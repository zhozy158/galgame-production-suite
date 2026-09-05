import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const suiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const gameArg = process.argv[2] || "games/summer-heart-equation";
const root = path.resolve(suiteRoot, gameArg);
const gamesRoot = path.join(suiteRoot, "games") + path.sep;
if (!root.startsWith(gamesRoot) || !fs.existsSync(root)) {
  console.error(`游戏目录无效：${gameArg}`);
  process.exit(1);
}
const sandbox = { window: {} };
vm.createContext(sandbox);
for (const file of ["game/config.js", "game/story.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), sandbox, { filename: file });
}

const config = sandbox.window.GAME_CONFIG;
const story = sandbox.window.GAME_STORY;
const errors = [];
const warnings = [];
const knownTypes = new Set(["narrate", "say", "choice", "jump", "jumpIf", "set", "ending"]);
const targets = new Set();
const endings = new Set();
let dialogueNodes = 0;
let totalCharacters = 0;

const requireFile = relative => {
  if (!fs.existsSync(path.join(root, relative))) errors.push(`缺少素材：${relative}`);
};

const characterHasSprite = char => Boolean(char?.sprite || Object.keys(char?.sprites || {}).length);
Object.values(config.characters).forEach(char => {
  if (char.sprite) requireFile(char.sprite);
  Object.values(char.sprites || {}).forEach(requireFile);
  if (char.sprites && !char.sprites[char.defaultExpression || "neutral"] && !char.sprite) {
    errors.push(`角色缺少默认表情立绘：${char.name || "未命名角色"}`);
  }
});
if (!Array.isArray(config.backgrounds)) Object.values(config.backgrounds || {}).forEach(requireFile);
Object.values(config.cgs || {}).forEach(requireFile);
config.gallery.forEach(item => requireFile(item.src));

for (const [sceneId, lines] of Object.entries(story)) {
  if (!Array.isArray(lines) || lines.length === 0) errors.push(`空场景：${sceneId}`);
  lines.forEach((line, index) => {
    const at = `${sceneId}[${index}]`;
    if (!knownTypes.has(line.type)) errors.push(`${at} 使用未知类型：${line.type}`);
    if (["say", "narrate"].includes(line.type)) {
      dialogueNodes += 1;
      totalCharacters += line.text?.length || 0;
      if (!line.text) errors.push(`${at} 缺少文本`);
    }
    if (line.type === "say" && !config.characters[line.speaker]) errors.push(`${at} 使用未知角色：${line.speaker}`);
    for (const id of line.cast || []) if (!characterHasSprite(config.characters[id])) errors.push(`${at} 使用无立绘角色：${id}`);
    const backgroundIds = Array.isArray(config.backgrounds) ? config.backgrounds : Object.keys(config.backgrounds || {});
    if (line.bg && !backgroundIds.includes(line.bg)) errors.push(`${at} 使用未知背景：${line.bg}`);
    if (line.cg && !config.cgs?.[line.cg]) errors.push(`${at} 使用未知事件 CG：${line.cg}`);
    const requestedExpressions = { ...(line.expressions || {}) };
    Object.assign(requestedExpressions, line.variants || {});
    if (line.expression && line.speaker) requestedExpressions[line.speaker] = line.expression;
    if (line.variant && line.speaker) requestedExpressions[line.speaker] = line.variant;
    for (const [id, expression] of Object.entries(requestedExpressions)) {
      const char = config.characters[id];
      if (!char) errors.push(`${at} 为未知角色指定表情：${id}`);
      else if (char.sprites && !char.sprites[expression]) errors.push(`${at} 使用未声明表情：${id}.${expression}`);
    }
    if (line.type === "jump") targets.add(line.target);
    if (line.type === "jumpIf") { targets.add(line.then); targets.add(line.else); }
    if (line.type === "choice") {
      if (!line.options?.length) errors.push(`${at} 没有选项`);
      line.options?.forEach(option => targets.add(option.target));
    }
    if (line.type === "ending") {
      endings.add(line.id);
      if (!config.endings[line.id]) errors.push(`${at} 使用未知结局：${line.id}`);
    }
  });
}

for (const target of targets) if (!story[target]) errors.push(`跳转目标不存在：${target}`);
for (const id of Object.keys(config.endings)) if (!endings.has(id)) errors.push(`结局未被剧本引用：${id}`);

const reachable = new Set();
const visit = sceneId => {
  if (reachable.has(sceneId) || !story[sceneId]) return;
  reachable.add(sceneId);
  for (const line of story[sceneId]) {
    if (line.type === "jump") visit(line.target);
    if (line.type === "jumpIf") { visit(line.then); visit(line.else); }
    if (line.type === "choice") line.options.forEach(option => visit(option.target));
  }
};
visit(config.startScene);
for (const id of Object.keys(story)) if (!reachable.has(id)) errors.push(`场景无法从开局抵达：${id}`);

const enumerate = (sceneId, seen = new Set(), stats = { nodes: 0, chars: 0 }) => {
  if (seen.has(sceneId)) return [{ ...stats, loop: true }];
  const nextSeen = new Set(seen).add(sceneId);
  let acc = { ...stats };
  for (const line of story[sceneId]) {
    if (["say", "narrate"].includes(line.type)) { acc.nodes += 1; acc.chars += line.text.length; }
    if (line.type === "jump") return enumerate(line.target, nextSeen, acc);
    if (line.type === "jumpIf") return [line.then, line.else].flatMap(target => enumerate(target, nextSeen, { ...acc }));
    if (line.type === "choice") return line.options.flatMap(option => enumerate(option.target, nextSeen, { ...acc }));
    if (line.type === "ending") return [{ ...acc, ending: line.id }];
  }
  return [{ ...acc, deadEnd: true }];
};

const paths = enumerate(config.startScene);
paths.forEach((route, index) => {
  if (route.deadEnd) errors.push(`路线 ${index + 1} 没有结局`);
  if (route.loop) errors.push(`路线 ${index + 1} 出现循环`);
});
const minNodes = Math.min(...paths.map(p => p.nodes));
const maxNodes = Math.max(...paths.map(p => p.nodes));
const minChars = Math.min(...paths.map(p => p.chars));
const maxChars = Math.max(...paths.map(p => p.chars));
// 视觉小说通常包含停顿、选项与画面浏览；以 260 字/分钟 + 每节点 2.2 秒估算。
const minutes = chars => Math.round(chars / 260 + minNodes * 2.2 / 60);
if (minChars < 5500) warnings.push("最短路线文本偏短，可能不足半小时");

if (errors.length) {
  console.error("剧本校验失败：\n- " + errors.join("\n- "));
  process.exit(1);
}
console.log(`\n[${config.title || path.basename(root)}]`);
console.log(`✓ ${Object.keys(story).length} 个场景全部可达`);
console.log(`✓ ${dialogueNodes} 个文本节点，剧本总字符 ${totalCharacters}`);
console.log(`✓ ${paths.length} 种选择组合全部能抵达结局`);
console.log(`✓ 单次路线 ${minNodes}–${maxNodes} 个文本节点，${minChars}–${maxChars} 字`);
console.log(`✓ 预计单次体验约 ${minutes(minChars)}–${minutes(maxChars)} 分钟`);
console.log(`✓ ${Object.keys(config.endings).length} 个结局、${config.gallery.length} 个相册项目、角色与图片引用均有效`);
warnings.forEach(warning => console.warn(`! ${warning}`));
