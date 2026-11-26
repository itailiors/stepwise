import { describe, expect, it } from 'vitest';
import { chordFromRoot, chordSpelling, formatSymbol } from '../src/engine/chords';
import { solve } from '../src/engine/solver';
import { buildShareText, buildSummary, rankFor } from '../src/state/scoring';
import { applyResult, displayStreak, emptyStats, loadPrefs, loadProgress, PREFS_KEY, saveProgress, type KV } from '../src/state/storage';
import type { DailyRule, DailyStepwisePuzzle } from '../src/types/stepwise';

function memStore(): KV {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

function puzzle(rule: DailyRule): DailyStepwisePuzzle {
  const start = chordFromRoot(0, 'major');
  const target = chordFromRoot(6, 'minor');
  const r = solve(start.pitchClasses, target.pitchClasses, rule)!;
  return {
    puzzleNumber: 88,
    dateUtc: '2027-02-21',
    rule,
    start,
    target,
    parMoves: r.parMoves,
    parSemitones: r.parSemitones,
    maxMoves: r.parMoves + 3,
    optimalPath: r.optimalPath,
  };
}

describe('rank & medals', () => {
  it('awards golf ranks', () => {
    expect(rankFor(true, 2, 3, 4)).toBe('eagle');
    expect(rankFor(true, 3, 3, 0)).toBe('par-pure');
    expect(rankFor(true, 3, 3, 1)).toBe('par');
    expect(rankFor(true, 6, 3, 0)).toBe('solved');
    expect(rankFor(false, 6, 3, 0)).toBe('out-of-moves');
  });

  it('adds Half-Step Master on half-step clears', () => {
    const p = puzzle({ kind: 'half-steps-only', label: 'Half-Steps ±1', maxStep: 1 });
    const s = buildSummary(p, { steps: p.optimalPath, undos: 0, invalidAttempts: 2, solved: true });
    expect(s.rank).toBe('par-pure');
    expect(s.medalId).toBe('medal-par-pure');
    expect(s.challengeMedalId).toBe('medal-half-step-master');
  });
});

describe('share card', () => {
  it('matches the spec format', () => {
    const p = puzzle({ kind: 'half-steps-only', label: 'Half-Steps ±1', maxStep: 1 });
    const s = buildSummary(p, { steps: p.optimalPath, undos: 0, invalidAttempts: 0, solved: true });
    const { text } = buildShareText(p, s);
    const lines = text.split('\n');
    expect(lines[0]).toBe('🪜 STEPWISE #88 (Half-Steps Only)');
    expect(lines[1]).toBe('C Maj ──▶ F# Min | Par 5');
    expect(lines).toHaveLength(2 + 5 + 2);
    for (const row of lines.slice(2, 7)) expect(row).toMatch(/^[⬜🟩]{3}  \([+-]1\)$/u);
    expect(lines.at(-2)).toBe('Score: 5 moves · 5 semitones (⛳ PAR PURE · 0 undos)');
    expect(lines.at(-1)).toBe('https://itailiors.github.io/stepwise/');
    expect(text).not.toMatch(/Csus|Dim|Aug/); // spoiler-free
  });

  it('marks checkpoint steps with a diamond', () => {
    const p = puzzle({ kind: 'checkpoint-quality', label: 'Checkpoint: Dim', maxStep: 2, requiredQuality: 'dim' });
    const s = buildSummary(p, { steps: p.optimalPath, undos: 0, invalidAttempts: 0, solved: true });
    expect(buildShareText(p, s).text).toContain('💎');
  });
});

describe('auto spelling', () => {
  // Playtest: "D# Maj (D# · G · A#)" and "F Min (F · G# · C)" read wrong to a first-time player.
  it('spells chords the way they are usually written', () => {
    expect(formatSymbol(3, 'major', 'auto')).toBe('Eb Maj');
    expect(chordSpelling(5, 'minor')).toBe('flat'); // F Min -> Ab
    expect(formatSymbol(6, 'major', 'auto')).toBe('F# Maj');
    expect(formatSymbol(1, 'minor', 'auto')).toBe('C# Min');
    expect(formatSymbol(8, 'dim', 'auto')).toBe('G# Dim');
    expect(chordSpelling(4, 'dim')).toBe('flat'); // E Dim -> Bb
    expect(formatSymbol(10, 'dom7', 'auto')).toBe('Bb7');
  });
});

describe('storage', () => {
  it('round-trips progress and defaults prefs to light', () => {
    const store = memStore();
    saveProgress('2027-01-01', { moves: [{ voiceIndex: 0, delta: 1 }], undos: 1, invalidAttempts: 0, status: 'playing' }, store);
    expect(loadProgress('2027-01-01', store)!.moves).toHaveLength(1);
    expect(loadPrefs(store)).toMatchObject({ inputView: 'rail', noteSpelling: 'auto', soundEnabled: false });
  });

  it('treats an old default "sharp" save as auto, but keeps an explicit choice', () => {
    const store = memStore();
    store.setItem(PREFS_KEY, JSON.stringify({ theme: 'light', noteSpelling: 'sharp' }));
    expect(loadPrefs(store).noteSpelling).toBe('auto');
    store.setItem(PREFS_KEY, JSON.stringify({ theme: 'light', noteSpelling: 'sharp', spellingChosen: true }));
    expect(loadPrefs(store).noteSpelling).toBe('sharp');
  });

  it('tracks streaks, distribution and medals once per day', () => {
    const p = puzzle({ kind: 'standard', label: 'Standard', maxStep: 2 });
    const win = buildSummary(p, { steps: p.optimalPath, undos: 0, invalidAttempts: 0, solved: true });
    let st = applyResult(emptyStats(), '2027-01-01', win);
    st = applyResult(st, '2027-01-01', win); // idempotent
    st = applyResult(st, '2027-01-02', win);
    st = applyResult(st, '2027-01-01', win); // re-opening an older finished day doesn't recount
    expect(st).toMatchObject({ played: 2, won: 2, currentStreak: 2, maxStreak: 2 });
    expect(st.distribution['par-pure']).toBe(2);
    expect(st.medals['medal-par-pure']).toBe(2);
    expect(displayStreak(st, '2027-01-03')).toBe(2);
    expect(displayStreak(st, '2027-01-05')).toBe(0);
    const loss = buildSummary(p, { steps: p.optimalPath.slice(0, 1), undos: 0, invalidAttempts: 0, solved: false });
    st = applyResult(st, '2027-01-03', loss);
    expect(st.currentStreak).toBe(0);
    expect(st.distribution.missed).toBe(1);
    expect(st.maxStreak).toBe(2);
  });
});
