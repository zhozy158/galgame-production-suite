import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const suiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.resolve(suiteRoot, process.argv[2] || "games/summer-heart-equation/art/voice-dialogue-ja.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const endpoint = "https://api.xiaomimimo.com/v1/chat/completions";

const readSecret = async () => {
  if (process.env.MIMO_API_KEY) return process.env.MIMO_API_KEY;
  if (!process.stdin.isTTY) throw new Error("MIMO_API_KEY 未设置，且当前终端不可安全输入密钥");
  process.stdout.write("MiMo API Key（输入不会显示）: ");
  process.stdin.setRawMode(true); process.stdin.resume();
  let secret = "";
  return await new Promise((resolve, reject) => {
    const onData = chunk => {
      for (const byte of chunk) {
        if (byte === 3) { process.stdin.setRawMode(false); process.stdin.pause(); reject(new Error("用户取消")); return; }
        if (byte === 13 || byte === 10) { process.stdin.off("data", onData); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write("\n"); resolve(secret.trim()); return; }
        if (byte === 8 || byte === 127) secret = secret.slice(0, -1); else secret += String.fromCharCode(byte);
      }
    };
    process.stdin.on("data", onData);
  });
};

const apiKey = await readSecret();
const chunks = (items, size) => Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size));
const stripFence = text => text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

for (const [speaker, character] of Object.entries(manifest.characters)) {
  const lines = manifest.lines.filter(line => line.speaker === speaker);
  for (const [batchIndex, batch] of chunks(lines, 18).entries()) {
    process.stdout.write(`[${character.name}] 日语校订 ${batchIndex + 1}/${Math.ceil(lines.length / 18)} ... `);
    const payload = batch.map(line => ({ id: line.id, zh: line.zh, draft: line.ja, expression: line.expression, direction: line.direction }));
    const prompt = `你是资深日本女性向/男性向青春恋爱视觉小说本地化编辑。校订${character.name}的日语对白，使其像十八岁左右的日本动画女高中生自然说话，但人物实际是成年人。\n角色：${character.persona}\n强制人名：陆遥必须写作「ルー・ヤオ」，林夏=「リン・シア」，唐桃=「タン・タオ」，沈月=「シェン・ユエ」，星汐町=「ほししお町」。\n要求：准确保留中文含义与关系；自然口语、年轻女性语感；禁止男性化结尾（如不合语境的「だぜ」「やるよ」）、大妈腔、古风腔、过度敬语、擅自增加剧情；修复生硬直译；台词不要包含表演标签。direction 用简洁日语说明情绪、语速、停顿，避免导演词过长导致 TTS 擅自加戏。严格返回 {"items":[{"id":"原ID","ja":"校订台词","direction":"简短日语指导"}]}。不得遗漏、重复或改ID。\n输入：${JSON.stringify(payload)}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "mimo-v2.5-pro", messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" }, temperature: 0.15 })
    });
    const raw = await response.text();
    if (!response.ok) throw new Error(`MiMo ${response.status}: ${raw.slice(0, 800)}`);
    const body = JSON.parse(raw);
    const parsed = JSON.parse(stripFence(body.choices?.[0]?.message?.content || ""));
    const returned = new Map((parsed.items || []).map(item => [item.id, item]));
    if (returned.size !== batch.length || batch.some(line => !returned.has(line.id))) throw new Error(`校订批次返回 ID 不完整：${character.name} ${batchIndex + 1}`);
    for (const line of batch) { const item = returned.get(line.id); line.ja = item.ja; line.direction = item.direction; }
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    console.log(`${batch.length} 条`);
  }
}
console.log(`✓ ${manifest.lines.length} 条日语对白校订完成`);
