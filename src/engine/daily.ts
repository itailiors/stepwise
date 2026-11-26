// Deterministic UTC-date daily puzzle generator with the Mon–Sun twist cadence.
import type { ChordQuality, DailyRule, DailyStepwisePuzzle, NoteSpellingMode, PitchClass, RuleKind } from '../types/stepwise';
import { chordFromRoot, maskOf, pcName, popcount, rootPosition } from './chords';
import { solve, type SolveResult } from './solver';

/** Puzzle #1 date. */
export const LAUNCH_EPOCH_UTC = '2026-11-26';
const DAY_MS = 86_400_000;

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * FNV-1a 32-bit string hash + murmur3 fmix32 avalanche → PRNG seed. The finalizer matters:
 * consecutive dates differ in one character, and raw FNV seeds gave correlated daily picks.
 */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export function toUtcDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const parseUtc = (dateUtc: string): number => Date.parse(`${dateUtc}T00:00:00Z`);

export function puzzleNumberFor(dateUtc: string): number {
  return Math.round((parseUtc(dateUtc) - parseUtc(LAUNCH_EPOCH_UTC)) / DAY_MS) + 1;
}

export function addDaysUtc(dateUtc: string, days: number): string {
  return toUtcDateString(new Date(parseUtc(dateUtc) + days * DAY_MS));
}

/** 0 = Sunday … 6 = Saturday. */
export const weekdayUtc = (dateUtc: string): number => new Date(parseUtc(dateUtc)).getUTCDay();

export function ruleKindForWeekday(day: number): RuleKind {
  switch (day) {
    case 1:
    case 2:
      return 'standard';
    case 3:
    case 4:
      return 'lava-note';
    case 5:
      return 'checkpoint-quality';
    case 6:
      return 'half-steps-only';
    default:
      return 'four-voice-seventh';
  }
}

export const PAR_BOUNDS: Record<RuleKind, [number, number]> = {
  standard: [3, 5],
  'lava-note': [3, 5],
  'checkpoint-quality': [3, 5],
  'half-steps-only': [4, 6],
  'four-voice-seventh': [3, 5],
};

/** Human label for the header pill, spelled with the user's accidental preference. */
export function ruleLabel(rule: DailyRule, spelling: NoteSpellingMode = 'sharp'): string {
  switch (rule.kind) {
    case 'standard':
      return 'Standard ±1–2';
    case 'half-steps-only':
      return 'Half-Steps ±1';
    case 'lava-note':
      return `Lava Note: ${pcName(rule.forbiddenPc, spelling)}`;
    case 'checkpoint-quality':
      return 'Checkpoint: Dim';
    case 'four-voice-seventh':
      return '4-Voice 7ths';
  }
}

/** Name used inside the share card header, e.g. "(Half-Steps Only)". */
export function ruleShareName(rule: DailyRule, spelling: NoteSpellingMode = 'sharp'): string {
  switch (rule.kind) {
    case 'standard':
      return 'Standard';
    case 'half-steps-only':
      return 'Half-Steps Only';
    case 'lava-note':
      return `Lava ${pcName(rule.forbiddenPc, spelling)}`;
    case 'checkpoint-quality':
      return 'Checkpoint Dim';
    case 'four-voice-seventh':
      return '4-Voice 7ths';
  }
}

export function ruleDetail(rule: DailyRule, spelling: NoteSpellingMode = 'sharp'): string {
  switch (rule.kind) {
    case 'standard':
      return 'Standard Day: Slide exactly one voice by ±1 or ±2 semitones per turn. Every step must form a real triad.';
    case 'half-steps-only':
      return 'Half-Steps Only: Each move shifts one voice by exactly +1 or -1 semitone (±2 is locked).';
    case 'lava-note': {
      const n = pcName(rule.forbiddenPc, 'sharp');
      const f = pcName(rule.forbiddenPc, 'flat');
      const name = n === f ? n : spelling === 'flat' ? `${f} / ${n}` : `${n} / ${f}`;
      return `Lava Note Hazard: Pitch class ${name} is blocked today. Detour around it in ±1 or ±2 steps.`;
    }
    case 'checkpoint-quality':
      return 'Friday Checkpoint: Your progression must pass through at least one Diminished triad before resolving.';
    case 'four-voice-seventh':
      return 'Sunday 4-Voice Edition: Navigate 4-note seventh chords (maj7, 7, m7, m7b5, dim7) with octave wrapping.';
  }
}

const ENDPOINT_TRIADS: readonly ChordQuality[] = ['major', 'minor'];
const ENDPOINT_SEVENTHS: readonly ChordQuality[] = ['maj7', 'dom7', 'min7', 'm7b5'];

function makeRule(kind: RuleKind, forbiddenPc: PitchClass = 0): DailyRule {
  switch (kind) {
    case 'standard':
      return { kind, label: 'Standard ±1–2', maxStep: 2 };
    case 'half-steps-only':
      return { kind, label: 'Half-Steps ±1', maxStep: 1 };
    case 'lava-note':
      return { kind, label: `Lava Note: ${pcName(forbiddenPc)}`, maxStep: 2, forbiddenPc };
    case 'checkpoint-quality':
      return { kind, label: 'Checkpoint: Dim', maxStep: 2, requiredQuality: 'dim' };
    case 'four-voice-seventh':
      return { kind, label: '4-Voice 7ths', maxStep: 2, voiceCount: 4 };
  }
}

const cost = (r: SolveResult) => r.parMoves * 1000 + r.parSemitones;
const MAX_ATTEMPTS = 4000;

/**
 * In the triad graph a single blocked pitch class almost never lengthens par (there is
 * always an equally short way around), so "forces a detour" means: par gets strictly worse,
 * OR the lava note blocks at least 25% of the unrestricted optimal routes — the obvious
 * lines run into lava and the player has to find the surviving ones.
 */
export function lavaForcesDetour(withLava: SolveResult, free: SolveResult | null): boolean {
  if (!free) return false;
  if (cost(withLava) > cost(free)) return true;
  return withLava.routeCount * 4 <= free.routeCount * 3;
}

/** Generates the daily puzzle for a UTC date. Pure and deterministic. */
export function generateDailyPuzzle(dateUtc: string, kindOverride?: RuleKind): DailyStepwisePuzzle {
  const rand = mulberry32(hashString(`stepwise:${dateUtc}`));
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
  const kind = kindOverride ?? ruleKindForWeekday(weekdayUtc(dateUtc));
  const qualities = kind === 'four-voice-seventh' ? ENDPOINT_SEVENTHS : ENDPOINT_TRIADS;
  const [minPar, maxPar] = PAR_BOUNDS[kind];

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const startRoot = Math.floor(rand() * 12);
    const startQ = pick(qualities);
    const targetRoot = Math.floor(rand() * 12);
    const targetQ = pick(qualities);
    const lavaPc = Math.floor(rand() * 12) as PitchClass;

    const startPcs = rootPosition(startRoot, startQ);
    const targetPcs = rootPosition(targetRoot, targetQ);
    const shared = popcount(maskOf(startPcs) & maskOf(targetPcs));
    if (shared > 1) continue;

    const rule = makeRule(kind, lavaPc);
    if (rule.kind === 'lava-note') {
      if (startPcs.includes(lavaPc) || targetPcs.includes(lavaPc)) continue;
    }

    const result = solve(startPcs, targetPcs, rule);
    if (!result || result.parMoves < minPar || result.parMoves > maxPar) continue;

    if (rule.kind === 'lava-note' && !lavaForcesDetour(result, solve(startPcs, targetPcs, makeRule('standard')))) continue;

    return {
      puzzleNumber: puzzleNumberFor(dateUtc),
      dateUtc,
      rule,
      start: chordFromRoot(startRoot, startQ),
      target: chordFromRoot(targetRoot, targetQ),
      parMoves: result.parMoves,
      parSemitones: result.parSemitones,
      maxMoves: result.parMoves + 3,
      optimalPath: result.optimalPath,
    };
  }
  throw new Error(`No valid ${kind} puzzle found for ${dateUtc}`);
}

export function todayUtc(now: Date = new Date()): string {
  return toUtcDateString(now);
}
