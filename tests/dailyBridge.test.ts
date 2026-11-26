import { describe, expect, it } from 'vitest';
import { chordFromRoot } from '../src/engine/chords';
import { todayUtc } from '../src/engine/daily';
import { solve } from '../src/engine/solver';
import {
  DAILY_KEY,
  buildDoneRecord,
  buildProgressRecord,
  emitDaily,
  labMoveFor,
  localDateKey,
  shouldReplace,
  type DailyStats,
} from '../src/state/daily';
import { buildSummary } from '../src/state/scoring';
import { applyResult, emptyStats, type KV } from '../src/state/storage';
import type { DailyRule, DailyStepwisePuzzle, LadderStep } from '../src/types/stepwise';

// 23:30 local on Nov 26 (Date(y, m, d, h, min) is local time).
const lateNight = new Date(2026, 10, 26, 23, 30);
const stats: DailyStats = { streak: 4, bestMoves: 2, played: 9 };

function memKV(): KV & { dump(): string | null } {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), dump: () => m.get(DAILY_KEY) ?? null };
}

function puzzle(rule: DailyRule = { kind: 'standard', label: 'Standard ±1–2', maxStep: 2 }): DailyStepwisePuzzle {
  const start = chordFromRoot(0, 'major');
  const target = chordFromRoot(6, 'minor');
  const r = solve(start.pitchClasses, target.pitchClasses, rule)!;
  return {
    puzzleNumber: 1,
    dateUtc: '2026-11-26',
    rule,
    start,
    target,
    parMoves: r.parMoves,
    parSemitones: r.parSemitones,
    maxMoves: r.parMoves + 3,
    optimalPath: r.optimalPath,
  };
}

const steps = (p: DailyStepwisePuzzle, n: number): LadderStep[] => p.optimalPath.slice(0, n);

describe('local day key', () => {
  it('rolls over at local midnight, not UTC', () => {
    expect(todayUtc(new Date(2026, 10, 26, 0, 1))).toBe('2026-11-26');
    expect(todayUtc(new Date(2026, 10, 25, 23, 59))).toBe('2026-11-25');
    expect(todayUtc(lateNight)).toBe(localDateKey(lateNight));
  });
});

describe('buildDoneRecord', () => {
  it('records a par solve for the hub', () => {
    const p = puzzle();
    const summary = buildSummary(p, { steps: steps(p, p.parMoves), undos: 0, invalidAttempts: 0, solved: true });
    const r = buildDoneRecord(p, summary, stats, lateNight);
    expect(r).toMatchObject({
      v: 1,
      gameId: 'stepwise',
      dateKey: '2026-11-26',
      puzzleNo: 1,
      status: 'done',
      score: p.parMoves,
      scoreLabel: `${p.parMoves} moves (Par)`,
      tierIcon: '⛳',
      streak: 4,
      bestScore: 2,
      playedCount: 9,
      shareText: `🪜 STEPWISE: ${p.parMoves} moves (PAR PURE)`,
      labMove: null,
      updatedAt: lateNight.getTime(),
    });
    expect(JSON.stringify(r).length).toBeLessThan(2048);
  });

  it('records a failed day as done with a null score', () => {
    const p = puzzle();
    const summary = buildSummary(p, { steps: steps(p, 1), undos: 0, invalidAttempts: 0, solved: false });
    expect(buildDoneRecord(p, summary, stats, lateNight)).toMatchObject({ status: 'done', score: null, scoreLabel: 'Out of moves', tierIcon: '✗' });
  });

  it('links the Diminished Pivot lab move only after a cleared Friday checkpoint', () => {
    const p = puzzle({ kind: 'checkpoint-quality', label: 'Checkpoint: Dim', maxStep: 2, requiredQuality: 'dim' });
    const solved = buildSummary(p, { steps: steps(p, p.parMoves), undos: 0, invalidAttempts: 0, solved: true });
    expect(labMoveFor(p, { ...solved, checkpointSatisfied: true })).toEqual({ slug: 'diminished-pivot', label: 'Diminished Pivot' });
    expect(labMoveFor(p, { ...solved, checkpointSatisfied: false })).toBeNull();
    expect(labMoveFor(puzzle(), solved)).toBeNull();
  });
});

describe('buildProgressRecord', () => {
  it('reports in_progress with a step count and par', () => {
    const p = puzzle();
    expect(buildProgressRecord(p, 2, stats, lateNight)).toMatchObject({
      status: 'in_progress',
      score: null,
      scoreLabel: `Step 2/${p.maxMoves} · Par ${p.parMoves}`,
      progressLabel: `Step 2/${p.maxMoves}`,
    });
  });

  it('treats zero moves as new', () => {
    expect(buildProgressRecord(puzzle(), 0, stats, lateNight).status).toBe('new');
  });
});

describe('shouldReplace / emitDaily', () => {
  const p = puzzle();
  const summary = buildSummary(p, { steps: steps(p, p.parMoves), undos: 0, invalidAttempts: 0, solved: true });
  const done = buildDoneRecord(p, summary, stats, lateNight);

  it('never regresses a finished local day', () => {
    expect(shouldReplace(done, buildProgressRecord(p, 1, stats, lateNight))).toBe(false);
    expect(shouldReplace(done, buildProgressRecord(p, 0, stats, lateNight))).toBe(false);
  });

  it('writes progress over an older day but not an empty "new"', () => {
    const yesterday = { ...done, dateKey: '2026-11-25' };
    expect(shouldReplace(yesterday, buildProgressRecord(p, 1, stats, lateNight))).toBe(true);
    expect(shouldReplace(yesterday, buildProgressRecord(p, 0, stats, lateNight))).toBe(false);
    expect(shouldReplace(null, buildProgressRecord(p, 0, stats, lateNight))).toBe(false);
  });

  it('writes daily:v1:stepwise and survives a throwing backend', () => {
    const kv = memKV();
    emitDaily(buildProgressRecord(p, 1, stats, lateNight), kv);
    expect(JSON.parse(kv.dump()!)).toMatchObject({ status: 'in_progress', gameId: 'stepwise' });
    emitDaily(done, kv);
    expect(JSON.parse(kv.dump()!).status).toBe('done');
    emitDaily(buildProgressRecord(p, 1, stats, lateNight), kv);
    expect(JSON.parse(kv.dump()!).status).toBe('done');

    const bad: KV = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(() => emitDaily(done, bad)).not.toThrow();
    expect(() => emitDaily(done, null)).not.toThrow();
  });
});

describe('bestMoves lifetime stat', () => {
  it('tracks the fewest moves across solved days only', () => {
    const p = puzzle();
    const solvedIn = (n: number) => ({
      ...buildSummary(p, { steps: steps(p, p.parMoves), undos: 0, invalidAttempts: 0, solved: true }),
      movesUsed: n,
    });
    const a = applyResult(emptyStats(), '2026-11-26', solvedIn(p.parMoves + 1));
    const b = applyResult(a, '2026-11-27', solvedIn(p.parMoves));
    const failed = applyResult(b, '2026-11-28', buildSummary(p, { steps: steps(p, 1), undos: 0, invalidAttempts: 0, solved: false }));
    expect(a.bestMoves).toBe(p.parMoves + 1);
    expect(b.bestMoves).toBe(p.parMoves);
    expect(failed.bestMoves).toBe(p.parMoves);
  });
});
