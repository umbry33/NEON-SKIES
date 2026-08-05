import { MODULE_CONFIG, ASSEMBLY_BOARD, getFootprintBounds } from "./module-config.js";
import { ENEMY_CONFIG, ADVANCED_ENEMY_CONFIG, UNRELEASED_ENEMY_CONFIG, createBossDefinition } from "./enemy-config.js";
import { ENVIRONMENT_CONFIG } from "./environment-config.js";
import { BEYOND_LIGHT_CONE_CONFIG } from "./beyond-light-cone-config.js";
import { BEYOND_EVENTS } from "./beyond-events-config.js";

const rarityNames = { common: "普通", uncommon: "非凡", rare: "稀有", epic: "史诗", legendary: "传说" };
const typeNames = { weapon: "自动模块", special: "技能模块" };

export function getEncyclopediaSections() {
  const modules = [...MODULE_CONFIG.weapons, ...MODULE_CONFIG.specials].map((module) => {
    const size = getFootprintBounds(module);
    const skill = module.skill ? `主动技能：${module.skill.name}（冷却 ${module.skill.cooldown}s）` : "自动生效";
    return { title: module.name, tag: `${typeNames[module.type] ?? module.type} · ${rarityNames[module.rarity] ?? module.rarity}`, description: `${module.description} ${skill}`, meta: `占位 ${size.width} × ${size.height}` };
  });
  const enemies = [...ENEMY_CONFIG, ...ADVANCED_ENEMY_CONFIG].map((enemy) => ({
    title: enemy.name,
    tag: enemy.type.toUpperCase(),
    description: enemy.ability === "shield" ? "周期性展开护盾，护盾期间受到的伤害大幅降低。" : enemy.ability === "dash" ? "锁定航线后会短暂高速突进。" : enemy.ability === "burst" ? "发射三发扇形弹幕，覆盖更宽的躲避区域。" : enemy.ability === "phase" ? "会间歇性进入相位状态，常规子弹无法命中。" : enemy.ability === "orbit" ? "沿横向轨道移动，提升远距离射击压力。" : "基础敌机，会依据自身移动方式和射击节奏压迫玩家。",
    meta: `生命 ${enemy.hp} · 速度 ${enemy.speed} · 积分 ${enemy.score}`,
    enemyVisual: { type: enemy.visualType ?? enemy.type, color: enemy.color, flipY: enemy.flipY === true },
  }));
  enemies.push(...UNRELEASED_ENEMY_CONFIG.map((enemy) => ({
    title: enemy.name,
    tag: enemy.type.toUpperCase(),
    description: enemy.mechanic,
    meta: `\u751f\u547d ${enemy.hp} \u00b7 \u901f\u5ea6 ${enemy.speed} \u00b7 \u79ef\u5206 ${enemy.score}`,
    enemyVisual: { type: enemy.visualType ?? enemy.type, color: enemy.color, flipY: enemy.flipY === true },
  })));
  const environments = ENVIRONMENT_CONFIG.map((environment) => ({
    title: environment.name, tag: environment.beyondOnly ? "光锥之外 · 航程环境" : `第 ${environment.minLevel} 关起`, description: environment.description, meta: `持续 ${environment.duration}s` }));
  const bossVariantDescriptions = {
    "storm-warden": "雷暴监守以螺旋弹幕逐步压缩安全区域，并在战斗中召唤护卫机。",
    "nest-matriarch": "覆巢母舰发射扇形弹幕，同时持续召唤护卫机形成多层火力。",
    "prism-oracle": "棱镜先知释放十字弹幕，并会短暂冲刺改变战场位置。",
    "zero-archon": "零度执政官以环形弹幕封锁航线，配合冲刺和护卫机制造交叉压力。",
    "lattice-leviathan": "晶格利维坦释放高密度径向弹幕，并结合冲刺与召唤改变躲避节奏。",
    "abyss-gardener": "深渊园丁发射深渊长枪弹幕，召唤护卫机守住自身周围的空域。",
    "chorus-conductor": "合唱指挥舰以环形弹幕组织节奏，并持续召唤护卫机协同攻击。",
    "cryo-hive-queen": "寒潮蜂后释放十字弹幕，结合冲刺和蜂群召唤制造多方向夹击。",
  };
  const bossVariants = Object.keys(bossVariantDescriptions).map((variantId) => {
    const boss = createBossDefinition(25, variantId);
    return { title: boss.name, tag: `BOSS VARIANT · ${boss.attackPattern.toUpperCase()}`, description: bossVariantDescriptions[variantId], meta: `形态 ${boss.bossShape} · 技能 ${boss.bossSkills.join(" / ")} · 生命 ${boss.hp}`, enemyVisual: { type: boss.bossShape, color: boss.color } };
  });
  const standardBoss = createBossDefinition(50);
  const bosses = [{
    title: "常规首领",
    tag: "STANDARD BOSS",
    description: "常规首领会在战场上方游走，持续发射扇形弹幕并召唤护卫机。击败首领后才能完成对应的首领关。",
    meta: `生命 ${standardBoss.hp} · 召唤间隔 ${standardBoss.summon.interval.toFixed(1)}s`,
    enemyVisual: { type: standardBoss.bossShape, color: standardBoss.color },
  }, ...bossVariants];
  // 光锥之外的百科内容集中在这里，模式配置发生变化时同步核对本区块。
  const beyond = [
    {
      title: "模式目标",
      tag: "CHAPTER RUN",
      description: "光锥之外是一场独立的章节式航程。每次开始都会重新生成地图，沿路线向上推进，最终抵达地图顶端并击败首领。航程中的模块、金币、路线和进度只属于当前这一局。",
      meta: `${BEYOND_LIGHT_CONE_CONFIG.layers} 层随机航线 · 终点首领 · 局内成长`,
    },
    {
      title: "难度选择",
      tag: "LEVEL 1–4",
      description: "开始前可以选择 4 档难度。难度越高，敌人的生命、攻击压力和生成节奏越强，同时会影响航程中的奖励质量。Lv.1 为休闲难度，Lv.4 为高于现有关卡的极限难度。",
      meta: `Lv.1–Lv.4 · ${BEYOND_LIGHT_CONE_CONFIG.difficulties[0].name} / ${BEYOND_LIGHT_CONE_CONFIG.difficulties.at(-1).name}`,
    },
    {
      title: "路线地图",
      tag: "ROUTE MAP",
      description: "地图由多层节点组成，路线每局随机生成但保证可达。玩家只能进入当前节点直接相连的下一层节点；可前往的节点会高亮显示，并用连线标出。路线可以分支和汇合，不能返回已经走过的节点。",
      meta: `${BEYOND_LIGHT_CONE_CONFIG.lanes} 条路线 · 前进制 · 分支与汇合`,
    },
    {
      title: "节点类型",
      tag: "NODE TYPES",
      description: "普通战斗是最常见的成长来源；精英战斗风险更高但会提供高品质模块；商店消耗金币购买模块；回复节点恢复生命；事件节点会在战斗、金币、模块和治疗等结果之间变化；最顶端的首领节点需要击败首领才能完成航程。",
      meta: Object.values(BEYOND_LIGHT_CONE_CONFIG.nodeTypes).map(({ name }) => name).join(" · "),
    },
    {
      title: "深空事件档案",
      tag: "30 EVENTS",
      description: "事件节点会从深空事件池中抽取一段独立遭遇。每个事件都提供至少两种处理方式，可能带来模块、金币、治疗、风险战斗或随机结果。",
      meta: "点击查看全部事件",
      action: "beyond-events",
    },
    {
      title: "起始与库存",
      tag: "RUN INVENTORY",
      description: "每次新航程从核心和 1 个初始自动模块“辉光灵能”开始。之后获得的模块按拥有数量计入本局库存：拥有几个，最多就能同时装备几个，而不是永久解锁图纸。航程结束后，本局新获得的模块和金币都会清空。",
      meta: `初始金币 ${BEYOND_LIGHT_CONE_CONFIG.startingGold} · 模块按数量拥有 · 结束后清空`,
    },
    {
      title: "航程改装",
      tag: "ASSEMBLY BAY",
      description: "在地图、商店、回复、事件节点以及战斗结束后，都可以打开机体改装。战斗开始后不能改装。只能使用本局库存中的模块，保存时会检查库存数量、空间重叠、核心连接和连携能力；不满足条件的方案无法保存。",
      meta: `${ASSEMBLY_BOARD.columns} × ${ASSEMBLY_BOARD.rows} 核心网络 · 战斗中锁定`,
    },
    {
      title: "奖励与成长",
      tag: "RISK / REWARD",
      description: "普通战斗、精英战斗和首领战会提供模块与金币，精英和首领更容易获得高品质模块。随着地图深度和所选难度提高，敌人数量、生命与攻击压力平滑增加，不依赖单纯无限膨胀的数值。",
      meta: `精英数量配置范围 ${BEYOND_LIGHT_CONE_CONFIG.eliteRange[0]}–${BEYOND_LIGHT_CONE_CONFIG.eliteRange[1]} 个`,
    },
    {
      title: "存档码与连携",
      tag: "RUN ARCHIVE",
      description: "航程中的存档码会记录随机种子、地图、已走路线、当前节点、生命、金币、库存、机体位置、连携能力和战斗进度，并以紧凑编码保存。可以在航程中复制，在难度选择界面导入后继续。连携能力规则与普通模式相同，满足需求模块即可配置。",
      meta: "可复制 / 可导入 · 记录本局航程 · 支持连携能力",
    },
  ];
  const sections = [
    { title: "战斗规则", entries: [
      { title: "关卡推进", tag: "MISSION", description: "累计指定积分即可完成普通关卡；每五关为首领关，积分达标后首领出现，击败首领才算通关。", meta: "共 100 关 · 20 场首领战" },
      { title: "机体拼装", tag: "ASSEMBLY", description: "所有模块必须直接或间接连接核心。模块可自由摆放，装配不同组合会改变攻击与技能。", meta: `${ASSEMBLY_BOARD.columns} × ${ASSEMBLY_BOARD.rows} 核心网络` },
      { title: "主动技能", tag: "SKILL", description: "带技能的模块会在战斗左下角生成对应按钮，可用 1–9 数字键或触摸释放。", meta: "最多装配 9 个技能模块" },
    ] },
    { title: "玩家模块", entries: modules },
    { title: "敌机档案", entries: enemies },
    { title: "首领机制", entries: bosses },
    { title: "特殊环境", entries: environments },
    { title: "光锥之外", entries: beyond },
  ];
  return sections;
}

export function getBeyondEventArchiveEntries() {
  return BEYOND_EVENTS.map((event) => ({
    title: event.title,
    tag: event.tag,
    description: event.description,
    meta: event.choices.map((choice) => `${choice.label}：${choice.hint}`).join("　/　"),
  }));
}

export function getUnreleasedEnemyArchiveEntries() {
  return UNRELEASED_ENEMY_CONFIG.map((enemy) => ({
    title: enemy.name,
    tag: `${enemy.type.toUpperCase()} / UNRELEASED`,
    description: enemy.mechanic,
    meta: `\u751f\u547d ${enemy.hp} \u00b7 \u901f\u5ea6 ${enemy.speed} \u00b7 \u9884\u8ba1\u79ef\u5206 ${enemy.score}`,
    enemyVisual: { type: enemy.visualType ?? enemy.type, color: enemy.color, flipY: enemy.flipY === true },
  }));
}
