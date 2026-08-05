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
  {
    id: "magnetic-corridor", name: "\u78c1\u66b4\u56de\u5eca", color: "#ff6edb", duration: 22, beyondOnly: true,
    player: { moveSpeed: 0.9 }, enemy: { projectileSpeed: 1.16 },
    description: "\u78c1\u66b4\u5728\u822a\u7ebf\u4e24\u4fa7\u53cd\u590d\u62c9\u626f\uff0c\u73a9\u5bb6\u79fb\u52a8\u53d7\u5230\u5e72\u6270\uff0c\u5f39\u5e55\u901f\u5ea6\u4e0a\u5347\u3002",
  },
  {
    id: "crystal-reversal", name: "\u971c\u6676\u9006\u6d41", color: "#8ce8ff", duration: 25, beyondOnly: true,
    player: { attackSpeed: 0.9 }, enemy: { speed: 0.8, projectileSpeed: 0.86 },
    description: "\u971c\u6676\u6d41\u5728\u6218\u573a\u4e2d\u5012\u6d41\uff0c\u6574\u4f53\u8282\u594f\u53d8\u6162\uff0c\u4f46\u73a9\u5bb6\u706b\u529b\u4e5f\u4f1a\u88ab\u51bb\u7ed3\u3002",
  },
  {
    id: "void-tide", name: "\u865a\u7a7a\u6f6e\u6c50", color: "#9c83ff", duration: 23, beyondOnly: true,
    player: { moveSpeed: 0.84 }, enemy: { speed: 0.96, projectileSpeed: 1.2 },
    description: "\u865a\u7a7a\u6f6e\u6c50\u4f7f\u5f39\u5e55\u50cf\u6d6a\u5934\u4e00\u6837\u52a0\u901f\u6d8c\u6765\uff0c\u73a9\u5bb6\u9700\u8981\u5728\u66f4\u7a84\u7684\u7a7a\u95f4\u4e2d\u8f6c\u79fb\u3002",
  },
  {
    id: "ember-fault", name: "\u4f59\u70ec\u88c2\u5c42", color: "#ff9b62", duration: 21, beyondOnly: true,
    player: { attackSpeed: 1.16 }, enemy: { speed: 1.15, projectileSpeed: 1.08 },
    description: "\u88c2\u5c42\u4e2d\u7684\u4f59\u70ec\u540c\u65f6\u50ac\u52a8\u53cc\u65b9\u706b\u529b\uff0c\u73a9\u5bb6\u653b\u51fb\u66f4\u5feb\uff0c\u654c\u673a\u4e5f\u66f4\u51f6\u731b\u3002",
  },
  {
    id: "prism-refraction", name: "\u68f1\u955c\u6298\u5c04\u5e26", color: "#d29cff", duration: 24, beyondOnly: true,
    player: { moveSpeed: 1.14 }, enemy: { shootInterval: 0.82 },
    description: "\u68f1\u955c\u5e26\u628a\u653b\u51fb\u8282\u62cd\u62c9\u5feb\uff0c\u540c\u65f6\u4e3a\u73a9\u5bb6\u63d0\u4f9b\u66f4\u7075\u6d3b\u7684\u8d8a\u7ebf\u673a\u52a8\u7a7a\u95f4\u3002",
  },
];

export function getEnvironmentPool(level) {
  return ENVIRONMENT_CONFIG.filter((environment) => level >= environment.minLevel);
}

export function getBeyondEnvironmentPool() {
  return ENVIRONMENT_CONFIG;
}
