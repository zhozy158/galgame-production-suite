import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const suiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const planPath = path.resolve(suiteRoot, process.argv[2] || "games/summer-heart-equation/art/voice-tests-ja.json");
const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
const gameRoot = path.resolve(path.dirname(planPath), "..");
const baseUrl = "https://api.xiaomimimo.com/v1";

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

const apiKey = await readSecret();
if (!apiKey) throw new Error("未输入 MiMo API Key");

const requestAudio = async ({ model, direction, text, voice }) => {
  const audio = { format: "wav" };
  if (model.endsWith("voicedesign")) audio.optimize_text_preview = false;
  if (voice) audio.voice = voice;
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "user", content: direction },
        { role: "assistant", content: text }
      ],
      audio
    })
  });
  const raw = await response.text();
  let body;
  try { body = JSON.parse(raw); } catch { body = { raw: raw.slice(0, 500) }; }
  if (!response.ok) throw new Error(`MiMo ${response.status}: ${JSON.stringify(body)}`);
  const message = body.choices?.[0]?.message;
  if (!message?.audio?.data) throw new Error(`响应中没有音频数据：${JSON.stringify(body).slice(0, 500)}`);
  return { bytes: Buffer.from(message.audio.data, "base64"), id: body.id || null, transcript: message.audio.transcript || null };
};

const asDataUri = file => `data:audio/wav;base64,${fs.readFileSync(file).toString("base64")}`;
const log = { generatedAt: new Date().toISOString(), api: baseUrl, characters: [] };

for (const character of plan.characters) {
  const charLog = { id: character.id, samples: [] };
  const first = character.samples[0];
  const masterPath = path.resolve(gameRoot, first.output);
  fs.mkdirSync(path.dirname(masterPath), { recursive: true });
  process.stdout.write(`[${character.name}] 设计母声：${first.id} ... `);
  const master = await requestAudio({
    model: "mimo-v2.5-tts-voicedesign",
    direction: `${character.voiceDesign}\n${first.direction}`,
    text: first.ja
  });
  fs.writeFileSync(masterPath, master.bytes);
  console.log(`${master.bytes.length} bytes`);
  charLog.samples.push({ id: first.id, model: "mimo-v2.5-tts-voicedesign", output: first.output, responseId: master.id, transcript: master.transcript });

  const clonedVoice = asDataUri(masterPath);
  for (const sample of character.samples.slice(1)) {
    const outputPath = path.resolve(gameRoot, sample.output);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    process.stdout.write(`[${character.name}] 克隆演绎：${sample.id} ... `);
    const result = await requestAudio({
      model: "mimo-v2.5-tts-voiceclone",
      direction: sample.direction,
      text: sample.ja,
      voice: clonedVoice
    });
    fs.writeFileSync(outputPath, result.bytes);
    console.log(`${result.bytes.length} bytes`);
    charLog.samples.push({ id: sample.id, model: "mimo-v2.5-tts-voiceclone", output: sample.output, responseId: result.id, transcript: result.transcript });
  }
  log.characters.push(charLog);
}

const logPath = path.resolve(gameRoot, plan.generationLog);
fs.mkdirSync(path.dirname(logPath), { recursive: true });
fs.writeFileSync(logPath, JSON.stringify(log, null, 2) + "\n");
console.log(`完成：${logPath}`);
