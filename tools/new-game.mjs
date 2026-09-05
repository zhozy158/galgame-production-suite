import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const suiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [slug, ...titleParts] = process.argv.slice(2);
const title = titleParts.join(" ").trim();

if (!slug || !title || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error('用法：npm run new-game -- <英文短名> "<游戏标题>"');
  console.error('示例：npm run new-game -- moonlit-letter "月下书简"');
  process.exit(1);
}

const templateRoot = path.join(suiteRoot, "templates", "game-starter");
const gameRoot = path.join(suiteRoot, "games", slug);
const gamesRoot = path.join(suiteRoot, "games") + path.sep;
if (!gameRoot.startsWith(gamesRoot)) throw new Error("目标目录越界");
if (fs.existsSync(gameRoot)) {
  console.error(`游戏已经存在：games/${slug}`);
  process.exit(1);
}

const copyTree = (source, destination) => {
  fs.mkdirSync(destination);
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) copyTree(sourcePath, destinationPath);
    else fs.copyFileSync(sourcePath, destinationPath);
  }
};
copyTree(templateRoot, gameRoot);
const replaceTokens = directory => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) replaceTokens(file);
    else if (/\.(html|css|js|json|md)$/.test(entry.name)) {
      const next = fs.readFileSync(file, "utf8")
        .replaceAll("__GAME_SLUG__", slug)
        .replaceAll("__GAME_TITLE__", title);
      fs.writeFileSync(file, next);
    }
  }
};
replaceTokens(gameRoot);

const catalogPath = path.join(suiteRoot, "games", "catalog.json");
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
catalog.games.push({ id: slug, title, path: `games/${slug}/`, status: "development", description: "新建项目，等待填写简介。" });
fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + "\n");

console.log(`✓ 已创建 games/${slug}`);
console.log(`✓ 已加入 games/catalog.json`);
console.log(`下一步：编辑 games/${slug}/game/config.js 与 game/story.js`);
