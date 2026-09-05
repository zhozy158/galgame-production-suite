import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const suiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const gameRoot = path.resolve(suiteRoot, process.argv[2] || "games/summer-heart-equation");
const output = path.join(gameRoot, "art", "voice-dialogue-ja.json");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(gameRoot, "game", "story.js"), "utf8"), sandbox);

const heroines = new Set(["linxia", "tangtao", "shenyue"]);
const voiceMasters = {
  linxia: "assets/audio/voice-tests/ja-school-v3/linxia/02-reply-promise.wav",
  tangtao: "assets/audio/voice-tests/ja-school-v3/tangtao/01-offer-soda.wav",
  shenyue: "assets/audio/voice-tests/ja-school-v3/shenyue/01-ending-save.wav"
};
const characters = {
  linxia: { name: "林夏", japaneseName: "リン・シア", persona: "物静かな理系女子。簡潔で論理的だが、親しい相手への優しさと初恋の不器用さがある。" },
  tangtao: { name: "唐桃", japaneseName: "タン・タオ", persona: "明るく行動的な幼なじみ。冗談と強がりが多いが、面倒見がよく本音はまっすぐ。" },
  shenyue: { name: "沈月", japaneseName: "シェン・ユエ", persona: "静かな資料館員。観察と言葉選びが慎重で、事務的な表現の中に繊細な感情がにじむ。" }
};
const previous = fs.existsSync(output) ? JSON.parse(fs.readFileSync(output, "utf8")) : null;
const existing = new Map((previous?.lines || []).map(line => [line.id, line]));
const lines = [];

for (const [scene, nodes] of Object.entries(sandbox.window.GAME_STORY)) {
  nodes.forEach((node, index) => {
    if (node.type !== "say" || !heroines.has(node.speaker)) return;
    const id = `${scene}__${String(index).padStart(3, "0")}`;
    const hash = crypto.createHash("sha256").update(`${node.speaker}\0${node.text}`).digest("hex").slice(0, 16);
    const old = existing.get(id);
    lines.push({
      id,
      scene,
      index,
      speaker: node.speaker,
      zh: node.text,
      ja: old?.sourceHash === hash ? old.ja : null,
      direction: old?.sourceHash === hash ? old.direction : null,
      expression: node.expression || null,
      variant: node.variant || null,
      sourceHash: hash,
      output: `assets/audio/voice/ja/${node.speaker}/${id}.wav`
    });
  });
}

const manifest = {
  schemaVersion: 1,
  language: "ja-JP",
  screenTextLanguage: "zh-CN",
  protagonistVoiced: false,
  namePronunciation: { "陆遥": "ルー・ヤオ", "林夏": "リン・シア", "唐桃": "タン・タオ", "沈月": "シェン・ユエ", "星汐町": "ほししお町" },
  voiceMasters,
  characters,
  lines
};
fs.writeFileSync(output, JSON.stringify(manifest, null, 2) + "\n");
console.log(`✓ ${lines.length} 条女主对白已写入 ${output}`);
