export const ENVIRONMENT_CONFIG = [
  {
    id: "solar-flare", name: "日冕风暴", color: "#ff8a5c", duration: 24, minLevel: 26,
    player: { attackSpeed: 0.86 }, enemy: { speed: 1.24 },
    description: "炽热粒子流压制武器散热：玩家自动攻击减速，敌机移动加速。",
  },
  {
    id: "ion-fog", name: "离子迷雾", color: "#a77dff", duration: 26, minLevel: 28,
    player: { moveSpeed: 0.82 }, enemy: { shootInterval: 1.34, projectileSpeed: 0.78 },
    description: "黏稠离子云降低机体机动，但会干扰敌方瞄准与弹速。",
  },
  {
    id: "starlight-surge", name: "星辉潮汐", color: "#78f7db", duration: 22, minLevel: 32,
    player: { attackSpeed: 1.28 }, enemy: { speed: 0.82 },
    description: "星辉能量涌入：玩家攻速提升，敌机推进效率下降。",
  },
  {
    id: "gravity-rift", name: "引力裂隙", color: "#66b8ff", duration: 24, minLevel: 38,
    player: { moveSpeed: 0.88 }, enemy: { speed: 0.9, projectileSpeed: 0.68 },
    description: "局部引力失衡令双方机动受阻，并显著拖慢敌方弹幕。",
  },
];

export function getEnvironmentPool(level) {
  return ENVIRONMENT_CONFIG.filter((environment) => level >= environment.minLevel);
}
