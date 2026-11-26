import { describe, expect, it } from 'vitest';
import { maskOf } from '../src/engine/chords';
import { applyMove } from '../src/engine/graph';
import { solve } from '../src/engine/solver';
import type { DailyRule, LadderStep, PitchClass } from '../src/types/stepwise';

const C_MAJ = [0, 4, 7] as PitchClass[];
const FS_MIN = [6, 9, 1] as PitchClass[];
const STANDARD: DailyRule = { kind: 'standard', label: 'Standard', maxStep: 2 };
const HALF: DailyRule = { kind: 'half-steps-only', label: 'Half-Steps', maxStep: 1 };

/** Replays a path from the start through applyMove to prove every step is legal. */
function replay(start: PitchClass[], path: LadderStep[], rule: DailyRule): PitchClass[] {
  let v = [...start];
  for (const step of path) {
    const r = applyMove(v, step.move.voiceIndex, step.move.delta, rule);
    expect(r.ok).toBe(true);
    if (!r.ok) break;
    v = r.pitchClasses;
    expect(v).toEqual(step.chord.pitchClasses);
  }
  return v;
}

describe('par solver benchmarks', () => {
  it('C Maj -> F# Min standard: Par 3, 5 semitones', () => {
    const r = solve(C_MAJ, FS_MIN, STANDARD)!;
    expect(r.parMoves).toBe(3);
    expect(r.parSemitones).toBe(5);
    expect(maskOf(replay(C_MAJ, r.optimalPath, STANDARD))).toBe(maskOf(FS_MIN));
  });

  it('C Maj -> F# Min half-steps only: Par 5, 5 semitones', () => {
    const r = solve(C_MAJ, FS_MIN, HALF)!;
    expect(r.parMoves).toBe(5);
    expect(r.parSemitones).toBe(5);
    expect(r.optimalPath.every((s) => Math.abs(s.move.delta) === 1)).toBe(true);
    replay(C_MAJ, r.optimalPath, HALF);
  });

  it('C Maj -> F# Min with Lava G# never touches pitch class 8', () => {
    const lava: DailyRule = { kind: 'lava-note', label: 'Lava', maxStep: 2, forbiddenPc: 8 };
    const r = solve(C_MAJ, FS_MIN, lava)!;
    expect(r).not.toBeNull();
    for (const s of r.optimalPath) expect(s.chord.pitchClasses).not.toContain(8);
    replay(C_MAJ, r.optimalPath, lava);
  });

  it('C Maj -> F# Min with Checkpoint: dim passes through a dim chord', () => {
    const cp: DailyRule = { kind: 'checkpoint-quality', label: 'Checkpoint', maxStep: 2, requiredQuality: 'dim' };
    const r = solve(C_MAJ, FS_MIN, cp)!;
    expect(r.optimalPath.some((s) => s.chord.quality === 'dim' && s.satisfiedCheckpoint)).toBe(true);
    expect(r.parMoves).toBeGreaterThanOrEqual(3);
    replay(C_MAJ, r.optimalPath, cp);
  });

  it('Cmaj7 -> Bmaj7 4-voice: Par 4, 4 semitones with an octave wrap', () => {
    const rule: DailyRule = { kind: 'four-voice-seventh', label: '4-Voice', maxStep: 2, voiceCount: 4 };
    const start = [0, 4, 7, 11] as PitchClass[];
    const r = solve(start, [11, 3, 6, 10] as PitchClass[], rule)!;
    expect(r.parMoves).toBe(4);
    expect(r.parSemitones).toBe(4);
    expect(r.optimalPath.some((s) => s.move.wrappedOctave)).toBe(true);
    const end = replay(start, r.optimalPath, rule);
    expect(maskOf(end)).toBe(maskOf([11, 3, 6, 10]));
  });

  it('tracks cumulative semitones and target matches', () => {
    const r = solve(C_MAJ, FS_MIN, STANDARD)!;
    expect(r.optimalPath.at(-1)!.cumulativeSemitones).toBe(5);
    expect(r.optimalPath.at(-1)!.matchedTargetCount).toBe(3);
    expect(r.optimalPath.map((s) => s.stepIndex)).toEqual([1, 2, 3]);
  });

  it('solves in well under 2ms on average', () => {
    const t0 = performance.now();
    for (let i = 0; i < 200; i++) solve(C_MAJ, FS_MIN, STANDARD);
    expect((performance.now() - t0) / 200).toBeLessThan(2);
  });
});
