import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const suiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const gamesRoot = path.join(suiteRoot, "games");
const games = fs.readdirSync(gamesRoot, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && fs.existsSync(path.join(gamesRoot, entry.name, "game", "config.js")))
  .map(entry => entry.name);

if (!games.length) {
  console.error("没有发现可校验的游戏。");
  process.exit(1);
}

let failed = false;
const frameworkTest = spawnSync(process.execPath, [path.join(suiteRoot, "tools", "test-framework.mjs")], {
  cwd: suiteRoot,
  stdio: "inherit"
});
if (frameworkTest.status !== 0) failed = true;
for (const slug of games) {
  const result = spawnSync(process.execPath, [path.join(suiteRoot, "tools", "validate-game.mjs"), `games/${slug}`], {
    cwd: suiteRoot,
    stdio: "inherit"
  });
  if (result.status !== 0) failed = true;
}
if (failed) process.exit(1);
console.log(`\n✓ 全部 ${games.length} 部游戏校验通过`);
