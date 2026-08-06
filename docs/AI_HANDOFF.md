# AI_HANDOFF

更新日期：2026-08-06

## 当前状态

- 项目：Neon Skies，Git 分支 `main`。
- 最近代码提交：`317207a`，`发布 v0.7.0：新增模块与战斗机制优化`；本次文档提交后的 HEAD 以 Git 历史为准。
- 当前阶段：v0.7.0 内容扩展完成后的持续开发/稳定化阶段；文档系统已建立，测试基线和发布包仍需同步。
- 技术形态：原生 HTML5/CSS/ES Modules + Canvas 2D + Web Audio，无 npm 依赖、无构建步骤、无数据库。
- 工作区：本次审计开始时干净；生成的 `publish-package/` 和 ZIP 被 Git 忽略，不能当作源码基线。

## 最近完成

- v0.7.0 已加入天幕协议、黑曜波束、幽蓝奇点、星蚀脉冲、星环、火羽及暗蚀连携。
- 当前配置确认 100 个关卡、20 个标准 Boss 关、34 个深空事件、4 档光锥之外难度、3 档躲避弹幕难度。
- 已建立并同步根目录入口文档和 `docs/` 专题文档。

## 当前任务与下一步

本轮工程检查的文档工作已完成。下一项优先任务不是继续堆新内容，而是：

1. 逐项处理 `docs/KNOWN_ISSUES.md` 中的测试失败，先确认产品规则，再同步测试。
2. 决定光锥之外合成系统是否开放；不要仅凭已有代码自行开放。
3. 修正 34 个事件仍显示 30 个的玩家文案。
4. 修改源码后重新生成并检查发布包。
5. 做桌面/触摸/移动端和性能基线测试。

## 风险

- `tests/logic-tests.js` 当前不全绿，旧断言与 v0.6/v0.7 代码不同步。
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

然后阅读 `AGENTS.md`、`docs/DEVELOPMENT_RULES.md`、`docs/ARCHITECTURE.md`、`docs/KNOWN_ISSUES.md`，再打开主页面和测试页。若任务涉及功能，继续阅读 `FEATURES.md` 和 `DATA_MODEL.md`。

## 什么时候更新本文件

每次正式开发、修复、测试基线变化、风险变化、版本发布或任务交接结束时更新。至少写清：当前提交/阶段、最近完成、当前任务、下一步、风险、验证结果和遗留问题。不要把聊天记录当唯一状态来源。
