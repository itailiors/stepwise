// STEPWISE data & event contracts (design/claude-code-handoff.md §4), plus a few
// additive fields the UI needs (root, token, qualityLabel, satisfied checkpoint flags).

export type PitchClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

/** 'auto' spells each chord the way it's usually written (Eb Maj, F Min with Ab, F# Maj with A#). */
export type NoteSpellingMode = 'sharp' | 'flat' | 'auto';
export type InputViewMode = 'rail' | 'clock';
export type ThemeMode = 'light' | 'dark';

export type ChordQuality =
  | 'major'
  | 'minor'
  | 'dim'
  | 'aug'
  | 'sus2'
  | 'sus4'
  | 'maj7'
  | 'dom7'
  | 'min7'
  | 'm7b5'
  | 'dim7';

/** Visual quality token — maps to the --sw-q-{token}-* CSS variables. */
export type QualityToken = 'major' | 'minor' | 'sus' | 'dim' | 'aug' | 'seventh';

export type DailyRule =
  | { kind: 'standard'; label: string; maxStep: 2 }
  | { kind: 'half-steps-only'; label: string; maxStep: 1 }
  | { kind: 'lava-note'; label: string; maxStep: 2; forbiddenPc: PitchClass }
  | { kind: 'checkpoint-quality'; label: string; maxStep: 2; requiredQuality: ChordQuality }
  | { kind: 'four-voice-seventh'; label: string; maxStep: 2; voiceCount: 4 };

export type RuleKind = DailyRule['kind'];

export interface ChordNode {
  id: string; // Canonical sorted pitch-class key e.g. "0-4-7"
  symbol: string; // Formatted with the requested spelling e.g. "C Maj", "F# Min", "Csus4"
  quality: ChordQuality;
  token: QualityToken;
  qualityLabel: string; // Short badge label: Maj, Min, Dim, Aug, sus2, sus4, maj7, dom7, m7, m7b5, dim7
  root: PitchClass;
  pitchClasses: PitchClass[]; // Ordered strictly by Voice 1..N
}

export type StepDelta = -2 | -1 | 1 | 2;

export interface VoiceMove {
  voiceIndex: number;
  fromPc: PitchClass;
  toPc: PitchClass;
  delta: StepDelta;
  wrappedOctave: boolean;
}

export interface LadderStep {
  stepIndex: number; // 1-based
  chord: ChordNode;
  move: VoiceMove;
  matchedTargetCount: number;
  satisfiedCheckpoint: boolean; // true when THIS step's chord has the required checkpoint quality
  cumulativeSemitones: number;
}

export interface DailyStepwisePuzzle {
  puzzleNumber: number;
  dateUtc: string;
  rule: DailyRule;
  start: ChordNode;
  target: ChordNode;
  parMoves: number;
  parSemitones: number;
  maxMoves: number;
  optimalPath: LadderStep[];
}

export type GolfRank = 'eagle' | 'par-pure' | 'par' | 'solved' | 'out-of-moves';

export type MedalId =
  | 'medal-eagle'
  | 'medal-par-pure'
  | 'medal-par'
  | 'medal-solved'
  | 'medal-half-step-master'
  | 'medal-four-voice-virtuoso';

export interface SolveSummary {
  puzzleNumber: number;
  solved: boolean;
  rank: GolfRank;
  medalId: MedalId;
  /** Extra challenge medal earned on top of the rank medal (Half-Step Master / Four-Voice Virtuoso). */
  challengeMedalId: MedalId | null;
  movesUsed: number;
  parMoves: number;
  semitonesMoved: number;
  undosUsed: number;
  invalidAttempts: number;
  userSteps: LadderStep[];
  optimalPath: LadderStep[];
  checkpointSatisfied: boolean;
}

export interface SharePayload {
  text: string;
  puzzleNumber: number;
  rank: GolfRank;
}

export type RejectReason = 'invalid-cluster' | 'lava-blocked' | 'half-step-locked';

export interface StepwiseVisualHooks {
  onVoiceSlide(voiceIdx: number, fromPc: number, toPc: number, valid: boolean, reason?: RejectReason): void;
  onStepCommit(stepIndex: number, stepData: LadderStep): void;
  onUndo(removedStepIndex: number): void;
  onPlaybackStep(stepIndex: number, mode?: 'user' | 'optimal'): void;
  onCheckpointSatisfied(stepIndex: number, ruleLabel: string): void;
  onBudgetTension(remainingMoves: number): void;
  onResolve(summary: SolveSummary): void;
}
