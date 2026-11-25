import { loadMutedPref, saveMutedPref } from './engine';
import { getStorageItem, setStorageItem } from './storage';
import { AudioSettingsState } from './types';

export const AUDIO_STORAGE_KEY = 'neon_block_audio_v1';
export const AUDIO_SCHEMA_VERSION = 1;
export const DEFAULT_SFX_VOLUME = 70;

export function clampSfxVolume(val: unknown, fallback = DEFAULT_SFX_VOLUME): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return fallback;
  return Math.max(0, Math.min(100, Math.round(val)));
}

export function validateAudioSettings(
  raw: unknown,
  legacyMuted = false
): AudioSettingsState {
  if (!raw || typeof raw !== 'object') {
    return {
      version: AUDIO_SCHEMA_VERSION,
      sfxVolume: DEFAULT_SFX_VOLUME,
      muted: Boolean(legacyMuted),
    };
  }

  const obj = raw as Record<string, unknown>;
  const sfxVolume = clampSfxVolume(obj.sfxVolume, DEFAULT_SFX_VOLUME);
  const muted =
    typeof obj.muted === 'boolean' ? obj.muted : Boolean(legacyMuted);

  return {
    version: AUDIO_SCHEMA_VERSION,
    sfxVolume,
    muted,
  };
}

export function loadAudioSettings(): AudioSettingsState {
  const legacyMuted = loadMutedPref();
  try {
    const rawStr = getStorageItem(AUDIO_STORAGE_KEY);
    if (!rawStr) {
      const initial: AudioSettingsState = {
        version: AUDIO_SCHEMA_VERSION,
        sfxVolume: DEFAULT_SFX_VOLUME,
        muted: legacyMuted,
      };
      saveAudioSettings(initial);
      return initial;
    }
    const parsed = JSON.parse(rawStr);
    const validated = validateAudioSettings(parsed, legacyMuted);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      (parsed as { version?: number }).version !== AUDIO_SCHEMA_VERSION
    ) {
      saveAudioSettings(validated);
    }
    return validated;
  } catch {
    return {
      version: AUDIO_SCHEMA_VERSION,
      sfxVolume: DEFAULT_SFX_VOLUME,
      muted: legacyMuted,
    };
  }
}

export function saveAudioSettings(settings: AudioSettingsState): void {
  const clean = validateAudioSettings(settings, settings.muted);
  saveMutedPref(clean.muted);
  try {
    setStorageItem(AUDIO_STORAGE_KEY, JSON.stringify(clean));
  } catch {
    // Ignore storage quota / private mode errors
  }
}

interface ActiveAudioSource {
  osc: OscillatorNode;
  gain?: GainNode;
}

class NeonAudioEngine {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private muted = false;
  private sfxVolume = DEFAULT_SFX_VOLUME; // 0..100
  private lastPreviewAt = 0;
  private backgroundSuspended = false;
  private awaitingUserGesture = false;
  private activeSources = new Set<ActiveAudioSource>();

  private computeTargetGain(): number {
    if (this.muted || this.sfxVolume <= 0 || this.backgroundSuspended) return 0;
    // Perceptually balanced curve so 70% feels comfortable and 100% stays crisp without clipping
    const normalized = this.sfxVolume / 100;
    return Number((normalized * normalized * 0.45 + normalized * 0.55).toFixed(4));
  }

  private applyGainSmoothly(immediate = false): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const target = this.computeTargetGain();
    const param = this.sfxGain.gain;

    try {
      const currentVal = Number.isFinite(param.value) ? param.value : target;
      if (
        typeof (
          param as AudioParam & {
            cancelAndHoldAtTime?: (t: number) => AudioParam;
          }
        ).cancelAndHoldAtTime === 'function'
      ) {
        (
          param as AudioParam & {
            cancelAndHoldAtTime: (t: number) => AudioParam;
          }
        ).cancelAndHoldAtTime(now);
      } else {
        param.cancelScheduledValues(now);
        param.setValueAtTime(currentVal, now);
      }
      if (immediate) {
        param.setValueAtTime(target, now);
      } else {
        // Exponential approach (15ms time constant) prevents sudden clicks or DC pops
        param.setTargetAtTime(target, now, 0.015);
      }
    } catch {
      param.value = target;
    }
  }

  private registerSource(osc: OscillatorNode, gain?: GainNode): void {
    const entry: ActiveAudioSource = { osc, gain };
    this.activeSources.add(entry);
    osc.onended = () => {
      this.activeSources.delete(entry);
      try {
        osc.disconnect();
      } catch {
        // Ignore disconnect errors on already-cleaned nodes
      }
      if (gain) {
        try {
          gain.disconnect();
        } catch {
          // Ignore disconnect errors
        }
      }
    };
  }

  private stopAllActiveAudio(): void {
    if (this.activeSources.size === 0) return;
    const now = this.ctx?.currentTime ?? 0;
    for (const entry of Array.from(this.activeSources)) {
      if (entry.gain) {
        try {
          entry.gain.gain.cancelScheduledValues(now);
          entry.gain.gain.setValueAtTime(0, now);
        } catch {
          // Ignore gain reset errors
        }
      }
      try {
        entry.osc.onended = null;
        entry.osc.stop();
      } catch {
        // Ignore already-stopped oscillators
      }
      try {
        entry.osc.disconnect();
      } catch {
        // Ignore disconnect errors
      }
      if (entry.gain) {
        try {
          entry.gain.disconnect();
        } catch {
          // Ignore disconnect errors
        }
      }
    }
    this.activeSources.clear();
  }

  setMuted(muted: boolean): void {
    this.muted = Boolean(muted);
    this.applyGainSmoothly(false);
  }

  isMuted(): boolean {
    return this.muted;
  }

  setSfxVolume(percent: number): void {
    this.sfxVolume = clampSfxVolume(percent, DEFAULT_SFX_VOLUME);
    this.applyGainSmoothly(false);
  }

  getSfxVolume(): number {
    return this.sfxVolume;
  }

  getEffectiveGain(): number {
    return this.computeTargetGain();
  }

  isBackgroundSuspended(): boolean {
    return this.backgroundSuspended;
  }

  isAwaitingUserGesture(): boolean {
    return this.awaitingUserGesture;
  }

  suspendForBackground(): void {
    this.backgroundSuspended = true;
    this.awaitingUserGesture = true;
    this.stopAllActiveAudio();

    if (this.ctx) {
      if (this.sfxGain) {
        try {
          const now = this.ctx.currentTime;
          this.sfxGain.gain.cancelScheduledValues(now);
          this.sfxGain.gain.setValueAtTime(0, now);
        } catch {
          // Ignore gain errors
        }
      }
      if (
        this.ctx.state !== 'closed' &&
        typeof this.ctx.suspend === 'function'
      ) {
        try {
          const res = this.ctx.suspend();
          if (res && typeof res.catch === 'function') {
            res.catch(() => {});
          }
        } catch {
          // Ignore AudioContext suspend errors
        }
      }
    }
  }

  /**
   * Marks that the application returned to the foreground without automatically
   * resuming AudioContext; actual audio playback waits for a valid user gesture via unlock().
   */
  markForegroundReturned(): void {
    this.backgroundSuspended = false;
    if (this.ctx) {
      this.awaitingUserGesture = true;
    }
  }

  configure(settings: Pick<AudioSettingsState, 'sfxVolume' | 'muted'>): void {
    this.sfxVolume = clampSfxVolume(settings.sfxVolume, DEFAULT_SFX_VOLUME);
    this.muted = Boolean(settings.muted);
    this.applyGainSmoothly(false);
  }

  /**
   * Ensures the AudioContext and shared SFX GainNode exist.
   * Refuses to play or auto-resume while background-suspended or awaiting a user gesture.
   */
  private ensureSfxBus(allowWhenSilent = false): {
    ctx: AudioContext;
    bus: GainNode;
  } | null {
    if (this.backgroundSuspended || this.awaitingUserGesture) return null;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return null;
    }
    if (!allowWhenSilent && (this.muted || this.sfxVolume <= 0)) return null;
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }

    if (!this.sfxGain) {
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.ctx.destination);
      this.applyGainSmoothly(true);
    }

    if (this.ctx.state === 'suspended') {
      try {
        const res = this.ctx.resume();
        if (res && typeof res.catch === 'function') {
          res.catch(() => {});
        }
      } catch {
        // Ignore resume errors
      }
    }

    return { ctx: this.ctx, bus: this.sfxGain };
  }

  unlock(): void {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return;
    }
    this.backgroundSuspended = false;
    this.awaitingUserGesture = false;
    const bus = this.ensureSfxBus(true);
    if (bus) {
      this.applyGainSmoothly(true);
    }
  }

  playVolumePreview(force = false): void {
    const nowMs = Date.now();
    if (!force && nowMs - this.lastPreviewAt < 130) return;
    this.lastPreviewAt = nowMs;

    const audio = this.ensureSfxBus();
    if (!audio) return;
    const { ctx, bus } = audio;

    const now = ctx.currentTime;
    [659.25, 987.77].forEach((freq, idx) => {
      const t = now + idx * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.03, t + 0.09);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.11, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc.connect(gain);
      gain.connect(bus);
      this.registerSource(osc, gain);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  }

  playMove(): void {
    const audio = this.ensureSfxBus();
    if (!audio) return;
    const { ctx, bus } = audio;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.025);

    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(bus);
    this.registerSource(osc, gain);
    osc.start(now);
    osc.stop(now + 0.032);
  }

  playSelect(): void {
    const audio = this.ensureSfxBus();
    if (!audio) return;
    const { ctx, bus } = audio;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.055);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

    osc.connect(gain);
    gain.connect(bus);
    this.registerSource(osc, gain);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  playPlace(): void {
    const audio = this.ensureSfxBus();
    if (!audio) return;
    const { ctx, bus } = audio;

    const now = ctx.currentTime;
    // Soft sub thud
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(190, now);
    sub.frequency.exponentialRampToValueAtTime(75, now + 0.09);
    subGain.gain.setValueAtTime(0.16, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    sub.connect(subGain);
    subGain.connect(bus);
    this.registerSource(sub, subGain);
    sub.start(now);
    sub.stop(now + 0.105);

    // Crisp neon click
    const top = ctx.createOscillator();
    const topGain = ctx.createGain();
    top.type = 'triangle';
    top.frequency.setValueAtTime(620, now);
    top.frequency.exponentialRampToValueAtTime(930, now + 0.04);
    topGain.gain.setValueAtTime(0.06, now);
    topGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    top.connect(topGain);
    topGain.connect(bus);
    this.registerSource(top, topGain);
    top.start(now);
    top.stop(now + 0.055);
  }

  playInvalid(): void {
    const audio = this.ensureSfxBus();
    if (!audio) return;
    const { ctx, bus } = audio;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.linearRampToValueAtTime(115, now + 0.11);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(480, now);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(bus);
    this.registerSource(osc, gain);
    osc.start(now);
    osc.stop(now + 0.125);
  }

  playMerge(comboDepth: number, newValue: number): void {
    const audio = this.ensureSfxBus();
    if (!audio) return;
    const { ctx, bus } = audio;

    const now = ctx.currentTime;
    const scaleNotes = [523.25, 659.25, 783.99, 987.77, 1174.66, 1479.98];
    const valueStep = Math.min(4, Math.floor(Math.log2(Math.max(4, newValue)) - 2));
    const idx = Math.min(scaleNotes.length - 1, comboDepth - 1 + Math.floor(valueStep / 2));
    const baseFreq = scaleNotes[idx];

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    osc1.frequency.setValueAtTime(baseFreq * 0.85, now);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.06);

    osc2.frequency.setValueAtTime(baseFreq * 1.5, now);
    osc2.frequency.exponentialRampToValueAtTime(baseFreq * 2, now + 0.09);

    const vol = Math.min(0.16, 0.1 + comboDepth * 0.015);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(bus);

    this.registerSource(osc1, gain);
    this.registerSource(osc2);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.25);
    osc2.stop(now + 0.25);
  }

  playLineClear(lineCount: number): void {
    const audio = this.ensureSfxBus();
    if (!audio) return;
    const { ctx, bus } = audio;

    const now = ctx.currentTime;
    const notes = lineCount > 1 ? [523.25, 659.25, 783.99, 1046.5] : [440, 659.25, 880];

    notes.forEach((freq, i) => {
      const t = now + i * 0.045;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.12, t + 0.14);

      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(bus);
      this.registerSource(osc, gain);
      osc.start(t);
      osc.stop(t + 0.23);
    });
  }

  playNewTray(): void {
    const audio = this.ensureSfxBus();
    if (!audio) return;
    const { ctx, bus } = audio;

    const now = ctx.currentTime;
    [587.33, 739.99, 880].forEach((freq, idx) => {
      const t = now + idx * 0.035;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.045, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
      osc.connect(gain);
      gain.connect(bus);
      this.registerSource(osc, gain);
      osc.start(t);
      osc.stop(t + 0.12);
    });
  }

  playNewBest(): void {
    const audio = this.ensureSfxBus();
    if (!audio) return;
    const { ctx, bus } = audio;

    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 987.77, 1174.66].forEach((freq, idx) => {
      const t = now + idx * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain);
      gain.connect(bus);
      this.registerSource(osc, gain);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  playGameOver(): void {
    const audio = this.ensureSfxBus();
    if (!audio) return;
    const { ctx, bus } = audio;

    const now = ctx.currentTime;
    [392.0, 349.23, 311.13, 261.63].forEach((freq, idx) => {
      const t = now + idx * 0.11;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.linearRampToValueAtTime(freq * 0.96, t + 0.18);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(bus);
      this.registerSource(osc, gain);
      osc.start(t);
      osc.stop(t + 0.23);
    });
  }

  playFireworkBurst(): void {
    const audio = this.ensureSfxBus();
    if (!audio) return;
    const { ctx, bus } = audio;

    const now = ctx.currentTime;
    // Soft sub pop
    const pop = ctx.createOscillator();
    const popGain = ctx.createGain();
    pop.type = 'sine';
    pop.frequency.setValueAtTime(220, now);
    pop.frequency.exponentialRampToValueAtTime(65, now + 0.14);
    popGain.gain.setValueAtTime(0.08, now);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    pop.connect(popGain);
    popGain.connect(bus);
    this.registerSource(pop, popGain);
    pop.start(now);
    pop.stop(now + 0.16);

    // High crystalline crackle shimmer
    [1318.5, 1567.98, 2093.0].forEach((freq, i) => {
      const t = now + i * 0.025;
      const sparkle = ctx.createOscillator();
      const sGain = ctx.createGain();
      sparkle.type = 'sine';
      sparkle.frequency.setValueAtTime(freq, t);
      sGain.gain.setValueAtTime(0.035, t);
      sGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      sparkle.connect(sGain);
      sGain.connect(bus);
      this.registerSource(sparkle, sGain);
      sparkle.start(t);
      sparkle.stop(t + 0.19);
    });
  }

  playDailyComplete(): void {
    const audio = this.ensureSfxBus();
    if (!audio) return;
    const { ctx, bus } = audio;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.065;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.015, t + 0.25);
      gain.gain.setValueAtTime(0.095, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
      osc.connect(gain);
      gain.connect(bus);
      this.registerSource(osc, gain);
      osc.start(t);
      osc.stop(t + 0.36);
    });
  }

  playRewardClaim(): void {
    const audio = this.ensureSfxBus();
    if (!audio) return;
    const { ctx, bus } = audio;

    const now = ctx.currentTime;
    const notes = [587.33, 739.99, 880.0, 1174.66, 1479.98];
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.02, t + 0.22);
      gain.gain.setValueAtTime(0.085, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(gain);
      gain.connect(bus);
      this.registerSource(osc, gain);
      osc.start(t);
      osc.stop(t + 0.32);
    });
  }

  playLevelUp(): void {
    const audio = this.ensureSfxBus();
    if (!audio) return;
    const { ctx, bus } = audio;

    const now = ctx.currentTime;
    const chord = [440, 554.37, 659.25, 880, 1108.73];
    chord.forEach((freq, idx) => {
      const t = now + idx * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      osc.connect(gain);
      gain.connect(bus);
      this.registerSource(osc, gain);
      osc.start(t);
      osc.stop(t + 0.34);
    });
  }

  playStreakRecord(): void {
    const audio = this.ensureSfxBus();
    if (!audio) return;
    const { ctx, bus } = audio;

    const now = ctx.currentTime;
    const fanfare = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
    fanfare.forEach((freq, idx) => {
      const t = now + idx * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx >= 4 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.01, t + 0.26);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.095, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
      osc.connect(gain);
      gain.connect(bus);
      this.registerSource(osc, gain);
      osc.start(t);
      osc.stop(t + 0.38);
    });
  }
}

export const neonAudio = new NeonAudioEngine();
