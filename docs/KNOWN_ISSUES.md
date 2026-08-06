# 已知问题与风险

本文件只记录已从代码、Git 或可复现测试确认的问题；没有证据的猜测不写入。最后验证时间：2026-08-06。

## 已解决：测试基线同步

本轮已按当前代码和已确认产品规则更新 `tests/logic-tests.js`：100 个关卡、每 5 关一个 Boss、34 个光锥之外事件、当前武器配置，以及“合成系统不正式开放”的玩家边界均已纳入断言。复现：运行 `start-server.ps1`，打开 `http://localhost:5500/tests/index.html`，当前结果为 `All tests passed`。

以后若测试失败，必须先区分代码回归、过期断言和测试夹具缺失；不能为了绿灯删除断言。

## 合成系统入口暂不开放

- `src/config/module-config.js`、`src/systems/BeyondLightConeSystem.js` 和 `src/ui/BeyondLightConeUI.js` 保留合成/分解实现，但 `installBeyondLightConeUI()` 中会移除 `#beyond-fusion-button`，玩家当前无法从航程 UI 进入。
- 已确认：合成系统不正式开放。未来 AI 不能因为看到完整实现就开放该功能；功能文档必须保持“实现但未开放”。除非重新获得明确产品决策，否则不应把它列入玩家功能或 Roadmap 的开放项。

## 待确认而非已确认 Bug

- 最低浏览器版本、移动端具体机型、横竖屏策略、性能预算、设置项是否跨刷新保留：当前没有正式兼容矩阵，均标“待确认”。
- 任何仅凭静态代码推测、但没有复现步骤的性能或存档问题，不应追加到本文件。
