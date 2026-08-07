const SOUND_CONFIG = {
  shot: { frequency: 1040, endFrequency: 560, duration: 0.04, volume: 0.08, cooldown: 0.07, type: "square" },
  playerImpact: { frequency: 1380, endFrequency: 720, duration: 0.045, volume: 0.1, cooldown: 0.045, type: "triangle" },
  playerHit: { frequency: 820, endFrequency: 310, duration: 0.08, volume: 0.16, cooldown: 0.18, type: "sawtooth" },
  skill: { frequency: 620, endFrequency: 1040, duration: 0.12, volume: 0.14, cooldown: 0.12, type: "sine" },
  ballLightning: { frequency: 230, endFrequency: 148, duration: 0.3, volume: 0.13, cooldown: 0.24, type: "sine", attack: 0.045, filterFrequency: 900 },
  lightning: { frequency: 2180, endFrequency: 1560, duration: 0.16, volume: 0.12, cooldown: 0.14, type: "sawtooth" },
  blackHoleExplosion: { frequency: 560, endFrequency: 190, duration: 0.28, volume: 0.22, cooldown: 0.1, type: "square" },
};

const MASTER_VOLUME = 2.5;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const UNLOCK_EVENTS = ["pointerdown", "touchstart", "click", "keydown"];

export class SoundSystem {
  constructor() {
    this.enabled = true;
    this.context = null;
    this.lastPlayed = new Map();
    this.musicRequested = true;
    this.musicActive = false;
    this.musicUnlocked = false;
    this.musicPlayPromise = null;
    this.musicUnlockListening = false;
    this.musicVolume = 1;
    this.soundVolume = 1;
    this.musicAudio = this.createMusicAudio();
    this.musicUnlockHandler = () => this.unlockMusicFromInteraction();
    this.armMusicUnlockListeners();
    this.playMusic();
  }

  createMusicAudio() {
    if (typeof Audio !== "function" || typeof document === "undefined") return null;
    const sourceUrl = new URL("./梦见天际 Dreaming the Skies.mp3", document.baseURI).href;
    const audio = new Audio(sourceUrl);
    audio.loop = true;
    audio.preload = "auto";
    audio.playsInline = true;
    audio.volume = this.musicVolume;
    audio.addEventListener("error", () => { this.musicActive = false; }, { once: true });
    audio.load();
    return audio;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) {
      this.musicAudio?.pause();
      this.musicActive = false;
      return;
    }
    this.playMusic();
  }

  setMusicVolume(volume) {
    this.musicVolume = clamp(Number(volume) || 0, 0, 3);
    if (this.musicAudio) this.musicAudio.volume = Math.min(1, this.musicVolume);
    if (this.musicVolume > 0 && this.enabled) this.playMusic();
  }

  setSoundVolume(volume) { this.soundVolume = clamp(Number(volume) || 0, 0, 3); }
  setMusicMuted(muted) { this.setMusicVolume(muted ? 0 : 1); }

  unlock() {
    if (!this.enabled || typeof window === "undefined") return null;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    this.context ??= new AudioContext({ latencyHint: "interactive" });
    if (this.context.state === "suspended") this.context.resume().catch(() => {});
    return this.context;
  }

  armMusicUnlockListeners() {
    if (this.musicUnlockListening || this.musicUnlocked || typeof document === "undefined") return;
    this.musicUnlockListening = true;
    UNLOCK_EVENTS.forEach((eventName) => document.addEventListener(eventName, this.musicUnlockHandler, { capture: true, passive: true }));
  }

  removeMusicUnlockListeners() {
    if (!this.musicUnlockListening || typeof document === "undefined") return;
    this.musicUnlockListening = false;
    UNLOCK_EVENTS.forEach((eventName) => document.removeEventListener(eventName, this.musicUnlockHandler, true));
  }

  unlockMusicFromInteraction() {
    if (!this.musicAudio || this.musicUnlocked) return;
    this.playMusic(true);
  }

  playMusic(forceRetry = false) {
    if (!this.musicAudio || !this.enabled || this.musicVolume <= 0) return;
    if (this.musicActive) return;
    if (this.musicPlayPromise && !forceRetry) return;
    this.musicAudio.volume = Math.min(1, this.musicVolume);
    const result = this.musicAudio.play();
    if (!result?.then) {
      this.musicActive = !this.musicAudio.paused;
      this.musicUnlocked = this.musicActive;
      if (this.musicActive) this.removeMusicUnlockListeners();
      return;
    }
    this.musicPlayPromise = result.then(() => {
      this.musicPlayPromise = null;
      this.musicActive = true;
      this.musicUnlocked = true;
      this.removeMusicUnlockListeners();
    }).catch(() => {
      this.musicPlayPromise = null;
      this.musicActive = false;
      this.armMusicUnlockListeners();
    });
  }

  pauseMusic() {
    // Game pause does not pause global BGM.
  }

  resumeMusic() {
    if (!this.musicRequested || !this.enabled || this.musicVolume <= 0) return;
    this.playMusic(true);
  }

  handleVisibilityChange() {
    if (document.visibilityState === "visible" && this.musicUnlocked && this.musicAudio?.paused) this.playMusic(true);
  }

  stopMusic(preserveRequest = false) {
    if (!preserveRequest) this.musicRequested = false;
    this.musicAudio?.pause();
    this.musicActive = false;
    if (!preserveRequest && this.musicAudio) this.musicAudio.currentTime = 0;
  }

  play(name) {
    const config = SOUND_CONFIG[name];
    if (!this.enabled || !config || this.soundVolume <= 0) return;
    this.unlock();
    if (!this.context || this.context.state !== "running") return;
    const now = this.context.currentTime;
    const last = this.lastPlayed.get(name) ?? -Infinity;
    if (now - last < config.cooldown) return;
    this.lastPlayed.set(name, now);
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = config.filterFrequency ? this.context.createBiquadFilter() : null;
    oscillator.type = config.type;
    oscillator.frequency.setValueAtTime(config.frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(45, config.endFrequency ?? config.frequency * 0.66), now + config.duration);
    if (filter) { filter.type = "lowpass"; filter.frequency.setValueAtTime(config.filterFrequency, now); filter.Q.value = 0.45; }
    const peak = config.volume * MASTER_VOLUME * this.soundVolume;
    const attack = config.attack ?? 0;
    gain.gain.setValueAtTime(attack > 0 ? 0.0001 : peak, now);
    if (attack > 0) gain.gain.linearRampToValueAtTime(peak, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + config.duration);
    if (filter) oscillator.connect(filter).connect(gain).connect(this.context.destination);
    else oscillator.connect(gain).connect(this.context.destination);
    oscillator.start();
    oscillator.stop(now + config.duration + 0.01);
  }
}
