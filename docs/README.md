# Neon Skies 文档索引

这些文档用于让新的 AI、开发者或未来的自己在没有聊天记录的情况下恢复项目上下文。事实优先级为：当前代码与可复现测试 > Git 历史 > 本文档中的总结 > 未确认计划。

| 文档 | 职责 |
| --- | --- |
| [`AI_HANDOFF.md`](AI_HANDOFF.md) | 每次换 AI 时先读的当前状态、风险和下一步 |
| [`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md) | 项目定位、玩法、风格、平台和游戏循环 |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | 入口、模块边界、状态管理、渲染和数据流 |
| [`DEVELOPMENT_RULES.md`](DEVELOPMENT_RULES.md) | 修改原则、影响分析、验证和文档同步 |
| [`FEATURES.md`](FEATURES.md) | 玩家可体验的正式功能及实现位置 |
| [`DATA_MODEL.md`](DATA_MODEL.md) | 配置、模块、敌人、存档码和兼容约束 |
| [`ROADMAP.md`](ROADMAP.md) | 已完成、开发中、下一步、长期计划和暂缓项 |
| [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md) | 已验证的 Bug、测试失配、兼容与发布风险 |
| [`CHANGELOG_GUIDELINES.md`](CHANGELOG_GUIDELINES.md) | 更新日志的事实与确认规则 |
| [`TASK_TEMPLATE.md`](TASK_TEMPLATE.md) | 新任务统一记录模板 |
| [`TEST_CHECKLIST.md`](TEST_CHECKLIST.md) | 启动、交互、模式、移动端和发布前检查 |
| [`TECHNICAL_DECISIONS.md`](TECHNICAL_DECISIONS.md) | 长期设计决策、替代方案和修改条件 |

## 当前基线

- Git 分支：`main`；代码基线提交：`317207a`，提交标题为 `发布 v0.7.0：新增模块与战斗机制优化`。本次文档提交以后的 HEAD 以 Git 历史为准。
- 项目类型：原生 HTML5/CSS/ES Modules，无 `package.json`、无 npm 构建和无数据库。
- 当前测试基线已按 v0.7.0 规则同步并通过；`publish-package/` 与 `neon-skies-publish.zip` 为忽略的生成物，最近一次已依据当前源码重新生成。
- 兼容性采用轻量冒烟标准：以用户已确认的 GitHub 部署版本在一台手机和一台电脑上的实际运行结果为准，不维护复杂设备矩阵或固定性能预算。
- 最后一次文档审计：2026-08-06（Asia/Shanghai）。

## 维护规则

正式开发完成后，先更新 `AI_HANDOFF.md`，再按改动范围更新架构、功能、数据、路线图、已知问题和测试清单；如果是玩家可感知的版本改动，先向用户列出 `CHANGELOG.md` 拟写内容并等待确认。
