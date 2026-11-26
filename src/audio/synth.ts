// Silent-first Web Audio voice-leading synth: a warm FM electric-piano with a
// PRE-ALLOCATED 4-voice pool (oscillators start once and run forever; notes are
// gain envelopes + frequency glides, so no graph nodes are created mid-move).
//
// iOS Safari workarounds (music-theory-dle-research.md §1):
//  - AudioContext is created/resumed inside the first user gesture with sound on (no splash).
//  - navigator.audioSession.type = 'playback' where supported, plus a looping silent
//    <audio> element so the hardware mute switch doesn't silence explicit Sound On.
//  - visibilitychange resumes suspended / interrupted contexts.
import type { PitchClass } from '../types/stepwise';

const VOICES = 4;
/** Warm middle register: C3 (48) … B4 (71). Glides may drift slightly past it before folding. */
const REG_LOW = 48;
const REG_HIGH = 71;
const REG_CENTER = 60;
export const PLAYBACK_STEP_SEC = 0.68;

const midiToHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** Places each pitch class in the octave closest to the register center. */
export function centeredVoicing(pcs: readonly PitchClass[]): number[] {
  return pcs.map((pc) => {
    let m = REG_CENTER - 6 + ((pc - (REG_CENTER - 6)) % 12 + 12) % 12; // 54..65
    if (m > REG_HIGH) m -= 12;
    return m;
  });
}

/** Moves one voice by its true semitone delta (B -> C glides up), folding only if it leaves the register. */
export function nextVoicing(prev: readonly number[], voiceIndex: number, delta: number): number[] {
  return prev.map((m, i) => {
    if (i !== voiceIndex) return m;
    let n = m + delta;
    if (n > REG_HIGH + 3) n -= 12;
    if (n < REG_LOW - 3) n += 12;
    return n;
  });
}

/** Voicing for each chord of a ladder (start + steps), tracking register continuously. */
export function ladderVoicings(start: readonly PitchClass[], moves: readonly { voiceIndex: number; delta: number }[]): number[][] {
  const out = [centeredVoicing(start)];
  for (const mv of moves) out.push(nextVoicing(out[out.length - 1], mv.voiceIndex, mv.delta));
  return out;
}

interface EpVoice {
  carrier: OscillatorNode;
  modulator: OscillatorNode;
  modGain: GainNode; // FM index envelope
  tine: OscillatorNode;
  tineGain: GainNode;
  amp: GainNode;
  midi: number | null;
}

/** Tiny silent 8-bit mono WAV as a data URI (for the iOS media-channel unlock loop). */
function silentWavDataUri(): string {
  const samples = 800; // 0.1s at 8kHz
  const bytes = new Uint8Array(44 + samples);
  const dv = new DataView(bytes.buffer);
  const str = (o: number, s: string) => [...s].forEach((c, i) => bytes[o + i] = c.charCodeAt(0));
  str(0, 'RIFF');
  dv.setUint32(4, 36 + samples, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);
  dv.setUint16(22, 1, true);
  dv.setUint32(24, 8000, true);
  dv.setUint32(28, 8000, true);
  dv.setUint16(32, 1, true);
  dv.setUint16(34, 8, true);
  str(36, 'data');
  dv.setUint32(40, samples, true);
  bytes.fill(128, 44);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return `data:audio/wav;base64,${btoa(bin)}`;
}

type AudioCtor = typeof AudioContext;

export class StepwiseSynth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private voices: EpVoice[] = [];
  private thudOsc: OscillatorNode | null = null;
  private thudGain: GainNode | null = null;
  private silentEl: HTMLAudioElement | null = null;
  private current: number[] = [];
  enabled = false;

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.enabled) void this.resume();
      });
    }
  }

  get audioTime(): number | null {
    return this.ctx && this.ctx.state === 'running' ? this.ctx.currentTime : null;
  }

  /** Must be called from inside a user gesture handler. Idempotent. */
  unlock(): void {
    if (!this.enabled) return;
    try {
      const nav = navigator as Navigator & { audioSession?: { type: string } };
      if (nav.audioSession) nav.audioSession.type = 'playback';
    } catch {
      /* unsupported */
    }
    if (!this.silentEl && typeof Audio !== 'undefined') {
      const el = new Audio(silentWavDataUri());
      el.loop = true;
      el.setAttribute('playsinline', '');
      el.preload = 'auto';
      this.silentEl = el;
    }
    void this.silentEl?.play().catch(() => undefined);
    if (!this.ctx) this.build();
    void this.resume();
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (on) {
      this.unlock();
    } else {
      this.silence();
      this.silentEl?.pause();
    }
  }

  private async resume(): Promise<void> {
    if (this.ctx && this.ctx.state !== 'running') {
      try {
        await this.ctx.resume();
      } catch {
        /* will retry on next gesture */
      }
    }
  }

  private build(): void {
    const Ctor: AudioCtor | undefined =
      typeof window !== 'undefined'
        ? window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext
        : undefined;
    if (!Ctor) return;
    const ctx = new Ctor({ latencyHint: 'interactive' });
    this.ctx = ctx;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 3200;
    tone.Q.value = 0.4;
    const master = ctx.createGain();
    master.gain.value = 0.55;
    tone.connect(comp).connect(master).connect(ctx.destination);
    this.master = master;

    // Gentle stereo-ish width via a short feedback-free delay "room".
    const room = ctx.createDelay(0.1);
    room.delayTime.value = 0.023;
    const roomGain = ctx.createGain();
    roomGain.gain.value = 0.18;
    room.connect(roomGain).connect(comp);

    for (let i = 0; i < VOICES; i++) {
      const carrier = ctx.createOscillator();
      carrier.type = 'sine';
      const modulator = ctx.createOscillator();
      modulator.type = 'sine';
      const modGain = ctx.createGain();
      modGain.gain.value = 0;
      const tine = ctx.createOscillator();
      tine.type = 'sine';
      const tineGain = ctx.createGain();
      tineGain.gain.value = 0;
      const amp = ctx.createGain();
      amp.gain.value = 0;

      modulator.connect(modGain).connect(carrier.frequency);
      carrier.connect(amp);
      tine.connect(tineGain).connect(amp);
      amp.connect(tone);
      amp.connect(room);

      const f = midiToHz(60);
      carrier.frequency.value = f;
      modulator.frequency.value = f;
      tine.frequency.value = f * 14;
      carrier.start();
      modulator.start();
      tine.start();
      this.voices.push({ carrier, modulator, modGain, tine, tineGain, amp, midi: null });
    }

    // Muted wooden click for rejected moves (also pre-allocated).
    const thudOsc = ctx.createOscillator();
    thudOsc.type = 'triangle';
    thudOsc.frequency.value = 160;
    const thudFilter = ctx.createBiquadFilter();
    thudFilter.type = 'lowpass';
    thudFilter.frequency.value = 700;
    const thudGain = ctx.createGain();
    thudGain.gain.value = 0;
    thudOsc.connect(thudFilter).connect(thudGain).connect(comp);
    thudOsc.start();
    this.thudOsc = thudOsc;
    this.thudGain = thudGain;
  }

  private setPitch(v: EpVoice, midi: number, at: number, glide: number): void {
    const f = midiToHz(midi);
    for (const [param, mult] of [[v.carrier.frequency, 1], [v.modulator.frequency, 1], [v.tine.frequency, 14]] as const) {
      param.cancelScheduledValues(at);
      if (glide > 0 && v.midi !== null) {
        param.setValueAtTime(midiToHz(v.midi) * mult, at);
        param.exponentialRampToValueAtTime(f * mult, at + glide);
      } else {
        param.setValueAtTime(f * mult, at);
      }
    }
    v.midi = midi;
  }

  /**
   * Cuts a gain param's automation at `at` while keeping the level it will have then.
   * `param.value` is only the level *now*, so it must not anchor events scheduled ahead
   * (playback cascades), or held common tones would snap to the pre-playback level (≈0).
   */
  private holdAt(param: AudioParam, at: number): void {
    const now = this.ctx?.currentTime ?? 0;
    if (at <= now + 0.03) {
      param.cancelScheduledValues(at);
      param.setValueAtTime(Math.max(param.value, 0.0001), at);
    } else if (typeof param.cancelAndHoldAtTime === 'function') {
      param.cancelAndHoldAtTime(at);
    } else {
      // Firefox: drop later events; the next setTarget/ramp continues from the curve's value.
      param.cancelScheduledValues(at);
    }
  }

  /** Full electric-piano strike. */
  private strike(v: EpVoice, at: number, vel: number): void {
    const peak = 0.2 * vel;
    this.holdAt(v.amp.gain, at);
    v.amp.gain.linearRampToValueAtTime(peak, at + 0.006);
    v.amp.gain.setTargetAtTime(peak * 0.45, at + 0.006, 0.35);
    const index = (v.midi ? midiToHz(v.midi) : 262) * 1.6 * vel;
    v.modGain.gain.cancelScheduledValues(at);
    v.modGain.gain.setValueAtTime(index, at);
    v.modGain.gain.setTargetAtTime(index * 0.12, at, 0.18);
    v.tineGain.gain.cancelScheduledValues(at);
    v.tineGain.gain.setValueAtTime(0.05 * vel, at);
    v.tineGain.gain.setTargetAtTime(0, at, 0.03);
  }

  /** Soft swell that keeps a held common tone alive without re-attacking. */
  private sustain(v: EpVoice, at: number): void {
    this.holdAt(v.amp.gain, at);
    v.amp.gain.setTargetAtTime(0.075, at, 0.12);
  }

  private release(v: EpVoice, at: number, tau = 0.25): void {
    this.holdAt(v.amp.gain, at);
    v.amp.gain.setTargetAtTime(0, at, tau);
  }

  private ready(): AudioContext | null {
    if (!this.enabled || !this.ctx) return null;
    if (this.ctx.state !== 'running') void this.resume();
    return this.ctx;
  }

  /** Strikes a whole chord (register-centered) and remembers its voicing. */
  playChord(pcs: readonly PitchClass[], at?: number): void {
    const ctx = this.ready();
    if (!ctx) return;
    this.chordAt(centeredVoicing(pcs), at ?? ctx.currentTime + 0.01);
  }

  private chordAt(midis: readonly number[], t: number): void {
    this.voices.forEach((v, i) => {
      if (i < midis.length) {
        this.setPitch(v, midis[i], t, 0);
        this.strike(v, t, i === 0 ? 0.9 : 0.75);
      } else {
        this.release(v, t, 0.05);
      }
    });
    this.current = [...midis];
  }

  /** Voice-leading step: common tones held, the moved voice glides and re-articulates softly. */
  playStep(voiceIndex: number, delta: number, pcsAfter: readonly PitchClass[]): void {
    // Track the voicing even while silent, so turning Sound On mid-game starts from the real chord.
    const next = this.current.length === pcsAfter.length ? nextVoicing(this.current, voiceIndex, delta) : null;
    const tracked = next && next.every((m, i) => ((m % 12) + 12) % 12 === pcsAfter[i]) ? next : null;
    const ctx = this.ready();
    if (!ctx) {
      this.current = tracked ?? centeredVoicing(pcsAfter);
      return;
    }
    const t = ctx.currentTime + 0.01;
    if (!tracked) {
      this.chordAt(centeredVoicing(pcsAfter), t);
      return;
    }
    this.stepAt(tracked, voiceIndex, t);
  }

  private stepAt(midis: readonly number[], moved: number, t: number): void {
    midis.forEach((m, i) => {
      const v = this.voices[i];
      if (i === moved) {
        this.setPitch(v, m, t, 0.09);
        this.strike(v, t + 0.02, 0.6);
      } else {
        this.sustain(v, t);
      }
    });
    this.current = [...midis];
  }

  /** Gentle, non-punishing muted wooden thud. */
  playReject(): void {
    const ctx = this.ready();
    if (!ctx || !this.thudOsc || !this.thudGain) return;
    const t = ctx.currentTime + 0.005;
    this.thudOsc.frequency.cancelScheduledValues(t);
    this.thudOsc.frequency.setValueAtTime(190, t);
    this.thudOsc.frequency.exponentialRampToValueAtTime(85, t + 0.07);
    this.thudGain.gain.cancelScheduledValues(t);
    this.thudGain.gain.setValueAtTime(0.0001, t);
    this.thudGain.gain.linearRampToValueAtTime(0.22, t + 0.004);
    this.thudGain.gain.setTargetAtTime(0, t + 0.004, 0.025);
  }

  /**
   * Schedules a progression on the audio clock, starting at chord `fromIndex` (0 = start chord;
   * used to resume a paused cascade). Returns the audio time of chord `fromIndex`, or null if silent.
   */
  scheduleLadder(
    start: readonly PitchClass[],
    moves: readonly { voiceIndex: number; delta: number }[],
    fromIndex = 0,
  ): number | null {
    const ctx = this.ready();
    if (!ctx || ctx.state !== 'running') return null;
    const voicings = ladderVoicings(start, moves);
    const t0 = ctx.currentTime + 0.08;
    this.chordAt(voicings[fromIndex], t0);
    for (let i = fromIndex; i < moves.length; i++) {
      this.stepAt(voicings[i + 1], moves[i].voiceIndex, t0 + (i + 1 - fromIndex) * PLAYBACK_STEP_SEC);
    }
    const end = t0 + (moves.length - fromIndex) * PLAYBACK_STEP_SEC + PLAYBACK_STEP_SEC * 1.4;
    this.voices.forEach((v) => this.release(v, end, 0.4));
    return t0;
  }

  silence(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.voices.forEach((v) => this.release(v, t, 0.06));
  }

  /** Re-seeds the remembered voicing (e.g. after undo) without sounding. */
  setCurrent(pcs: readonly PitchClass[]): void {
    this.current = centeredVoicing(pcs);
  }

  get masterNode(): GainNode | null {
    return this.master;
  }
}

/**
 * Drives onPlaybackStep(stepIndex) in lockstep with the audio clock when sound is on,
 * or with performance.now() in silent mode. `fromIndex` resumes a paused cascade
 * (audioStart is then the time of chord `fromIndex`). Returns a cancel function.
 */
export function runPlaybackClock(
  totalSteps: number,
  audioStart: number | null,
  getAudioTime: () => number | null,
  onStep: (stepIndex: number) => void,
  onDone: () => void,
  fromIndex = 0,
): () => void {
  let fired = fromIndex - 1;
  let raf = 0;
  let cancelled = false;
  const perfStart = performance.now() / 1000;
  const now = () => {
    if (audioStart !== null) {
      const t = getAudioTime();
      if (t !== null) return t - audioStart;
    }
    return performance.now() / 1000 - perfStart;
  };
  const tick = () => {
    if (cancelled) return;
    const elapsed = now();
    const idx = fromIndex + Math.floor(elapsed / PLAYBACK_STEP_SEC);
    while (fired < Math.min(idx, totalSteps)) {
      fired++;
      onStep(fired);
    }
    if (elapsed >= (totalSteps - fromIndex + 1) * PLAYBACK_STEP_SEC) {
      onDone();
      return;
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => {
    cancelled = true;
    cancelAnimationFrame(raf);
  };
}

export const synth = new StepwiseSynth();
