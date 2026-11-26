/**
 * Reharm Daily hub record (`daily:v1:stepwise`).
 * Contract: ReharmLab-Dailys/design/data-contract.md §1; parsed by the hub's src/lib/records.ts.
 * The hub rolls over at LOCAL midnight; `dateKey` is the local calendar date, the same day
 * STEPWISE's puzzle number is derived from (see todayUtc in engine/daily.ts).
 */
import type { DailyStepwisePuzzle, SolveSummary } from '../types/stepwise';
import { RANK_LABEL } from './scoring';
import type { KV } from './storage';

export const DAILY_KEY = 'daily:v1:stepwise';
export const DAILY_HUB_URL = 'https://itailiors.github.io/reharm-daily/';
export const DAILY_SHARE_URL = `${DAILY_HUB_URL}?open=share`;
export const LAB_BASE_URL = 'https://itailiors.github.io/reharm-lab/';
export const LAB_CHANGES_URL = `${LAB_BASE_URL}?mode=changes&from=reharm-daily`;

export type DailyStatus = 'new' | 'in_progress' | 'done';

export interface LabMove {
  slug: string;
  label: string;
}

export interface DailyRecord {
  v: 1;
  gameId: 'stepwise';
  dateKey: string;
  puzzleNo: number;
  status: DailyStatus;
  score: number | null;
  scoreLabel: string;
  tierIcon?: string;
  streak: number;
  bestScore: number | null;
  playedCount: number;
  progressLabel?: string;
  shareText?: string;
  labMove?: LabMove | null;
  updatedAt: number;
}

export interface DailyStats {
  /** Streak as shown today (already broken if the last win is older than yesterday). */
  streak: number;
  /** Fewest moves in any solved puzzle (golf: lower is better), or null before the first solve. */
  bestMoves: number | null;
  played: number;
}

export const DIMINISHED_PIVOT: LabMove = { slug: 'diminished-pivot', label: 'Diminished Pivot' };

export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Lab move to teach for a result: today's Diminished Pivot when the Friday checkpoint was cleared. */
export function labMoveFor(puzzle: DailyStepwisePuzzle, summary: SolveSummary): LabMove | null {
  return summary.solved && puzzle.rule.kind === 'checkpoint-quality' && summary.checkpointSatisfied ? { ...DIMINISHED_PIVOT } : null;
}

export function labMoveUrl(move: LabMove): string {
  return `${LAB_BASE_URL}?move=${encodeURIComponent(move.slug)}&from=stepwise`;
}

function base(puzzleNo: number, stats: DailyStats, now: Date) {
  return {
    v: 1 as const,
    gameId: 'stepwise' as const,
    dateKey: localDateKey(now),
    puzzleNo,
    streak: Math.max(0, stats.streak),
    bestScore: stats.bestMoves,
    playedCount: stats.played,
    updatedAt: now.getTime(),
  };
}

function resultLabel(summary: SolveSummary): string {
  const diff = summary.movesUsed - summary.parMoves;
  const tag = summary.rank === 'eagle' ? 'Eagle' : diff <= 0 ? 'Par' : `+${diff}`;
  return `${summary.movesUsed} moves (${tag})`;
}

export function buildDoneRecord(puzzle: DailyStepwisePuzzle, summary: SolveSummary, stats: DailyStats, now: Date = new Date()): DailyRecord {
  if (!summary.solved) {
    return {
      ...base(puzzle.puzzleNumber, stats, now),
      status: 'done',
      score: null,
      scoreLabel: 'Out of moves',
      tierIcon: '✗',
      shareText: '🪜 STEPWISE: ✗ out of moves',
      labMove: null,
    };
  }
  return {
    ...base(puzzle.puzzleNumber, stats, now),
    status: 'done',
    score: summary.movesUsed,
    scoreLabel: resultLabel(summary),
    tierIcon: summary.rank === 'eagle' ? '🦅' : '⛳',
    shareText: `🪜 STEPWISE: ${summary.movesUsed} moves (${RANK_LABEL[summary.rank]})`,
    labMove: labMoveFor(puzzle, summary),
  };
}

/** `moves` = committed moves so far. 0 → status 'new'. */
export function buildProgressRecord(puzzle: DailyStepwisePuzzle, moves: number, stats: DailyStats, now: Date = new Date()): DailyRecord {
  const n = Math.max(0, Math.min(puzzle.maxMoves, Math.floor(moves)));
  if (n === 0) return { ...base(puzzle.puzzleNumber, stats, now), status: 'new', score: null, scoreLabel: '' };
  const label = `Step ${n}/${puzzle.maxMoves}`;
  return {
    ...base(puzzle.puzzleNumber, stats, now),
    status: 'in_progress',
    score: null,
    scoreLabel: `${label} · Par ${puzzle.parMoves}`,
    progressLabel: label,
  };
}

/**
 * Whether `next` may replace `prev`. A finished local day never regresses to in_progress/new:
 * guards edge cases such as a device clock / time-zone change mid-day serving a new puzzle.
 */
export function shouldReplace(prev: Partial<DailyRecord> | null, next: DailyRecord): boolean {
  if (next.status === 'done') return true;
  if (!prev || prev.dateKey !== next.dateKey) return next.status === 'in_progress';
  if (prev.status === 'done') return false;
  if (next.status === 'new') return prev.puzzleNo === next.puzzleNo; // moves undone back to zero
  return true;
}

export function loadDaily(store: KV | null): Partial<DailyRecord> | null {
  if (!store) return null;
  try {
    const raw = store.getItem(DAILY_KEY);
    return raw ? (JSON.parse(raw) as Partial<DailyRecord>) : null;
  } catch {
    return null;
  }
}

/** Mirror today's state into `daily:v1:stepwise` for the hub. Never touches `stepwise:*`. */
export function emitDaily(next: DailyRecord, store: KV | null): void {
  if (!store || !shouldReplace(loadDaily(store), next)) return;
  try {
    store.setItem(DAILY_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode: the game still works */
  }
}
