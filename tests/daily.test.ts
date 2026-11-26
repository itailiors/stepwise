import { describe, expect, it } from 'vitest';
import { maskOf, popcount } from '../src/engine/chords';
import {
  addDaysUtc,
  generateDailyPuzzle,
  LAUNCH_EPOCH_UTC,
  lavaForcesDetour,
  PAR_BOUNDS,
  puzzleNumberFor,
  ruleKindForWeekday,
  weekdayUtc,
} from '../src/engine/daily';
import { applyMove } from '../src/engine/graph';
import { solve } from '../src/engine/solver';
import type { DailyStepwisePuzzle } from '../src/types/stepwise';

const DAYS = Array.from({ length: 365 }, (_, i) => addDaysUtc(LAUNCH_EPOCH_UTC, i));

describe('daily generator', () => {
  const puzzles: DailyStepwisePuzzle[] = DAYS.map((d) => generateDailyPuzzle(d));

  it('numbers puzzles from the launch epoch', () => {
    expect(puzzleNumberFor(LAUNCH_EPOCH_UTC)).toBe(1);
    expect(puzzles[364].puzzleNumber).toBe(365);
  });

  it('follows the Mon–Sun twist cadence', () => {
    for (const p of puzzles) expect(p.rule.kind).toBe(ruleKindForWeekday(weekdayUtc(p.dateUtc)));
    expect(ruleKindForWeekday(1)).toBe('standard');
    expect(ruleKindForWeekday(3)).toBe('lava-note');
    expect(ruleKindForWeekday(5)).toBe('checkpoint-quality');
    expect(ruleKindForWeekday(6)).toBe('half-steps-only');
    expect(ruleKindForWeekday(0)).toBe('four-voice-seventh');
  });

  it('365 days: every puzzle is solvable, in bounds and satisfies its rule', () => {
    for (const p of puzzles) {
      const [lo, hi] = PAR_BOUNDS[p.rule.kind];
      expect(p.parMoves).toBeGreaterThanOrEqual(lo);
      expect(p.parMoves).toBeLessThanOrEqual(hi);
      expect(p.maxMoves).toBe(p.parMoves + 3);
      expect(popcount(maskOf(p.start.pitchClasses) & maskOf(p.target.pitchClasses))).toBeLessThanOrEqual(1);
      expect(p.start.pitchClasses).toHaveLength(p.rule.kind === 'four-voice-seventh' ? 4 : 3);

      // Re-solve independently and replay the stored optimal path move by move.
      const again = solve(p.start.pitchClasses, p.target.pitchClasses, p.rule)!;
      expect(again.parMoves).toBe(p.parMoves);
      expect(again.parSemitones).toBe(p.parSemitones);
      let v = [...p.start.pitchClasses];
      for (const s of p.optimalPath) {
        const r = applyMove(v, s.move.voiceIndex, s.move.delta, p.rule);
        expect(r.ok).toBe(true);
        if (r.ok) v = r.pitchClasses;
      }
      expect(maskOf(v)).toBe(maskOf(p.target.pitchClasses));
      expect(p.optimalPath).toHaveLength(p.parMoves);

      if (p.rule.kind === 'lava-note') {
        const lava = p.rule.forbiddenPc;
        expect(p.start.pitchClasses).not.toContain(lava);
        expect(p.target.pitchClasses).not.toContain(lava);
        for (const s of p.optimalPath) expect(s.chord.pitchClasses).not.toContain(lava);
        const free = solve(p.start.pitchClasses, p.target.pitchClasses, { kind: 'standard', label: '', maxStep: 2 });
        expect(lavaForcesDetour(again, free)).toBe(true);
        // At least one unrestricted optimal route runs through the lava note.
        expect(again.routeCount).toBeLessThan(free!.routeCount);
      }
      if (p.rule.kind === 'checkpoint-quality') {
        expect(p.optimalPath.some((s) => s.chord.quality === 'dim')).toBe(true);
      }
      if (p.rule.kind === 'half-steps-only') {
        expect(p.optimalPath.every((s) => Math.abs(s.move.delta) === 1)).toBe(true);
      }
    }
  });

  it('is deterministic across repeated runs', () => {
    for (const d of DAYS.slice(0, 60)) {
      expect(JSON.stringify(generateDailyPuzzle(d))).toBe(JSON.stringify(generateDailyPuzzle(d)));
    }
  });

  it('varies from day to day', () => {
    const ids = new Set(puzzles.map((p) => `${p.start.id}>${p.target.id}`));
    expect(ids.size).toBeGreaterThan(100);
  });
});
