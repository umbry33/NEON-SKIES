const SOUND_CONFIG = {
  shot: { frequency: 720, duration: 0.035, volume: 0.09, cooldown: 0.07, type: "square" },
  playerImpact: { frequency: 240, duration: 0.06, volume: 0.13, cooldown: 0.045, type: "triangle" },
  playerHit: { frequency: 95, duration: 0.12, volume: 0.2, cooldown: 0.18, type: "sawtooth" },
  skill: { frequency: 480, duration: 0.1, volume: 0.16, cooldown: 0.12, type: "sine" },
  blackHoleExplosion: { frequency: 82, duration: 0.34, volume: 0.3, cooldown: 0.1, type: "sawtooth" },
};
const MASTER_VOLUME = 2.5;

export class SoundSystem {
  constructor() {
    this.enabled = true;
    this.context = null;
    this.lastPlayed = new Map();
    this.musicActive = false;
    this.musicTimer = null;
    this.musicStep = 0;
    this.musicBus = null;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (this.enabled) {
      this.unlock();
      if (this.musicRequested) this.startMusic();
    } else {
      this.stopMusic(true);
    }
  }

  unlock() {
    if (!this.enabled || typeof window === "undefined") return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.context ??= new AudioContext();
    if (this.context.state === "suspended") this.context.resume().catch(() => {});
  }

  // Music is generated in real time: no external audio asset or download is needed.
  startMusic() {
    this.musicRequested = true;
    if (!this.enabled || typeof window === "undefined") return;
    this.unlock();
    if (!this.context || this.musicActive) return;
    this.musicActive = true;
    this.musicStep = 0;
    this.musicBus = this.context.createGain();
    this.musicBus.gain.setValueAtTime(0.0001, this.context.currentTime);
    this.musicBus.gain.exponentialRampToValueAtTime(0.42 * MASTER_VOLUME, this.context.currentTime + 1.8);
    this.musicBus.connect(this.context.destination);
    const beatMs = (60 / 82) * 1000;
    this.playMusicStep();
    this.musicTimer = window.setInterval(() => this.playMusicStep(), beatMs);
  }

  stopMusic(preserveRequest = false) {
    if (!preserveRequest) this.musicRequested = false;
    if (this.musicTimer !== null && typeof window !== "undefined") window.clearInterval(this.musicTimer);
    this.musicTimer = null;
    if (this.musicBus && this.context) {
      const now = this.context.currentTime;
      this.musicBus.gain.cancelScheduledValues(now);
      this.musicBus.gain.setTargetAtTime(0.0001, now, 0.08);
      const oldBus = this.musicBus;
      window.setTimeout(() => oldBus.disconnect(), 420);
    }
    this.musicBus = null;
    this.musicActive = false;
  }

  playMusicStep() {
    if (!this.musicActive || !this.context || !this.musicBus || this.context.state !== "running") return;
    const now = this.context.currentTime;
    const beat = this.musicStep % 16;
    const bassNotes = [41, 41, 48, 46, 39, 39, 46, 44, 36, 36, 43, 41, 39, 39, 46, 44];
    const leadNotes = [72, 75, 79, 75, 70, 74, 77, 74, 68, 72, 75, 72, 67, 70, 74, 70];
    this.playMusicTone(bassNotes[beat], 1.55, 0.12, "triangle", 0.035);
    if (beat % 2 === 0) this.playMusicTone(leadNotes[beat], 0.42, 0.045, "sine", 0.018);
    if (beat % 4 === 0) {
      const chord = [bassNotes[beat] + 12, bassNotes[beat] + 15, bassNotes[beat] + 19];
      chord.forEach((note, index) => this.playMusicTone(note, 3.6, 0.18, "sawtooth", 0.009 + index * 0.002, index * 0.013));
    }
    this.musicStep += 1;
  }

  playMusicTone(midi, duration, detune, type, volume, delay = 0) {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    const start = this.context.currentTime + delay;
    const frequency = 440 * (2 ** ((midi - 69) / 12));
    oscillator.type = type;
    oscillator.detune.setValueAtTime(detune * 100, start);
    oscillator.frequency.setValueAtTime(frequency, start);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(type === "sawtooth" ? 1200 : 2200, start);
    filter.Q.setValueAtTime(0.7, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.045);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(filter).connect(gain).connect(this.musicBus);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.04);
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
    gain.gain.exponentialRampToValueAtTime(config.volume * MASTER_VOLUME, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + config.duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now); oscillator.stop(now + config.duration + 0.01);
  }
}
