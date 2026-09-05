import fs from "node:fs";
import path from "node:path";

const manifestPath = path.resolve(process.argv[2] || "games/summer-heart-equation/art/voice-dialogue-ja.json");
const outputPath = path.resolve(process.argv[3] || "games/summer-heart-equation/game/voice-map.js");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const map = Object.fromEntries(manifest.lines.map(line => [line.id, line.output]));
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `window.GAME_VOICE_MAP = ${JSON.stringify(map, null, 2)};\n`);
console.log(`Voice map: ${Object.keys(map).length} lines -> ${outputPath}`);
