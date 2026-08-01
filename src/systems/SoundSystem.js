const SOUND_CONFIG = {
  shot: { frequency: 720, duration: 0.035, volume: 0.025, cooldown: 0.07, type: "square" },
  hit: { frequency: 240, duration: 0.045, volume: 0.035, cooldown: 0.055, type: "triangle" },
  playerHit: { frequency: 95, duration: 0.12, volume: 0.07, cooldown: 0.18, type: "sawtooth" },
  skill: { frequency: 480, duration: 0.1, volume: 0.05, cooldown: 0.12, type: "sine" },
};

export class SoundSystem {
  constructor() { this.enabled = true; this.context = null; this.lastPlayed = new Map(); }

  setEnabled(enabled) { this.enabled = Boolean(enabled); if (this.enabled) this.unlock(); }

  unlock() {
    if (!this.enabled || typeof window === "undefined") return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.context ??= new AudioContext();
    if (this.context.state === "suspended") this.context.resume().catch(() => {});
  }

  play(name) {
    const config = SOUND_CONFIG[name];
    if (!this.enabled || !config) return;
    this.unlock();
    if (!this.context || this.context.state !== "running") return;
    const now = this.context.currentTime;
    const last = this.lastPlayed.get(name) ?? -Infinity;
    if (now - last < config.cooldown) return;
    this.lastPlayed.set(name, now);
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = config.type;
    oscillator.frequency.setValueAtTime(config.frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(45, config.frequency * 0.66), now + config.duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(config.volume, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + config.duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now); oscillator.stop(now + config.duration + 0.01);
  }
}
