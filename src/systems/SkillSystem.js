import { getInstalledEntries } from "../config/module-config.js";

export class SkillSystem {
  constructor(loadout) {
    this.skills = getInstalledEntries(loadout).filter(({ module }) => module?.skill).map(({ module, instanceId }) => ({
      ...module.skill,
      id: module.skill.id,
      name: module.skill.name,
      cooldown: module.skill.cooldown,
      cooldownRemaining: 0,
      duration: module.skill.duration,
      maxCharges: Math.max(1, Number(module.skill.maxCharges ?? 1)),
      charges: Math.max(1, Number(module.skill.maxCharges ?? 1)),
      chargeInterval: Number(module.skill.chargeInterval ?? module.skill.cooldown ?? 0),
      chargeTimer: 0,
      instanceId,
    }));
  }

  update(dt) {
    this.skills.forEach((skill) => {
      if (skill.maxCharges > 1) {
        if (skill.charges < skill.maxCharges) {
          let timer = skill.chargeTimer - dt;
          const interval = Math.max(0.01, skill.chargeInterval);
          while (timer <= 0 && skill.charges < skill.maxCharges) { skill.charges += 1; timer += interval; }
          skill.chargeTimer = skill.charges < skill.maxCharges ? Math.max(0, timer) : 0;
        }
        skill.cooldownRemaining = skill.charges < skill.maxCharges ? skill.chargeTimer : 0;
      } else skill.cooldownRemaining = Math.max(0, skill.cooldownRemaining - dt);
    });
  }

  activate(index, game) {
    const skill = this.skills[index];
    if (!skill || game.state !== "playing") return false;
    if (skill.maxCharges > 1) {
      if (skill.charges <= 0) return false;
      skill.charges -= 1;
      if (skill.charges === skill.maxCharges - 1 && skill.chargeTimer <= 0) skill.chargeTimer = Math.max(0.01, skill.chargeInterval);
      skill.cooldownRemaining = skill.charges < skill.maxCharges ? skill.chargeTimer : 0;
    } else {
      if (skill.cooldownRemaining > 0) return false;
      skill.cooldownRemaining = skill.cooldown;
    }
    if (skill.id === "decoy") game.createDecoy(skill.duration);
    else if (skill.id === "ionSaw") game.startIonSaw(skill.duration);
    else if (skill.id === "sonicWave") game.startSonicWave(skill.duration);
    else if (skill.id === "freeze") game.freezeTimer = Math.max(game.freezeTimer, skill.duration);
    else if (skill.id === "overclock") game.startOverclock(skill.duration);
    else if (skill.id === "polarityReverse") game.startPolarityReverse(skill.duration);
    else if (skill.id === "photonChoir") game.startPhotonChoir();
    else if (skill.id === "skyProtocol") game.startSkyProtocol(skill.duration, skill.instanceId);
    else if (skill.id === "azureSingularity") game.startAzureSingularity(skill.duration, skill.instanceId);
    else if (skill.id === "starRing") game.startStarRing(skill.duration, skill.instanceId);
    else if (skill.id === "cryoHive") game.startCryoHive(skill.duration, skill.instanceId);
    else if (skill.id === "mirageAnchor") game.startMirageAnchor(skill.duration);
    else if (skill.id === "polarTether") game.startPolarTether(skill.duration);
    else if (skill.id === "overflowDrive") game.startOverflowDrive(skill.duration);
    else if (skill.id === "abyssBloom") game.startAbyssBloom(skill.duration, skill.instanceId);
    else if (skill.id === "silentStorm") game.startSilentStorm(skill.duration);
    else if (skill.id === "tacticalMine") game.deployTacticalMine(skill);
    return true;
  }

  getState() { return this.skills.map(({ id, name, cooldownRemaining, charges, maxCharges, chargeTimer }) => ({ id, name, cooldownRemaining, charges, maxCharges, chargeTimer })); }
}
