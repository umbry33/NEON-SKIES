# Neon Skies

Neon Skies 是一个原生 HTML5 Canvas 纵向射击游戏。项目没有 npm 依赖、没有构建步骤，玩家通过 15×15 核心连接网络拖拽模块，组合出自己的机体并进入战斗。

## 运行、调试与构建

直接打开 `index.html` 可以尝试运行；如果浏览器限制 `file://` 下的 ES Module，使用真实存在的本地服务器脚本：

```powershell
powershell -ExecutionPolicy Bypass -File .\start-server.ps1
```

然后打开 `http://localhost:5500/`。逻辑检查页为 `http://localhost:5500/tests/index.html`。项目没有 `package.json`，不要运行或添加未经确认的 npm 构建命令。

正式发布前由以下脚本从源文件重新生成发布目录和 ZIP；普通开发不强制生成发布物：

```powershell
powershell -ExecutionPolicy Bypass -File .\package-release.ps1
```

仅检查发布目录而不生成 ZIP 时，可使用 `-FolderOnly`。

GitHub Pages 通过 `.github/workflows/deploy-pages.yml` 从 `main` 分支自动部署完整源码；推送后等待 GitHub Actions 完成即可更新线上站点。手动上传到其他静态托管服务时，仍需先生成完整的 `publish-package/` 或 ZIP，不能只替换单个 JavaScript 文件。用户已确认当前 GitHub 部署版本在手机和电脑上都能正常运行。

## 技术与平台

- 技术栈：HTML、CSS、原生 JavaScript ES Modules、Canvas 2D、Web Audio API。
- 运行要求：支持 ES Modules、Canvas 2D、Pointer Events 和 Web Audio API 的现代浏览器。
- 目标平台：桌面浏览器与移动浏览器；用户已确认当前 GitHub 部署版本在手机和电脑上均可正常运行。本项目不承诺完整浏览器版本矩阵。
- 当前资源：飞机、敌机、模块、子弹和特效主要由 Canvas 几何绘制；背景音乐使用项目根目录的 `梦见天际 Dreaming the Skies.mp3`，战斗音效由 Web Audio API 合成。

## 当前玩法

- 无尽模式：持续生成敌机的经典战斗。
- 关卡模式：100 个战区，每 5 关为 Boss 关；关卡越高，敌机池、生命、速度、伤害与生成压力逐步提升，26 关后可出现特殊环境，51 关后加入 10 个已启用的原型敌机。
- 躲避弹幕模式：简单、困难、噩梦三档，只生成持续变化的危险弹幕，按存活时间和躲过的弹幕计分。
- 新手教程：引导装配、移动、释放技能和完成 800 分训练目标。
- 光锥之外：独立的随机章节航程，包含战斗、精英、商店、回复、事件和 Boss 节点；支持四档难度、局内库存、路线、金币、模块成长、连携能力和航程存档码。
- 游戏百科与更新日志：从游戏内查看模块、敌机、Boss、环境、光锥之外规则和历史更新记录。

## 操作方式

- 键盘：WASD 或方向键移动，数字键 1–9 释放主动技能。
- 鼠标/触摸：在战斗画布上拖动移动；技能按钮位于战斗界面左下区域。
- 装配：从模块仓库拖到核心网络；可开启快捷装配，也可拖动已安装模块重新摆放或拖入删除区。
- 装配校验：模块不能重叠，必须落在 15×15 网格内，并通过核心连通性校验；最多装配 9 个技能模块，普通模块没有总数量上限，但单个模块仍可能有自身限制。
- 机库：普通模式提供 10 个本地机体槽位，当前槽位会自动保存，可在改装界面切换；点击机体名称即可重命名，也可在槽位内直接导入/导出配置码；光锥之外不使用机库。
- 本地存档：浏览器会自动保存普通机体和未完成的光锥之外航程；换设备或清理浏览器数据时，仍需使用配置码/航程存档码迁移。
- 暂停：战斗 HUD 的暂停按钮提供继续和返回选项，返回路线图/主菜单需要二次确认。

## 目录结构

```text
index.html                 页面骨架、菜单、装配、战斗 HUD
styles.css                 全局与移动端视觉样式
src/main.js                应用入口，组装 UI、输入和 Game
src/config/                模块、敌机、关卡、环境、事件和模式配置
src/core/Game.js           游戏状态、主循环、模式流程和 Canvas 渲染
src/entities/              玩家、敌机、子弹、分身、僚机实体
src/systems/               输入、装配、武器、技能、碰撞、音效、航程和本地存档系统
src/ui/                    菜单、改装界面、百科和光锥之外界面
src/rendering/             模块图标和 Canvas 几何绘制
tests/                     浏览器逻辑测试页与测试脚本
assets/                    资源策略说明；背景音乐位于项目根目录
docs/                      AI 长期维护文档
```

## 新增内容的入口

- 新模块：先改 `src/config/module-config.js`；尽量复用 `src/systems/WeaponSystem.js` 中现有 behavior，只有新机制确实需要时才扩展行为工厂，并同步 `ModuleRenderer.js`、百科与测试。
- 新敌机/Boss：改 `src/config/enemy-config.js`，必要时扩展 `src/entities/Enemy.js`、武器系统和百科配置。
- 新关卡/环境：改 `src/config/level-config.js`、`src/config/environment-config.js`，并检查 `Game.js` 的生成、HUD 和结算逻辑。
- 新光锥之外内容：改 `src/config/beyond-light-cone-config.js`、`beyond-events-config.js` 与 `BeyondLightConeSystem.js`，UI 在 `src/ui/BeyondLightConeUI.js`。
- 新主动技能：配置 `module-config.js`，在 `SkillSystem.js` 分发，并在 `Game.js` 实现状态、更新和渲染。

完整架构、数据兼容、测试与 AI 交接规则见 [`docs/README.md`](docs/README.md)。

## 当前限制

- 没有故事、账号、联网、排行榜或数据库。
- 本地自动存档只保存在当前浏览器设备；普通机体配置码和光锥之外航程存档码仍用于备份、分享和跨设备迁移。
- 合成系统暂时停止开发：相关旧配置和系统代码仅供内部维护，当前不对玩家开放，也不存在“合成模块”这一玩家模块定义；它们不会进入正常模块库、百科、商店或光锥之外奖励池。
- `publish-package/` 和 `neon-skies-publish.zip` 是忽略的生成物；正式发布前必须重新生成，普通开发不强制生成。
- `tests/index.html` 是当前逻辑检查入口，必须显示 `All tests passed`；失败时按 `docs/TEST_CHECKLIST.md` 区分代码回归、过期断言和测试夹具问题。
