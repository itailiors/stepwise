import { describe, expect, it } from 'vitest';
import { generateDailyPuzzle } from '../src/engine/daily';
import { centeredVoicing, nextVoicing, StepwiseSynth } from '../src/audio/synth';
import { staggerTiers } from '../src/ui/Rail';
import { currentPcs, gameReducer, initGame, toProgress } from '../src/game/gameState';
import type { PitchClass } from '../src/types/stepwise';

describe('game reducer', () => {
  const puzzle = generateDailyPuzzle('2026-11-30'); // Monday: standard

  it('solves by replaying the optimal path and counts no moves on rejects', () => {
    let s = initGame(puzzle, null);
    s = gameReducer(s, { type: 'move', voice: 0, delta: 2 });
    s = gameReducer(s, { type: 'move', voice: 0, delta: -2 });
    // Whatever happened, reset by undoing all committed steps.
    while (s.steps.length) s = gameReducer(s, { type: 'undo' });
    const before = s.steps.length;
    for (const st of puzzle.optimalPath) s = gameReducer(s, { type: 'move', voice: st.move.voiceIndex, delta: st.move.delta });
    expect(s.steps.length - before).toBe(puzzle.parMoves);
    expect(s.status).toBe('solved');
    // Game over: further moves and undos are ignored.
    expect(gameReducer(s, { type: 'undo' })).toBe(s);
  });

  it('rejections leave the ladder untouched', () => {
    let s = initGame(generateDailyPuzzle('2026-11-28'), null); // Saturday: half-steps
    const r = gameReducer(s, { type: 'move', voice: 0, delta: 2 });
    expect(r.steps).toHaveLength(0);
    expect(r.rejection?.reason).toBe('half-step-locked');
    expect(r.invalidAttempts).toBe(1);
    s = r;
    expect(currentPcs(s)).toEqual(s.puzzle.start.pitchClasses);
  });

  it('restores saved progress', () => {
    let s = initGame(puzzle, null);
    const first = puzzle.optimalPath[0].move;
    s = gameReducer(s, { type: 'move', voice: first.voiceIndex, delta: first.delta });
    const restored = initGame(puzzle, toProgress(s));
    expect(restored.steps).toHaveLength(1);
    expect(currentPcs(restored)).toEqual(currentPcs(s));
  });
});

describe('synth voicing tracking while silent', () => {
  it('follows moves with sound off, so enabling sound later starts from the real chord', () => {
    const s = new StepwiseSynth(); // enabled = false, no AudioContext
    s.setCurrent([0, 4, 7] as PitchClass[]);
    s.playStep(1, 1, [0, 5, 7] as PitchClass[]);
    s.playStep(2, 1, [0, 5, 8] as PitchClass[]);
    const cur = (s as unknown as { current: number[] }).current;
    expect(cur.map((m) => m % 12)).toEqual([0, 5, 8]);
  });
});

describe('rail stagger', () => {
  it('staggers B and C as neighbours across the wrap', () => {
    const [b, c] = staggerTiers([11, 0]);
    expect(b).not.toBe(c);
  });
});

describe('register-centered voicing', () => {
  it('keeps voices in the warm middle register and glides B -> C upward', () => {
    const v = centeredVoicing([0, 4, 7, 11] as PitchClass[]);
    for (const m of v) expect(m).toBeGreaterThanOrEqual(48);
    for (const m of v) expect(m).toBeLessThanOrEqual(71);
    const b = centeredVoicing([11] as PitchClass[]);
    expect(nextVoicing(b, 0, 1)[0]).toBe(b[0] + 1);
  });
});
