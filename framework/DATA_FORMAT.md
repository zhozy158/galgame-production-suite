# 剧情数据格式

每个场景是 `GAME_STORY` 中的一组顺序节点。场景名是稳定 ID，显示标题另放在 `chapter` 字段中。

## 内容节点

```js
{ type: "narrate", text: "海风吹过。", bg: "harbor", cast: ["heroine"] }
{ type: "say", speaker: "heroine", text: "你回来了。", active: "heroine" }
```

`bg` 引用 `config.backgrounds`；`cast` 决定当前立绘；`active` 高亮说话人。

## 背景与表情差分

`config.backgrounds` 可以是背景 ID 数组（由游戏 CSS 绘制），也可以是“背景 ID → 图片路径”的映射：

```js
backgrounds: {
  harbor: "assets/backgrounds/harbor.png",
  classroom: "assets/backgrounds/classroom.png"
}
```

角色既可继续使用单张 `sprite`，也可以声明 `sprites`。`defaultExpression` 缺省为 `neutral`：

```js
heroine: {
  name: "夏音",
  defaultExpression: "neutral",
  sprites: {
    neutral: "assets/characters/heroine/neutral.png",
    smile: "assets/characters/heroine/smile.png",
    sad: "assets/characters/heroine/sad.png"
  }
}
```

单人表情用 `expression`，多人同时切换用 `expressions`。表情状态会随存档保存；未找到指定差分时自动回退至默认表情，再回退至旧版 `sprite`。

```js
{ type: "say", speaker: "heroine", text: "欢迎回来。", expression: "smile", active: "heroine" }
{ type: "narrate", text: "两人同时愣住。", expressions: { heroine: "surprised", friend: "surprised" } }
```

动作立绘等非表情差分也放在 `sprites` 映射中，并用语义更明确的 `variant` / `variants` 调用；引擎行为与表情差分相同，会持续到下一次该角色的差分变更。

```js
{ type: "say", speaker: "heroine", text: "让我来调频。", variant: "tuning-radio" }
{ type: "narrate", text: "两人同时举起道具。", variants: { heroine: "tuning-radio", friend: "holding-map" } }
```

## 事件 CG

在 `config.cgs` 中用稳定 ID 声明图片，剧情节点通过 `cg` 显示；CG 会覆盖普通立绘、跨节点保持并随存档恢复。使用 `cg: false` 明确关闭。首次显示时，同 ID 的相册项目会自动解锁。

```js
cgs: {
  reunion: "assets/cg/reunion.png",
  ending: "assets/cg/ending.png"
}

{ type: "narrate", text: "她穿过站台向我跑来。", cg: "reunion" }
{ type: "say", speaker: "heroine", text: "欢迎回来。" }
{ type: "narrate", text: "我们离开车站。", cg: false }
```

`cg` 必须引用 `config.cgs` 中已声明的 ID。无需在各游戏 HTML 中手写 CG 图层；通用引擎初始化时会自动创建。

## 分支节点

```js
{
  type: "choice",
  prompt: "怎么回答？",
  options: [
    { text: "答应", target: "promise", effects: { heroine: 1, promised: { set: true } } },
    { text: "隐藏选项", target: "secret", when: { affinity: "heroine", gte: 3 } }
  ]
}
{ type: "jump", target: "next_scene" }
```

与角色 ID 同名的数值效果写入好感度，其他效果写入 `flags`。`{ set: value }` 表示覆盖，普通数字表示累加。

## 条件节点

```js
{ type: "set", effects: { foundLetter: { set: true }, courage: 1 } }
{
  type: "jumpIf",
  when: { all: [{ flag: "foundLetter", eq: true }, { affinity: "heroine", gte: 3 }] },
  then: "true_ending",
  else: "normal_ending"
}
```

条件支持 `flag` 或 `affinity`，比较器支持 `eq`、`neq`、`gte`、`lte`；可用 `all`、`any`、`not` 组合。条件也可以写在选择项的 `when` 中隐藏/显示选项。

## 结局节点

```js
{ type: "ending", id: "good" }
```

结局 ID 必须在 `GAME_CONFIG.endings` 中声明。所有分支都应最终到达结局；自动校验器会枚举路线并报告死路。
