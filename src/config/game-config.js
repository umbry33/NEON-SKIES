export const GAME_CONFIG = {
  canvas: { width: 480, height: 854 },
  player: {
    maxHp: 100,
    moveSpeed: 270,
    attackSpeed: 1,
    maxAttackSpeed: 3,
    radius: 18,
    moduleSpacing: 13,
    moduleDrawScale: 0.85,
    autoFireGrace: 0.12,
  },
  projectile: {
    enemySpeed: 180,
    enemyDamage: 5,
    enemyContactDamage: 5,
    enemyRadius: 5,
    enemyLife: 5,
  },
  difficulty: {
    baseSpawnInterval: 0.88,
    minSpawnInterval: 0.25,
    stageDuration: 12,
    spawnIntervalStep: 0.08,
    enemySpeedStep: 0.08,
    enemyHpStep: 0.06,
  },
  stars: { count: 70, speedMin: 16, speedMax: 72 },
};

export const SONIC_WAVE_CONFIG = {
  spawnInterval: 0.15,
  spawnStep: 38,
  beamLife: 0.15,
  beamVisualLife: 0.52,
  beamThickness: 6,
  beamCoreThickness: 2.2,
  beamGlowThickness: 18,
  beamFlashDuration: 0.055,
  damage: 10,
};

export const IMPACT_CONFIG = {
  hit: { duration: 0.08, strength: 2.2, vibration: 10 },
  damage: { duration: 0.22, strength: 7, vibration: 45 },
};

export const PLAYER_BASE_STATS = {
  maxHp: GAME_CONFIG.player.maxHp,
  moveSpeed: GAME_CONFIG.player.moveSpeed,
  attackSpeed: GAME_CONFIG.player.attackSpeed,
};
