import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const suiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.resolve(suiteRoot, process.argv[2] || "games/summer-heart-equation/art/voice-dialogue-ja.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const gameRoot = path.resolve(path.dirname(manifestPath), "..");
const apiUrl = "https://api.xiaomimimo.com/v1/chat/completions";
const logPath = path.resolve(gameRoot, "art/voice-dialogue-ja-generation.json");

const readSecret = async () => {
  if (process.env.MIMO_API_KEY) return process.env.MIMO_API_KEY;
  if (!process.stdin.isTTY) throw new Error("MIMO_API_KEY 未设置，且当前终端不可安全输入密钥");
  process.stdout.write("MiMo API Key（输入不会显示）: ");
  process.stdin.setRawMode(true);
  process.stdin.resume();
  let secret = "";
  return await new Promise((resolve, reject) => {
    const onData = chunk => {
      for (const byte of chunk) {
        if (byte === 3) {
          process.stdin.off("data", onData);
          process.stdin.setRawMode(false);
          process.stdin.pause();
          reject(new Error("用户取消"));
          return;
        }
        if (byte === 13 || byte === 10) {
          process.stdin.off("data", onData);
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write("\n");
          resolve(secret.trim());
          return;
        }
        if (byte === 8 || byte === 127) secret = secret.slice(0, -1);
        else secret += String.fromCharCode(byte);
      }
    };
    process.stdin.on("data", onData);
  });
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const apiKey = await readSecret();
if (!apiKey) throw new Error("未输入 MiMo API Key");

const wavDuration = bytes => {
  if (bytes.length < 44 || bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WAVE") return null;
  let offset = 12;
  let byteRate = 0;
  let dataSize = 0;
  while (offset + 8 <= bytes.length) {
    const tag = bytes.toString("ascii", offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    if (tag === "fmt " && size >= 12) byteRate = bytes.readUInt32LE(offset + 8 + 8);
    if (tag === "data") { dataSize = size; break; }
    offset += 8 + size + (size % 2);
  }
  return byteRate && dataSize ? dataSize / byteRate : null;
};

const isExistingValid = (file, text) => {
  if (!fs.existsSync(file)) return false;
  const duration = wavDuration(fs.readFileSync(file));
  return duration !== null && duration >= 0.35 && duration <= Math.max(10, text.length * 0.38 + 5);
};

const masters = Object.fromEntries(Object.entries(manifest.voiceMasters).map(([id, relative]) => {
  const file = path.resolve(gameRoot, relative);
  if (!fs.existsSync(file)) throw new Error(`缺少 ${id} 母声：${file}`);
  return [id, `data:audio/wav;base64,${fs.readFileSync(file).toString("base64")}`];
}));

const requestAudio = async (line, attempt) => {
  const limit = Math.max(10, line.ja.length * 0.38 + 5);
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "mimo-v2.5-tts-voiceclone",
      messages: [
        { role: "user", content: `${line.direction}\n日本語の台詞を一度だけ自然に読み、台詞以外の言葉、説明、笑い声、繰り返し、長い沈黙を追加しない。` },
        { role: "assistant", content: line.ja }
      ],
      audio: { format: "wav", voice: masters[line.speaker] }
    })
  });
  const raw = await response.text();
  let body;
  try { body = JSON.parse(raw); } catch { body = { raw: raw.slice(0, 300) }; }
  if (!response.ok) throw new Error(`MiMo ${response.status}: ${JSON.stringify(body).slice(0, 500)}`);
  const data = body.choices?.[0]?.message?.audio?.data;
  if (!data) throw new Error("响应中没有音频数据");
  const bytes = Buffer.from(data, "base64");
  const duration = wavDuration(bytes);
  if (duration === null) throw new Error("返回内容不是有效 WAV");
  if (duration < 0.35 || duration > limit) throw new Error(`异常时长 ${duration.toFixed(2)}s（上限 ${limit.toFixed(2)}s）`);
  return { bytes, duration, responseId: body.id || null, transcript: body.choices?.[0]?.message?.audio?.transcript || null, attempt };
};

const oldLog = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, "utf8")) : null;
const results = new Map((oldLog?.lines || []).map(item => [item.id, item]));
let completed = 0;
let skipped = 0;
let failed = 0;

const saveLog = () => fs.writeFileSync(logPath, JSON.stringify({
  generatedAt: new Date().toISOString(), model: "mimo-v2.5-tts-voiceclone", manifest: path.relative(gameRoot, manifestPath).replaceAll("\\", "/"),
  summary: { total: manifest.lines.length, completed, skipped, failed }, lines: [...results.values()]
}, null, 2) + "\n");

for (let index = 0; index < manifest.lines.length; index += 1) {
  const line = manifest.lines[index];
  const outputPath = path.resolve(gameRoot, line.output);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  if (isExistingValid(outputPath, line.ja)) {
    skipped += 1;
    process.stdout.write(`[${index + 1}/${manifest.lines.length}] ${line.id} 已存在\n`);
    continue;
  }
  let result = null;
  let error = null;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      process.stdout.write(`[${index + 1}/${manifest.lines.length}] ${line.id} 合成 ${attempt}/4 ... `);
      result = await requestAudio(line, attempt);
      fs.writeFileSync(outputPath, result.bytes);
      console.log(`${result.duration.toFixed(2)}s`);
      break;
    } catch (caught) {
      error = caught;
      console.log(`重试：${caught.message}`);
      await sleep(900 * attempt);
    }
  }
  if (result) {
    completed += 1;
    results.set(line.id, { id: line.id, speaker: line.speaker, output: line.output, duration: Number(result.duration.toFixed(3)), responseId: result.responseId, transcript: result.transcript, attempts: result.attempt });
  } else {
    failed += 1;
    results.set(line.id, { id: line.id, speaker: line.speaker, output: line.output, error: error?.message || "未知错误" });
  }
  saveLog();
}

saveLog();
console.log(`完成：新生成 ${completed}，跳过 ${skipped}，失败 ${failed}`);
if (failed) process.exitCode = 2;
