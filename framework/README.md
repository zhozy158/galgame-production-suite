# 公共 Galgame 框架

`framework` 是所有作品共用、只维护一份的运行层。当前为零依赖浏览器实现，不需要打包和安装第三方库。

## 能力

- 场景、旁白、对话、人物在场状态与说话人高亮
- 图片背景、表情/动作差分、可持久化事件 CG 图层与首次观看自动解锁
- 选择肢、无条件跳转、条件选择、条件跳转、状态写入
- 自动存档、快速存读、8 个手动存档位与 JSON 导入导出
- 自动播放、已读/未读快进、履历、隐藏界面、设置
- 可选逐句语音映射、切句自动停止、重播与音量控制；自动播放会等待语音
- 相册、角色图鉴、结局记录
- 桌面与移动端响应式界面

## 接入方式

位于 `games/<id>/index.html` 的作品按以下顺序加载：

```html
<link rel="stylesheet" href="../../framework/styles/vn-core.css">
<link rel="stylesheet" href="theme.css">
<script src="game/config.js"></script>
<script src="game/story.js"></script>
<script src="game/voice-map.js"></script> <!-- 可选 -->
<script src="../../framework/engine/vn-engine.js"></script>
<script src="game/app.js"></script>
```

语音是可选模块。作品可传入形如 `{ "scene__004": "assets/audio/line.wav" }` 的映射：

```js
new VNEngine(window.GAME_CONFIG, window.GAME_STORY, window.GAME_VOICE_MAP).init();
```

不提供第三个参数时，框架仍按无配音模式工作，因此旧作品和新模板不受影响。

`vn-core.css` 提供公共 UI 与一套可用默认外观，作品的 `theme.css` 在后加载，只做覆盖。

## 稳定边界

- 新作通常不应修改 `framework`。
- 通用能力缺失时才修改框架，并用所有游戏的 `npm test` 回归。
- 作品差异不得通过 `if (config.id === ...)` 写入框架；应由配置或数据节点表达。
- 每部作品必须使用唯一 `storagePrefix`，防止存档互相覆盖。

剧情数据格式见 [DATA_FORMAT.md](DATA_FORMAT.md)。
