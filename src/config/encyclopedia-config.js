import { MODULE_CONFIG, getFootprintBounds } from "./module-config.js";
import { ENEMY_CONFIG, ADVANCED_ENEMY_CONFIG, createBossDefinition } from "./enemy-config.js";
import { ENVIRONMENT_CONFIG } from "./environment-config.js";

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
    enemyVisual: { type: enemy.type, color: enemy.color },
  }));
  const environments = ENVIRONMENT_CONFIG.map((environment) => ({
    title: environment.name, tag: `第 ${environment.minLevel} 关起`, description: environment.description, meta: `持续 ${environment.duration}s` }));
  const bosses = [5, 25, 50].map((level) => {
    const boss = createBossDefinition(level);
    return { title: `${level} 关首领`, tag: boss.bossSkills.join(" / ").toUpperCase(), description: "首领会在上半区域游走、发射特殊弹幕并召唤护卫机。高阶首领还会冲刺或释放环形弹幕。", meta: `生命 ${boss.hp} · 召唤间隔 ${boss.summon.interval.toFixed(1)}s` };
  });
  return [
    { title: "战斗规则", entries: [
      { title: "关卡推进", tag: "MISSION", description: "累计指定积分即可完成普通关卡；每五关为首领关，积分达标后首领出现，击败首领才算通关。", meta: "共 50 关 · 10 场首领战" },
      { title: "机体拼装", tag: "ASSEMBLY", description: "所有模块必须直接或间接连接核心。模块可自由摆放，装配不同组合会改变攻击与技能。", meta: "9 × 9 核心网络" },
      { title: "主动技能", tag: "SKILL", description: "带技能的模块会在战斗左下角生成对应按钮，可用 1–9 数字键或触摸释放。", meta: "最多装配 9 个技能模块" },
    ] },
    { title: "玩家模块", entries: modules },
    { title: "敌机档案", entries: enemies },
    { title: "首领机制", entries: bosses },
    { title: "特殊环境", entries: environments },
  ];
}
