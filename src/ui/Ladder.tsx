// Left column: Start Anchor -> committed ladder rows + SVG voice threads -> Target Goal Bar.
// Every track shares xPct = ((pc + 0.5) / 12) * 100 (coordinate alignment invariant).
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BLACK_PCS, formatSymbol, pcName, QUALITY_DEFS, respell } from '../engine/chords';
import { ruleForbiddenPc } from '../engine/graph';
import type { ChordNode, DailyStepwisePuzzle, LadderStep, NoteSpellingMode, PitchClass, VoiceMove } from '../types/stepwise';
import { Icon } from './Icon';

const xPct = (pc: number) => `${(((pc + 0.5) / 12) * 100).toFixed(3)}%`;
const VOICE_VARS = ['--sw-voice-1', '--sw-voice-2', '--sw-voice-3', '--sw-voice-4'];

function AxisGrid({ lavaPc }: { lavaPc: number | null }) {
  return (
    <div className="sw-axis-gridlines">
      {Array.from({ length: 12 }, (_, pc) => (
        <div key={pc} className={`sw-axis-cell${BLACK_PCS.has(pc) ? ' is-black' : ''}${lavaPc === pc ? ' is-lava' : ''}`} />
      ))}
    </div>
  );
}

function Dots({ pcs, target }: { pcs: readonly PitchClass[]; target: ReadonlySet<number> }) {
  return (
    <>
      {pcs.map((pc, v) => (
        <div key={v} className={`sw-ladder-dot${target.has(pc) ? ' is-target-match' : ''}`} data-voice={v} style={{ left: xPct(pc) }}>
          {v + 1}
        </div>
      ))}
    </>
  );
}

const W = 240;
const H = 24;
const xFor = (pc: number) => ((pc + 0.5) / 12) * W;

function ThreadConnector({
  prev,
  next,
  move,
  animate,
  surging,
}: {
  prev: readonly PitchClass[];
  next: readonly PitchClass[];
  move: VoiceMove;
  animate: boolean;
  surging: boolean;
}) {
  const paths = next.map((pc, v) => {
    const stroke = `var(${VOICE_VARS[v]})`;
    const x1 = xFor(prev[v]);
    const x2 = xFor(pc);
    if (prev[v] === pc) {
      return <line key={v} className="sw-thread-stationary" x1={x1.toFixed(1)} y1={0} x2={x2.toFixed(1)} y2={H} stroke={stroke} />;
    }
    const cls = `sw-thread-moving${animate ? ' is-drawing' : ''}`;
    const drawProps = animate ? { strokeDasharray: 64, strokeDashoffset: 64 } : {};
    if (move.wrappedOctave) {
      // Octave wrap: exit through one edge portal, re-enter from the opposite edge.
      const exitX = move.delta < 0 ? 0 : W;
      const enterX = move.delta < 0 ? W : 0;
      const chev = move.delta < 0 ? -1 : 1;
      return (
        <g key={v} className="sw-thread-wrap">
          <path
            className={cls}
            {...(animate ? drawProps : { strokeDasharray: '4 2' })}
            d={`M ${x1.toFixed(1)} 0 C ${x1.toFixed(1)} 10, ${exitX} 8, ${exitX} 12`}
            stroke={stroke}
          />
          <path className={cls} {...drawProps} d={`M ${enterX} 12 C ${enterX} 16, ${x2.toFixed(1)} 14, ${x2.toFixed(1)} ${H}`} stroke={stroke} />
          <path
            className="sw-thread-chevron"
            d={`M ${exitX - chev * 7} 9 L ${exitX - chev * 3} 12 L ${exitX - chev * 7} 15 M ${enterX + chev * 3} 9 L ${enterX + chev * 7} 12 L ${enterX + chev * 3} 15`}
            stroke={stroke}
          />
        </g>
      );
    }
    return (
      <path
        key={v}
        className={cls}
        {...drawProps}
        d={`M ${x1.toFixed(1)} 0 C ${x1.toFixed(1)} 13, ${x2.toFixed(1)} 11, ${x2.toFixed(1)} ${H}`}
        stroke={stroke}
      />
    );
  });
  const d = move.delta > 0 ? `+${move.delta}` : `${move.delta}`;
  return (
    <div className={`sw-thread-connector${surging ? ' is-surging' : ''}`}>
      <div className="sw-thread-delta-col">
        <span className="sw-delta-chip" data-voice={move.voiceIndex}>
          V{move.voiceIndex + 1} {d}
        </span>
      </div>
      <div className="sw-thread-svg-wrap">
        <svg className="sw-thread-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          {paths}
        </svg>
      </div>
    </div>
  );
}

function pitchList(chord: ChordNode, spelling: NoteSpellingMode): string {
  return chord.pitchClasses.map((pc) => pcName(pc, spelling)).join(chord.pitchClasses.length >= 4 ? '·' : ' · ');
}

export interface LadderProps {
  puzzle: DailyStepwisePuzzle;
  steps: LadderStep[];
  spelling: NoteSpellingMode;
  commitNonce: number;
  checkpointMet: boolean;
  solved: boolean;
  /** Playback cascade index on the board (0 = start anchor), or null. */
  playIndex: number | null;
  shimmer: boolean;
}

export function Ladder({ puzzle, steps, spelling, commitNonce, checkpointMet, solved, playIndex, shimmer }: LadderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lavaPc = ruleForbiddenPc(puzzle.rule);
  const target = new Set<number>(puzzle.target.pitchClasses);
  const active = steps.at(-1)?.chord.pitchClasses ?? puzzle.start.pitchClasses;
  const activeSet = new Set<number>(active);
  const matches = active.filter((pc) => target.has(pc)).length;
  const total = puzzle.target.pitchClasses.length;
  // The newest row/thread keeps its draw/snap classes for the whole animation window, so a
  // re-render right after a commit (solve shimmer, checkpoint toast, voice select) can't cut it.
  // Tied to the step count at commit time, so an undo never re-animates the previous row.
  const [anim, setAnim] = useState<{ nonce: number; len: number } | null>(null);
  const seenNonce = useRef(commitNonce);
  useLayoutEffect(() => {
    if (commitNonce <= seenNonce.current) return;
    seenNonce.current = commitNonce;
    setAnim({ nonce: commitNonce, len: steps.length });
    // Not cleared on cleanup: the nonce guard makes a stale timer a no-op.
    setTimeout(() => setAnim((a) => (a?.nonce === commitNonce ? null : a)), 700);
  }, [commitNonce, steps.length]);
  const animateLatest = anim !== null && anim.nonce === commitNonce && anim.len === steps.length;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [commitNonce, steps.length]);

  useEffect(() => {
    if (playIndex === null || playIndex === 0) return;
    scrollRef.current?.querySelector(`[data-row="${playIndex}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [playIndex]);

  const start = puzzle.start;
  const q = puzzle.rule.kind === 'checkpoint-quality' ? QUALITY_DEFS[puzzle.rule.requiredQuality].label : '';

  return (
    <section className="sw-ladder-column" aria-label="Harmonic Progression Ladder">
      <div className={`sw-anchor-card sw-anchor-start${playIndex === 0 ? ' is-playing' : ''}`}>
        <div className="sw-anchor-meta">
          <span className="sw-eyebrow">START</span>
          <div className="sw-anchor-chord-line">
            <strong className="sw-chord-name">{formatSymbol(start.root, start.quality, spelling)}</strong>
            <span className="sw-quality-badge" data-quality={start.token}>
              {start.qualityLabel}
            </span>
          </div>
          <span className="sw-pitch-list">{pitchList(start, spelling)}</span>
        </div>
        <div className="sw-track-axis" aria-hidden="true">
          <AxisGrid lavaPc={lavaPc} />
          <Dots pcs={start.pitchClasses} target={target} />
        </div>
      </div>

      <div className="sw-ladder-scroll" ref={scrollRef} aria-live="polite">
        <div className="sw-ladder-list">
          {steps.length === 0 ? (
            <div className="sw-ladder-empty">
              Select a voice below and tap <strong>+1 / -1</strong> (or drag a puck) to build your ladder.
            </div>
          ) : (
            steps.map((step, i) => {
              const prev = i === 0 ? start.pitchClasses : steps[i - 1].chord.pitchClasses;
              const isLatest = i === steps.length - 1;
              const animate = isLatest && animateLatest;
              const chord = respell(step.chord, spelling);
              const rowIdx = i + 1;
              return (
                <Fragment key={i}>
                  <ThreadConnector prev={prev} next={step.chord.pitchClasses} move={step.move} animate={animate} surging={playIndex === rowIdx} />
                  <div
                    data-row={rowIdx}
                    className={`sw-ladder-row${isLatest ? ' is-latest' : ''}${animate ? ' is-new-snap' : ''}${playIndex === rowIdx ? ' is-playing' : ''}`}
                  >
                    <div className="sw-row-info">
                      <span className="sw-step-idx">{String(rowIdx).padStart(2, '0')}</span>
                      <span className="sw-row-chord">{chord.symbol}</span>
                      <span className="sw-quality-badge" data-quality={chord.token}>
                        {chord.qualityLabel}
                      </span>
                      {step.satisfiedCheckpoint && puzzle.rule.kind === 'checkpoint-quality' ? (
                        <span className="sw-row-checkpoint" title="Checkpoint chord">
                          <Icon name="checkpoint-diamond" small />
                        </span>
                      ) : null}
                    </div>
                    <div className="sw-track-axis sw-row-track">
                      <AxisGrid lavaPc={lavaPc} />
                      <Dots pcs={step.chord.pitchClasses} target={target} />
                    </div>
                  </div>
                </Fragment>
              );
            })
          )}
        </div>
      </div>

      <div className={`sw-anchor-card sw-anchor-target${solved ? ' is-solved' : ''}${shimmer ? ' is-shimmering' : ''}`}>
        <div className="sw-anchor-meta">
          <div className="sw-target-top-row">
            <span className="sw-eyebrow">TARGET</span>
            <span className="sw-match-counter">
              Match {matches}/{total}
            </span>
          </div>
          <div className="sw-anchor-chord-line">
            <strong className="sw-chord-name">{formatSymbol(puzzle.target.root, puzzle.target.quality, spelling)}</strong>
            <span className="sw-quality-badge" data-quality={puzzle.target.token}>
              {puzzle.target.qualityLabel}
            </span>
            {puzzle.rule.kind === 'checkpoint-quality' ? (
              <span className={`sw-checkpoint-badge${checkpointMet ? ' is-satisfied' : ''}`}>
                <Icon name="checkpoint-diamond" small />
                <span>{checkpointMet ? `${q} ✓` : q}</span>
              </span>
            ) : null}
          </div>
          <span className="sw-pitch-list">{pitchList(puzzle.target, spelling)}</span>
        </div>
        <div className="sw-track-axis" aria-hidden="true">
          <AxisGrid lavaPc={lavaPc} />
          {puzzle.target.pitchClasses.map((pc) => (
            <div key={pc} className={`sw-target-beacon${activeSet.has(pc) ? ' is-lit' : ''}`} style={{ left: xPct(pc) }}>
              {pcName(pc, spelling)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
