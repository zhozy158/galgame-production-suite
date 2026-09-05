# 《夏日心跳方程式》角色美术圣经

## 当前状态

2026-09-05：V2 三位女主设定稿与标准透明立绘均已由用户确认。批准的标准立绘位于 `assets/characters-v2/<角色ID>/base-neutral.png`，并正式作为表情差分的像素级编辑母版。当前游戏仍引用 V1 立绘；在 V2 表情差分全部完成以前，不单独替换某一个角色，避免游戏内风格混杂。

完整原始生成提示词保存在 [`../art/character-prompts.json`](../art/character-prompts.json)。两张生成时使用的风格语言参考已经归档至工作区级 `art-direction/references/`。

标准透明立绘批次的完整提示词保存在 [`../art/sprite-prompts-v2.json`](../art/sprite-prompts-v2.json)，原始候选位于 `assets/candidates-v2/`，批准版本位于 `assets/characters-v2/`。三张图片均为 1024×1536、32 位 ARGB，画布角点 Alpha 为 0。

## 身份母版

| 角色 | 年龄 | 身份母版 | 不可变识别特征 |
|---|---:|---|---|
| 林夏 | 22 | `assets/concepts-v2/lin-xia-design-v2.png` | 蓝黑长直发、轻薄齐刘海、琥珀棕眼、金色星形发夹、靛蓝外套、米白上衣、深蓝长裙、腕表 |
| 唐桃 | 21 | `assets/concepts-v2/tang-tao-design-v2.png` | 灰调桃粉短波波头、不对称碎刘海、叶绿色眼睛、薄荷发夹、燕麦色连帽衫、珊瑚色内搭、深色阔腿短裤和连裤袜 |
| 沈月 | 24 | `assets/concepts-v2/shen-yue-design-v2.png` | 银灰及腰直发、侧刘海、耳后细辫、灰紫眼睛、圆领浅灰紫衬衫、灰色开衫、深蓝灰长裙、细银项链 |

## 全局画风锁定

- 当代日本动画/视觉小说角色设计，而非欧美漫画或半写实厚涂。
- 细而有轻微粗细变化的线稿；轮廓清楚，五官简洁。
- 平涂为主，只使用一层边缘清晰的赛璐璐阴影。
- 高光极少；皮肤保持哑光，不使用油亮反光、空气笔渐变或摄影棚柔光。
- 身体比例自然且明确成年，不强调胸腰，不采用写真、模特或 pin-up 姿势。
- 色彩低饱和，整体沿用海边小镇的蓝灰、米白、灰桃和淡紫色系。

## 后续资产生成顺序

1. 以每张身份母版作为唯一角色参考，制作透明背景的标准半身立绘。
2. 通过“局部表情编辑”产生普通、微笑、悲伤、生气、惊讶、害羞六种差分；身体、头发轮廓和服装不得重绘。
3. 制作每人一张剧情动作立绘，仍以身份母版约束脸型与服装。
4. 角色立绘全部验收后，再制作包含人物的事件 CG；每次必须同时附带对应身份母版。
5. 最后重画封面，并同时附带三张母版，禁止仅凭文字重新理解人物。

## 每次生成必须重复的约束

```text
Identity reference: use the supplied approved canonical character sheet as the only identity source.
Preserve exactly: facial geometry, eye shape and color, bangs, hair silhouette and length, signature accessory, body proportions, and outfit construction.
Style: clean contemporary Japanese anime linework, mostly flat cel colors, one hard-edged shadow tone, minimal highlights, matte skin, hand-drawn 2D appearance.
Avoid: identity drift, face redesign, glossy skin, oily highlights, airbrushed gradients, painterly rendering, 3D look, photorealism, Western comic anatomy, voluptuous exaggeration, pin-up pose, bloom, lens flare.
```

## 一致性验收清单

- 发缝、刘海分组和标志性发饰位置一致。
- 瞳色、眼角走势、脸宽和下巴形状一致。
- 肩宽、头身比、身高差和四肢比例一致。
- 服装领口、叠穿顺序、袖长、裙/裤长度与配色一致。
- 表情变化只影响眉眼和嘴部，不改变脸型。
- 同一场景中的线条粗细、阴影边界和皮肤色一致。

## 表情差分合成

如果图片生成器返回了烘焙棋盘格或重绘了非表情区域，不直接采用整张输出。使用公共工具 `tools/compose-expression.ps1`，以批准的透明 `base-neutral.png` 为底，仅在眉眼和嘴部的羽化椭圆区域合成 AI 表情编辑结果。最终 Alpha 始终取自母版，因此人物轮廓、服装、姿势和画布位置保持像素级一致。

```powershell
./tools/compose-expression.ps1 `
  -Base games/<game-id>/assets/characters-v2/<character>/base-neutral.png `
  -Edit games/<game-id>/assets/candidates-v2/<character>/smile.png `
  -Output games/<game-id>/assets/characters-v2/<character>/smile.png
```

默认区域适合 1024×1536 的当前三位角色；若角色脸部位置不同，显式传入 `-Regions "中心X,中心Y,半径X,半径Y;..."`。成品仍需检查角点 Alpha、五官接缝和表情可读性。

对没有同形 Alpha 母版的全新动作立绘，可使用 `tools/remove-generated-background.ps1`。它从画布四边开始，仅清除与边缘连通的近中性亮色棋盘格，因此不会把被深色线稿包围的米白服装误删。处理后必须检查内部孔洞、浅色发梢、道具天线和四角 Alpha。
