import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { runPlaybackClock, synth } from './audio/synth';
import { pcName, respell, spellingFor } from './engine/chords';
import { generateDailyPuzzle, ruleDetail, ruleLabel, todayUtc } from './engine/daily';
import { allowedDeltas, countTargetMatches, ruleForbiddenPc, ruleMaxStep } from './engine/graph';
import { checkpointMet, currentPcs, gameReducer, initGame, toProgress, type GameState } from './game/gameState';
import { bucketFor, buildShareText, buildSummary } from './state/scoring';
import { buildDoneRecord, buildProgressRecord, DAILY_HUB_URL, emitDaily, labMoveFor, type DailyStats } from './state/daily';
import { defaultStore, displayStreak, loadPrefs, loadProgress, loadStats, recordResult, savePrefs, saveProgress, type LifetimeStats, type Preferences } from './state/storage';
import type { ChordNode, RejectReason, StepDelta } from './types/stepwise';
import { brandMarkUrl, type IconName } from './ui/assets';
import { Clock } from './ui/Clock';
import { Icon } from './ui/Icon';
import { Ladder } from './ui/Ladder';
import { HowToModal, ResolveModal, ShareModal, StatsDrawer, type PlaybackMode, type PlaybackState } from './ui/Modals';
import { Rail } from './ui/Rail';

const RULE_ICON: Record<string, IconName> = {
  standard: 'linear-rail',
  'half-steps-only': 'half-step-lock',
  'lava-note': 'lava-hazard',
  'checkpoint-quality': 'checkpoint-diamond',
  'four-voice-seventh': 'chromatic-clock',
};

/** Dev/QA only: ?date=YYYY-MM-DD loads another day's puzzle. Production always plays today (local day). */
function resolveDate(): string {
  if (import.meta.env.DEV) {
    const q = new URLSearchParams(location.search).get('date');
    if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) return q;
  }
  return todayUtc();
}

const dailyStatsOf = (s: LifetimeStats, dateKey: string): DailyStats => ({
  streak: displayStreak(s, dateKey),
  bestMoves: s.bestMoves ?? null,
  played: s.played,
});

type ModalId = 'resolve' | 'share' | 'howto' | 'stats' | null;
interface Toast {
  text: string;
  kind: 'invalid' | 'lava' | 'checkpoint';
  id: number;
}

export function App() {
  const dateUtc = useMemo(resolveDate, []);
  const puzzle = useMemo(() => generateDailyPuzzle(dateUtc), [dateUtc]);
  const [game, dispatch] = useReducer(gameReducer, null, (): GameState => initGame(puzzle, loadProgress(dateUtc)));
  const [prefs, setPrefs] = useState<Preferences>(loadPrefs);
  const [stats, setStats] = useState(loadStats);
  const [inputView, setInputView] = useState(prefs.inputView);
  const [modal, setModal] = useState<ModalId>(null);
  // A special-rule day opens its explanation before the first move: playtesters didn't find the pill tappable.
  const [ruleOpen, setRuleOpen] = useState(() => puzzle.rule.kind !== 'standard' && game.status === 'playing' && game.steps.length === 0);
  const [toast, setToast] = useState<Toast | null>(null);
  const [playback, setPlayback] = useState<PlaybackState | null>(null);
  const [compare, setCompare] = useState(false);
  const [shimmer, setShimmer] = useState(false);
  const cancelPlayback = useRef<(() => void) | null>(null);

  const spelling = prefs.noteSpelling;
  const pcs = currentPcs(game);
  const activeChord: ChordNode = game.steps.at(-1)?.chord ?? puzzle.start;
  const activeLabel = respell(activeChord, spelling).symbol;
  // Single notes (voice chips, rail, steppers, the lava note in the rule pill) follow the chord currently sounding.
  const noteSpell = spellingFor(spelling, activeChord);
  const cpMet = checkpointMet(game);
  const matchCount = countTargetMatches(pcs, puzzle.target.pitchClasses);
  const finished = game.status !== 'playing';
  const movesUsed = game.steps.length;
  const remaining = puzzle.maxMoves - movesUsed;
  const tension = !finished && remaining <= 2;
  const summary = useMemo(
    () => buildSummary(puzzle, { steps: game.steps, undos: game.undos, invalidAttempts: game.invalidAttempts, solved: game.status === 'solved' }),
    [puzzle, game.steps, game.undos, game.invalidAttempts, game.status],
  );
  const shareText = useMemo(() => buildShareText(puzzle, summary, spelling).text, [puzzle, summary, spelling]);

  // ---- Theme / prefs
  useEffect(() => {
    document.documentElement.dataset.theme = prefs.theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', prefs.theme === 'dark' ? '#111318' : '#F5F3EE');
  }, [prefs.theme]);

  const updatePrefs = useCallback((patch: Partial<Preferences>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      savePrefs(next);
      return next;
    });
    if (patch.inputView) setInputView(patch.inputView);
    if (patch.soundEnabled !== undefined) synth.setEnabled(patch.soundEnabled); // inside the click gesture
  }, []);

  useEffect(() => {
    synth.enabled = prefs.soundEnabled;
  }, [prefs.soundEnabled]);

  // Transparent unlock on the first gesture when Sound is on (never an audio splash).
  useEffect(() => {
    // pointerdown is the fast path; iOS WebKit only grants audio activation on touchend/click/keydown.
    const unlock = () => synth.unlock();
    const events = ['pointerdown', 'touchend', 'click', 'keydown'] as const;
    events.forEach((ev) => window.addEventListener(ev, unlock, { capture: true }));
    return () => events.forEach((ev) => window.removeEventListener(ev, unlock, { capture: true }));
  }, []);

  // Roll over to the new daily puzzle after local midnight (tab left open overnight). Reload when the
  // player returns to the tab, or on a timer unless they are mid-solve. Skipped for ?date= previews.
  const statusRef = useRef(game.status);
  statusRef.current = game.status;
  const movesRef = useRef(game.steps.length);
  movesRef.current = game.steps.length;
  useEffect(() => {
    if (dateUtc !== todayUtc()) return;
    const stale = () => todayUtc() !== dateUtc;
    const onReturn = () => {
      if (document.visibilityState === 'visible' && stale()) location.reload();
    };
    const id = setInterval(() => {
      const midSolve = statusRef.current === 'playing' && movesRef.current > 0;
      if (stale() && !midSolve) location.reload();
    }, 60_000);
    document.addEventListener('visibilitychange', onReturn);
    window.addEventListener('focus', onReturn);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onReturn);
      window.removeEventListener('focus', onReturn);
    };
  }, [dateUtc]);

  // ---- Persistence + resolution
  const firstRender = useRef(true);
  // Reharm Daily hub mirror (`daily:v1:stepwise`): only for today's real puzzle, never ?date= previews.
  const isToday = dateUtc === todayUtc();

  useEffect(() => {
    saveProgress(dateUtc, toProgress(game));
    if (isToday && game.status === 'playing') {
      emitDaily(buildProgressRecord(puzzle, game.steps.length, dailyStatsOf(loadStats(), dateUtc)), defaultStore());
    }
  }, [dateUtc, game]);

  useEffect(() => {
    if (!finished) return;
    const nextStats = recordResult(dateUtc, summary);
    setStats(nextStats);
    if (isToday) emitDaily(buildDoneRecord(puzzle, summary, dailyStatsOf(nextStats, dateUtc)), defaultStore());
    if (firstRender.current) {
      setModal('resolve'); // returning visitor: show today's result
      return;
    }
    setShimmer(true);
    const t = setTimeout(() => setModal('resolve'), 420);
    const s = setTimeout(() => setShimmer(false), 900);
    return () => {
      clearTimeout(t);
      clearTimeout(s);
    };
  }, [finished]);

  useEffect(() => {
    firstRender.current = false;
  }, []);

  // ---- Visual hooks: toasts, audio
  const showToast = useCallback((text: string, kind: Toast['kind']) => {
    setToast({ text, kind, id: Date.now() });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  const rejectMessage = useCallback(
    (reason: RejectReason, toPc: number) =>
      reason === 'lava-blocked'
        ? `${pcName(toPc, noteSpell)} is Lava today — detour required`
        : reason === 'half-step-locked'
          ? 'Half-Steps Only day — ±2 semitones locked'
          : 'Not a triad or 7th chord — bounced, 0 moves used',
    [noteSpell],
  );

  useEffect(() => {
    const r = game.rejection;
    if (!r) return;
    showToast(rejectMessage(r.reason, r.toPc), r.reason === 'lava-blocked' ? 'lava' : 'invalid');
    synth.playReject();
  }, [game.rejection?.nonce]);

  const prevSteps = useRef(game.steps.length);
  const prevCp = useRef(cpMet);
  useEffect(() => {
    const n = game.steps.length;
    if (n > prevSteps.current && game.commitNonce > 0) {
      const step = game.steps[n - 1];
      synth.playStep(step.move.voiceIndex, step.move.delta, step.chord.pitchClasses);
      if (!prevCp.current && cpMet && puzzle.rule.kind === 'checkpoint-quality') {
        showToast('Checkpoint Satisfied: Diminished chord passed!', 'checkpoint');
      }
    } else if (n < prevSteps.current) {
      synth.setCurrent(pcs);
    }
    prevSteps.current = n;
    prevCp.current = cpMet;
  }, [game.steps.length, game.commitNonce]);

  useEffect(() => {
    synth.setCurrent(currentPcs(game));
  }, []);

  // ---- Actions
  const move = useCallback((voice: number, delta: StepDelta) => dispatch({ type: 'move', voice, delta }), []);
  const select = useCallback((voice: number) => dispatch({ type: 'select', voice }), []);
  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const toggleView = useCallback(() => setInputView((v) => (v === 'rail' ? 'clock' : 'rail')), []);

  const stopPlayback = useCallback(() => {
    cancelPlayback.current?.();
    cancelPlayback.current = null;
    synth.silence();
    setPlayback(null);
  }, []);

  const togglePlay = useCallback(
    (mode: PlaybackMode) => {
      if (cancelPlayback.current) {
        // Pause: freeze the cascade on the current chord; the next tap resumes from it.
        cancelPlayback.current();
        cancelPlayback.current = null;
        synth.silence();
        setPlayback((p) => (p ? { ...p, paused: true } : null));
        return;
      }
      const steps = mode === 'user' ? game.steps : puzzle.optimalPath;
      const moves = steps.map((s) => s.move);
      const from = playback?.paused && playback.mode === mode && playback.index < steps.length ? playback.index : 0;
      const audioStart = synth.scheduleLadder(puzzle.start.pitchClasses, moves, from);
      setPlayback({ mode, index: from, total: steps.length });
      cancelPlayback.current = runPlaybackClock(
        steps.length,
        audioStart,
        () => synth.audioTime,
        (i) => {
          setPlayback({ mode, index: i, total: steps.length });
          if (i === steps.length) {
            setShimmer(true);
            setTimeout(() => setShimmer(false), 480);
          }
        },
        () => {
          cancelPlayback.current = null;
          setPlayback(null);
        },
        from,
      );
    },
    [game.steps, puzzle, playback],
  );

  const closeModal = useCallback(() => {
    if (modal === 'resolve') stopPlayback();
    setModal(null);
  }, [modal, stopPlayback]);

  useEffect(() => () => cancelPlayback.current?.(), []);

  // ---- Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Escape') {
        if (modal) closeModal();
        setRuleOpen(false);
        return;
      }
      if (modal) return;
      if (['1', '2', '3', '4'].includes(e.key)) {
        select(Number(e.key) - 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const sign = e.key === 'ArrowLeft' ? -1 : 1;
        move(game.selectedVoice, (sign * (e.shiftKey ? 2 : 1)) as StepDelta);
      } else if (e.key.toLowerCase() === 'z') {
        undo();
      } else if (e.key.toLowerCase() === 'm') {
        toggleView();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modal, closeModal, select, move, undo, toggleView, game.selectedVoice]);

  // ---- Render
  const rule = puzzle.rule;
  const lockedTwo = ruleMaxStep(rule) === 1;
  const selPc = pcs[game.selectedVoice] ?? pcs[0];
  const lavaPc = ruleForbiddenPc(rule);
  const playOnBoard = playback?.mode === 'user' ? playback.index : null;
  const deltas = allowedDeltas(rule);

  return (
    <>
      <div className="sw-shell">
        {/* Reharm Daily family strip (ReharmLab-Dailys/design/bridge-spec.md §2.2) */}
        <nav className="daily-bridge-bar" aria-label="Reharm Daily navigation">
          <a className="daily-back-link" href={DAILY_HUB_URL}>
            <span aria-hidden="true">←</span>
            <span>Reharm Daily</span>
          </a>
          {/* STEPWISE only knows its own result: "1/1 today" read as the whole daily sheet being done. */}
          <a className="daily-ritual-mini" href={DAILY_HUB_URL} aria-label={`${finished ? 'STEPWISE done today. ' : ''}Open today's Reharm Daily sheet`}>
            <span className="daily-mini-count">{finished ? 'STEPWISE done' : 'Daily sheet'}</span>
            <span className="daily-mini-dots" aria-hidden="true">
              <i className={finished ? 'is-done' : undefined} />
            </span>
          </a>
        </nav>

        <header className="sw-header" aria-label="Game header">
          <div className="sw-header-left">
            <a href="./" className="sw-brand-lockup" aria-label="STEPWISE Home" onClick={(e) => e.preventDefault()}>
              <img src={brandMarkUrl} alt="" className="sw-brand-mark" width="30" height="30" />
              <span className="sw-brand-wordmark">STEPWISE</span>
            </a>
            <span className="sw-puzzle-num">#{puzzle.puzzleNumber}</span>
            <button
              type="button"
              className={`sw-rule-pill${rule.kind === 'checkpoint-quality' && cpMet ? ' is-satisfied' : ''}`}
              data-rule={rule.kind}
              aria-expanded={ruleOpen}
              aria-controls="sw-rule-banner"
              title="View daily rule details"
              onClick={() => setRuleOpen((o) => !o)}
            >
              <span className="sw-rule-icon">
                <Icon name={RULE_ICON[rule.kind]} small />
              </span>
              <span>{ruleLabel(rule, noteSpell)}</span>
              <span className="sw-rule-pill-info" aria-hidden="true">ⓘ</span>
            </button>
          </div>
          <div className="sw-header-actions">
            <button
              type="button"
              className="sw-icon-btn"
              aria-label={prefs.soundEnabled ? 'Sound on — switch to silent' : 'Silent — turn sound on'}
              aria-pressed={prefs.soundEnabled}
              title={prefs.soundEnabled ? 'Rhodes synth on' : 'Silent-first mode'}
              onClick={() => updatePrefs({ soundEnabled: !prefs.soundEnabled })}
            >
              <Icon name={prefs.soundEnabled ? 'sound-on' : 'sound-muted'} />
            </button>
            <button
              type="button"
              className="sw-icon-btn"
              aria-label="Toggle Light or Dark theme"
              title="Switch Light / Dark theme"
              onClick={() => updatePrefs({ theme: prefs.theme === 'light' ? 'dark' : 'light' })}
            >
              <Icon name={prefs.theme === 'dark' ? 'theme-sun' : 'theme-moon'} />
            </button>
            <button type="button" className="sw-icon-btn" aria-label="Open Stats and Settings" title="Stats & Settings" onClick={() => setModal('stats')}>
              <Icon name="stats" />
            </button>
            <button type="button" className="sw-icon-btn" aria-label="How to play" title="How to Play" onClick={() => setModal('howto')}>
              <Icon name="help" />
            </button>
          </div>
        </header>

        <div className="sw-rule-banner" id="sw-rule-banner" hidden={!ruleOpen}>
          <span>{ruleDetail(rule, noteSpell)}</span>
          <button type="button" className="sw-rule-banner-close" aria-label="Dismiss rule explanation" onClick={() => setRuleOpen(false)}>
            ✕
          </button>
        </div>

        <main className="sw-workspace">
          <Ladder
            puzzle={puzzle}
            steps={game.steps}
            spelling={spelling}
            commitNonce={game.commitNonce}
            checkpointMet={cpMet}
            solved={game.status === 'solved'}
            playIndex={playOnBoard}
            shimmer={shimmer}
          />

          <section className="sw-console-column" aria-label="Tactile Voice-Leading Console">
            <div className="sw-hud-bar">
              <div className={`sw-hud-metric${tension ? ' is-tension' : ''}`}>
                <span className="sw-hud-label">{tension ? `${remaining} left` : 'Moves'}</span>
                <span className="sw-hud-val">
                  {movesUsed} / {puzzle.maxMoves}
                </span>
              </div>
              <div className="sw-hud-divider" aria-hidden="true" />
              <div className="sw-hud-metric">
                <span className="sw-hud-label">Par</span>
                <span className="sw-hud-val">{puzzle.parMoves}</span>
              </div>
              <div className="sw-hud-divider" aria-hidden="true" />
              <div className="sw-hud-metric">
                <span className="sw-hud-label">Travel</span>
                <span className="sw-hud-val">{game.steps.at(-1)?.cumulativeSemitones ?? 0} st</span>
              </div>
              {finished ? (
                <button type="button" className="sw-undo-btn" onClick={() => setModal('resolve')}>
                  <Icon name="stats" small />
                  <span>Result</span>
                </button>
              ) : (
                <button type="button" className="sw-undo-btn" aria-label="Undo last move" disabled={movesUsed === 0} onClick={undo}>
                  <Icon name="undo" small />
                  <span>Undo</span>
                </button>
              )}
            </div>

            <div className="sw-toast-slot" aria-live="assertive">
              {toast ? (
                <div className="sw-feedback-pill" data-kind={toast.kind} key={toast.id}>
                  <span className="sw-feedback-dot" aria-hidden="true" />
                  <span>{toast.text}</span>
                </div>
              ) : null}
            </div>

            <div className="sw-console-toolbar">
              <div className="sw-view-switch" role="tablist" aria-label="Input mode">
                {(['rail', 'clock'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={`sw-view-tab${inputView === v ? ' is-active' : ''}`}
                    role="tab"
                    aria-selected={inputView === v}
                    onClick={() => setInputView(v)}
                  >
                    <Icon name={v === 'rail' ? 'linear-rail' : 'chromatic-clock'} small />
                    <span>{v === 'rail' ? 'Rail' : 'Clock'}</span>
                  </button>
                ))}
              </div>
              <div className="sw-voice-chips" role="group" aria-label="Select voice to move">
                {pcs.map((pc, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`sw-voice-chip${game.selectedVoice === i ? ' is-selected' : ''}`}
                    data-voice={i}
                    aria-pressed={game.selectedVoice === i}
                    onClick={() => select(i)}
                  >
                    <span className="sw-voice-chip-dot" aria-hidden="true" />
                    <span>
                      V{i + 1}:{pcName(pc, noteSpell)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="sw-input-stage">
              {inputView === 'rail' ? (
                <Rail
                  pcs={pcs}
                  targetPcs={puzzle.target.pitchClasses}
                  rule={rule}
                  spelling={noteSpell}
                  targetSpelling={spellingFor(spelling, puzzle.target)}
                  selectedVoice={game.selectedVoice}
                  activeLabel={activeLabel}
                  rejection={game.rejection}
                  disabled={finished}
                  onSelect={select}
                  onMove={move}
                />
              ) : (
                <Clock
                  pcs={pcs}
                  targetPcs={puzzle.target.pitchClasses}
                  rule={rule}
                  spelling={noteSpell}
                  targetSpelling={spellingFor(spelling, puzzle.target)}
                  selectedVoice={game.selectedVoice}
                  activeLabel={activeLabel}
                  matchCount={matchCount}
                  checkpointMet={cpMet}
                  rejection={game.rejection}
                  disabled={finished}
                  onSelect={select}
                  onMove={move}
                />
              )}
            </div>

            <div className="sw-stepper-dock" role="group" aria-label="Slide selected voice">
              {([-2, -1, 1, 2] as const).map((d) => {
                const locked = lockedTwo && Math.abs(d) === 2;
                const toPc = (((selPc + d) % 12) + 12) % 12;
                return (
                  <button
                    key={d}
                    type="button"
                    className={`sw-step-btn${lavaPc === toPc && deltas.includes(d) ? ' is-lava-dest' : ''}`}
                    data-delta={d}
                    disabled={locked || finished}
                    aria-disabled={locked || finished}
                    aria-label={locked ? `${d > 0 ? '+' : ''}${d} locked on Half-Steps Only day` : `Move voice ${game.selectedVoice + 1} ${d > 0 ? 'up' : 'down'} ${Math.abs(d)} to ${pcName(toPc, noteSpell)}`}
                    onClick={() => move(game.selectedVoice, d)}
                  >
                    <span className="sw-step-delta">{d > 0 ? `+${d}` : d}</span>
                    <span className="sw-step-note">→ {pcName(toPc, noteSpell)}</span>
                    {locked ? (
                      <span className="sw-step-lock-badge" aria-hidden="true">
                        <Icon name="half-step-lock" small />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <p className="sw-desktop-kbd-hint" aria-hidden="true">
              Shortcuts: <kbd>1</kbd>–<kbd>{pcs.length}</kbd> Voice · <kbd>←</kbd>
              <kbd>→</kbd> ±1 · <kbd>Shift</kbd>+<kbd>←</kbd>
              <kbd>→</kbd> ±2 · <kbd>Z</kbd> Undo · <kbd>M</kbd> Rail/Clock
            </p>
          </section>
        </main>
      </div>

      <ResolveModal
        open={modal === 'resolve' && finished}
        onClose={closeModal}
        puzzle={puzzle}
        summary={summary}
        spelling={spelling}
        playback={playback}
        labMove={labMoveFor(puzzle, summary)}
        onTogglePlay={togglePlay}
        compare={compare}
        onToggleCompare={() => {
          stopPlayback();
          setCompare((c) => !c);
        }}
        onShare={() => {
          stopPlayback();
          setModal('share');
        }}
      />
      <ShareModal open={modal === 'share'} onClose={closeModal} text={shareText} />
      <HowToModal open={modal === 'howto'} onClose={closeModal} halfSteps={lockedTwo} />
      <StatsDrawer
        open={modal === 'stats'}
        onClose={closeModal}
        stats={stats}
        streak={displayStreak(stats, todayUtc())}
        todayBucket={finished ? bucketFor(summary) : null}
        prefs={prefs}
        onPrefs={updatePrefs}
      />
    </>
  );
}
