import { describe, expect, it } from 'vitest';
import {
  formatSymbol,
  recognizeChord,
  SEVENTH_DICTIONARY,
  TRIAD_DICTIONARY,
} from '../src/engine/chords';
import { applyMove } from '../src/engine/graph';
import type { DailyRule, PitchClass } from '../src/types/stepwise';

const pcs = (...n: number[]) => n as PitchClass[];
const STANDARD: DailyRule = { kind: 'standard', label: 'Standard', maxStep: 2 };

describe('chord dictionary', () => {
  it('has 52 unique triad sets and 51 unique seventh sets', () => {
    expect(TRIAD_DICTIONARY.size).toBe(52);
    expect(SEVENTH_DICTIONARY.size).toBe(51);
  });
});

describe('triad recognition', () => {
  it.each([
    [[0, 4, 7], 'major', 'C Maj', 'major'],
    [[9, 0, 4], 'minor', 'A Min', 'minor'],
    [[11, 2, 5], 'dim', 'B Dim', 'dim'],
    [[0, 4, 8], 'aug', 'C Aug', 'aug'],
    [[2, 4, 9], 'sus2', 'Dsus2', 'sus'],
    [[0, 5, 7], 'sus4', 'Csus4', 'sus'],
  ])('%j -> %s', (notes, quality, symbol, token) => {
    const c = recognizeChord(notes)!;
    expect(c.quality).toBe(quality);
    expect(c.symbol).toBe(symbol);
    expect(c.token).toBe(token);
  });

  it('recognizes every inversion and voice order of the same set', () => {
    for (const order of [[0, 4, 7], [4, 7, 0], [7, 0, 4], [7, 4, 0], [4, 0, 7]]) {
      const c = recognizeChord(order)!;
      expect(c.quality).toBe('major');
      expect(c.root).toBe(0);
      expect(c.id).toBe('0-4-7');
      expect(c.pitchClasses).toEqual(order);
    }
  });

  it('handles enharmonic spelling (C#/Db)', () => {
    expect(recognizeChord([1, 5, 8], 'sharp')!.symbol).toBe('C# Maj');
    expect(recognizeChord([1, 5, 8], 'flat')!.symbol).toBe('Db Maj');
    expect(recognizeChord([6, 9, 1], 'flat')!.symbol).toBe('Gb Min');
    expect(formatSymbol(10, 'minor', 'flat')).toBe('Bb Min');
  });

  it('treats augmented triads as one symmetric set, named after voice 1', () => {
    const a = recognizeChord([0, 4, 8])!;
    const b = recognizeChord([4, 8, 0])!;
    const c = recognizeChord([8, 0, 4], 'flat')!;
    expect(a.id).toBe(b.id);
    expect(a.symbol).toBe('C Aug');
    expect(b.symbol).toBe('E Aug');
    expect(c.symbol).toBe('Ab Aug');
  });

  it('names a shared sus2/sus4 set after voice 1, preferring sus4 otherwise', () => {
    expect(recognizeChord([0, 2, 7])!.symbol).toBe('Csus2');
    expect(recognizeChord([7, 0, 2])!.symbol).toBe('Gsus4');
    expect(recognizeChord([2, 7, 0])!.symbol).toBe('Gsus4');
  });

  it('rejects clusters and duplicates', () => {
    expect(recognizeChord([0, 1, 7])).toBeNull();
    expect(recognizeChord([0, 0, 7])).toBeNull();
    expect(recognizeChord([0, 2, 4])).toBeNull();
  });
});

describe('seventh recognition', () => {
  it.each([
    [[0, 4, 7, 11], 'maj7', 'Cmaj7', 'seventh'],
    [[7, 11, 2, 5], 'dom7', 'G7', 'seventh'],
    [[2, 5, 9, 0], 'min7', 'Dm7', 'minor'],
    [[11, 2, 5, 9], 'm7b5', 'Bm7b5', 'dim'],
    [[1, 4, 7, 10], 'dim7', 'C#dim7', 'dim'],
  ])('%j -> %s', (notes, quality, symbol, token) => {
    const c = recognizeChord(notes)!;
    expect(c.quality).toBe(quality);
    expect(c.symbol).toBe(symbol);
    expect(c.token).toBe(token);
  });

  it('recognizes seventh inversions', () => {
    expect(recognizeChord([4, 7, 11, 0])!.quality).toBe('maj7');
    expect(recognizeChord([11, 0, 4, 7])!.root).toBe(0);
  });

  it('treats dim7 as symmetric: 3 unique sets, named after voice 1', () => {
    const dim7Sets = [...SEVENTH_DICTIONARY.values()].filter((r) => r.some((x) => x.quality === 'dim7'));
    expect(dim7Sets).toHaveLength(3);
    expect(dim7Sets.every((r) => r.length === 4)).toBe(true);
    expect(recognizeChord([0, 3, 6, 9])!.symbol).toBe('Cdim7');
    expect(recognizeChord([9, 0, 3, 6])!.symbol).toBe('Adim7');
    expect(recognizeChord([3, 6, 9, 0], 'flat')!.symbol).toBe('Ebdim7');
  });
});

describe('voice moves', () => {
  it('moves one voice and reports a wrap across B/C', () => {
    const r = applyMove(pcs(0, 4, 7, 11), 3, -1, { kind: 'four-voice-seventh', label: '', maxStep: 2, voiceCount: 4 });
    expect(r.ok).toBe(true);
    const w = applyMove(pcs(0, 3, 6, 10), 0, -1, { kind: 'four-voice-seventh', label: '', maxStep: 2, voiceCount: 4 });
    expect(w.ok && w.move.wrappedOctave).toBe(true);
    expect(w.ok && w.chord.symbol).toBe('Bmaj7');
  });

  it('rejects unisons, clusters, lava and locked steps', () => {
    expect(applyMove(pcs(0, 4, 7), 1, 2, STANDARD)).toMatchObject({ ok: false, reason: 'invalid-cluster' }); // 0-6-7
    expect(applyMove(pcs(0, 2, 7), 0, 2, STANDARD)).toMatchObject({ ok: false, reason: 'invalid-cluster' }); // unison
    expect(applyMove(pcs(0, 4, 7), 2, 1, { kind: 'lava-note', label: '', maxStep: 2, forbiddenPc: 8 })).toMatchObject({
      ok: false,
      reason: 'lava-blocked',
    });
    expect(applyMove(pcs(0, 4, 7), 2, 2, { kind: 'half-steps-only', label: '', maxStep: 1 })).toMatchObject({
      ok: false,
      reason: 'half-step-locked',
    });
  });
});
