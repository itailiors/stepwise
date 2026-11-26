// Golf rank, medal awarding and the spoiler-free share card.
import { ruleShareName } from '../engine/daily';
import { formatSymbol } from '../engine/chords';
import type {
  DailyStepwisePuzzle,
  GolfRank,
  LadderStep,
  MedalId,
  NoteSpellingMode,
  SharePayload,
  SolveSummary,
} from '../types/stepwise';

export function rankFor(solved: boolean, moves: number, par: number, undos: number): GolfRank {
  if (!solved) return 'out-of-moves';
  if (moves < par) return 'eagle';
  if (moves === par) return undos === 0 ? 'par-pure' : 'par';
  if (moves <= par + 3) return 'solved';
  return 'out-of-moves';
}

export const RANK_MEDAL: Record<GolfRank, MedalId> = {
  eagle: 'medal-eagle',
  'par-pure': 'medal-par-pure',
  par: 'medal-par',
  solved: 'medal-solved',
  'out-of-moves': 'medal-solved',
};

export const RANK_LABEL: Record<GolfRank, string> = {
  eagle: 'EAGLE',
  'par-pure': 'PAR PURE',
  par: 'PAR',
  solved: 'SOLVED',
  'out-of-moves': 'OUT OF MOVES',
};

export function challengeMedalFor(puzzle: DailyStepwisePuzzle, solved: boolean): MedalId | null {
  if (!solved) return null;
  if (puzzle.rule.kind === 'half-steps-only') return 'medal-half-step-master';
  if (puzzle.rule.kind === 'four-voice-seventh') return 'medal-four-voice-virtuoso';
  return null;
}

export interface GameTally {
  steps: LadderStep[];
  undos: number;
  invalidAttempts: number;
  solved: boolean;
}

export function buildSummary(puzzle: DailyStepwisePuzzle, tally: GameTally): SolveSummary {
  const moves = tally.steps.length;
  const rank = rankFor(tally.solved, moves, puzzle.parMoves, tally.undos);
  return {
    puzzleNumber: puzzle.puzzleNumber,
    solved: tally.solved,
    rank,
    medalId: RANK_MEDAL[rank],
    challengeMedalId: challengeMedalFor(puzzle, tally.solved),
    movesUsed: moves,
    parMoves: puzzle.parMoves,
    semitonesMoved: tally.steps.at(-1)?.cumulativeSemitones ?? 0,
    undosUsed: tally.undos,
    invalidAttempts: tally.invalidAttempts,
    userSteps: tally.steps,
    optimalPath: puzzle.optimalPath,
    checkpointSatisfied: puzzle.rule.kind !== 'checkpoint-quality' || tally.steps.some((s) => s.satisfiedCheckpoint),
  };
}

/** Golf distribution bucket for the stats histogram. */
export type DistBucket = 'eagle' | 'par-pure' | 'par' | '+1' | '+2' | '+3' | 'missed';
export const DIST_BUCKETS: readonly DistBucket[] = ['eagle', 'par-pure', 'par', '+1', '+2', '+3', 'missed'];

export function bucketFor(summary: SolveSummary): DistBucket {
  switch (summary.rank) {
    case 'eagle':
    case 'par-pure':
    case 'par':
      return summary.rank;
    case 'solved': {
      const over = Math.min(3, Math.max(1, summary.movesUsed - summary.parMoves));
      return `+${over}` as DistBucket;
    }
    default:
      return 'missed';
  }
}

const RANK_GLYPH: Record<GolfRank, string> = {
  eagle: '🦅',
  'par-pure': '⛳',
  par: '⛳',
  solved: '⛳',
  'out-of-moves': '✗',
};

export function buildShareText(
  puzzle: DailyStepwisePuzzle,
  summary: SolveSummary,
  spelling: NoteSpellingMode = 'sharp',
): SharePayload {
  const voices = puzzle.start.pitchClasses.length;
  const rows = summary.userSteps.map((step) => {
    const cells = Array.from({ length: voices }, (_, v) => {
      if (v !== step.move.voiceIndex) return '⬜';
      return step.satisfiedCheckpoint ? '💎' : '🟩';
    }).join('');
    const d = step.move.delta > 0 ? `+${step.move.delta}` : `${step.move.delta}`;
    return `${cells}  (${d})`;
  });
  const start = formatSymbol(puzzle.start.root, puzzle.start.quality, spelling);
  const target = formatSymbol(puzzle.target.root, puzzle.target.quality, spelling);
  const undoWord = summary.undosUsed === 1 ? 'undo' : 'undos';
  const score = summary.solved
    ? `Score: ${summary.movesUsed} moves · ${summary.semitonesMoved} semitones (${RANK_GLYPH[summary.rank]} ${RANK_LABEL[summary.rank]} · ${summary.undosUsed} ${undoWord})`
    : `Score: ${summary.movesUsed}/${puzzle.maxMoves} moves (${RANK_GLYPH[summary.rank]} ${RANK_LABEL[summary.rank]} · ${summary.undosUsed} ${undoWord})`;
  const text = [
    `🪜 STEPWISE #${puzzle.puzzleNumber} (${ruleShareName(puzzle.rule, spelling)})`,
    `${start} ──▶ ${target} | Par ${puzzle.parMoves}`,
    ...rows,
    score,
  ].join('\n');
  return { text, puzzleNumber: puzzle.puzzleNumber, rank: summary.rank };
}
