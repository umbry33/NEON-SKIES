# AI 工作入口

任何 AI 修改代码之前，必须先阅读 AGENTS.md、AI_HANDOFF、开发规范以及当前任务相关文档。

本项目是 Neon Skies：一个无构建步骤、无第三方运行时依赖的原生 HTML5 Canvas 纵向射击游戏。当前代码基线为 v0.7.0，入口是 `index.html`，主逻辑从 `src/main.js` 启动。

## 必读文档

按以下顺序阅读：

1. `AGENTS.md`：本文件，了解协作边界。
2. `docs/AI_HANDOFF.md`：当前状态、最近变更、风险和下一步。
3. `docs/DEVELOPMENT_RULES.md`：修改原则、验证要求和文档同步规则。
4. `docs/ARCHITECTURE.md`：真实模块边界、数据流和入口。
5. `docs/FEATURES.md`、`docs/DATA_MODEL.md`：已有功能与数据兼容约束。
6. `docs/KNOWN_ISSUES.md`、`docs/ROADMAP.md`：已验证问题和后续范围。
7. `docs/TASK_TEMPLATE.md`：新任务的记录格式；涉及 UI 或玩法时再阅读相关代码。

文档总索引见 `docs/README.md`。玩家运行方式见 `README.md`，更新日志规则见 `docs/CHANGELOG_GUIDELINES.md`。

## 项目协作原则

- 默认使用中文，语气务实；代码中的既有英文标识和界面装饰文字可以保留。
- 先分析影响范围，再做最小修改。修复一个问题不能破坏其它模式、旧配置或移动端操作。
- 优先数据驱动和模块化；新增模块、敌机、关卡、环境或事件时，先查找对应 `src/config/` 配置和现有行为工厂。
- 保持项目随时可运行：这是浏览器原生 ES Module 项目，不要引入未经确认的构建工具、依赖或服务端框架。
- 代码、测试、发布包、文档各自承担职责；不要把临时调试代码当正式实现，也不要生成无意义 BAT 文件。
- 不能从代码或 Git 证明的内容必须写“待确认”，禁止猜测并写成已实现功能。

## 点击与触控交互强制规范

本节是项目长期规则，适用于所有新增、修改或修复的按钮、菜单、UI 和 Canvas 交互区域；不要求必须调用 `fix-input` Skill 才生效。用户说“修复点击”“修复触控”“按钮点不了”“点击失效”或“触摸失效”时，必须优先使用 `.agents/skills/fix-input/SKILL.md` 执行。

### 1. 默认交互语义

- 本项目同时支持 Windows 电脑端和手机触屏端。
- 普通按钮统一采用“按下 → 保持 → 松开 → 确认触发”的点击/tap 语义。
- 鼠标使用 `click` 或等价的松开确认逻辑；触屏使用与 `click` 等价的 tap 逻辑。
- 禁止把普通按钮的主要操作改成 `pointerdown`、`mousedown` 或 `touchstart` 直接执行；按下事件只能用于视觉反馈、记录指针状态或记录拖拽起点，除非功能明确要求按下瞬间触发。

### 2. 保持原有 UI

- 修复点击/触控时，禁止通过放大按钮、改变宽高、布局、位置、字体、间距、页面比例或视觉设计来解决问题。
- 只有在确认根因确实是命中区域过小后，才允许使用不改变外观和布局的透明 hit area/hitbox。
- 不得把扩大点击区域当作所有点击 Bug 的默认方案。

### 3. 先定位根因

按钮无法点击时，按以下顺序检查并记录证据：透明元素/Canvas 覆盖、`z-index`、`pointer-events`、重复监听器、touch/mouse/pointer 冲突、错误的 `preventDefault()`/`stopPropagation()`、拖拽吞掉 click/tap、Canvas 命中检测、点击过程中重建 DOM，以及移动端默认手势冲突。优先修复根因，不得用改变交互方式绕过问题。

### 4. 最小修改与平台兼容

- 只改受影响的按钮、CSS 层级或事件链；不要为了一个按钮重写整个输入系统，也不要让 A 的修复改变 B 的交互。
- 每次修改都必须同时考虑电脑端的鼠标点击、松开、拖拽和 UI 点击，以及手机端的单指 tap、按下、移动、松开、页面滚动和游戏触控。
- 修复一个平台时不得破坏另一个平台已正常工作的输入逻辑。

### 5. 单次触发与拖拽判定

- 不得因同时监听 `touchend + click` 或 `pointerup + click` 造成一次操作触发两次；能用 Pointer Events 统一鼠标和触摸时优先使用统一方案。
- 同时支持点击和拖拽的元素必须设置合理移动阈值：轻微抖动不能进入拖拽，未超过阈值时松开仍判定为点击。

### 6. 完成标准与不确定时的停止条件

“按钮能触发”不等于修复完成。必须同时满足：电脑端和手机端可用、不重复触发、不误触、不改变原有视觉和点击手感、不把松开触发改成按下触发、不影响其他按钮和拖拽、不引入新的输入冲突。

如果无法可靠确定根因，不得连续试不同事件模型、不断扩大按钮或重写输入系统；必须停止修改并报告已观察现象、已定位事件链、最可能原因和建议修改位置，等待用户决定。

## 禁止或需要确认的修改

- 不要直接修改 `publish-package/` 或 `neon-skies-publish.zip`；它们是被 `.gitignore` 忽略的生成物，应由 `package-release.ps1` 重新生成。
- 不要在未经确认的情况下修改 `CHANGELOG.md`。先列出拟写入的完整条目，等待确认后再写入。
- 不要随意修改模块 `id`、`shareCode`、存档编码、存档字段、旧配置兼容逻辑；这会影响已有配置码和航程存档码。
- 不要删除现有文档、测试或资源占位说明。若内容过期，应在原职责文档中修正，并在 `docs/KNOWN_ISSUES.md` 记录仍未解决的代码问题。
- 不要把未开放的合成系统、未启用敌机原型或路线图项目写成玩家当前可用功能。
- 不要使用 `npm` 或凭空添加 `package.json`；当前项目没有 npm 依赖和构建流程。

## 推荐开发流程

1. 阅读必读文档，查看 `git status --short`、最近提交和相关历史。
2. 明确目标、范围、禁止修改项和验收标准；复杂任务先复制 `docs/TASK_TEMPLATE.md`。
3. 搜索真实入口、配置、调用方和测试，评估对其它模式的影响。
4. 做最小、可回滚的修改；新内容优先放入配置文件，不要在 `Game.js` 中堆叠大量模块特判。
5. 运行必要检查：`node --check`、本地服务器、`tests/index.html`，并按 `docs/TEST_CHECKLIST.md` 做对应手动流程。
6. 检查浏览器控制台、桌面操作、触摸/移动端布局、暂停恢复、配置码和旧功能；每次正式发布都必须记录一次手机端触控回归，至少覆盖主菜单、改装界面机库按钮、弹窗按钮、触摸拖动和技能按钮。
7. 同步所有受影响文档；文档与代码冲突时，以代码和 Git 为证据修正文档，未知处标“待确认”。
8. 只提交本次任务相关文件，提交前再次检查敏感内容和 `git diff --check`。

## Git 规范

- 日常提交使用清晰的中文类型前缀，例如 `feat:`、`fix:`、`docs:`、`test:`、`chore:`；正式发布沿用项目现有的 `发布 vX.Y.Z：...` 格式。
- 提交信息必须描述实际修改，不得夸大未验证内容。
- 默认只做本地提交，不推送、不部署；发布操作必须得到明确授权并遵循 `.agents/skills/publish-release/`。
- 本次文档系统建立任务的指定提交信息为：`docs: establish and synchronize AI development documentation`。

## 完成后必须同步的文档

按影响范围更新：

- 新功能或玩法：`docs/FEATURES.md`、`docs/ROADMAP.md`、`docs/AI_HANDOFF.md`、相关架构/数据文档，以及经确认的 `CHANGELOG.md`。
- 架构、入口、模块边界：`docs/ARCHITECTURE.md`、`docs/TECHNICAL_DECISIONS.md`、`README.md`（若运行或目录变化）。
- 数据字段、模块、敌人、存档或数值：`docs/DATA_MODEL.md`、`docs/FEATURES.md`、`docs/KNOWN_ISSUES.md`（若有兼容风险）。
- 测试流程或已知失败：`docs/TEST_CHECKLIST.md`、`docs/KNOWN_ISSUES.md`、`docs/AI_HANDOFF.md`。
- 任何正式开发完成后至少检查 `AGENTS.md`、`README.md`、`docs/AI_HANDOFF.md` 和受影响专题文档是否仍准确。

## 测试要求

项目没有 npm test。使用：

```powershell
powershell -ExecutionPolicy Bypass -File .\start-server.ps1
```

然后打开 `http://localhost:5500/`，逻辑检查页是 `http://localhost:5500/tests/index.html`。命令必须以当前脚本和代码为准，不要虚构其它命令。测试页必须显示 `All tests passed`；若失败，先按 `docs/TEST_CHECKLIST.md` 区分代码回归、过期断言和测试夹具问题。

## 更新日志规则

1. 只记录自上一版本发布后、玩家能实际体验到的真实新增、修改和修复。
2. 不记录内部测试、调试、重构、变量修改、临时方案或实验性工作。
3. 每条必须能对应本次实际代码或资源改动；无法确认归属时默认不写。
4. 修改 `CHANGELOG.md` 前必须先列出全部拟写入内容并等待用户明确确认。

完整规则见 `docs/CHANGELOG_GUIDELINES.md`。
