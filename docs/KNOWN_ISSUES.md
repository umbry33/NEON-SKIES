# 已知问题与风险

本文件只记录已从代码、Git 或可复现测试确认的问题；没有证据的猜测不写入。最后验证时间：2026-08-06。

## 测试基线失配（可复现）

复现：运行 `start-server.ps1`，打开 `http://localhost:5500/tests/index.html`。测试页显示 `Some tests failed`，当前观察到 8 个失败断言，归为 6 类：

1. 未启用敌机百科断言仍要求独立的 `unreleased-enemies` 分区；当前百科把 10 个原型敌机并入敌机档案，另提供 `getUnreleasedEnemyArchiveEntries()` 数据。
2. 关卡断言仍要求 50 关；当前 `LEVELS` 实际为 100 关。
3. 光锥之外普通奖励池断言仍排除当前奖励策略允许的内容，产品规则与测试断言未重新确认。
4. 新武器数量断言没有包含 v0.7.0 新增模块。
5. 深渊花冠的 3 个测试调用与当前武器接口不匹配，触发 `Cannot read properties of undefined (reading 'filter')`。
6. 合成模块独立机制断言仍按旧的“玩家禁用”状态判断，和当前 `FUSION_MODULES`/`PLAYER_DISABLED_MODULE_IDS` 数据变化不一致。

这些失败目前更像测试夹具/产品规则滞后，而不是已确认的玩家运行时 Bug；在修复前不能把测试页称为全绿。处理时要逐项决定：更新测试以反映当前设计，还是恢复代码到测试期望，不可为了绿灯盲目删掉断言。

## 玩家可见文案与数据不一致

- `src/config/beyond-events-config.js` 当前有 34 个事件，但 `index.html` 和 `src/config/encyclopedia-config.js` 的部分玩家文案仍写“30 个”。这是可见文案问题，修正前需确认版本归属，避免把它写入未经确认的 CHANGELOG。

## 合成系统入口暂不开放

- `src/config/module-config.js`、`src/systems/BeyondLightConeSystem.js` 和 `src/ui/BeyondLightConeUI.js` 保留合成/分解实现，但 `installBeyondLightConeUI()` 中会移除 `#beyond-fusion-button`，玩家当前无法从航程 UI 进入。
- 风险：未来 AI 可能看到完整实现就误以为合成已经开放；功能文档必须保持“实现但未开放”。开放前需验证库存消耗、分解返还、存档兼容和移动端布局。

## 发布包可能过期

- `publish-package/` 和 `neon-skies-publish.zip` 被 `.gitignore` 忽略，当前文件时间早于 v0.7.0 源码；它们不能作为当前版本证据。
- 临时处理：运行 `powershell -ExecutionPolicy Bypass -File .\package-release.ps1 -FolderOnly` 重新生成，再检查包内 `index.html`、`styles.css`、`src/` 和 `assets/`。
- 注意：该脚本会删除并重建生成目录，操作前确认没有需要保留的手工文件。

## 待确认而非已确认 Bug

- 最低浏览器版本、移动端具体机型、横竖屏策略、性能预算、设置项是否跨刷新保留：当前没有正式兼容矩阵，均标“待确认”。
- 任何仅凭静态代码推测、但没有复现步骤的性能或存档问题，不应追加到本文件。
