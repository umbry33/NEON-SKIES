# AI_HANDOFF

更新日期：2026-08-06

## 当前状态

- 项目：Neon Skies，Git 分支 `main`。
- 最近代码提交：`317207a`，`发布 v0.7.0：新增模块与战斗机制优化`；本次文档提交后的 HEAD 以 Git 历史为准。
- 当前阶段：v0.7.0 内容扩展完成后的持续开发/稳定化阶段；文档系统、测试基线和当前发布包均已同步。
- 技术形态：原生 HTML5/CSS/ES Modules + Canvas 2D + Web Audio，无 npm 依赖、无构建步骤、无数据库。
- 工作区：本次审计开始时干净；生成的 `publish-package/` 和 ZIP 被 Git 忽略，不能当作源码基线。

## 最近完成

- v0.7.0 已加入天幕协议、黑曜波束、幽蓝奇点、星蚀脉冲、星环、火羽及暗蚀连携。
- 当前配置确认 100 个关卡、20 个标准 Boss 关、34 个深空事件、4 档光锥之外难度、3 档躲避弹幕难度。
- 已建立并同步根目录入口文档和 `docs/` 专题文档。
- 已修正事件档案 30/34 数量文案，并用当前源码重建发布目录与 ZIP。

## 最近验证

- 逻辑测试页最近一次运行结果为 `All tests passed`，共 70 项测试。
- 源码 33 个 JS 文件和发布目录 32 个 JS 文件均通过 `node --check`。
- 发布目录共 38 个源/配置/资源文件与工作区对应文件哈希一致；本地测试地址返回 HTTP 200。

## 当前任务与下一步

本轮工程检查和已确认问题修复已完成。下一项优先任务不是继续堆新内容，而是：

1. 保持光锥之外模块合成系统不正式开放；不要仅凭已有代码自行开放。
2. 做桌面/触摸/移动端和性能基线测试。

## 风险

- `tests/logic-tests.js` 已按当前 v0.7.0 规则同步，浏览器测试页当前显示 `All tests passed`；后续版本改动必须先更新对应断言再判断回归。
- 模块合成实现存在但 UI 入口被主动移除；它不是当前正式开放功能。
- 配置码和航程存档依赖模块 ID、share code、位置、旋转和字段兼容；不要做无理由的标识清理。
- `CHANGELOG.md` 有项目级确认规则，修改前必须先列完整候选条目并等待用户确认。
- UI 有动态注入元素，不能只检查 `index.html` 静态 ID；要同时检查 `UI.js` 和 `BeyondLightConeUI.js`。

## 建议新 AI 先检查

```powershell
git status --short
git log --oneline -20
powershell -ExecutionPolicy Bypass -File .\start-server.ps1
```

然后阅读 `AGENTS.md`、`docs/DEVELOPMENT_RULES.md`、`docs/ARCHITECTURE.md`、`docs/KNOWN_ISSUES.md`，再打开主页面和 `tests/index.html`。若任务涉及功能，继续阅读 `FEATURES.md` 和 `DATA_MODEL.md`；如果修改了规则或断言，必须同时更新 `docs/TEST_CHECKLIST.md`。

## 什么时候更新本文件

每次正式开发、修复、测试基线变化、风险变化、版本发布或任务交接结束时更新。至少写清：当前提交/阶段、最近完成、当前任务、下一步、风险、验证结果和遗留问题。不要把聊天记录当唯一状态来源。
