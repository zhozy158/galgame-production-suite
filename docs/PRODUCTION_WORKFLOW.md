# 多作品 Galgame 标准生产流程

## 1. 建立项目

使用 `npm run new-game -- <slug> "<标题>"` 创建独立目录。先填写作品一句话概念、目标时长、受众与内容边界，再开始写剧本或绘图。

## 2. 剧情预制作

先形成剧情大纲、场景 ID 表和路线图。场景 ID 一旦进入存档版本就尽量保持稳定；大改显示名称不会破坏存档，大改 ID 会。

把剧情写入 `game/story.js`，把人物、背景、事件 CG、相册、结局和存档命名空间写入 `game/config.js`。使用条件节点表达跨章节影响，不复制大量近似场景。

## 3. 人物设计

先做低成本角色设定页，确认后写入本作 `docs/CHARACTER_ART_BIBLE.md`，并把原始完整提示词写入 `art/character-prompts.json`。未确认的图片只进入 `assets/concepts/`，不能直接进入运行立绘目录。

## 4. 批量美术

生成顺序固定为：身份母版 → 标准透明立绘 → 表情差分 → 动作立绘 → 事件 CG → 封面。每个生成批次都保存提示词、输入参考、输出路径和验收状态。禁止仅凭角色名字重新生成。

建议资产命名：

```text
assets/characters/<角色ID>/base.png
assets/characters/<角色ID>/expressions/smile.png
assets/characters/<角色ID>/poses/action-01.png
assets/cg/chapter-02-radio-room.png
assets/backgrounds/station-evening.png
```

## 5. 集成与验证

只有通过人物一致性验收的图片才能写入 `config.js`。事件图先在 `config.cgs` 注册，再由剧情节点的 `cg` 字段调用，并用 `cg: false` 明确收场。每次修改公共框架后运行 `npm test`，每次修改单部剧情后运行指定游戏校验。人工至少跑通每个结局一次，并检查桌面、手机、存档往返和相册解锁。

## 6. 发布归档

发布版本应同时保存：游戏目录、框架版本、提示词与角色圣经、素材授权/来源记录、测试输出。不要把临时生成图和最终资产混在同一目录。
