import { getInstalledEntries } from "../config/module-config.js";

export class SkillSystem {
  constructor(loadout) {
    this.skills = getInstalledEntries(loadout).filter(({ module }) => module?.skill).map(({ module, instanceId }) => ({
      id: module.skill.id,
      name: module.skill.name,
      cooldown: module.skill.cooldown,
      cooldownRemaining: 0,
      duration: module.skill.duration,
      instanceId,
    }));
  }

  update(dt) { this.skills.forEach((skill) => { skill.cooldownRemaining = Math.max(0, skill.cooldownRemaining - dt); }); }

  activate(index, game) {
    const skill = this.skills[index];
    if (!skill || skill.cooldownRemaining > 0 || game.state !== "playing") return false;
    skill.cooldownRemaining = skill.cooldown;
    if (skill.id === "decoy") game.createDecoy(skill.duration);
    else if (skill.id === "ionSaw") game.startIonSaw(skill.duration);
    else if (skill.id === "sonicWave") game.startSonicWave(skill.duration);
    else if (skill.id === "freeze") game.freezeTimer = Math.max(game.freezeTimer, skill.duration);
    else if (skill.id === "overclock") game.startOverclock(skill.duration);
    else if (skill.id === "polarityReverse") game.startPolarityReverse(skill.duration);
    else if (skill.id === "photonChoir") game.startPhotonChoir();
    else if (skill.id === "cryoHive") game.startCryoHive(skill.duration, skill.instanceId);
    else if (skill.id === "mirageAnchor") game.startMirageAnchor(skill.duration);
    else if (skill.id === "polarTether") game.startPolarTether(skill.duration);
    else if (skill.id === "overflowDrive") game.startOverflowDrive(skill.duration);
    else if (skill.id === "abyssBloom") game.startAbyssBloom(skill.duration, skill.instanceId);
    return true;
  }

  getState() { return this.skills.map(({ id, name, cooldownRemaining }) => ({ id, name, cooldownRemaining })); }
}
