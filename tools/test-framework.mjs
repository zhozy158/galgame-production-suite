import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const suiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = { window: {}, localStorage: { getItem: () => null, setItem: () => {} } };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(suiteRoot, "framework", "engine", "vn-engine.js"), "utf8"), sandbox);
const engine = new sandbox.window.VNEngine({ storagePrefix: "test", startScene: "start" }, {}, { "start__000": "voice.wav" });
assert.equal(engine.voiceMap["start__000"], "voice.wav");
assert.equal(engine.voiceId(), "start__000");
engine.state.affinity = { heroine: 1 };
engine.state.flags = {};

engine.applyEffects({ heroine: 2, foundLetter: { set: true }, courage: 1 });
assert.equal(engine.state.affinity.heroine, 3);
assert.equal(engine.state.flags.foundLetter, true);
assert.equal(engine.state.flags.courage, 1);
assert.equal(engine.testCondition({ affinity: "heroine", gte: 3 }), true);
assert.equal(engine.testCondition({ flag: "foundLetter", eq: true }), true);
assert.equal(engine.testCondition({ all: [{ affinity: "heroine", gte: 3 }, { flag: "foundLetter" }] }), true);
assert.equal(engine.testCondition({ any: [{ flag: "missing" }, { flag: "foundLetter" }] }), true);
assert.equal(engine.testCondition({ not: { flag: "missing" } }), true);
engine.el.scene = { className: "scene bg-old", classList: { add: value => { engine._lastBgClass = value; } }, style: {} };
engine.config.backgrounds = { harbor: "assets/backgrounds/harbor.png" };
engine.setBackground("harbor");
assert.equal(engine._lastBgClass, "bg-harbor");
assert.equal(engine.el.scene.style.backgroundImage, 'url("assets/backgrounds/harbor.png")');
engine.state.visual = { expressions: { heroine: "smile" } };
engine.el.sprites = { innerHTML: "" };
engine.config.characters = {
  heroine: { position: "center", defaultExpression: "neutral", sprites: { neutral: "neutral.png", smile: "smile.png" } }
};
engine.setCast(["heroine"], "heroine");
assert.match(engine.el.sprites.innerHTML, /src="smile\.png"/);
assert.match(engine.el.sprites.innerHTML, /data-expression="smile"/);
const toggles = {};
engine.config.cgs = { reunion: "assets/cg/reunion.png" };
engine.el.eventCg = {
  classList: { toggle: (name, value) => { toggles[`cg-${name}`] = value; } },
  getAttribute: () => "",
  removeAttribute: () => {},
  dataset: {}
};
engine.el.sprites.classList = { toggle: (name, value) => { toggles[`sprites-${name}`] = value; } };
engine.setCG("reunion");
assert.equal(engine.el.eventCg.src, "assets/cg/reunion.png");
assert.equal(toggles["cg-hidden"], false);
assert.equal(toggles["sprites-hidden"], true);
assert.equal(engine.profile.gallery.includes("reunion"), true);
engine.setCG(null);
assert.equal(toggles["cg-hidden"], true);
assert.equal(toggles["sprites-hidden"], false);
assert.equal(engine.freshState().visual.cg, null);
console.log("✓ 公共框架状态、条件表达式、差分、事件 CG 与可选语音映射测试通过");
