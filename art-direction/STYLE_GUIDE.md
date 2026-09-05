# 全局美术规范：Clean Japanese VN

这是所有作品默认继承的基础画风。单部作品可以调整时代、服装、色盘与氛围，但不能重新引入已经排除的“AI 油亮厚涂感”。

## 核心视觉语言

- 当代日本动画与漫画式人物设计，细而有轻微粗细变化的线稿。
- 五官以清晰轮廓和少量线条概括，表情依靠眉眼与嘴型，不依赖写实肌肉或皮肤纹理。
- 平涂为主，只保留一层边缘明确的赛璐璐阴影；必要时最多增加极少的环境色。
- 皮肤哑光，高光克制；头发高光是简洁图形块，而非油脂般连续反射。
- 自然、明确成年的人体比例；服装有现实层搭与结构，不使用写真或 pin-up 姿态。
- 默认低至中饱和色，优先形成角色自身稳定的 3–5 色色板。

## 全局禁止项

```text
glossy skin, oily highlights, airbrushed gradients, painterly rendering,
3D render, photorealism, Western superhero/comic anatomy,
voluptuous exaggeration, pin-up pose, excessive bloom, lens flare,
identity drift, inconsistent bangs, redesigned face or outfit
```

## 参考图

- `references/manga-linework-reference.png`：只参考日本漫画线条、黑白块面与脸部概括。
- `references/anime-flat-color-reference.jpg`：只参考日系动画平涂、简洁高光与自然表情。

参考图只用于提取一般绘画语言。禁止复制其中的具体角色、猫耳、服装、姿势、构图或可识别设计。

## 角色身份母版制度

每个角色必须先建立一张经确认的角色设定页，包含全身、半身和表情研究。之后所有生成必须：

1. 把身份母版作为角色身份的唯一参考。
2. 重复声明必须保留的脸型、刘海、发型轮廓、瞳色、标志配饰、身材比例和服装结构。
3. 表情差分优先对同一张标准立绘做局部编辑，禁止重新生成完整身体。
4. 事件 CG 必须同时提供所有出场人物的身份母版。
5. 封面最后制作，并以已经验收的立绘和 CG 为依据。

## 提示词基线

```text
Style: clean contemporary Japanese anime production artwork; thin confident ink lines;
mostly flat cel colors; one hard-edged shadow tone; minimal highlights; matte skin;
restrained facial construction; natural adult proportions; hand-drawn 2D appearance.

Identity: use the supplied approved canonical character sheet as the only identity source.
Preserve exactly: facial geometry, eye shape and color, bangs, hair silhouette and length,
signature accessory, body proportions, and outfit construction.

Avoid: glossy skin, oily highlights, airbrushed gradients, painterly rendering, 3D look,
photorealism, Western comic anatomy, voluptuous exaggeration, pin-up pose, bloom,
lens flare, identity drift, face redesign, clothing redesign.
```
