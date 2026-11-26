// Canonical chord dictionary: every 3-voice triad and 4-voice seventh chord,
// keyed by a 12-bit pitch-class bitmask (inversion- and enharmonic-agnostic).
import type { ChordNode, ChordQuality, NoteSpellingMode, PitchClass, QualityToken } from '../types/stepwise';

export const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
export const BLACK_PCS: ReadonlySet<number> = new Set([1, 3, 6, 8, 10]);

export const mod12 = (n: number): PitchClass => ((((n % 12) + 12) % 12) as PitchClass);

export function pcName(pc: number, spelling: NoteSpellingMode = 'sharp'): string {
  return (spelling === 'flat' ? FLAT_NAMES : SHARP_NAMES)[mod12(pc)];
}

interface QualityDef {
  intervals: readonly number[];
  token: QualityToken;
  label: string;
  /** Builds the display symbol from a spelled root name. */
  format: (root: string) => string;
  /** Lower = preferred when one pitch set has several readings (e.g. Csus4 = Fsus2). */
  priority: number;
}

export const TRIAD_QUALITIES = ['major', 'minor', 'dim', 'aug', 'sus2', 'sus4'] as const satisfies readonly ChordQuality[];
export const SEVENTH_QUALITIES = ['maj7', 'dom7', 'min7', 'm7b5', 'dim7'] as const satisfies readonly ChordQuality[];

export const QUALITY_DEFS: Record<ChordQuality, QualityDef> = {
  major: { intervals: [0, 4, 7], token: 'major', label: 'Maj', format: (r) => `${r} Maj`, priority: 0 },
  minor: { intervals: [0, 3, 7], token: 'minor', label: 'Min', format: (r) => `${r} Min`, priority: 1 },
  dim: { intervals: [0, 3, 6], token: 'dim', label: 'Dim', format: (r) => `${r} Dim`, priority: 2 },
  aug: { intervals: [0, 4, 8], token: 'aug', label: 'Aug', format: (r) => `${r} Aug`, priority: 3 },
  sus4: { intervals: [0, 5, 7], token: 'sus', label: 'sus4', format: (r) => `${r}sus4`, priority: 4 },
  sus2: { intervals: [0, 2, 7], token: 'sus', label: 'sus2', format: (r) => `${r}sus2`, priority: 5 },
  maj7: { intervals: [0, 4, 7, 11], token: 'seventh', label: 'maj7', format: (r) => `${r}maj7`, priority: 0 },
  dom7: { intervals: [0, 4, 7, 10], token: 'seventh', label: 'dom7', format: (r) => `${r}7`, priority: 1 },
  min7: { intervals: [0, 3, 7, 10], token: 'minor', label: 'm7', format: (r) => `${r}m7`, priority: 2 },
  m7b5: { intervals: [0, 3, 6, 10], token: 'dim', label: 'm7b5', format: (r) => `${r}m7b5`, priority: 3 },
  dim7: { intervals: [0, 3, 6, 9], token: 'dim', label: 'dim7', format: (r) => `${r}dim7`, priority: 4 },
};

export interface ChordReading {
  root: PitchClass;
  quality: ChordQuality;
}

export const maskOf = (pcs: readonly number[]): number => pcs.reduce((m, pc) => m | (1 << mod12(pc)), 0);

export function pcsOfMask(mask: number): PitchClass[] {
  const out: PitchClass[] = [];
  for (let pc = 0; pc < 12; pc++) if (mask & (1 << pc)) out.push(pc as PitchClass);
  return out;
}

export const popcount = (mask: number): number => {
  let n = 0;
  for (let m = mask; m; m &= m - 1) n++;
  return n;
};

export const chordId = (pcs: readonly number[]): string => pcsOfMask(maskOf(pcs)).join('-');

function buildDictionary(qualities: readonly ChordQuality[]): Map<number, ChordReading[]> {
  const dict = new Map<number, ChordReading[]>();
  for (const quality of qualities) {
    for (let root = 0; root < 12; root++) {
      const mask = maskOf(QUALITY_DEFS[quality].intervals.map((i) => root + i));
      const readings = dict.get(mask) ?? [];
      readings.push({ root: root as PitchClass, quality });
      dict.set(mask, readings);
    }
  }
  return dict;
}

/** 52 unique 3-voice pitch-class sets (aug collapses to 4, sus2/sus4 share 12). */
export const TRIAD_DICTIONARY = buildDictionary(TRIAD_QUALITIES);
/** 51 unique 4-voice pitch-class sets (dim7 collapses to 3). */
export const SEVENTH_DICTIONARY = buildDictionary(SEVENTH_QUALITIES);

export function dictionaryFor(voiceCount: number): Map<number, ChordReading[]> {
  return voiceCount === 4 ? SEVENTH_DICTIONARY : TRIAD_DICTIONARY;
}

export function readingsOf(pcs: readonly number[]): ChordReading[] {
  const mask = maskOf(pcs);
  if (popcount(mask) !== pcs.length) return [];
  return dictionaryFor(pcs.length).get(mask) ?? [];
}

export function maskHasQuality(mask: number, quality: ChordQuality): boolean {
  const n = popcount(mask);
  return (dictionaryFor(n).get(mask) ?? []).some((r) => r.quality === quality);
}

/**
 * Picks one reading for display: the reading rooted on Voice 1 wins (so an aug / dim7 /
 * sus chord names itself after its "bass" voice), otherwise the lowest-priority quality.
 */
export function pickReading(readings: readonly ChordReading[], voice1: number): ChordReading {
  const sorted = [...readings].sort(
    (a, b) => QUALITY_DEFS[a.quality].priority - QUALITY_DEFS[b.quality].priority || a.root - b.root,
  );
  return sorted.find((r) => r.root === voice1) ?? sorted[0];
}

export function formatSymbol(root: number, quality: ChordQuality, spelling: NoteSpellingMode = 'sharp'): string {
  return QUALITY_DEFS[quality].format(pcName(root, spelling));
}

export function makeChordNode(pcs: readonly number[], reading: ChordReading, spelling: NoteSpellingMode = 'sharp'): ChordNode {
  const def = QUALITY_DEFS[reading.quality];
  return {
    id: chordId(pcs),
    symbol: def.format(pcName(reading.root, spelling)),
    quality: reading.quality,
    token: def.token,
    qualityLabel: def.label,
    root: reading.root,
    pitchClasses: pcs.map(mod12),
  };
}

/** Recognizes any voicing (any inversion / voice order / enharmonic spelling). Null if not a chord. */
export function recognizeChord(pcs: readonly number[], spelling: NoteSpellingMode = 'sharp'): ChordNode | null {
  if (pcs.length !== 3 && pcs.length !== 4) return null;
  const readings = readingsOf(pcs);
  if (readings.length === 0) return null;
  return makeChordNode(pcs, pickReading(readings, mod12(pcs[0])), spelling);
}

/** Root-position voicing of a chord (Voice 1 = root). */
export function rootPosition(root: number, quality: ChordQuality): PitchClass[] {
  return QUALITY_DEFS[quality].intervals.map((i) => mod12(root + i));
}

export function chordFromRoot(root: number, quality: ChordQuality, spelling: NoteSpellingMode = 'sharp'): ChordNode {
  return makeChordNode(rootPosition(root, quality), { root: mod12(root), quality }, spelling);
}

/** Re-spells an existing node (sharps <-> flats) without changing its reading. */
export function respell(node: ChordNode, spelling: NoteSpellingMode): ChordNode {
  return { ...node, symbol: formatSymbol(node.root, node.quality, spelling) };
}
