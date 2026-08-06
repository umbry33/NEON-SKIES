# 正式功能清单

状态含义：

- **已完成**：当前代码已有入口或可直接体验。
- **实现但未开放**：代码/配置存在，但当前玩家入口被隐藏或规则明确禁止使用。
- **未实现**：当前代码没有对应玩家功能。

## 已完成

| 功能 | 玩家体验 | 实现位置 | 状态/已知问题 |
| --- | --- | --- | --- |
| 主菜单与设置 | 进入模式、改装、百科、更新日志；调节伤害跳字、震动、倒计时、音乐和音效 | `index.html`、`src/ui/UI.js`、`src/systems/SoundSystem.js` | 已完成；部分设置持久化策略待确认 |
| 15×15 机体装配 | 拖放多单元模块，预览占位，校验边界/重叠/核心连通性 | `src/config/module-config.js`、`src/systems/ModuleSystem.js`、`src/ui/UI.js` | 已完成；旋转未实现 |
| 快捷装配/撤销/删除 | 快捷选择模块，重复放置；撤销历史；拖到删除区 | `src/ui/UI.js` | 已完成；需持续做移动端回归 |
| 普通机体配置码 | 复制和导入包含位置、旋转、模块 share code 的配置码，并校验 checksum | `src/systems/LoadoutCodec.js` | 已完成；不要改 ID/share code |
| 无尽模式 | 自动生成基础敌机的持续战斗 | `src/core/Game.js`、`src/systems/EnemySpawner.js` | 已完成 |
| 100 关卡模式 | 100 个可选战区，每 5 关 Boss，26 关后环境，51 关后原型敌池 | `src/config/level-config.js`、`src/config/enemy-config.js`、`src/core/Game.js` | 已完成；测试页已按当前 100 关规则同步 |
| 躲避弹幕模式 | 简单/困难/噩梦三档，持续生成多种弹幕，按存活和躲避计分 | `src/config/dodge-config.js`、`src/core/Game.js`、`src/entities/Projectile.js` | 已完成 |
| 新手教程 | 装配、移动、技能和 800 分训练流程 | `src/ui/UI.js`、`src/core/Game.js` | 已完成 |
| 敌机与 Boss | 基础敌机、5 种高级敌机、10 种后期原型敌机、标准 Boss 和 8 种 Boss 变体 | `src/config/enemy-config.js`、`src/entities/Enemy.js`、`src/core/Game.js` | 已完成；原型敌机在当前配置中已于 51 关后启用，不应再写成全部未启用 |
| 特殊环境 | 日冕风暴、离子迷雾、星辉潮汐、引力裂隙及 Beyond 专属环境 | `src/config/environment-config.js`、`src/core/Game.js` | 已完成；具体浏览器性能基线待确认 |
| 模块系统 | 自动武器、技能模块、属性修正、元素、稀有度、单模块限制和 4 个连携能力 | `src/config/module-config.js`、`src/config/synergy-config.js`、`src/systems/WeaponSystem.js`、`SkillSystem.js` | 已完成；行为边界以配置和测试为准 |
| 光锥之外航程 | 随机路线、四档难度、多章节、节点、事件、商店、回复、库存、奖励和 Boss | `src/systems/BeyondLightConeSystem.js`、`src/ui/BeyondLightConeUI.js`、`src/config/beyond-*` | 已完成；当前事件档案为 34 个 |
| 光锥之外存档码 | 编码随机种子、地图、路线、库存、机体、连携和战斗进度，复制/导入后继续 | `src/systems/BeyondLightConeSystem.js` | 已完成；不是自动存档 |
| 合成数据与系统 | 存在合成配方、库存合成/分解和合成模块数据 | `src/config/module-config.js`、`BeyondLightConeSystem.js`、`BeyondLightConeUI.js` | 实现但未开放；`BeyondLightConeUI.js` 当前移除合成入口 |
| Canvas 图形与音频 | 几何图标、特效、背景、合成音乐、音效和音量控制 | `src/rendering/ModuleRenderer.js`、各实体/场景 renderer、`SoundSystem.js` | 已完成；无外部媒体资源 |
| 游戏内百科与更新日志 | 查看模块、敌机、Boss、环境、光锥之外规则和历史更新记录 | `src/config/encyclopedia-config.js`、`src/ui/UI.js`、`index.html` | 已完成；部分历史文案需持续核对 |

## 标准装配内容

当前改装仓库由配置渲染为 26 个玩家可选模块；完整模块/字段清单见 `docs/DATA_MODEL.md`。新增模块必须同时更新百科、图标、行为和测试，不要只更新 README。

## 未实现或不应误写成已完成

故事、联网、账号、排行榜、数据库、本地自动存档、多个本地机体槽、模块掉落、战斗中替换、模块旋转和正式发布浏览器兼容矩阵均未被当前代码证明为已完成。
