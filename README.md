# Galgame 制作套件

这个目录不是某一部游戏，而是所有 Galgame 共用的制作工作区。目标是：公共能力只实现一次，每部作品的代码、剧本、美术与生成记录彼此隔离，并能稳定复用同一套框架和画风规范。

## 目录职责

```text
galgame/
├─ framework/                 # 只放跨作品公共引擎与默认界面
│  ├─ engine/vn-engine.js
│  └─ styles/vn-core.css
├─ games/                     # 每部游戏一个独立目录
│  ├─ catalog.json            # 启动器作品目录
│  └─ summer-heart-equation/  # 第一部作品
├─ templates/game-starter/    # 新作模板
├─ art-direction/             # 全局画风、参考图与通用提示词规则
├─ tools/                     # 新建项目和自动校验工具
├─ docs/                      # 跨作品制作流程
└─ index.html                 # 作品库启动页
```

依赖方向必须保持单向：`games → framework`。公共框架永远不能反向引用某一部游戏的素材或剧情。

## 启动作品库

在本目录运行：

```powershell
npm start
```

打开 <http://127.0.0.1:4173>。也可以直接双击具体作品的 `index.html`，单部游戏不依赖构建工具。

## 创建下一部游戏

```powershell
npm run new-game -- moonlit-letter "月下书简"
```

命令会从模板创建 `games/moonlit-letter/`，替换标题和项目 ID，并加入作品目录。它不会复制或修改其他游戏。

## 校验

```powershell
npm test
npm run validate-game -- games/summer-heart-equation
```

第一条命令自动发现并校验所有游戏；第二条只校验指定作品。校验范围包括素材引用、角色、背景、跳转、条件分支、不可达场景、循环、死路、结局和体验时长估算。

## 分层原则

- `framework`：存档、读取、自动播放、快进、履历、相册、条件分支和 UI 布局。
- `games/<id>/game`：这部作品独有的配置与剧情图。
- `games/<id>/theme.css`：本作配色、背景、封面覆盖；不要修改公共 CSS 来适配单一作品。
- `games/<id>/assets`：只存本作实际运行素材。
- `games/<id>/art`：提示词、生成清单、种子信息或生成批次记录。
- `games/<id>/docs`：角色圣经、剧情大纲、路线说明和验收记录。
- `art-direction`：所有作品共同遵守的基础美术语言，不放某个角色的专属设定。

详细说明见 [公共框架](framework/README.md)、[数据格式](framework/DATA_FORMAT.md)、[全局美术规范](art-direction/STYLE_GUIDE.md) 和 [生产流程](docs/PRODUCTION_WORKFLOW.md)。
