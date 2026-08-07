const SOUND_CONFIG = {
  // All effects use short, bright electronic sweeps; none use the old
  // low-frequency "puff" character.
  shot: { frequency: 1040, endFrequency: 560, duration: 0.04, volume: 0.08, cooldown: 0.07, type: "square" },
  playerImpact: { frequency: 1380, endFrequency: 720, duration: 0.045, volume: 0.1, cooldown: 0.045, type: "triangle" },
  playerHit: { frequency: 820, endFrequency: 310, duration: 0.08, volume: 0.16, cooldown: 0.18, type: "sawtooth" },
  skill: { frequency: 620, endFrequency: 1040, duration: 0.12, volume: 0.14, cooldown: 0.12, type: "sine" },
  // Ball lightning uses a soft low electric swell instead of the sharp generic shot.
  ballLightning: { frequency: 230, endFrequency: 148, duration: 0.3, volume: 0.13, cooldown: 0.24, type: "sine", attack: 0.045, filterFrequency: 900 },
  lightning: { frequency: 2180, endFrequency: 1560, duration: 0.16, volume: 0.12, cooldown: 0.14, type: "sawtooth" },
  blackHoleExplosion: { frequency: 560, endFrequency: 190, duration: 0.28, volume: 0.22, cooldown: 0.1, type: "square" },
};

const MASTER_VOLUME = 2.5;

// 16 bars at 84 BPM ≈ 45.7 seconds. The progression and timbre settings are
// kept together so the background can be tuned without touching game logic.
export const MUSIC_CONFIG = {
  bpm: 84,
  stepsPerBeat: 4,
  bars: 16,
  scheduleAhead: 0.8,
  schedulerInterval: 90,
  // Base output level at 100%. The settings slider multiplies this value.
  // 100% now equals the previous 200% output; the 0%～300% slider ratio is unchanged.
  volume: 0.92,
  pad: { volume: 0.1, durationBars: 1.16, filter: 1250 },
  bass: { volume: 0.095, duration: 0.62, filter: 680 },
  keys: { volume: 0.06, duration: 0.44, filter: 2800 },
  // The background loop intentionally has no kick: keep the atmosphere soft
  // and remove the distracting low "puff" hit from every beat.
  drums: { hat: 0.008 },
  tapeNoise: 0.0035,
  progression: [
    { root: 48, tones: [0, 4, 7, 11, 14] }, // Cmaj7 add9
    { root: 43, tones: [0, 4, 7, 11, 14] }, // Gmaj7 add9
    { root: 45, tones: [0, 3, 7, 10, 14] }, // Am7 add9
    { root: 41, tones: [0, 4, 7, 11, 14] }, // Fmaj7 add9
    { root: 50, tones: [0, 3, 7, 10, 14] }, // Dm7 add9
    { root: 43, tones: [0, 4, 7, 11, 14] }, // Gmaj7 add9
    { root: 40, tones: [0, 3, 7, 10, 14] }, // Em7 add9
    { root: 41, tones: [0, 4, 7, 11, 14] }, // Fmaj7 add9
    { root: 48, tones: [0, 4, 7, 11, 14] },
    { root: 43, tones: [0, 4, 7, 11, 14] },
    { root: 45, tones: [0, 3, 7, 10, 14] },
    { root: 41, tones: [0, 4, 7, 11, 14] },
    { root: 50, tones: [0, 3, 7, 10, 14] },
    { root: 40, tones: [0, 3, 7, 10, 14] },
    { root: 41, tones: [0, 4, 7, 11, 14] },
    { root: 43, tones: [0, 4, 7, 11, 14] },
  ],
  // Sparse, bell-like motif. null values deliberately leave breathing room.
  melody: [null, 76, null, null, 79, null, null, 77, null, 74, null, null, 72, null, null, 74],
};

const midiToFrequency = (midi) => 440 * (2 ** ((midi - 69) / 12));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class SoundSystem {
  constructor() {
    this.enabled = true;
    this.context = null;
    this.lastPlayed = new Map();
    this.musicRequested = false;
    this.musicActive = false;
    this.musicPaused = false;
    this.musicSchedulerTimer = null;
    this.musicStep = 0;
    this.musicNextNoteTime = 0;
    this.musicBus = null;
    this.musicSources = new Set();
    this.musicVolume = 1;
    this.soundVolume = 1;
    this.musicAudio = typeof document !== "undefined" ? document.querySelector("#bgm-audio") : null;
    if (!this.musicAudio && typeof Audio === "function") this.musicAudio = new Audio("./梦见天际 Dreaming the Skies.mp3");
    if (this.musicAudio) { this.musicAudio.loop = true; this.musicAudio.preload = "auto"; this.musicAudio.volume = this.musicVolume; }
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) {
      this.stopMusic(true);
      return;
    }
    this.unlock();
    if (this.musicRequested && !this.musicPaused) this.startMusic();
  }

  setMusicVolume(volume) {
    this.musicVolume = clamp(Number(volume) || 0, 0, 3);
    if (this.musicAudio) this.musicAudio.volume = Math.min(1, this.musicVolume);
    if (this.musicBus?.master && this.context) {
      const now = this.context.currentTime;
      this.musicBus.master.gain.cancelScheduledValues(now);
      if (this.musicVolume <= 0) {
        // A true zero is required here; 0.0001 is still audible on some devices.
        this.musicBus.master.gain.setValueAtTime(0, now);
      } else {
        this.musicBus.master.gain.setTargetAtTime(MUSIC_CONFIG.volume * this.musicVolume, now, 0.04);
      }
    }
    // Changing the slider is a user gesture, so re-arm music immediately when
    // a previously muted track is turned back on.
    if (this.musicVolume > 0 && this.enabled) this.startMusic();
  }

  setSoundVolume(volume) {
    this.soundVolume = clamp(Number(volume) || 0, 0, 3);
  }

  setMusicMuted(muted) {
    this.setMusicVolume(muted ? 0 : 1);
  }

  unlock() {
    if (!this.enabled || typeof window === "undefined") return null;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    this.context ??= new AudioContext({ latencyHint: "interactive" });
    if (this.context.state === "suspended") this.context.resume().catch(() => {});
    return this.context;
  }

  // The first call is made from a user action in Game.start(), satisfying the
  // browser autoplay rule without creating a context while the page loads.
  startMusic() {
    this.musicRequested = true;
    if (!this.enabled || this.musicVolume <= 0 || typeof window === "undefined") return;
    if (this.musicAudio) {
      this.musicAudio.volume = Math.min(1, this.musicVolume);
      if (!this.musicActive) {
        this.musicAudio.play().then(() => { this.musicActive = true; }).catch(() => {});
      }
      return;
    }
    const context = this.unlock();
    if (!context) return;
    if (context.state === "suspended") {
      context.resume().then(() => {
        if (this.musicRequested && !this.musicPaused && !this.musicActive) this.startMusic();
      }).catch(() => {});
      return;
    }
    if (this.musicActive || this.musicPaused) return;

    this.musicActive = true;
    this.musicStep = this.musicStep % (MUSIC_CONFIG.bars * 16);
    this.musicNextNoteTime = context.currentTime + 0.06;
    this.musicBus = this.createMusicBus(context);
    this.startTapeNoise(context);
    this.scheduleMusic();
  }

  pauseMusic() {
    // Music is global ambience: gameplay pause must not interrupt it.
    this.musicPaused = false;
  }

  resumeMusic() {
    if (!this.enabled || this.musicVolume <= 0 || !this.musicRequested) return;
    this.musicPaused = false;
    this.startMusic();
  }

  stopMusic(preserveRequest = false) {
    if (!preserveRequest) this.musicRequested = false;
    if (this.musicAudio) {
      this.musicAudio.pause();
      if (!preserveRequest) this.musicAudio.currentTime = 0;
      this.musicActive = false;
      return;
    }
    this.musicPaused = preserveRequest && this.musicPaused;
    if (this.musicSchedulerTimer !== null && typeof window !== "undefined") window.clearTimeout(this.musicSchedulerTimer);
    this.musicSchedulerTimer = null;
    for (const source of this.musicSources) {
      try { source.stop(); } catch { /* already stopped */ }
    }
    this.musicSources.clear();
    const bus = this.musicBus;
    this.musicBus = null;
    this.musicActive = false;
    if (bus?.master && this.context) {
      const now = this.context.currentTime;
      bus.master.gain.cancelScheduledValues(now);
      bus.master.gain.setTargetAtTime(0.0001, now, 0.045);
      window.setTimeout(() => {
        try { bus.input.disconnect(); bus.master.disconnect(); bus.delay.disconnect(); bus.feedback.disconnect(); bus.wet.disconnect(); bus.dry.disconnect(); } catch { /* disconnected */ }
      }, 320);
    }
    if (!preserveRequest) this.musicStep = 0;
  }

  createMusicBus(context) {
    const input = context.createGain();
    const master = context.createGain();
    const dry = context.createGain();
    const wet = context.createGain();
    const delay = context.createDelay(0.6);
    const feedback = context.createGain();
    dry.gain.value = 0.76;
    wet.gain.value = 0.16;
    delay.delayTime.value = 0.28;
    feedback.gain.value = 0.22;
    master.gain.setValueAtTime(0.0001, context.currentTime);
    master.gain.exponentialRampToValueAtTime(Math.max(0.0001, MUSIC_CONFIG.volume * this.musicVolume), context.currentTime + 1.4);
    input.connect(dry).connect(master);
    input.connect(delay).connect(wet).connect(master);
    delay.connect(feedback).connect(delay);
    master.connect(context.destination);
    return { input, master, dry, wet, delay, feedback };
  }

  startTapeNoise(context) {
    const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = (Math.random() * 2 - 1) * 0.32;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    source.loop = true;
    filter.type = "lowpass";
    filter.frequency.value = 1650;
    gain.gain.value = MUSIC_CONFIG.tapeNoise;
    source.connect(filter).connect(gain).connect(this.musicBus.input);
    source.start();
    this.musicSources.add(source);
  }

  scheduleMusic() {
    if (!this.musicActive || !this.context || !this.musicBus) return;
    const context = this.context;
    while (this.musicNextNoteTime < context.currentTime + MUSIC_CONFIG.scheduleAhead) {
      this.scheduleMusicStep(this.musicStep, this.musicNextNoteTime);
      this.musicNextNoteTime += 60 / MUSIC_CONFIG.bpm / MUSIC_CONFIG.stepsPerBeat;
      this.musicStep = (this.musicStep + 1) % (MUSIC_CONFIG.bars * 16);
    }
    this.musicSchedulerTimer = window.setTimeout(() => this.scheduleMusic(), MUSIC_CONFIG.schedulerInterval);
  }

  scheduleMusicStep(step, time) {
    const stepInBar = step % 16;
    const chord = MUSIC_CONFIG.progression[Math.floor(step / 16) % MUSIC_CONFIG.progression.length];
    if (stepInBar === 0) this.playPadChord(chord, time);
    if (stepInBar === 0 || stepInBar === 8) this.playBass(chord.root - 12 + (stepInBar === 8 ? 7 : 0), time);
    if (stepInBar % 2 === 0) this.playHat(time);
    const melody = MUSIC_CONFIG.melody[stepInBar];
    if (melody !== null && (step % 32) !== 0) this.playKey(melody + (Math.floor(step / 64) % 2 === 1 ? -5 : 0), time);
  }

  registerSource(source) {
    this.musicSources.add(source);
    source.addEventListener?.("ended", () => this.musicSources.delete(source), { once: true });
    return source;
  }

  playPadChord(chord, time) {
    const duration = (60 / MUSIC_CONFIG.bpm) * 4 * MUSIC_CONFIG.pad.durationBars;
    chord.tones.forEach((offset, index) => {
      const oscillator = this.context.createOscillator();
      const filter = this.context.createBiquadFilter();
      const gain = this.context.createGain();
      oscillator.type = index === 0 ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(midiToFrequency(chord.root + 12 + offset), time);
      oscillator.detune.setValueAtTime((index - 2) * 3.5, time);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(MUSIC_CONFIG.pad.filter + index * 110, time);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(MUSIC_CONFIG.pad.volume / (index < 2 ? 1.2 : 2.6), time + 0.42);
      gain.gain.setTargetAtTime(0.0001, time + duration * 0.68, duration * 0.23);
      this.registerSource(oscillator).connect(filter).connect(gain).connect(this.musicBus.input);
      oscillator.start(time);
      oscillator.stop(time + duration + 0.12);
    });
  }

  playBass(midi, time) {
    const oscillator = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    const duration = MUSIC_CONFIG.bass.duration;
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(midiToFrequency(midi), time);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(MUSIC_CONFIG.bass.filter, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(MUSIC_CONFIG.bass.volume, time + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    this.registerSource(oscillator).connect(filter).connect(gain).connect(this.musicBus.input);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.03);
  }

  playKey(midi, time) {
    const oscillator = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    const duration = MUSIC_CONFIG.keys.duration;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(midiToFrequency(midi), time);
    oscillator.detune.setValueAtTime(-5, time);
    oscillator.detune.linearRampToValueAtTime(4, time + duration);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(MUSIC_CONFIG.keys.filter, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(MUSIC_CONFIG.keys.volume, time + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    this.registerSource(oscillator).connect(filter).connect(gain).connect(this.musicBus.input);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.03);
  }

  playHat(time) {
    const buffer = this.context.createBuffer(1, Math.floor(this.context.sampleRate * 0.045), this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = buffer;
    filter.type = "highpass";
    filter.frequency.value = 4300;
    gain.gain.value = MUSIC_CONFIG.drums.hat;
    this.registerSource(source).connect(filter).connect(gain).connect(this.musicBus.input);
    source.start(time);
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
    if (filter) {
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(config.filterFrequency, now);
      filter.Q.value = 0.45;
    }
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
