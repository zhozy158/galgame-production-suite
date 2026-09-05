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
  const pending = manifest.lines.filter(line => line.speaker === speaker && (!line.ja || !line.direction));
  for (const [batchIndex, batch] of chunks(pending, 20).entries()) {
    process.stdout.write(`[${character.name}] 翻译批次 ${batchIndex + 1}/${Math.ceil(pending.length / 20)} ... `);
    const payload = batch.map(line => ({ id: line.id, zh: line.zh, expression: line.expression, variant: line.variant }));
    const prompt = `你是日系青春恋爱视觉小说的专业本地化译者和配音导演。把以下${character.name}的中文对白译成自然、年轻、适合日本高中恋爱动画声优演绎的日语。角色虽为成年人，但说话听感约十八岁。\n角色：${character.persona}\n人名固定读法：陆遥=ルー・ヤオ，林夏=リン・シア，唐桃=タン・タオ，沈月=シェン・ユエ，星汐町=ほししお町。\n要求：保留信息、关系与情绪，不逐字硬译；口语自然；不要擅自增加敬语、称谓或剧情；不要加入括号标签到台词。每项还要给一条简短日语配音指导 direction，说明语速、情绪、停顿，不要要求音效。严格返回 JSON 对象 {"items":[{"id":"原ID","ja":"日语台词","direction":"日语指导"}]}，不得遗漏、重复或改 ID。\n输入：${JSON.stringify(payload)}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mimo-v2.5",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3
      })
    });
    const raw = await response.text();
    if (!response.ok) throw new Error(`MiMo ${response.status}: ${raw.slice(0, 800)}`);
    const body = JSON.parse(raw);
    const parsed = JSON.parse(stripFence(body.choices?.[0]?.message?.content || ""));
    const returned = new Map((parsed.items || []).map(item => [item.id, item]));
    if (returned.size !== batch.length || batch.some(line => !returned.has(line.id))) throw new Error(`翻译批次返回 ID 不完整：${character.name} batch ${batchIndex + 1}`);
    for (const line of batch) {
      const translated = returned.get(line.id);
      line.ja = translated.ja;
      line.direction = translated.direction;
    }
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    console.log(`${batch.length} 条`);
  }
}
console.log(`✓ 全部 ${manifest.lines.length} 条日语对白翻译完成`);
