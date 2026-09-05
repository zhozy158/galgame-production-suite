# __GAME_TITLE__

项目 ID：`__GAME_SLUG__`

- `game/config.js`：人物、相册、结局、存档命名空间
- `game/story.js`：剧情场景和分支
- `theme.css`：本作色彩、封面和背景
- `assets/`：只存放本作素材
- `art/`：提示词、生成记录和素材清单
- `docs/`：角色圣经、剧情大纲和制作说明

完成修改后，在 `galgame` 根目录运行：

```powershell
npm run validate-game -- games/__GAME_SLUG__
```
