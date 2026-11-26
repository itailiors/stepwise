// Voice-indexed transitions: move exactly one voice by ±1/±2 semitones (mod 12),
// validated against the chord dictionary and the active DailyRule.
import type {
  ChordNode,
  ChordQuality,
  DailyRule,
  NoteSpellingMode,
  PitchClass,
  RejectReason,
  StepDelta,
  VoiceMove,
} from '../types/stepwise';
import { dictionaryFor, maskHasQuality, maskOf, mod12, popcount, recognizeChord } from './chords';

export const ALL_DELTAS: readonly StepDelta[] = [-2, -1, 1, 2];

export function ruleMaxStep(rule: DailyRule): 1 | 2 {
  return rule.maxStep;
}

export function ruleVoiceCount(rule: DailyRule): 3 | 4 {
  return rule.kind === 'four-voice-seventh' ? 4 : 3;
}

export function ruleForbiddenPc(rule: DailyRule): PitchClass | null {
  return rule.kind === 'lava-note' ? rule.forbiddenPc : null;
}

export function ruleRequiredQuality(rule: DailyRule): ChordQuality | null {
  return rule.kind === 'checkpoint-quality' ? rule.requiredQuality : null;
}

export function allowedDeltas(rule: DailyRule): StepDelta[] {
  const max = ruleMaxStep(rule);
  return ALL_DELTAS.filter((d) => Math.abs(d) <= max);
}

export const isWrap = (fromPc: number, delta: number): boolean => fromPc + delta < 0 || fromPc + delta > 11;

export type MoveResult =
  | { ok: true; chord: ChordNode; move: VoiceMove; pitchClasses: PitchClass[] }
  | { ok: false; reason: RejectReason; fromPc: PitchClass; toPc: PitchClass };

/** Applies one voice move to a voice-ordered chord and validates it. */
export function applyMove(
  pcs: readonly PitchClass[],
  voiceIndex: number,
  delta: StepDelta,
  rule: DailyRule,
  spelling: NoteSpellingMode = 'sharp',
): MoveResult {
  const fromPc = pcs[voiceIndex];
  const toPc = mod12(fromPc + delta);
  if (Math.abs(delta) > ruleMaxStep(rule)) return { ok: false, reason: 'half-step-locked', fromPc, toPc };
  if (ruleForbiddenPc(rule) === toPc) return { ok: false, reason: 'lava-blocked', fromPc, toPc };
  const next = pcs.map((pc, i) => (i === voiceIndex ? toPc : pc));
  if (new Set(next).size !== next.length) return { ok: false, reason: 'invalid-cluster', fromPc, toPc };
  const chord = recognizeChord(next, spelling);
  if (!chord || next.length !== ruleVoiceCount(rule)) return { ok: false, reason: 'invalid-cluster', fromPc, toPc };
  return {
    ok: true,
    chord,
    pitchClasses: next,
    move: { voiceIndex, fromPc, toPc, delta, wrappedOctave: isWrap(fromPc, delta) },
  };
}

export interface MaskEdge {
  mask: number;
  fromPc: PitchClass;
  toPc: PitchClass;
  delta: StepDelta;
}

/**
 * Neighbors of a chord set in the voice-leading graph. Voice identity does not change which
 * sets are reachable (any member can move), so the solver works on bitmasks and voices are
 * re-attached during path reconstruction. Ordering is deterministic (ascending pc, then delta).
 */
export function maskNeighbors(mask: number, rule: DailyRule): MaskEdge[] {
  const n = popcount(mask);
  const dict = dictionaryFor(n);
  const lava = ruleForbiddenPc(rule);
  const out: MaskEdge[] = [];
  for (let pc = 0; pc < 12; pc++) {
    if (!(mask & (1 << pc))) continue;
    for (const delta of allowedDeltas(rule)) {
      const toPc = mod12(pc + delta);
      if (toPc === lava) continue;
      if (mask & (1 << toPc)) continue; // unison collision
      const next = (mask & ~(1 << pc)) | (1 << toPc);
      if (!dict.has(next)) continue;
      out.push({ mask: next, fromPc: pc as PitchClass, toPc, delta });
    }
  }
  return out;
}

export function countTargetMatches(pcs: readonly number[], target: readonly number[]): number {
  const t = maskOf(target);
  return pcs.reduce((n, pc) => n + ((t >> mod12(pc)) & 1), 0);
}

export function isTargetReached(pcs: readonly number[], target: readonly number[]): boolean {
  return pcs.length === target.length && maskOf(pcs) === maskOf(target);
}

export function satisfiesCheckpoint(pcs: readonly number[], rule: DailyRule): boolean {
  const q = ruleRequiredQuality(rule);
  return q !== null && maskHasQuality(maskOf(pcs), q);
}
