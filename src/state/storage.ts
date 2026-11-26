// localStorage persistence: per-day progress, lifetime stats, preferences.
// Every access is wrapped so private windows / blocked storage never break the game.
import { addDaysUtc } from '../engine/daily';
import type { InputViewMode, MedalId, NoteSpellingMode, SolveSummary, StepDelta, ThemeMode } from '../types/stepwise';
import { bucketFor, DIST_BUCKETS, type DistBucket } from './scoring';

export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function defaultStore(): KV | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function read<T>(store: KV | null, key: string): T | null {
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(store: KV | null, key: string, value: unknown): void {
  if (!store) return;
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / disabled storage: progress just isn't kept */
  }
}

// ---------- Per-day puzzle progress ----------

export interface SavedMove {
  voiceIndex: number;
  delta: StepDelta;
}

export interface PuzzleProgress {
  moves: SavedMove[];
  undos: number;
  invalidAttempts: number;
  status: 'playing' | 'solved' | 'failed';
}

export const puzzleKey = (dateUtc: string) => `stepwise:puzzle:${dateUtc}`;

export function loadProgress(dateUtc: string, store: KV | null = defaultStore()): PuzzleProgress | null {
  const p = read<PuzzleProgress>(store, puzzleKey(dateUtc));
  if (!p || !Array.isArray(p.moves)) return null;
  return p;
}

export function saveProgress(dateUtc: string, progress: PuzzleProgress, store: KV | null = defaultStore()): void {
  write(store, puzzleKey(dateUtc), progress);
}

// ---------- Lifetime stats ----------

export const ALL_MEDALS: readonly MedalId[] = [
  'medal-eagle',
  'medal-par-pure',
  'medal-par',
  'medal-solved',
  'medal-half-step-master',
  'medal-four-voice-virtuoso',
];

export interface LifetimeStats {
  played: number;
  won: number;
  currentStreak: number;
  maxStreak: number;
  lastWonDate: string | null;
  lastRecordedDate: string | null;
  /** Fewest moves in any solved puzzle (feeds the hub's bestScore). */
  bestMoves: number | null;
  distribution: Record<DistBucket, number>;
  medals: Record<MedalId, number>;
}

export const STATS_KEY = 'stepwise:stats';

export function emptyStats(): LifetimeStats {
  return {
    played: 0,
    won: 0,
    currentStreak: 0,
    maxStreak: 0,
    lastWonDate: null,
    lastRecordedDate: null,
    bestMoves: null,
    distribution: Object.fromEntries(DIST_BUCKETS.map((b) => [b, 0])) as Record<DistBucket, number>,
    medals: Object.fromEntries(ALL_MEDALS.map((m) => [m, 0])) as Record<MedalId, number>,
  };
}

export function loadStats(store: KV | null = defaultStore()): LifetimeStats {
  const saved = read<Partial<LifetimeStats>>(store, STATS_KEY);
  const base = emptyStats();
  if (!saved) return base;
  return {
    ...base,
    ...saved,
    distribution: { ...base.distribution, ...(saved.distribution ?? {}) },
    medals: { ...base.medals, ...(saved.medals ?? {}) },
  };
}

/**
 * Pure stats update for one finished puzzle. Idempotent: days are recorded in calendar order
 * (only today is playable), so any date at or before the last recorded one is ignored.
 */
export function applyResult(stats: LifetimeStats, dateUtc: string, summary: SolveSummary): LifetimeStats {
  if (stats.lastRecordedDate !== null && dateUtc <= stats.lastRecordedDate) return stats;
  const next: LifetimeStats = {
    ...stats,
    distribution: { ...stats.distribution },
    medals: { ...stats.medals },
    played: stats.played + 1,
    lastRecordedDate: dateUtc,
  };
  next.distribution[bucketFor(summary)] += 1;
  if (summary.solved) {
    next.won += 1;
    next.currentStreak = stats.lastWonDate === addDaysUtc(dateUtc, -1) ? stats.currentStreak + 1 : 1;
    next.maxStreak = Math.max(next.maxStreak, next.currentStreak);
    next.lastWonDate = dateUtc;
    next.bestMoves = stats.bestMoves === null || stats.bestMoves === undefined ? summary.movesUsed : Math.min(stats.bestMoves, summary.movesUsed);
    next.medals[summary.medalId] += 1;
    if (summary.challengeMedalId) next.medals[summary.challengeMedalId] += 1;
  } else {
    next.currentStreak = 0;
  }
  return next;
}

/** Streak shown today: broken if the last win is older than yesterday. */
export function displayStreak(stats: LifetimeStats, todayUtc: string): number {
  if (!stats.lastWonDate) return 0;
  if (stats.lastWonDate === todayUtc || stats.lastWonDate === addDaysUtc(todayUtc, -1)) return stats.currentStreak;
  return 0;
}

export function recordResult(dateUtc: string, summary: SolveSummary, store: KV | null = defaultStore()): LifetimeStats {
  const next = applyResult(loadStats(store), dateUtc, summary);
  write(store, STATS_KEY, next);
  return next;
}

// ---------- Preferences ----------

export interface Preferences {
  theme: ThemeMode;
  inputView: InputViewMode;
  noteSpelling: NoteSpellingMode;
  /** True once the player picked a spelling in Settings (older saves wrote 'sharp' as a mere default). */
  spellingChosen?: boolean;
  soundEnabled: boolean;
}

export const PREFS_KEY = 'stepwise:prefs';

function systemTheme(): ThemeMode {
  try {
    return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function loadPrefs(store: KV | null = defaultStore()): Preferences {
  const saved = read<Partial<Preferences>>(store, PREFS_KEY) ?? {};
  return {
    theme: saved.theme === 'dark' || saved.theme === 'light' ? saved.theme : systemTheme(),
    inputView: saved.inputView === 'clock' ? 'clock' : 'rail',
    noteSpelling: saved.noteSpelling === 'flat' ? 'flat' : saved.noteSpelling === 'sharp' && saved.spellingChosen ? 'sharp' : 'auto',
    spellingChosen: saved.spellingChosen === true,
    soundEnabled: saved.soundEnabled === true,
  };
}

export function savePrefs(prefs: Preferences, store: KV | null = defaultStore()): void {
  write(store, PREFS_KEY, prefs);
}
