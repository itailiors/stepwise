// Shortest-path Par solver: Dijkstra over (chordMask, checkpointVisited) minimizing
// (moves, totalSemitones) lexicographically. Reconstructs a voice-tracked optimal ladder.
import type { DailyRule, LadderStep, NoteSpellingMode, PitchClass } from '../types/stepwise';
import { maskHasQuality, maskOf } from './chords';
import { applyMove, countTargetMatches, maskNeighbors, ruleRequiredQuality, satisfiesCheckpoint } from './graph';

export interface SolveResult {
  parMoves: number;
  parSemitones: number;
  optimalPath: LadderStep[];
  /** Number of distinct chord-set routes that achieve (parMoves, parSemitones). */
  routeCount: number;
}

/** Moves dominate semitones: a path is never long enough for semitones to overflow one move. */
const MOVE_WEIGHT = 1000;

interface Parent {
  prev: number; // previous state key, -1 for the start
  fromPc: PitchClass;
  delta: -2 | -1 | 1 | 2;
}

/** Minimal binary heap keyed by numeric priority. */
class MinHeap {
  private items: { key: number; pri: number; seq: number }[] = [];
  private seq = 0;
  get size(): number {
    return this.items.length;
  }
  push(key: number, pri: number): void {
    const a = this.items;
    a.push({ key, pri, seq: this.seq++ });
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.less(a[p], a[i])) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop(): { key: number; pri: number } {
    const a = this.items;
    const top = a[0];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
  private less(x: { pri: number; seq: number }, y: { pri: number; seq: number }): boolean {
    return x.pri < y.pri || (x.pri === y.pri && x.seq < y.seq);
  }
}

/**
 * Solves from a voice-ordered start chord to the target pitch-class set under `rule`.
 * `startCheckpoint` lets an in-progress game ask "par from here" when a checkpoint is already met.
 */
export function solve(
  start: readonly PitchClass[],
  target: readonly PitchClass[],
  rule: DailyRule,
  spelling: NoteSpellingMode = 'sharp',
  startCheckpoint = false,
): SolveResult | null {
  const needCheckpoint = ruleRequiredQuality(rule);
  const targetMask = maskOf(target);
  const startMask = maskOf(start);
  const startCp = needCheckpoint ? (startCheckpoint ? 1 : 0) : 1;
  const keyOf = (mask: number, cp: number) => mask * 2 + cp;

  const dist = new Map<number, number>();
  const ways = new Map<number, number>();
  const parent = new Map<number, Parent>();
  const heap = new MinHeap();
  const startKey = keyOf(startMask, startCp);
  dist.set(startKey, 0);
  ways.set(startKey, 1);
  heap.push(startKey, 0);

  let goalKey = -1;
  let goalCost = 0;
  while (heap.size) {
    const { key, pri } = heap.pop();
    if (pri !== dist.get(key)) continue;
    const mask = Math.floor(key / 2);
    const cp = key & 1;
    if (mask === targetMask && cp === 1 && key !== startKey) {
      goalKey = key;
      goalCost = pri;
      break;
    }
    for (const edge of maskNeighbors(mask, rule)) {
      const nextCp = cp || (needCheckpoint && maskHasQuality(edge.mask, needCheckpoint) ? 1 : 0);
      const nk = keyOf(edge.mask, nextCp);
      const nd = pri + MOVE_WEIGHT + Math.abs(edge.delta);
      const cur = dist.get(nk);
      const w = ways.get(key)!;
      if (cur === undefined || nd < cur) {
        dist.set(nk, nd);
        ways.set(nk, w);
        parent.set(nk, { prev: key, fromPc: edge.fromPc, delta: edge.delta });
        heap.push(nk, nd);
      } else if (nd === cur) {
        ways.set(nk, ways.get(nk)! + w);
      }
    }
  }
  if (goalKey < 0) return null;

  // Walk parents back to the start, then replay forward with voice tracking.
  const chain: Parent[] = [];
  for (let k = goalKey; k !== startKey; ) {
    const p = parent.get(k)!;
    chain.push(p);
    k = p.prev;
  }
  chain.reverse();

  const optimalPath: LadderStep[] = [];
  let voices = [...start];
  let semis = 0;
  for (const link of chain) {
    const voiceIndex = voices.indexOf(link.fromPc);
    const res = applyMove(voices, voiceIndex, link.delta, rule, spelling);
    if (!res.ok) throw new Error(`solver produced an invalid move: ${res.reason}`);
    voices = res.pitchClasses;
    semis += Math.abs(link.delta);
    optimalPath.push({
      stepIndex: optimalPath.length + 1,
      chord: res.chord,
      move: res.move,
      matchedTargetCount: countTargetMatches(voices, target),
      satisfiedCheckpoint: satisfiesCheckpoint(voices, rule),
      cumulativeSemitones: semis,
    });
  }

  return {
    parMoves: Math.floor(goalCost / MOVE_WEIGHT),
    parSemitones: goalCost % MOVE_WEIGHT,
    optimalPath,
    routeCount: ways.get(goalKey)!,
  };
}
