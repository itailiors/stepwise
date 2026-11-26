// Resolution + playback scrubber, share modal, how-to-play modal and stats/settings drawer.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { formatSymbol, respell } from '../engine/chords';
import { ruleLabel } from '../engine/daily';
import { DIST_BUCKETS, RANK_LABEL, type DistBucket } from '../state/scoring';
import { DAILY_SHARE_URL, LAB_CHANGES_URL, labMoveUrl, type LabMove } from '../state/daily';
import { ALL_MEDALS, type LifetimeStats, type Preferences } from '../state/storage';
import type { DailyStepwisePuzzle, GolfRank, LadderStep, NoteSpellingMode, SolveSummary } from '../types/stepwise';
import { frameUrl, MEDAL_NAMES, medalUrl, type FrameId } from './assets';
import { Icon } from './Icon';

export function Backdrop({
  open,
  onClose,
  labelledBy,
  drawer = false,
  children,
}: {
  open: boolean;
  onClose(): void;
  labelledBy: string;
  drawer?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) ref.current?.querySelector<HTMLElement>('.sw-modal-close')?.focus({ preventScroll: true });
  }, [open]);
  return (
    <div
      ref={ref}
      className={drawer ? 'sw-drawer-backdrop' : 'sw-modal-backdrop'}
      hidden={!open}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {open ? children : null}
    </div>
  );
}

const CloseBtn = ({ onClose, label }: { onClose(): void; label: string }) => (
  <button type="button" className="sw-modal-close" aria-label={label} onClick={onClose}>
    ✕
  </button>
);

// ---------------------------------------------------------------- Resolution

export type PlaybackMode = 'user' | 'optimal';
export interface PlaybackState {
  mode: PlaybackMode;
  index: number;
  total: number;
  /** Paused cascades keep their position; the play button resumes from `index`. */
  paused?: boolean;
}

const RANK_ATTR: Record<GolfRank, string> = {
  eagle: 'eagle',
  'par-pure': 'par',
  par: 'par',
  solved: 'solved',
  'out-of-moves': 'outOfMoves',
};
const RANK_FRAME: Record<GolfRank, FrameId> = {
  eagle: 'frame-eagle',
  'par-pure': 'frame-par',
  par: 'frame-par',
  solved: 'frame-solved',
  'out-of-moves': 'medal-frame',
};

function moveText(step: LadderStep): string {
  return `V${step.move.voiceIndex + 1} ${step.move.delta > 0 ? '+' : ''}${step.move.delta}`;
}

function ReplayList({ puzzle, steps, spelling, playIdx }: { puzzle: DailyStepwisePuzzle; steps: LadderStep[]; spelling: NoteSpellingMode; playIdx: number | null }) {
  const items = [{ symbol: formatSymbol(puzzle.start.root, puzzle.start.quality, spelling), move: 'Start' }].concat(
    steps.map((s) => ({ symbol: respell(s.chord, spelling).symbol, move: moveText(s) })),
  );
  return (
    <ol className="sw-replay-list">
      {items.map((it, i) => (
        <li key={i} className={`sw-replay-step-item${playIdx === i ? ' is-playing' : ''}`} data-replay-idx={i}>
          <span className="sw-replay-step-chord">{it.symbol}</span>
          <span className="sw-replay-step-move">{it.move}</span>
        </li>
      ))}
    </ol>
  );
}

export function ResolveModal({
  open,
  onClose,
  puzzle,
  summary,
  spelling,
  playback,
  labMove,
  onTogglePlay,
  compare,
  onToggleCompare,
  onShare,
}: {
  open: boolean;
  onClose(): void;
  puzzle: DailyStepwisePuzzle;
  summary: SolveSummary;
  spelling: NoteSpellingMode;
  playback: PlaybackState | null;
  labMove: LabMove | null;
  onTogglePlay(mode: PlaybackMode): void;
  compare: boolean;
  onToggleCompare(): void;
  onShare(): void;
}) {
  const { rank, challengeMedalId, solved } = summary;
  const heroMedal = challengeMedalId ?? summary.medalId;
  const heroFrame: FrameId = challengeMedalId ? 'frame-challenge' : RANK_FRAME[rank];
  const prefix = challengeMedalId === 'medal-half-step-master' ? 'HALF-STEP ' : challengeMedalId === 'medal-four-voice-virtuoso' ? '4-VOICE ' : '';
  const diff = summary.movesUsed - puzzle.parMoves;
  const playMode: PlaybackMode = compare ? 'optimal' : 'user';
  const isPlaying = playback !== null && !playback.paused;
  const isPaused = playback?.paused === true && playback.mode === playMode;
  const progress = playback ? ((playback.index + 1) / (playback.total + 1)) * 100 : 0;

  return (
    <Backdrop open={open} onClose={onClose} labelledBy="resolve-title">
      <div className="sw-modal sw-modal-resolve">
        <CloseBtn onClose={onClose} label="Close resolution screen" />
        <div className="sw-resolve-hero">
          <div className="sw-medal-stage">
            <img src={frameUrl(heroFrame)} alt="" className="sw-medal-bezel" />
            <img
              src={medalUrl(heroMedal)}
              alt={solved ? `${MEDAL_NAMES[heroMedal]} Medal` : 'No medal'}
              className={`sw-medal-img${solved ? '' : ' is-locked'}`}
            />
          </div>
          <span className="sw-rank-pill" data-rank={RANK_ATTR[rank]}>
            {solved ? `${prefix}${RANK_LABEL[rank]}` : RANK_LABEL[rank]}
          </span>
          <h2 className="sw-modal-title" id="resolve-title">
            {solved ? 'Harmonic Resolution' : 'So Close — Out of Moves'}
          </h2>
          <p className="sw-resolve-subtitle">
            Puzzle #{puzzle.puzzleNumber} · {ruleLabel(puzzle.rule, spelling)} · {formatSymbol(puzzle.start.root, puzzle.start.quality, spelling)} →{' '}
            {formatSymbol(puzzle.target.root, puzzle.target.quality, spelling)}
          </p>
        </div>

        <div className="sw-triad-card">
          <div className="sw-triad-cell">
            <span className="sw-triad-label">Moves</span>
            <strong className="sw-triad-val">
              {summary.movesUsed} / {solved ? puzzle.parMoves : puzzle.maxMoves}
            </strong>
            <span className="sw-triad-sub">
              {!solved ? 'Hard Ceiling' : diff < 0 ? `${-diff} Under Par` : diff === 0 ? 'On Par' : `+${diff} Over Par`}
            </span>
          </div>
          <div className="sw-triad-cell">
            <span className="sw-triad-label">Travel</span>
            <strong className="sw-triad-val">{summary.semitonesMoved} st</strong>
            <span className="sw-triad-sub">Optimal {puzzle.parSemitones} st</span>
          </div>
          <div className="sw-triad-cell">
            <span className="sw-triad-label">Undos</span>
            <strong className="sw-triad-val">{summary.undosUsed}</strong>
            <span className="sw-triad-sub">{summary.undosUsed === 0 ? 'Zero Undos' : 'Adjusted'}</span>
          </div>
        </div>

        <div className="sw-replay-card">
          <div className="sw-replay-controls">
            <button type="button" className="sw-btn-primary sw-btn-play" onClick={() => onTogglePlay(playMode)}>
              <Icon name={isPlaying ? 'pause' : 'play'} small />
              <span>{isPlaying ? 'Pause Cascade' : isPaused ? 'Resume Cascade' : compare ? 'Play Optimal Par' : 'Play My Ladder'}</span>
            </button>
            <button type="button" className="sw-btn-secondary" aria-pressed={compare} onClick={onToggleCompare}>
              <Icon name="compare-optimal" small />
              <span>{compare ? 'Hide Optimal Par' : 'Compare Optimal Par'}</span>
            </button>
          </div>
          <div className="sw-replay-progress-track" aria-hidden="true">
            <div className="sw-replay-progress-fill" style={{ width: `${progress.toFixed(0)}%` }} />
          </div>
          <div className={`sw-replay-columns${compare ? ' is-comparing' : ''}`}>
            <div className="sw-replay-col">
              <div className="sw-replay-col-head">
                <span>Your Progression</span>
                <span className="sw-mono-tag">
                  {summary.movesUsed} moves · {summary.semitonesMoved} st
                </span>
              </div>
              <ReplayList puzzle={puzzle} steps={summary.userSteps} spelling={spelling} playIdx={playback?.mode === 'user' ? playback.index : null} />
            </div>
            <div className="sw-replay-col" hidden={!compare}>
              <div className="sw-replay-col-head">
                <span>Optimal Par Route</span>
                <span className="sw-mono-tag">
                  {puzzle.parMoves} moves · {puzzle.parSemitones} st
                </span>
              </div>
              <ReplayList puzzle={puzzle} steps={puzzle.optimalPath} spelling={spelling} playIdx={playback?.mode === 'optimal' ? playback.index : null} />
            </div>
          </div>
        </div>

        <div className="sw-modal-footer-actions">
          <button type="button" className="sw-btn-primary sw-btn-full" onClick={onShare}>
            <Icon name="share" small />
            <span>Share Scorecard</span>
          </button>
          <aside className="daily-next-card" aria-label="Next daily puzzle">
            <div className="daily-next-info">
              <span className="daily-next-eyebrow">Today’s Sheet</span>
              <strong className="daily-next-title">STEPWISE complete</strong>
              <a className="daily-next-practice" href={LAB_CHANGES_URL}>
                Practice: Make the&nbsp;Changes&nbsp;↗
              </a>
            </div>
            <a className="daily-next-cta" href={DAILY_SHARE_URL}>
              Share Combined Card →
            </a>
          </aside>
          {labMove ? (
            <a className="daily-lab-chip" href={labMoveUrl(labMove)} aria-label={`Learn ${labMove.label} in Reharm Lab (opens Reharm Lab)`}>
              <span className="daily-lab-mark" aria-hidden="true">
                RL
              </span>
              <span className="daily-lab-title">Learn {labMove.label} in Reharm Lab</span>
              <span className="daily-lab-action" aria-hidden="true">
                Open Lab ↗
              </span>
            </a>
          ) : null}
        </div>
      </div>
    </Backdrop>
  );
}

// ---------------------------------------------------------------- Share

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      // Legacy fallback for older iOS Safari without the async Clipboard API.
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const legacy = document as Document & { execCommand(cmd: string): boolean };
      const ok = legacy.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function ShareModal({ open, onClose, text }: { open: boolean; onClose(): void; text: string }) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'blocked'>('idle');
  const preRef = useRef<HTMLPreElement>(null);
  const copied = copyState === 'copied';
  useEffect(() => {
    if (copyState === 'idle') return;
    const id = setTimeout(() => setCopyState('idle'), copyState === 'copied' ? 2000 : 3200);
    return () => clearTimeout(id);
  }, [copyState]);
  const onCopy = async () => {
    if (await copyText(text)) return setCopyState('copied');
    // Clipboard blocked (permissions policy / insecure context): select the card for a manual copy.
    const sel = window.getSelection();
    if (preRef.current && sel) {
      const range = document.createRange();
      range.selectNodeContents(preRef.current);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    setCopyState('blocked');
  };
  return (
    <Backdrop open={open} onClose={onClose} labelledBy="share-title">
      <div className="sw-modal sw-modal-compact">
        <CloseBtn onClose={onClose} label="Close share modal" />
        <h2 className="sw-modal-title" id="share-title">
          Share Scorecard
        </h2>
        <p className="sw-modal-lead">Spoiler-free voice-leading grid ready for text, Discord, or social.</p>
        <pre className="sw-share-preview" ref={preRef}>
          {text}
        </pre>
        <button type="button" className={`sw-btn-primary sw-btn-full${copied ? ' is-copied' : ''}`} onClick={onCopy}>
          <Icon name="share" small />
          <span aria-live="polite">
            {copied ? '✓ Copied to Clipboard' : copyState === 'blocked' ? 'Copy blocked — text selected' : 'Copy Scorecard'}
          </span>
        </button>
      </div>
    </Backdrop>
  );
}

// ---------------------------------------------------------------- How to play

export function HowToModal({ open, onClose, halfSteps }: { open: boolean; onClose(): void; halfSteps: boolean }) {
  return (
    <Backdrop open={open} onClose={onClose} labelledBy="howto-title">
      <div className="sw-modal sw-modal-howto">
        <CloseBtn onClose={onClose} label="Close how to play" />
        <h2 className="sw-modal-title" id="howto-title">
          How to Play STEPWISE
        </h2>
        <p className="sw-modal-lead">Morph the Start Chord into the Target Chord in as few steps as possible. Play silently or with sound.</p>
        <div className="sw-howto-frames">
          <article className="sw-howto-card">
            <div className="sw-howto-num">1</div>
            <svg className="sw-howto-diagram" viewBox="0 0 240 66" aria-hidden="true">
              <defs>
                <marker id="sw-howto-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="var(--sw-voice-2)" />
                </marker>
              </defs>
              <rect x="8" y="10" width="224" height="46" rx="10" fill="var(--sw-bg-recessed)" stroke="var(--sw-border-subtle)" />
              <line x1="36" y1="33" x2="204" y2="33" stroke="var(--sw-border-strong)" strokeWidth="2" strokeDasharray="3 3" />
              <circle cx="52" cy="33" r="12" fill="var(--sw-voice-1)" />
              <text x="52" y="37" textAnchor="middle" fill="var(--sw-voice-1-on)" fontSize="11" fontWeight="700" fontFamily="var(--sw-font-mono)">
                C
              </text>
              <circle cx="110" cy="33" r="12" fill="var(--sw-voice-2)" fillOpacity="0.35" stroke="var(--sw-voice-2)" strokeDasharray="3 2" />
              <path d="M122 25 C132 16, 140 16, 148 25" fill="none" stroke="var(--sw-voice-2)" strokeWidth="2" markerEnd="url(#sw-howto-arrow)" />
              <circle cx="152" cy="33" r="12" fill="var(--sw-voice-2)" />
              <text x="152" y="37" textAnchor="middle" fill="var(--sw-voice-2-on)" fontSize="11" fontWeight="700" fontFamily="var(--sw-font-mono)">
                F
              </text>
              <circle cx="192" cy="33" r="12" fill="var(--sw-voice-3)" />
              <text x="192" y="37" textAnchor="middle" fill="var(--sw-voice-3-on)" fontSize="11" fontWeight="700" fontFamily="var(--sw-font-mono)">
                G
              </text>
              <text x="135" y="15" textAnchor="middle" fill="var(--sw-voice-2)" fontSize="10" fontWeight="700" fontFamily="var(--sw-font-mono)">
                +1
              </text>
            </svg>
            <div className="sw-howto-copy">
              <strong>{halfSteps ? 'Slide 1 voice ±1 semitone today' : 'Slide 1 voice ±1–2 semitones'}</strong>
              <span>Tap a voice puck and nudge it by step, or drag it along the rail. Only one voice moves per turn.</span>
            </div>
          </article>
          <article className="sw-howto-card">
            <div className="sw-howto-num">2</div>
            <svg className="sw-howto-diagram" viewBox="0 0 240 66" aria-hidden="true">
              <rect x="8" y="8" width="106" height="50" rx="10" fill="var(--sw-valid-surface)" stroke="var(--sw-valid-border)" />
              <text x="61" y="30" textAnchor="middle" fill="var(--sw-valid-text)" fontSize="13" fontWeight="700" fontFamily="var(--sw-font-display)">
                Csus4 ✓
              </text>
              <text x="61" y="46" textAnchor="middle" fill="var(--sw-valid-text)" fontSize="10" fontFamily="var(--sw-font-sans)">
                Snaps onto ladder
              </text>
              <rect x="126" y="8" width="106" height="50" rx="10" fill="var(--sw-invalid-surface)" stroke="var(--sw-invalid-border)" />
              <text x="179" y="30" textAnchor="middle" fill="var(--sw-invalid-text)" fontSize="12" fontWeight="700" fontFamily="var(--sw-font-display)">
                C–C#–G ✗
              </text>
              <text x="179" y="46" textAnchor="middle" fill="var(--sw-invalid-text)" fontSize="10" fontFamily="var(--sw-font-sans)">
                Bounces · 0 moves
              </text>
            </svg>
            <div className="sw-howto-copy">
              <strong>Every step must be a real chord</strong>
              <span>Unrecognized clusters bounce back harmlessly without costing a move.</span>
            </div>
          </article>
          <article className="sw-howto-card">
            <div className="sw-howto-num">3</div>
            <svg className="sw-howto-diagram" viewBox="0 0 240 66" aria-hidden="true">
              <rect x="8" y="8" width="224" height="50" rx="10" fill="var(--sw-target-match-tint)" stroke="var(--sw-target-match-ring)" />
              <circle cx="48" cy="33" r="11" fill="var(--sw-voice-1)" stroke="var(--sw-target-match-ring)" strokeWidth="3" />
              <circle cx="90" cy="33" r="11" fill="var(--sw-voice-2)" stroke="var(--sw-target-match-ring)" strokeWidth="3" />
              <circle cx="132" cy="33" r="11" fill="var(--sw-voice-3)" stroke="var(--sw-target-match-ring)" strokeWidth="3" />
              <text x="186" y="30" textAnchor="middle" fill="var(--sw-target-match-text)" fontSize="13" fontWeight="700" fontFamily="var(--sw-font-display)">
                Par 5
              </text>
              <text x="186" y="46" textAnchor="middle" fill="var(--sw-target-match-text)" fontSize="10" fontFamily="var(--sw-font-mono)">
                3/3 Gold
              </text>
            </svg>
            <div className="sw-howto-copy">
              <strong>Match every target note in Par</strong>
              <span>Gold rings mark target pitch matches. Beat Par for Eagle; zero undos earns Par Pure. You get Par + 3 moves.</span>
            </div>
          </article>
        </div>
        <div className="sw-howto-legend">
          <span className="sw-legend-item">
            <i className="sw-legend-swatch sw-swatch-gold" />
            Target Pitch Match
          </span>
          <span className="sw-legend-item">
            <i className="sw-legend-swatch sw-swatch-lava" />
            Lava Blocked Note
          </span>
          <span className="sw-legend-item">
            <i className="sw-legend-swatch sw-swatch-diamond" />
            Checkpoint Required
          </span>
        </div>
      </div>
    </Backdrop>
  );
}

// ---------------------------------------------------------------- Stats drawer

const DIST_LABEL: Record<DistBucket, string> = {
  eagle: 'Eagle',
  'par-pure': 'Par Pure',
  par: 'Par',
  '+1': '+1',
  '+2': '+2',
  '+3': '+3',
  missed: 'Missed',
};
const DIST_CLASS: Record<DistBucket, string> = {
  eagle: 'is-eagle',
  'par-pure': 'is-par',
  par: 'is-par',
  '+1': 'is-solved',
  '+2': 'is-solved',
  '+3': 'is-solved',
  missed: 'is-missed',
};

function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange(v: T): void }) {
  return (
    <div className="sw-seg-ctrl" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} type="button" className={`sw-seg-btn${value === v ? ' is-active' : ''}`} aria-pressed={value === v} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  );
}

export function StatsDrawer({
  open,
  onClose,
  stats,
  streak,
  todayBucket,
  prefs,
  onPrefs,
}: {
  open: boolean;
  onClose(): void;
  stats: LifetimeStats;
  streak: number;
  todayBucket: DistBucket | null;
  prefs: Preferences;
  onPrefs(p: Partial<Preferences>): void;
}) {
  const maxCount = Math.max(1, ...DIST_BUCKETS.map((b) => stats.distribution[b]));
  const winPct = stats.played ? Math.round((stats.won / stats.played) * 100) : 0;
  return (
    <Backdrop open={open} onClose={onClose} labelledBy="stats-title" drawer>
      <aside className="sw-drawer">
        <div className="sw-drawer-header">
          <h2 className="sw-modal-title" id="stats-title">
            Stats &amp; Preferences
          </h2>
          <CloseBtn onClose={onClose} label="Close stats drawer" />
        </div>
        <div className="sw-kpi-grid">
          {(
            [
              [stats.played, 'Played'],
              [`${winPct}%`, 'Win %'],
              [streak, 'Streak'],
              [stats.maxStreak, 'Best'],
            ] as const
          ).map(([v, l]) => (
            <div key={l} className="sw-kpi-cell">
              <strong className="sw-kpi-val">{v}</strong>
              <span className="sw-kpi-label">{l}</span>
            </div>
          ))}
        </div>

        <div className="sw-drawer-section">
          <h3 className="sw-section-label">Golf Distribution</h3>
          <div className="sw-dist-bars">
            {DIST_BUCKETS.map((b) => {
              const n = stats.distribution[b];
              const width = n === 0 ? 0 : Math.max(9, (n / maxCount) * 100);
              return (
                <div key={b} className="sw-dist-row">
                  <span className="sw-dist-key">{DIST_LABEL[b]}</span>
                  <div className="sw-dist-track">
                    <div className={`sw-dist-fill ${DIST_CLASS[b]}${todayBucket === b ? ' is-highlight' : ''}${n === 0 ? ' is-empty' : ''}`} style={{ width: `${width}%` }}>
                      {n}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="sw-drawer-section">
          <h3 className="sw-section-label">Medals Earned</h3>
          <div className="sw-medal-shelf">
            {ALL_MEDALS.map((m) => (
              <div key={m} className={`sw-shelf-item${stats.medals[m] ? '' : ' is-locked'}`} title={MEDAL_NAMES[m]}>
                <img src={medalUrl(m)} alt={MEDAL_NAMES[m]} />
                <span>×{stats.medals[m]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="sw-drawer-section">
          <h3 className="sw-section-label">Settings</h3>
          <div className="sw-pref-row">
            <div>
              <strong>Theme</strong>
              <span>Archival Paper or Midnight Studio</span>
            </div>
            <Seg label="Theme preference" value={prefs.theme} options={[['light', 'Light'], ['dark', 'Dark']]} onChange={(theme) => onPrefs({ theme })} />
          </div>
          <div className="sw-pref-row">
            <div>
              <strong>Default Input View</strong>
              <span>Chromatic Rail or 12-Tone Clock</span>
            </div>
            <Seg label="Input preference" value={prefs.inputView} options={[['rail', 'Rail'], ['clock', 'Clock']]} onChange={(inputView) => onPrefs({ inputView })} />
          </div>
          <div className="sw-pref-row">
            <div>
              <strong>Note Spelling</strong>
              <span>Prefer Sharps (#) or Flats (b)</span>
            </div>
            <Seg
              label="Accidental spelling"
              value={prefs.noteSpelling}
              options={[['sharp', 'Sharps #'], ['flat', 'Flats b']]}
              onChange={(noteSpelling) => onPrefs({ noteSpelling })}
            />
          </div>
          <div className="sw-pref-row">
            <div>
              <strong>Audio Playback</strong>
              <span>Silent commute vs. Rhodes synth toggle</span>
            </div>
            <Seg
              label="Audio toggle"
              value={prefs.soundEnabled ? 'on' : 'muted'}
              options={[['muted', 'Silent'], ['on', 'Sound On']]}
              onChange={(v) => onPrefs({ soundEnabled: v === 'on' })}
            />
          </div>
        </div>
      </aside>
    </Backdrop>
  );
}
