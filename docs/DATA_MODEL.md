# 数据结构与兼容约束

## 核心常量

来源：`src/config/game-config.js`、`module-config.js`、`level-config.js`。

- Canvas 逻辑尺寸：480×854。
- 玩家基础值：生命 100、移动速度 270、基础攻速 1、攻速上限 3。
- 核心网络：15×15，核心位置 `(7, 7)`，核心模块 `core-stellar`。
- 普通模式最多 9 个技能模块；普通自动模块没有全局总数量上限，但模块自身可以有 `maxCount`。
- 关卡配置由 `Array.from({ length: 100 })` 生成；每 5 关 `boss: true`，26 关后环境字段启用。

## 模块对象

模块定义位于 `src/config/module-config.js`，常见字段：

```js
{
  id, shareCode, name, type, description, rarity, icon,
  element, footprint: { cells: [[x, y], ...] },
  modifiers, skill, behavior, combat, maxCount,
  beyondFusionOnly, fusionRecipe
}
```

主动技能的 `skill` 可包含 `duration`；需要独立充能的技能还可配置 `maxCharges`、`chargeInterval`，运行时状态由 `SkillSystem` 保存，不写入配置码。

当前源数据包含 34 个 `ALL_MODULES` 条目（含核心、玩家模块和暂停开发的内部/禁用定义）；运行时标准改装仓库显示 26 个。`MODULE_CONFIG.weapons` 当前为 15 个、`specials` 当前为 14 个；数组中保留了暂停开发的旧合成定义，玩家界面会过滤 `FUSION_MODULES` 和禁用模块，阅读时以玩家过滤结果为准。

主要模块 ID：

- 自动：`weapon-electric-whirlwind`、`weapon-nest`、`weapon-ricochet`、`weapon-ball-lightning`、`weapon-psionic`、`weapon-lightning-generator`、`weapon-black-hole`、`special-energy-aggregator`、`weapon-flame-crossbow`、`weapon-water-shot`、`weapon-star-arc`（显示名“星弧”）、`weapon-obsidian-beam`、`weapon-eclipse-pulse`、`weapon-fire-feather`。
- 技能：`special-optical`（史诗）、`special-wingman`、`special-chainsaw`、`special-sonic`、`special-zero`、`special-overclock`、`special-polarity-reverse`、`special-silent-storm`、`special-tactical-mine`（3 层充能，6 秒恢复，单枚存活 30 秒）、`special-sky-protocol`、`special-azure-singularity`（史诗）、`special-star-ring`。
- 元素：`special-silent-storm` 明确配置为 `electric`；未声明元素的模块继续由 `getModuleElement()` 回退为 `neutral`。
- 暂停开发定义：`FUSION_MODULES`、`fusionRecipe` 和相关合成方法仅作内部维护资料；当前没有“合成模块”玩家定义，所有这些 ID 均不进入玩家装配库、百科、商店、Boss 奖励或光锥之外奖励池。`PLAYER_DISABLED_MODULE_IDS` 继续用于禁用其它未开放模块。

不要随意修改 `id`、`shareCode`、`footprint` 坐标含义或技能 ID。`LoadoutCodec` 依赖 share code 和 15×15 网格编码，旧配置码可能因此失效。

## Loadout

`createLoadout()` 返回的核心结构：

```js
{
  core,
  corePosition: { x: 7, y: 7 },
  modules: [{ instanceId, moduleId, module, x, y, rotation }],
  synergies: [{ id }]
}
```

`ModuleSystem.validateGeometry()` 检查边界、占位重叠和连通性；`pruneDisconnected()` 会移除与核心断开的模块；`calculateFinalStats()` 合并 `maxHp`、`moveSpeed`、`attackSpeed` 等修正。`getInstalledEntries()` 会把核心作为 `slotId: "core"` 的第一项。

## 浏览器本地存档与机库

`src/systems/LocalSaveSystem.js` 使用 `localStorage` 保存版本化对象：

```js
{
  version: 1,
  selectedHangarSlot: 0,
  hangarSlots: [loadoutSpec, ...], // 固定 10 个普通模式机体槽位
  beyondCode: "◇...",              // 光锥之外本地安全断点
  updatedAt: 0
}
```

`loadoutSpec` 保存机体名称（最多 24 个字符，数字和中英文均可）、`instanceId`、`moduleId`、位置、旋转和连携 ID，不保存完整模块定义；读取后通过当前配置重新构造并校验。点击普通模式机库中的名称会进入文本输入，回车或失焦保存，手机端同步聚焦输入框以唤起系统键盘。每个机库槽位都可以直接打开配置码窗口导出自身配置，或把输入的配置码导入该槽位；导入后会保存并切换到目标槽位。机库只属于普通模式，进入光锥之外改装时必须使用本局库存，不得读写机库槽位。`beyondCode` 保存路线节点等安全断点，战斗进行中关闭页面时回到本场战斗开始前的航程状态。

本地数据属于当前浏览器设备和网站来源；清理网站数据、无痕模式或更换设备可能导致本地数据不可用。配置码和航程存档码仍是跨设备迁移和手动备份方式。

## 敌机与关卡

- 基础敌机：`ENEMY_CONFIG` 3 种；高级敌机：`ADVANCED_ENEMY_CONFIG` 5 种；原型列表 10 种；`ENABLED_PROTOTYPE_ENEMY_CONFIG` 在关卡 51 后进入关卡敌池。
- Boss 由 `createBossDefinition(level, variantId)` 运行时生成，包含 `hp`、`summon`、`attackPattern`、`bossSkills`、`bossShape` 等字段。
- `LEVELS` 每项包含 `number`、`id`、`name`、`boss`、`targetScore`、`enemyPool`、`hpMultiplier`、`speedMultiplier`、`damageMultiplier`、`spawnInterval`、`environmentPool` 和 `environment`。
- 环境由 `ENVIRONMENT_CONFIG` 声明玩家/敌人倍率和持续时间；Beyond 专属环境通过 `beyondOnly` 区分。

## 连携能力

来源：`src/config/synergy-config.js`。当前为 `synergy-wolfpack`、`synergy-white-hole`、`synergy-water-fire`、`synergy-dark-erosion`。每项以模块 ID `requirements` 判定，装配一次后作用于所有满足条件的模块实例；`normalizeSynergies()` 负责旧实例选择字段的兼容清理。暗蚀由黑曜波束命中叠加暗耀印记，星蚀脉冲命中时每层分别触发一次 15 点暗属性范围爆炸，再清除全部印记；火羽弹命中敌人后立即移除，不穿透敌人。

## 航程与存档

`BeyondLightConeSystem.createRun()` 的运行时数据包括：版本、随机种子、难度、章节、章节种子、地图、当前节点、已访问节点、金币、生命、库存、机体、连携、统计、事件状态、事件历史、活动事件、当前战斗和日志。`encode()` 会压缩/混淆后编码，`decode()` 必须保留版本兼容处理。

航程库存按模块 ID 计数，普通战斗、精英和 Boss 奖励规则在 `rewardModules()`；当前玩家奖励池只使用已开放的正常模块，暂停开发的合成/分解方法和字段不参与玩家流程。

## 数值修改注意事项

- 攻速由 `WeaponSystem.getPlayerAttackSpeed()` 结合环境、超频和上限计算；主动技能冷却由 `SkillSystem` 独立计时。
- 伤害、元素、燃烧、减速、爆炸、链式和特殊标记通过 `Projectile` 字段与 `CollisionSystem` 处理，新增字段要同步构造、更新、碰撞和测试。
- 先确认普通模式、Beyond、躲避模式对同一字段的解释是否不同，再改共享实体。
