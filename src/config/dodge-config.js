// 弹幕躲避模式的难度只控制弹幕密度、速度和得分倍率，避免把玩法简化成单纯堆血量。
export const DODGE_DIFFICULTIES = [
  {
    id: "easy",
    name: "简单",
    subtitle: "EASY / 练习躲避",
    description: "弹幕稀疏、速度较慢，适合熟悉移动和弹幕规律。",
    spawnInterval: 1.35,
    speed: 116,
    bulletCount: 1,
    damage: 5,
    scorePerSecond: 10,
    scorePerBullet: 2,
  },
  {
    id: "hard",
    name: "困难",
    subtitle: "HARD / 密集弹道",
    description: "弹幕更密集，交替出现扇形、横扫和摆动弹道。",
    spawnInterval: 0.88,
    speed: 158,
    bulletCount: 2,
    damage: 6,
    scorePerSecond: 18,
    scorePerBullet: 3,
  },
  {
    id: "nightmare",
    name: "噩梦",
    subtitle: "NIGHTMARE / 极限回避",
    description: "高速连续弹幕与多方向攻击交替出现，考验持续走位。",
    spawnInterval: 0.58,
    speed: 205,
    bulletCount: 3,
    damage: 7,
    scorePerSecond: 28,
    scorePerBullet: 5,
  },
];

export const getDodgeDifficulty = (id = "easy") => DODGE_DIFFICULTIES.find((difficulty) => difficulty.id === id) ?? DODGE_DIFFICULTIES[0];
