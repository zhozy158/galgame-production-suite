# 《夏日心跳方程式》

这是一个不依赖第三方库、可离线运行的浏览器 Galgame。故事为原创短篇：主人公陆遥回到海边小镇，和林夏、唐桃、沈月共同修复一座会向过去发送“未来录音”的旧电台。

## 直接游玩

最简单的方式是双击 `index.html`。Chrome、Edge 等现代浏览器均可运行，存档保存在浏览器的 `localStorage` 中。

也可以在 `galgame` 工作区根目录运行：

```powershell
npm start
```

然后打开 <http://127.0.0.1:4173/games/summer-heart-equation/>。

## 已实现功能

- 逐字文本、说话人样式、章节卡、7 张背景、角色表情/动作立绘和事件 CG 层
- 选择肢、数值/标记效果、场景跳转、三条结局
- 8 个手动存档位、自动存档、快速保存与快速读取
- 存档 JSON 导入/导出
- 自动播放、已读快进、可选未读快进
- 对话履历、界面隐藏、键盘操作
- 131 句女主日语配音、逐句自动播放/停止、语音重播与音量设置
- 8 项回忆相册、事件 CG 自动解锁和结局记录
- 桌面和移动端响应式布局

键盘：`Space`/`Enter` 推进，`A` 自动播放，`Ctrl` 切换快进，`Esc` 返回。

## 人物一致性策略

当前运行版本以 V2 身份母版为基准。三位女主各有 1 张身份母版、5 张表情差分和 1 张剧情动作立绘；针对旧版局部表情合成中容易出现的接缝，7 张问题差分已改为 V3 整图重绘。运行素材仍位于 `assets/characters-v2/`，旧合成版备份在 `assets/legacy-composite-v2/`。人物锁定规则见 `docs/CHARACTER_ART_BIBLE.md`。

完整复现资料分别保存在 `art/sprite-prompts-v2.json`、`art/expression-prompts-v2.json`、`art/expression-prompts-v3-full.json`、`art/action-prompts-v2.json`、`art/background-prompts-v2.json` 与 `art/cg-prompts-v2.json`；`art/asset-manifest-v2.json` 是基础资产状态和剧情接入位置的事实来源。

## 与公共框架的关系

本目录只包含这部作品的内容：

```text
game/config.js        游戏标题、角色、相册、结局配置
game/story.js         本作剧情数据
game/voice-map.js     剧情节点到日语 WAV 的稳定映射
game/app.js           初始化入口
theme.css             本作对公共主题的覆盖
assets/               本作运行素材与角色母版
art/                  本作完整生成提示词
docs/                 本作角色与制作文档
```

通用运行能力来自 `../../framework/`。制作下一款游戏请使用工作区根目录的 `npm run new-game`，不要复制或修改本作来充当模板。

## 日语配音资料

- 屏幕文本保持中文，只有林夏、唐桃、沈月的对白配日语；主人公与旁白不配音。
- 翻译、演绎说明和稳定节点 ID：`art/voice-dialogue-ja.json`。
- 合成日志与时长校验：`art/voice-dialogue-ja-generation.json`。
- 运行 WAV：`assets/audio/voice/ja/<character>/`。
- 重新生成映射：`node tools/build-voice-map.mjs games/summer-heart-equation/art/voice-dialogue-ja.json games/summer-heart-equation/game/voice-map.js`。
- 重新合成支持断点续传，命令为 `node tools/generate-mimo-dialogue-tts.mjs games/summer-heart-equation/art/voice-dialogue-ja.json`；密钥只从环境变量或隐藏终端输入读取，不写入项目。

### 剧本数据格式

```js
// 旁白或对话
{ type: "narrate", text: "海风吹过。", bg: "seaside", cast: ["heroine"] }
{ type: "say", speaker: "heroine", text: "欢迎回来。", active: "heroine" }
{ type: "say", speaker: "heroine", text: "让我来调频。", expression: "smile", variant: "tuning-radio" }
{ type: "narrate", text: "那一刻被永远记住。", cg: "chapter-event" }
{ type: "narrate", text: "我们继续向前。", cg: false }

// 选择与跳转
{
  type: "choice",
  prompt: "怎么回答？",
  options: [
    { text: "答应她", target: "good_route", effects: { heroine: 1 }, unlock: "heroine" }
  ]
}
{ type: "jump", target: "next_scene" }
{ type: "ending", id: "good" }
```

`bg` 引用配置中的图片背景；`cast` 控制在场人物；`active` 高亮当前说话人；`expression`/`variant` 调用表情或动作立绘；`cg` 显示配置中的事件图并自动解锁同 ID 相册，`cg: false` 关闭；`effects` 中与角色 ID 同名的字段累加好感度，其他字段写入剧情标记；`unlock` 可显式解锁相册项目。

## 自动校验

在 `galgame` 工作区根目录运行：

```powershell
npm run validate-game -- games/summer-heart-equation
```

校验器会检查 JavaScript 语法、素材存在性、角色/背景引用、跳转目标、不可达场景、死路与循环，并枚举全部选择组合，确认每条路线都能到达合法结局，同时输出单次路线字数和体验时长估算。

## 素材说明

V2 封面、三位角色、差分、动作、背景与事件 CG 均由内置图像生成工具制作，并保存了生成提示、参考输入和候选/成品关系。角色均明确设定为 20 岁以上成年人。故事、角色名和代码均为本项目原创，不引用网络小说文本。
