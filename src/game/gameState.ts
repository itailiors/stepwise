// Pure game reducer: the UI state machine from design/claude-code-handoff.md §3.
import { applyMove, countTargetMatches, isTargetReached, satisfiesCheckpoint } from '../engine/graph';
import type { DailyStepwisePuzzle, LadderStep, PitchClass, RejectReason, StepDelta } from '../types/stepwise';
import type { PuzzleProgress, SavedMove } from '../state/storage';

export type GameStatus = 'playing' | 'solved' | 'failed';

export interface Rejection {
  nonce: number;
  voiceIndex: number;
  fromPc: PitchClass;
  toPc: PitchClass;
  reason: RejectReason;
}

export interface GameState {
  puzzle: DailyStepwisePuzzle;
  steps: LadderStep[];
  undos: number;
  invalidAttempts: number;
  status: GameStatus;
  selectedVoice: number;
  /** Increments on every commit so the newest row/thread animates exactly once. */
  commitNonce: number;
  rejection: Rejection | null;
}

export type GameAction =
  | { type: 'select'; voice: number }
  | { type: 'move'; voice: number; delta: StepDelta }
  | { type: 'undo' };

export function currentPcs(s: Pick<GameState, 'puzzle' | 'steps'>): PitchClass[] {
  return s.steps.at(-1)?.chord.pitchClasses ?? s.puzzle.start.pitchClasses;
}

export function checkpointMet(s: Pick<GameState, 'puzzle' | 'steps'>): boolean {
  return s.puzzle.rule.kind !== 'checkpoint-quality' || s.steps.some((st) => st.satisfiedCheckpoint);
}

function statusAfter(puzzle: DailyStepwisePuzzle, steps: LadderStep[]): GameStatus {
  const pcs = steps.at(-1)?.chord.pitchClasses ?? puzzle.start.pitchClasses;
  const cp = puzzle.rule.kind !== 'checkpoint-quality' || steps.some((st) => st.satisfiedCheckpoint);
  if (steps.length > 0 && isTargetReached(pcs, puzzle.target.pitchClasses) && cp) return 'solved';
  if (steps.length >= puzzle.maxMoves) return 'failed';
  return 'playing';
}

function commit(puzzle: DailyStepwisePuzzle, steps: LadderStep[], voice: number, delta: StepDelta) {
  const pcs = steps.at(-1)?.chord.pitchClasses ?? puzzle.start.pitchClasses;
  const res = applyMove(pcs, voice, delta, puzzle.rule);
  if (!res.ok) return res;
  const step: LadderStep = {
    stepIndex: steps.length + 1,
    chord: res.chord,
    move: res.move,
    matchedTargetCount: countTargetMatches(res.pitchClasses, puzzle.target.pitchClasses),
    satisfiedCheckpoint: satisfiesCheckpoint(res.pitchClasses, puzzle.rule),
    cumulativeSemitones: (steps.at(-1)?.cumulativeSemitones ?? 0) + Math.abs(delta),
  };
  return { ok: true as const, step };
}

export function initGame(puzzle: DailyStepwisePuzzle, saved: PuzzleProgress | null): GameState {
  const steps: LadderStep[] = [];
  for (const mv of saved?.moves ?? []) {
    if (steps.length >= puzzle.maxMoves || statusAfter(puzzle, steps) !== 'playing') break;
    const r = commit(puzzle, steps, mv.voiceIndex, mv.delta);
    if (!r.ok) break; // corrupted save: keep the valid prefix
    steps.push(r.step);
  }
  return {
    puzzle,
    steps,
    undos: saved?.undos ?? 0,
    invalidAttempts: saved?.invalidAttempts ?? 0,
    status: statusAfter(puzzle, steps),
    selectedVoice: 0,
    commitNonce: 0,
    rejection: null,
  };
}

export function gameReducer(s: GameState, a: GameAction): GameState {
  switch (a.type) {
    case 'select':
      if (a.voice < 0 || a.voice >= s.puzzle.start.pitchClasses.length) return s;
      return { ...s, selectedVoice: a.voice };
    case 'move': {
      if (s.status !== 'playing') return s;
      const r = commit(s.puzzle, s.steps, a.voice, a.delta);
      if (!r.ok) {
        return {
          ...s,
          selectedVoice: a.voice,
          invalidAttempts: s.invalidAttempts + 1,
          rejection: {
            nonce: (s.rejection?.nonce ?? 0) + 1,
            voiceIndex: a.voice,
            fromPc: r.fromPc,
            toPc: r.toPc,
            reason: r.reason,
          },
        };
      }
      const steps = [...s.steps, r.step];
      return { ...s, steps, selectedVoice: a.voice, status: statusAfter(s.puzzle, steps), commitNonce: s.commitNonce + 1 };
    }
    case 'undo':
      if (s.status !== 'playing' || s.steps.length === 0) return s;
      return { ...s, steps: s.steps.slice(0, -1), undos: s.undos + 1 };
  }
}

export function toProgress(s: GameState): PuzzleProgress {
  const moves: SavedMove[] = s.steps.map((st) => ({ voiceIndex: st.move.voiceIndex, delta: st.move.delta }));
  return { moves, undos: s.undos, invalidAttempts: s.invalidAttempts, status: s.status };
}
