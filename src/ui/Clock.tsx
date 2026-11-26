// 12-tone chromatic clock: C at 12 o'clock, morphing active polygon vs dashed target polygon.
// Vertices select voices; tapping a node ±1/±2 from a voice moves it there.
import { useLayoutEffect, useRef, useState } from 'react';
import { pcName, QUALITY_DEFS } from '../engine/chords';
import { allowedDeltas, ruleForbiddenPc } from '../engine/graph';
import type { Rejection } from '../game/gameState';
import type { DailyRule, NoteSpellingMode, PitchClass, StepDelta } from '../types/stepwise';

const C = 150;
const R_VERTEX = 88;
/** Hit radius in viewBox units: ~44px on screen even when the dial renders at 204px (mobile). */
const HIT_R = 32;
const VOICE_VARS = ['--sw-voice-1', '--sw-voice-2', '--sw-voice-3', '--sw-voice-4'];
const VOICE_ON = ['--sw-voice-1-on', '--sw-voice-2-on', '--sw-voice-3-on', '--sw-voice-4-on'];

const clockXY = (pc: number, r: number): [number, number] => {
  const rad = ((pc * 30 - 90) * Math.PI) / 180;
  return [C + r * Math.cos(rad), C + r * Math.sin(rad)];
};
const pts = (coords: [number, number][]) => coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

function prefersReducedMotion(): boolean {
  try {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Interpolates each vertex along the circular arc (shortest way round), 280ms ease-out cubic. */
function useMorph(pcs: readonly number[]): number[] {
  const [angles, setAngles] = useState<number[]>(() => pcs.map((p) => p * 30));
  const cur = useRef(angles);
  useLayoutEffect(() => {
    const from = cur.current.length === pcs.length ? cur.current : pcs.map((p) => p * 30);
    const to = pcs.map((p, i) => {
      let a = p * 30;
      while (a - from[i] > 180) a -= 360;
      while (from[i] - a > 180) a += 360;
      return a;
    });
    const dur = prefersReducedMotion() ? 0 : 280;
    const t0 = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const raw = dur === 0 ? 1 : Math.min(1, (now - t0) / dur);
      const t = 1 - Math.pow(1 - raw, 3);
      const next = to.map((a, i) => from[i] + (a - from[i]) * t);
      cur.current = next;
      setAngles(next);
      if (raw < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [pcs.join(',')]); // keyed on the pitch set's contents, not the array identity
  return angles;
}

export interface ClockProps {
  pcs: readonly PitchClass[];
  targetPcs: readonly PitchClass[];
  rule: DailyRule;
  spelling: NoteSpellingMode;
  /** Target notes keep the target chord's spelling. */
  targetSpelling?: NoteSpellingMode;
  selectedVoice: number;
  activeLabel: string;
  matchCount: number;
  checkpointMet: boolean;
  rejection: Rejection | null;
  disabled: boolean;
  onSelect(voice: number): void;
  onMove(voice: number, delta: StepDelta): void;
}

export function Clock(props: ClockProps) {
  const { pcs, targetPcs, rule, spelling, targetSpelling, selectedVoice, activeLabel, matchCount, checkpointMet, rejection, disabled, onSelect, onMove } =
    props;
  const angles = useMorph(pcs);
  const lavaPc = ruleForbiddenPc(rule);
  const target = new Set<number>(targetPcs);
  const active = new Set<number>(pcs);
  const svgRef = useRef<SVGSVGElement>(null);
  const deltas = allowedDeltas(rule);
  const selPc = pcs[selectedVoice];

  // Only animate rejections that happen while mounted (not an old one replayed on a view switch).
  const mountNonce = useRef(rejection?.nonce ?? 0);
  const freshRejection = rejection !== null && rejection.nonce !== mountNonce.current;
  useLayoutEffect(() => {
    if (!rejection || !svgRef.current || !freshRejection) return;
    const g = svgRef.current.querySelector(`.sw-clock-vertex-group[data-voice="${rejection.voiceIndex}"]`);
    if (g) {
      g.classList.remove('is-bouncing');
      void (g as SVGGElement).getBoundingClientRect();
      g.classList.add('is-bouncing');
    }
  }, [rejection]);

  /** Tap on an empty node: move the selected voice there if in reach, else the unique voice in reach. */
  const tapNode = (pc: number) => {
    if (disabled) return;
    const deltaFor = (from: number) => deltas.find((d) => (((from + d) % 12) + 12) % 12 === pc);
    const own = deltaFor(selPc);
    if (own !== undefined) return onMove(selectedVoice, own);
    const candidates = pcs.map((from, v) => ({ v, d: deltaFor(from) })).filter((c) => c.d !== undefined);
    if (candidates.length === 1) onMove(candidates[0].v, candidates[0].d!);
  };

  let lavaPath: string | null = null;
  if (lavaPc !== null) {
    const a1 = ((lavaPc * 30 - 15 - 90) * Math.PI) / 180;
    const a2 = ((lavaPc * 30 + 15 - 90) * Math.PI) / 180;
    const [rIn, rOut] = [46, 107];
    const p = (r: number, a: number) => `${(C + r * Math.cos(a)).toFixed(1)} ${(C + r * Math.sin(a)).toFixed(1)}`;
    lavaPath = `M ${p(rIn, a1)} L ${p(rOut, a1)} A ${rOut} ${rOut} 0 0 1 ${p(rOut, a2)} L ${p(rIn, a2)} A ${rIn} ${rIn} 0 0 0 ${p(rIn, a1)} Z`;
  }

  const vertexCoords = angles.map((a) => clockXY(a / 30, R_VERTEX));
  const cpLabel = rule.kind === 'checkpoint-quality' ? QUALITY_DEFS[rule.requiredQuality].label : null;

  return (
    <div className="sw-clock-view">
      <div className="sw-clock-wrap">
        <svg ref={svgRef} className="sw-clock-svg" viewBox="0 0 300 300" role="group" aria-label="12-tone chromatic pitch-class clock">
          <defs>
            <pattern id="sw-lava-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="var(--sw-lava-surface)" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="var(--sw-lava-solid)" strokeWidth="2" strokeOpacity="0.45" />
            </pattern>
          </defs>
          <g>
            <circle cx={C} cy={C} r={108} className="sw-clock-ring-outer" />
            <circle cx={C} cy={C} r={88} className="sw-clock-ring-inner" />
            {Array.from({ length: 12 }, (_, pc) => {
              const [x1, y1] = clockXY(pc, 42);
              const [x2, y2] = clockXY(pc, 108);
              return <line key={pc} x1={x1.toFixed(1)} y1={y1.toFixed(1)} x2={x2.toFixed(1)} y2={y2.toFixed(1)} className="sw-clock-spoke" />;
            })}
          </g>
          {lavaPath ? (
            <g className={freshRejection && rejection?.reason === 'lava-blocked' ? 'sw-clock-lava is-pulsing' : 'sw-clock-lava'} key={rejection?.nonce}>
              <path d={lavaPath} fill="url(#sw-lava-hatch)" stroke="var(--sw-lava-solid)" strokeWidth="1.5" />
            </g>
          ) : null}
          <polygon className="sw-clock-target-poly" points={pts(targetPcs.map((pc) => clockXY(pc, R_VERTEX)))} />
          <polygon className="sw-clock-active-poly" points={pts(vertexCoords)} />
          <g>
            {targetPcs.map((pc) => {
              const [x, y] = clockXY(pc, R_VERTEX);
              return (
                <circle
                  key={pc}
                  cx={x.toFixed(1)}
                  cy={y.toFixed(1)}
                  r="6"
                  fill="none"
                  stroke="var(--sw-target-match-ring)"
                  strokeWidth="2"
                  strokeDasharray="2 2"
                />
              );
            })}
          </g>
          <g>
            {Array.from({ length: 12 }, (_, pc) => {
              const [lx, ly] = clockXY(pc, 127);
              const cls = ['sw-clock-note-label'];
              if (target.has(pc)) cls.push('is-target');
              if (lavaPc === pc) cls.push('is-lava');
              return (
                <text key={pc} x={lx.toFixed(1)} y={(ly + 4).toFixed(1)} textAnchor="middle" className={cls.join(' ')}>
                  {pcName(pc, target.has(pc) && targetSpelling ? targetSpelling : spelling)}
                </text>
              );
            })}
          </g>
          {/* Step ghosts + invisible 44px hit targets for empty nodes */}
          <g>
            {Array.from({ length: 12 }, (_, pc) => {
              if (active.has(pc)) return null;
              const [x, y] = clockXY(pc, R_VERTEX);
              const reach = deltas.some((d) => (((selPc + d) % 12) + 12) % 12 === pc);
              const isLava = lavaPc === pc;
              return (
                <g
                  key={pc}
                  className={`sw-clock-node${reach && !disabled ? ' is-reachable' : ''}${isLava ? ' is-lava' : ''}`}
                  role="button"
                  tabIndex={-1}
                  aria-label={`Move to ${pcName(pc, spelling)}`}
                  onClick={() => tapNode(pc)}
                >
                  <circle cx={x.toFixed(1)} cy={y.toFixed(1)} r={HIT_R} fill="transparent" />
                  {reach && !disabled ? <circle cx={x.toFixed(1)} cy={y.toFixed(1)} r="9" className="sw-clock-step-ghost" /> : null}
                  {isLava ? (
                    <text x={x.toFixed(1)} y={(y + 4).toFixed(1)} textAnchor="middle" className="sw-clock-lava-x">
                      ×
                    </text>
                  ) : null}
                </g>
              );
            })}
          </g>
          <g>
            {vertexCoords.map(([vx, vy], idx) => {
              const pc = pcs[idx];
              return (
                <g
                  key={idx}
                  className={`sw-clock-vertex-group${selectedVoice === idx ? ' is-selected' : ''}${target.has(pc) ? ' is-target-match' : ''}`}
                  data-voice={idx}
                  role="button"
                  tabIndex={0}
                  aria-label={`Voice ${idx + 1}, ${pcName(pc, spelling)}`}
                  aria-pressed={selectedVoice === idx}
                  onClick={() => onSelect(idx)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(idx);
                    }
                  }}
                >
                  <circle cx={vx.toFixed(1)} cy={vy.toFixed(1)} r={HIT_R} fill="transparent" />
                  <circle cx={vx.toFixed(1)} cy={vy.toFixed(1)} r="19" className="sw-clock-vertex-halo" />
                  <circle cx={vx.toFixed(1)} cy={vy.toFixed(1)} r="15" className="sw-clock-vertex-circle" fill={`var(${VOICE_VARS[idx]})`} />
                  <text x={vx.toFixed(1)} y={(vy + 4).toFixed(1)} textAnchor="middle" className="sw-clock-vertex-text" fill={`var(${VOICE_ON[idx]})`}>
                    {idx + 1}
                  </text>
                </g>
              );
            })}
          </g>
          <g className="sw-clock-center">
            <text x="150" y="143" textAnchor="middle" className="sw-clock-chord-text">
              {activeLabel}
            </text>
            <text x="150" y="163" textAnchor="middle" className="sw-clock-match-text">
              Match {matchCount}/{targetPcs.length}
            </text>
            {cpLabel ? (
              <text x="150" y="184" textAnchor="middle" className={`sw-clock-checkpoint-text${checkpointMet ? ' is-satisfied' : ''}`}>
                ◇ {cpLabel}
                {checkpointMet ? ' ✓' : ''}
              </text>
            ) : null}
          </g>
        </svg>
      </div>
    </div>
  );
}
