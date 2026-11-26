/**
 * STEPWISE — Zero-Logic Visual Showcase Controller
 * Strictly mocked preset progressions & UI state previews.
 * NO chord graph, BFS solver, Web Audio API, or persistence logic.
 */

(() => {
  'use strict';

  const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const FLAT_NAMES  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const BLACK_PC = new Set([1, 3, 6, 8, 10]);

  const VOICE_COLORS = [
    { varName: '--sw-voice-1', onVar: '--sw-voice-1-on', shape: 'circle' },
    { varName: '--sw-voice-2', onVar: '--sw-voice-2-on', shape: 'square' },
    { varName: '--sw-voice-3', onVar: '--sw-voice-3-on', shape: 'diamond' },
    { varName: '--sw-voice-4', onVar: '--sw-voice-4-on', shape: 'triangle' },
  ];

  // Strictly hardcoded mocked daily puzzle presets (no solver or graph engine)
  const PRESETS = {
    halfstep: {
      puzzleNumber: 88,
      rule: {
        kind: 'half-steps-only',
        label: 'Half-Steps ±1',
        detail: 'Weekend Half-Steps Only: Slide exactly one voice by +1 or -1 semitone per turn (±2 is locked).',
        icon: 'half-step-lock',
        maxStep: 1,
      },
      parMoves: 5,
      parSemitones: 5,
      maxMoves: 8,
      defaultStepIndex: 3, // Starts mid-ladder to immediately showcase SVG threads & Gold match
      start: {
        symbol: 'C Maj',
        quality: 'major',
        qualityLabel: 'Maj',
        pitchClasses: [0, 4, 7],
      },
      target: {
        symbol: 'F# Min',
        flatSymbol: 'Gb Min',
        quality: 'minor',
        qualityLabel: 'Min',
        pitchClasses: [1, 6, 9],
      },
      steps: [
        {
          chord: { symbol: 'Csus4', flatSymbol: 'Csus4', quality: 'sus', qualityLabel: 'sus4', pitchClasses: [0, 5, 7] },
          move: { voiceIndex: 1, fromPc: 4, toPc: 5, delta: 1, wrappedOctave: false },
          semitones: 1,
        },
        {
          chord: { symbol: 'F Min', flatSymbol: 'F Min', quality: 'minor', qualityLabel: 'Min', pitchClasses: [0, 5, 8] },
          move: { voiceIndex: 2, fromPc: 7, toPc: 8, delta: 1, wrappedOctave: false },
          semitones: 2,
        },
        {
          chord: { symbol: 'Db Maj', flatSymbol: 'Db Maj', sharpSymbol: 'C# Maj', quality: 'major', qualityLabel: 'Maj', pitchClasses: [1, 5, 8] },
          move: { voiceIndex: 0, fromPc: 0, toPc: 1, delta: 1, wrappedOctave: false },
          semitones: 3,
        },
        {
          chord: { symbol: 'Dbsus4', flatSymbol: 'Dbsus4', sharpSymbol: 'C#sus4', quality: 'sus', qualityLabel: 'sus4', pitchClasses: [1, 6, 8] },
          move: { voiceIndex: 1, fromPc: 5, toPc: 6, delta: 1, wrappedOctave: false },
          semitones: 4,
        },
        {
          chord: { symbol: 'F# Min', flatSymbol: 'Gb Min', sharpSymbol: 'F# Min', quality: 'minor', qualityLabel: 'Min', pitchClasses: [1, 6, 9] },
          move: { voiceIndex: 2, fromPc: 8, toPc: 9, delta: 1, wrappedOctave: false },
          semitones: 5,
        },
      ],
      optimalPath: [
        { symbol: 'C Aug', moveText: 'V3 +1', pitchClasses: [0, 4, 8] },
        { symbol: 'C# Min', moveText: 'V1 +1', pitchClasses: [1, 4, 8] },
        { symbol: 'A Maj', moveText: 'V3 +1', pitchClasses: [1, 4, 9] },
        { symbol: 'A Aug', moveText: 'V2 +1', pitchClasses: [1, 5, 9] },
        { symbol: 'F# Min', moveText: 'V2 +1', pitchClasses: [1, 6, 9] },
      ],
      medal: { id: 'medal-par-pure', frame: 'frame-par', rank: 'par', rankLabel: 'PAR PURE' },
    },

    lava: {
      puzzleNumber: 89,
      rule: {
        kind: 'lava-note',
        label: 'Lava Note: G#',
        detail: 'Lava Note Hazard: Pitch class G# / Ab is blocked today. Detour around it in ±1 or ±2 steps.',
        icon: 'lava-hazard',
        maxStep: 2,
        forbiddenPc: 8,
      },
      parMoves: 3,
      parSemitones: 5,
      maxMoves: 6,
      defaultStepIndex: 1,
      start: {
        symbol: 'C Maj',
        quality: 'major',
        qualityLabel: 'Maj',
        pitchClasses: [0, 4, 7],
      },
      target: {
        symbol: 'F# Min',
        flatSymbol: 'Gb Min',
        quality: 'minor',
        qualityLabel: 'Min',
        pitchClasses: [1, 6, 9],
      },
      steps: [
        {
          chord: { symbol: 'A Min', flatSymbol: 'A Min', quality: 'minor', qualityLabel: 'Min', pitchClasses: [0, 4, 9] },
          move: { voiceIndex: 2, fromPc: 7, toPc: 9, delta: 2, wrappedOctave: false },
          semitones: 2,
        },
        {
          chord: { symbol: 'A Maj', flatSymbol: 'A Maj', quality: 'major', qualityLabel: 'Maj', pitchClasses: [1, 4, 9] },
          move: { voiceIndex: 0, fromPc: 0, toPc: 1, delta: 1, wrappedOctave: false },
          semitones: 3,
        },
        {
          chord: { symbol: 'F# Min', flatSymbol: 'Gb Min', quality: 'minor', qualityLabel: 'Min', pitchClasses: [1, 6, 9] },
          move: { voiceIndex: 1, fromPc: 4, toPc: 6, delta: 2, wrappedOctave: false },
          semitones: 5,
        },
      ],
      optimalPath: [
        { symbol: 'A Min', moveText: 'V3 +2', pitchClasses: [0, 4, 9] },
        { symbol: 'A Maj', moveText: 'V1 +1', pitchClasses: [1, 4, 9] },
        { symbol: 'F# Min', moveText: 'V2 +2', pitchClasses: [1, 6, 9] },
      ],
      medal: { id: 'medal-par', frame: 'frame-par', rank: 'par', rankLabel: 'PAR' },
    },

    checkpoint: {
      puzzleNumber: 90,
      rule: {
        kind: 'checkpoint-quality',
        label: 'Checkpoint: Dim',
        detail: 'Friday Checkpoint: Your progression must pass through at least one Diminished triad before resolving.',
        icon: 'checkpoint-diamond',
        maxStep: 2,
        requiredQuality: 'dim',
      },
      parMoves: 3,
      parSemitones: 5,
      maxMoves: 6,
      defaultStepIndex: 1,
      start: {
        symbol: 'C Maj',
        quality: 'major',
        qualityLabel: 'Maj',
        pitchClasses: [0, 4, 7],
      },
      target: {
        symbol: 'F# Min',
        flatSymbol: 'Gb Min',
        quality: 'minor',
        qualityLabel: 'Min',
        pitchClasses: [1, 6, 9],
      },
      steps: [
        {
          chord: { symbol: 'C# Dim', flatSymbol: 'Db Dim', sharpSymbol: 'C# Dim', quality: 'dim', qualityLabel: 'Dim', pitchClasses: [1, 4, 7] },
          move: { voiceIndex: 0, fromPc: 0, toPc: 1, delta: 1, wrappedOctave: false },
          semitones: 1,
          satisfiesCheckpoint: true,
        },
        {
          chord: { symbol: 'A Maj', flatSymbol: 'A Maj', quality: 'major', qualityLabel: 'Maj', pitchClasses: [1, 4, 9] },
          move: { voiceIndex: 2, fromPc: 7, toPc: 9, delta: 2, wrappedOctave: false },
          semitones: 3,
        },
        {
          chord: { symbol: 'F# Min', flatSymbol: 'Gb Min', quality: 'minor', qualityLabel: 'Min', pitchClasses: [1, 6, 9] },
          move: { voiceIndex: 1, fromPc: 4, toPc: 6, delta: 2, wrappedOctave: false },
          semitones: 5,
        },
      ],
      optimalPath: [
        { symbol: 'C# Dim', moveText: 'V1 +1', pitchClasses: [1, 4, 7] },
        { symbol: 'A Maj', moveText: 'V3 +2', pitchClasses: [1, 4, 9] },
        { symbol: 'F# Min', moveText: 'V2 +2', pitchClasses: [1, 6, 9] },
      ],
      medal: { id: 'medal-eagle', frame: 'frame-eagle', rank: 'eagle', rankLabel: 'EAGLE' },
    },

    sevenths: {
      puzzleNumber: 91,
      rule: {
        kind: 'four-voice-seventh',
        label: '4-Voice 7ths',
        detail: 'Weekend 4-Voice Edition: Navigate 4-note seventh chords (Cmaj7 → Bmaj7) with octave wrapping.',
        icon: 'chromatic-clock',
        maxStep: 2,
      },
      parMoves: 4,
      parSemitones: 4,
      maxMoves: 7,
      defaultStepIndex: 2,
      start: {
        symbol: 'Cmaj7',
        quality: 'seventh',
        qualityLabel: 'maj7',
        pitchClasses: [0, 4, 7, 11],
      },
      target: {
        symbol: 'Bmaj7',
        flatSymbol: 'Bmaj7',
        quality: 'seventh',
        qualityLabel: 'maj7',
        pitchClasses: [11, 3, 6, 10],
      },
      steps: [
        {
          chord: { symbol: 'C7', flatSymbol: 'C7', quality: 'seventh', qualityLabel: 'dom7', pitchClasses: [0, 4, 7, 10] },
          move: { voiceIndex: 3, fromPc: 11, toPc: 10, delta: -1, wrappedOctave: false },
          semitones: 1,
        },
        {
          chord: { symbol: 'Cm7', flatSymbol: 'Cm7', quality: 'minor', qualityLabel: 'm7', pitchClasses: [0, 3, 7, 10] },
          move: { voiceIndex: 1, fromPc: 4, toPc: 3, delta: -1, wrappedOctave: false },
          semitones: 2,
        },
        {
          chord: { symbol: 'Cm7b5', flatSymbol: 'Cm7b5', quality: 'dim', qualityLabel: 'm7b5', pitchClasses: [0, 3, 6, 10] },
          move: { voiceIndex: 2, fromPc: 7, toPc: 6, delta: -1, wrappedOctave: false },
          semitones: 3,
        },
        {
          chord: { symbol: 'Bmaj7', flatSymbol: 'Bmaj7', quality: 'seventh', qualityLabel: 'maj7', pitchClasses: [11, 3, 6, 10] },
          move: { voiceIndex: 0, fromPc: 0, toPc: 11, delta: -1, wrappedOctave: true },
          semitones: 4,
        },
      ],
      optimalPath: [
        { symbol: 'C7', moveText: 'V4 -1', pitchClasses: [0, 4, 7, 10] },
        { symbol: 'Cm7', moveText: 'V2 -1', pitchClasses: [0, 3, 7, 10] },
        { symbol: 'Cm7b5', moveText: 'V3 -1', pitchClasses: [0, 3, 6, 10] },
        { symbol: 'Bmaj7', moveText: 'V1 -1', pitchClasses: [11, 3, 6, 10] },
      ],
      medal: { id: 'medal-four-voice-virtuoso', frame: 'frame-challenge', rank: 'par', rankLabel: '4-VOICE PAR' },
    },
  };

  // Inline SVG icons matching assets/icons/* (uniform 24x24, 1.75px stroke)
  const ICONS = {
    'linear-rail': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M7.5 6v6M12.5 6v6M17.5 6v6"/><circle cx="9.5" cy="14.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="15.5" cy="14.5" r="1.5" fill="currentColor" stroke="none"/></svg>',
    'chromatic-clock': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21"/><polygon points="12,6.2 17,14.5 7,14.5"/></svg>',
    'lava-hazard': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3L21 19H3L12 3Z"/><path d="M9.5 11.5l5 5M14.5 11.5l-5 5"/></svg>',
    'checkpoint-diamond': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3L21 12L12 21L3 12L12 3Z"/><circle cx="12" cy="12" r="2.25"/></svg>',
    'half-step-lock': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/><circle cx="12" cy="15.5" r="1.25" fill="currentColor" stroke="none"/></svg>',
    'undo': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
    'play': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="7,4.5 19.5,12 7,19.5"/></svg>',
    'pause': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="6.5" y="4.5" width="3.75" height="15" rx="1"/><rect x="13.75" y="4.5" width="3.75" height="15" rx="1"/></svg>',
    'compare-optimal': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4v16"/><path d="M5 8h6.5a2.5 2.5 0 0 1 2.5 2.5V20"/><path d="M19 4v16"/><path d="M19 12h-3"/></svg>',
    'sound-on': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="11,5 6,9 2.5,9 2.5,15 6,15 11,19"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
    'sound-muted': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="11,5 6,9 2.5,9 2.5,15 6,15 11,19"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>',
    'share': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5v11"/><path d="M7.5 8L12 3.5L16.5 8"/><path d="M5 13v5.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V13"/></svg>',
    'stats': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="13" width="3.5" height="7" rx="1"/><rect x="10.25" y="5" width="3.5" height="15" rx="1"/><rect x="16.5" y="9" width="3.5" height="11" rx="1"/></svg>',
    'help': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.4 9.3a2.7 2.7 0 0 1 5.2.9c0 1.8-2.6 2.3-2.6 4"/><circle cx="12" cy="17.25" r="0.9" fill="currentColor" stroke="none"/></svg>',
    'theme-sun': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.25M12 19.25v2.25M2.5 12h2.25M19.25 12h2.25M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/></svg>',
    'theme-moon': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20.2 14.5A8.5 8.5 0 0 1 9.5 3.8a8.5 8.5 0 1 0 10.7 10.7Z"/></svg>',
  };

  // Visual Showcase State
  const state = {
    presetKey: 'halfstep',
    stepIndex: 3,
    selectedVoice: 1, // Selects the next scripted voice smoothly
    inputView: 'rail', // 'rail' | 'clock'
    theme: 'light',
    spelling: 'sharp', // 'sharp' | 'flat'
    soundOn: false,
    undosUsed: 0,
    tensionOverride: false,
    outOfMovesPreview: false,
    justCommitted: false,
    clockRenderedCoords: null,
    clockRafId: null,
    playbackTimerId: null,
    playbackActive: false,
    compareOptimal: false,
    toastTimerId: null,
  };

  // Utility Helpers
  const $ = (id) => document.getElementById(id);
  const pcName = (pc) => (state.spelling === 'flat' ? FLAT_NAMES : SHARP_NAMES)[((pc % 12) + 12) % 12];
  const chordLabel = (chord) => {
    if (state.spelling === 'flat' && chord.flatSymbol) return chord.flatSymbol;
    if (state.spelling === 'sharp' && chord.sharpSymbol) return chord.sharpSymbol;
    return chord.symbol;
  };
  const currentPreset = () => PRESETS[state.presetKey];

  function getActiveChord() {
    const p = currentPreset();
    if (state.stepIndex <= 0) return p.start;
    return p.steps[Math.min(state.stepIndex - 1, p.steps.length - 1)].chord;
  }

  function getMovesUsed() {
    const p = currentPreset();
    if (state.outOfMovesPreview) return p.maxMoves;
    if (state.tensionOverride) return Math.max(state.stepIndex, p.maxMoves - 2);
    return state.stepIndex;
  }

  function getSemitones() {
    const p = currentPreset();
    if (state.stepIndex <= 0) return 0;
    return p.steps[state.stepIndex - 1].semitones;
  }

  function isCheckpointSatisfied() {
    const p = currentPreset();
    if (p.rule.kind !== 'checkpoint-quality') return true;
    for (let i = 0; i < state.stepIndex; i++) {
      if (p.steps[i].satisfiesCheckpoint) return true;
    }
    return false;
  }

  function countTargetMatches(pitchClasses) {
    const targetSet = new Set(currentPreset().target.pitchClasses);
    let hits = 0;
    for (const pc of pitchClasses) {
      if (targetSet.has(pc)) hits++;
    }
    return hits;
  }

  // Visual Trigger Hooks (matches design/motion-spec.md contract)
  const VisualHooks = {
    onVoiceSlide(voiceIdx, _fromPc, _toPc, valid, reason = 'invalid-cluster') {
      if (!valid) {
        const puck = document.querySelector(`.sw-rail-puck[data-voice="${voiceIdx}"]:not(.is-ghost-echo)`);
        if (puck) {
          puck.classList.remove('is-bouncing');
          void puck.offsetWidth;
          puck.classList.add('is-bouncing');
        }
        const msg = reason === 'lava-blocked'
          ? `${pcName(currentPreset().rule.forbiddenPc)} is Lava today — detour required`
          : reason === 'half-step-locked'
            ? 'Half-Steps Only day — ±2 semitones locked'
            : 'Not a recognized chord — 0 moves used';
        showFeedback(msg, reason === 'lava-blocked' ? 'lava' : 'invalid');
      }
    },
    onStepCommit() {
      state.justCommitted = true;
      renderAll();
      state.justCommitted = false;
      const scroll = $('ladder-scroll');
      if (scroll) scroll.scrollTop = scroll.scrollHeight;
    },
    onUndo() {
      renderAll();
    },
    onCheckpointSatisfied() {
      showFeedback('Checkpoint Satisfied: Diminished chord passed!', 'checkpoint');
    },
    onResolve(mode = 'solved') {
      openResolutionModal(mode);
    },
  };

  function showFeedback(text, kind = 'invalid') {
    const pill = $('feedback-pill');
    const txt = $('feedback-text');
    if (!pill || !txt) return;
    pill.dataset.kind = kind;
    txt.textContent = text;
    pill.hidden = false;
    clearTimeout(state.toastTimerId);
    state.toastTimerId = setTimeout(() => {
      pill.hidden = true;
    }, 2600);
  }

  // Populate Static Chrome Icons
  function initStaticIcons() {
    $('icon-undo').innerHTML = ICONS.undo;
    $('icon-tab-rail').innerHTML = ICONS['linear-rail'];
    $('icon-tab-clock').innerHTML = ICONS['chromatic-clock'];
    $('icon-stats').innerHTML = ICONS.stats;
    $('icon-help').innerHTML = ICONS.help;
    $('icon-play-btn').innerHTML = ICONS.play;
    $('icon-compare-btn').innerHTML = ICONS['compare-optimal'];
    $('icon-res-share').innerHTML = ICONS.share;
    $('icon-copy-share').innerHTML = ICONS.share;
    $('checkpoint-icon').innerHTML = ICONS['checkpoint-diamond'];
    document.querySelectorAll('.sw-step-lock-badge').forEach((el) => {
      el.innerHTML = ICONS['half-step-lock'];
    });
  }

  function createAxisGridHtml(lavaPc) {
    let cells = '';
    for (let pc = 0; pc < 12; pc++) {
      const classes = ['sw-axis-cell'];
      if (BLACK_PC.has(pc)) classes.push('is-black');
      if (lavaPc === pc) classes.push('is-lava');
      cells += `<div class="${classes.join(' ')}"></div>`;
    }
    return `<div class="sw-axis-gridlines">${cells}</div>`;
  }

  function renderHeader() {
    const p = currentPreset();
    $('puzzle-num').textContent = `#${p.puzzleNumber}`;
    const pill = $('rule-pill');
    pill.dataset.rule = p.rule.kind;
    pill.classList.toggle('is-satisfied', p.rule.kind === 'checkpoint-quality' && isCheckpointSatisfied());
    $('rule-icon').innerHTML = ICONS[p.rule.icon];
    $('rule-label').textContent = p.rule.label;
    $('rule-banner-text').textContent = p.rule.detail;

    $('icon-sound').innerHTML = state.soundOn ? ICONS['sound-on'] : ICONS['sound-muted'];
    $('btn-sound').setAttribute('aria-pressed', String(state.soundOn));
    $('icon-theme').innerHTML = state.theme === 'dark' ? ICONS['theme-sun'] : ICONS['theme-moon'];
    $('demo-spelling-val').textContent = state.spelling === 'flat' ? 'b' : '#';
  }

  function renderAnchors() {
    const p = currentPreset();
    const active = getActiveChord();
    const targetSet = new Set(p.target.pitchClasses);
    const lavaPc = p.rule.forbiddenPc ?? -1;

    // Start Anchor
    $('start-chord-name').textContent = chordLabel(p.start);
    $('start-quality-badge').dataset.quality = p.start.quality;
    $('start-quality-badge').textContent = p.start.qualityLabel;
    const joiner = p.start.pitchClasses.length >= 4 ? '·' : ' · ';
    $('start-pitch-list').textContent = p.start.pitchClasses.map(pcName).join(joiner);

    const startDots = p.start.pitchClasses.map((pc, idx) => {
      const left = ((pc + 0.5) / 12) * 100;
      const matchClass = targetSet.has(pc) ? 'is-target-match' : '';
      return `<div class="sw-ladder-dot ${matchClass}" data-voice="${idx}" style="left:${left.toFixed(3)}%">${idx + 1}</div>`;
    }).join('');
    $('start-track-axis').innerHTML = createAxisGridHtml(lavaPc) + startDots;

    // Target Anchor
    const matches = countTargetMatches(active.pitchClasses);
    const totalVoices = p.target.pitchClasses.length;
    const isSolved = matches === totalVoices && isCheckpointSatisfied() && state.stepIndex > 0 && !state.outOfMovesPreview;

    $('target-anchor').classList.toggle('is-solved', isSolved);
    $('target-chord-name').textContent = chordLabel(p.target);
    $('target-quality-badge').dataset.quality = p.target.quality;
    $('target-quality-badge').textContent = p.target.qualityLabel;
    const targetJoiner = p.target.pitchClasses.length >= 4 ? '·' : ' · ';
    $('target-pitch-list').textContent = p.target.pitchClasses.map(pcName).join(targetJoiner);
    $('target-match-counter').textContent = `Match ${matches}/${totalVoices}`;

    const cpBadge = $('checkpoint-badge');
    if (p.rule.kind === 'checkpoint-quality') {
      cpBadge.hidden = false;
      const sat = isCheckpointSatisfied();
      cpBadge.classList.toggle('is-satisfied', sat);
      $('checkpoint-label').textContent = sat ? 'Dim ✓' : 'Dim';
    } else {
      cpBadge.hidden = true;
    }

    const activeSet = new Set(active.pitchClasses);
    const beacons = p.target.pitchClasses.map((pc) => {
      const left = ((pc + 0.5) / 12) * 100;
      const lit = activeSet.has(pc) ? 'is-lit' : '';
      return `<div class="sw-target-beacon ${lit}" style="left:${left.toFixed(3)}%">${pcName(pc)}</div>`;
    }).join('');
    $('target-track-axis').innerHTML = createAxisGridHtml(lavaPc) + beacons;
  }

  function buildThreadConnectorHtml(prevPcs, nextPcs, move, animateNew) {
    const W = 240;
    const H = 24;
    const xFor = (pc) => ((pc + 0.5) / 12) * W;
    const paths = [];

    for (let v = 0; v < nextPcs.length; v++) {
      const color = `var(${VOICE_COLORS[v].varName})`;
      const x1 = xFor(prevPcs[v]);
      const x2 = xFor(nextPcs[v]);
      if (prevPcs[v] === nextPcs[v]) {
        paths.push(`<line class="sw-thread-stationary" x1="${x1.toFixed(1)}" y1="0" x2="${x2.toFixed(1)}" y2="${H}" stroke="${color}" />`);
      } else if (move.wrappedOctave) {
        const exitX = move.delta < 0 ? 0 : W;
        const enterX = move.delta < 0 ? W : 0;
        const cls = animateNew ? 'sw-thread-moving is-drawing' : 'sw-thread-moving';
        paths.push(`<path class="${cls}" stroke-dasharray="${animateNew ? '64' : '4 2'}" d="M ${x1.toFixed(1)} 0 C ${x1.toFixed(1)} 10, ${exitX} 8, ${exitX} 12" stroke="${color}" />`);
        paths.push(`<path class="${cls}" stroke-dasharray="${animateNew ? '64' : 'none'}" d="M ${enterX} 12 C ${enterX} 16, ${x2.toFixed(1)} 14, ${x2.toFixed(1)} ${H}" stroke="${color}" />`);
      } else {
        const cls = animateNew ? 'sw-thread-moving is-drawing' : 'sw-thread-moving';
        const dash = animateNew ? 'stroke-dasharray="64" stroke-dashoffset="64"' : '';
        paths.push(`<path class="${cls}" ${dash} d="M ${x1.toFixed(1)} 0 C ${x1.toFixed(1)} 13, ${x2.toFixed(1)} 11, ${x2.toFixed(1)} ${H}" stroke="${color}" />`);
      }
    }

    const signedDelta = move.delta > 0 ? `+${move.delta}` : `${move.delta}`;
    return `
      <div class="sw-thread-connector">
        <div class="sw-thread-delta-col">
          <span class="sw-delta-chip" data-voice="${move.voiceIndex}">V${move.voiceIndex + 1} ${signedDelta}</span>
        </div>
        <div class="sw-thread-svg-wrap">
          <svg class="sw-thread-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${paths.join('')}</svg>
        </div>
      </div>`;
  }

  function renderLadder() {
    const p = currentPreset();
    const list = $('ladder-list');
    const targetSet = new Set(p.target.pitchClasses);
    const lavaPc = p.rule.forbiddenPc ?? -1;

    if (state.stepIndex === 0) {
      list.innerHTML = '<div class="sw-ladder-empty">Select a voice below and tap <strong>+1 / -1</strong> (or <strong>Next Scripted Step</strong> in States) to build your ladder.</div>';
      return;
    }

    let html = '';
    for (let i = 0; i < state.stepIndex; i++) {
      const step = p.steps[i];
      const prevPcs = i === 0 ? p.start.pitchClasses : p.steps[i - 1].chord.pitchClasses;
      const isLatest = i === state.stepIndex - 1;
      const animateNew = isLatest && state.justCommitted;

      html += buildThreadConnectorHtml(prevPcs, step.chord.pitchClasses, step.move, animateNew);

      const dots = step.chord.pitchClasses.map((pc, vIdx) => {
        const left = ((pc + 0.5) / 12) * 100;
        const matchCls = targetSet.has(pc) ? 'is-target-match' : '';
        return `<div class="sw-ladder-dot ${matchCls}" data-voice="${vIdx}" style="left:${left.toFixed(3)}%">${vIdx + 1}</div>`;
      }).join('');

      const rowCls = ['sw-ladder-row'];
      if (isLatest) rowCls.push('is-latest');
      if (animateNew) rowCls.push('is-new-snap');

      html += `
        <div class="${rowCls.join(' ')}">
          <div class="sw-row-info">
            <span class="sw-step-idx">${String(i + 1).padStart(2, '0')}</span>
            <span class="sw-row-chord">${chordLabel(step.chord)}</span>
            <span class="sw-quality-badge" data-quality="${step.chord.quality}">${step.chord.qualityLabel}</span>
          </div>
          <div class="sw-track-axis sw-row-track">
            ${createAxisGridHtml(lavaPc)}
            ${dots}
          </div>
        </div>`;
    }
    list.innerHTML = html;
  }

  function renderHud() {
    const p = currentPreset();
    const movesUsed = getMovesUsed();
    const remaining = p.maxMoves - movesUsed;
    const isTension = remaining <= 2;

    $('hud-moves').textContent = `${movesUsed} / ${p.maxMoves}`;
    $('hud-moves-wrap').classList.toggle('is-tension', isTension);
    $('hud-par').textContent = String(p.parMoves);
    $('hud-semitones').textContent = `${getSemitones()} st`;
    $('btn-undo').disabled = state.stepIndex === 0;
  }

  function renderVoiceChips() {
    const active = getActiveChord();
    const container = $('voice-chips');
    container.innerHTML = active.pitchClasses.map((pc, idx) => {
      const sel = state.selectedVoice === idx ? 'is-selected' : '';
      return `<button type="button" class="sw-voice-chip ${sel}" data-voice="${idx}" aria-pressed="${state.selectedVoice === idx}">
        <span class="sw-voice-chip-dot" aria-hidden="true"></span>
        <span>V${idx + 1}:${pcName(pc)}</span>
      </button>`;
    }).join('');

    container.querySelectorAll('.sw-voice-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.selectedVoice = Number(btn.dataset.voice);
        renderConsole();
      });
    });
  }

  function renderRail() {
    const p = currentPreset();
    const active = getActiveChord();
    const targetSet = new Set(p.target.pitchClasses);
    const lavaPc = p.rule.forbiddenPc ?? -1;

    $('rail-active-chord').textContent = chordLabel(active);

    // 16-slot wrapping track: slots -2,-1 (A#, B), 0..11 (C..B), 12..13 (C, C#)
    const slotsEl = $('rail-slots');
    let slotsHtml = '';
    for (let slot = -2; slot <= 13; slot++) {
      const pc = ((slot % 12) + 12) % 12;
      const isGhost = slot < 0 || slot > 11;
      const cls = ['sw-rail-slot'];
      if (BLACK_PC.has(pc)) cls.push('is-black');
      if (isGhost) cls.push('is-ghost');
      if (lavaPc === pc) cls.push('is-lava');
      if (targetSet.has(pc)) cls.push('is-target-pc');
      slotsHtml += `<div class="${cls.join(' ')}" data-pc="${pc}">
        <span class="sw-rail-slot-label">${pcName(pc)}</span>
      </div>`;
    }
    slotsEl.innerHTML = slotsHtml;

    // 2-tier vertical stagger so 48px pucks never overlap even on adjacent semitones (390px mobile)
    const pucksEl = $('rail-pucks');
    const placedSlots = [];
    const tierTops = [12, 56, 34];

    const puckEls = [];
    active.pitchClasses.forEach((pc, vIdx) => {
      const coreSlot = pc; // 0..11 corresponds to array index pc + 2 out of 16
      let tier = 0;
      for (const prev of placedSlots) {
        if (Math.abs(prev.slot - coreSlot) <= 2 && prev.tier === tier) {
          tier = (tier + 1) % 2;
        }
      }
      // Second pass in case tight cluster collides on both tiers
      for (const prev of placedSlots) {
        if (Math.abs(prev.slot - coreSlot) <= 1 && prev.tier === tier) {
          tier = 2;
        }
      }
      placedSlots.push({ slot: coreSlot, tier });

      const leftPct = ((coreSlot + 2 + 0.5) / 16) * 100;
      const topPx = tierTops[tier];
      const selCls = state.selectedVoice === vIdx ? 'is-selected' : '';
      const matchCls = targetSet.has(pc) ? 'is-target-match' : '';

      puckEls.push(`
        <button type="button" class="sw-rail-puck ${selCls} ${matchCls}" data-voice="${vIdx}"
          style="left:${leftPct.toFixed(3)}%; top:${topPx}px;"
          aria-label="Voice ${vIdx + 1}, note ${pcName(pc)}">
          <span class="sw-puck-note">${pcName(pc)}</span>
          <span class="sw-puck-idx">V${vIdx + 1}</span>
        </button>`);

      // Ghost octave wrap echo
      if (pc === 10 || pc === 11) {
        const echoSlot = pc - 12;
        const echoLeft = ((echoSlot + 2 + 0.5) / 16) * 100;
        puckEls.push(`<div class="sw-rail-puck is-ghost-echo" data-voice="${vIdx}" style="left:${echoLeft.toFixed(3)}%; top:${topPx}px;" aria-hidden="true">
          <span class="sw-puck-note">${pcName(pc)}</span>
          <span class="sw-puck-idx">V${vIdx + 1}</span>
        </div>`);
      } else if (pc === 0 || pc === 1) {
        const echoSlot = pc + 12;
        const echoLeft = ((echoSlot + 2 + 0.5) / 16) * 100;
        puckEls.push(`<div class="sw-rail-puck is-ghost-echo" data-voice="${vIdx}" style="left:${echoLeft.toFixed(3)}%; top:${topPx}px;" aria-hidden="true">
          <span class="sw-puck-note">${pcName(pc)}</span>
          <span class="sw-puck-idx">V${vIdx + 1}</span>
        </div>`);
      }
    });

    pucksEl.innerHTML = puckEls.join('');
    pucksEl.querySelectorAll('button.sw-rail-puck').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.selectedVoice = Number(btn.dataset.voice);
        renderConsole();
      });
    });
  }

  // 12-Tone Chromatic Clock Geometry
  const clockXY = (pc, r) => {
    const rad = ((pc * 30 - 90) * Math.PI) / 180;
    return [150 + r * Math.cos(rad), 150 + r * Math.sin(rad)];
  };

  function initClockBackdrop() {
    const backdrop = $('clock-backdrop');
    let html = '<circle cx="150" cy="150" r="108" class="sw-clock-ring-outer" />';
    html += '<circle cx="150" cy="150" r="88" class="sw-clock-ring-inner" />';
    for (let pc = 0; pc < 12; pc++) {
      const [x1, y1] = clockXY(pc, 42);
      const [x2, y2] = clockXY(pc, 108);
      html += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="sw-clock-spoke" />`;
    }
    backdrop.innerHTML = html;
  }

  function renderClock() {
    const p = currentPreset();
    const active = getActiveChord();
    const targetSet = new Set(p.target.pitchClasses);
    const lavaPc = p.rule.forbiddenPc ?? -1;

    $('clock-center-chord').textContent = chordLabel(active);
    $('clock-center-match').textContent = `Match ${countTargetMatches(active.pitchClasses)}/${p.target.pitchClasses.length}`;

    // Lava wedge
    const lavaLayer = $('clock-lava-layer');
    if (lavaPc >= 0) {
      const a1 = (((lavaPc * 30 - 15) - 90) * Math.PI) / 180;
      const a2 = (((lavaPc * 30 + 15) - 90) * Math.PI) / 180;
      const rIn = 46;
      const rOut = 107;
      const p1 = [150 + rIn * Math.cos(a1), 150 + rIn * Math.sin(a1)];
      const p2 = [150 + rOut * Math.cos(a1), 150 + rOut * Math.sin(a1)];
      const p3 = [150 + rOut * Math.cos(a2), 150 + rOut * Math.sin(a2)];
      const p4 = [150 + rIn * Math.cos(a2), 150 + rIn * Math.sin(a2)];
      const d = `M ${p1[0].toFixed(1)} ${p1[1].toFixed(1)} L ${p2[0].toFixed(1)} ${p2[1].toFixed(1)} A ${rOut} ${rOut} 0 0 1 ${p3[0].toFixed(1)} ${p3[1].toFixed(1)} L ${p4[0].toFixed(1)} ${p4[1].toFixed(1)} A ${rIn} ${rIn} 0 0 0 ${p1[0].toFixed(1)} ${p1[1].toFixed(1)} Z`;
      lavaLayer.innerHTML = `<path d="${d}" fill="var(--sw-lava-surface)" stroke="var(--sw-lava-solid)" stroke-width="1.5" />`;
    } else {
      lavaLayer.innerHTML = '';
    }

    // Target ghost polygon & corner dots
    const targetCoords = p.target.pitchClasses.map((pc) => clockXY(pc, 88));
    $('clock-target-poly').setAttribute('points', targetCoords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '));
    $('clock-target-dots').innerHTML = p.target.pitchClasses.map((pc) => {
      const [x, y] = clockXY(pc, 88);
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="none" stroke="var(--sw-target-match-ring)" stroke-width="2" stroke-dasharray="2 2" />`;
    }).join('');

    // 12 pitch labels around perimeter
    $('clock-labels').innerHTML = Array.from({ length: 12 }, (_, pc) => {
      const [lx, ly] = clockXY(pc, 127);
      const cls = ['sw-clock-note-label'];
      if (targetSet.has(pc)) cls.push('is-target');
      if (lavaPc === pc) cls.push('is-lava');
      return `<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="middle" class="${cls.join(' ')}">${pcName(pc)}</text>`;
    }).join('');

    // Smooth polygon vertex morphing when changing chord
    const destCoords = active.pitchClasses.map((pc) => clockXY(pc, 88));
    const startCoords = state.clockRenderedCoords && state.clockRenderedCoords.length === destCoords.length
      ? state.clockRenderedCoords
      : destCoords;

    cancelAnimationFrame(state.clockRafId);
    const startTime = performance.now();
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 280;

    function drawFrame(now) {
      const rawT = duration === 0 ? 1 : Math.min(1, (now - startTime) / duration);
      const t = 1 - Math.pow(1 - rawT, 3); // snappy cubic ease-out
      const interp = destCoords.map(([dx, dy], i) => {
        const [sx, sy] = startCoords[i];
        return [sx + (dx - sx) * t, sy + (dy - sy) * t];
      });
      state.clockRenderedCoords = interp;

      $('clock-active-poly').setAttribute('points', interp.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '));
      $('clock-vertices').innerHTML = interp.map(([vx, vy], idx) => {
        const pc = active.pitchClasses[idx];
        const vColor = `var(${VOICE_COLORS[idx].varName})`;
        const vOn = `var(${VOICE_COLORS[idx].onVar})`;
        const isSel = state.selectedVoice === idx ? 'is-selected' : '';
        const isMatch = targetSet.has(pc) ? 'is-target-match' : '';
        return `<g class="sw-clock-vertex-group ${isSel} ${isMatch}" data-voice="${idx}" role="button" tabindex="0" aria-label="Voice ${idx + 1}, ${pcName(pc)}">
          <circle cx="${vx.toFixed(1)}" cy="${vy.toFixed(1)}" r="22" fill="transparent" />
          <circle cx="${vx.toFixed(1)}" cy="${vy.toFixed(1)}" r="19" class="sw-clock-vertex-halo" />
          <circle cx="${vx.toFixed(1)}" cy="${vy.toFixed(1)}" r="15" class="sw-clock-vertex-circle" fill="${vColor}" />
          <text x="${vx.toFixed(1)}" y="${(vy + 4).toFixed(1)}" text-anchor="middle" class="sw-clock-vertex-text" fill="${vOn}">${idx + 1}</text>
        </g>`;
      }).join('');

      $('clock-vertices').querySelectorAll('.sw-clock-vertex-group').forEach((g) => {
        g.addEventListener('click', () => {
          state.selectedVoice = Number(g.dataset.voice);
          renderConsole();
        });
      });

      if (rawT < 1) {
        state.clockRafId = requestAnimationFrame(drawFrame);
      }
    }

    state.clockRafId = requestAnimationFrame(drawFrame);
  }

  function renderSteppers() {
    const p = currentPreset();
    const active = getActiveChord();
    const currentPc = active.pitchClasses[state.selectedVoice] ?? active.pitchClasses[0];
    const halfStepsLocked = p.rule.maxStep === 1;
    const nextStep = p.steps[state.stepIndex];

    const map = [
      { id: 'step-btn-m2', noteId: 'step-note-m2', delta: -2 },
      { id: 'step-btn-m1', noteId: 'step-note-m1', delta: -1 },
      { id: 'step-btn-p1', noteId: 'step-note-p1', delta: 1 },
      { id: 'step-btn-p2', noteId: 'step-note-p2', delta: 2 },
    ];

    map.forEach(({ id, noteId, delta }) => {
      const btn = $(id);
      const targetPc = ((currentPc + delta) % 12 + 12) % 12;
      $(noteId).textContent = `→ ${pcName(targetPc)}`;
      const isLocked = halfStepsLocked && Math.abs(delta) === 2;
      btn.disabled = isLocked;
      btn.setAttribute('aria-disabled', String(isLocked));
      const isRec = nextStep && nextStep.move.voiceIndex === state.selectedVoice && nextStep.move.delta === delta;
      btn.classList.toggle('is-recommended', Boolean(isRec));
    });
  }

  function renderConsole() {
    $('rail-view').hidden = state.inputView !== 'rail';
    $('clock-view').hidden = state.inputView !== 'clock';
    $('tab-rail').classList.toggle('is-active', state.inputView === 'rail');
    $('tab-clock').classList.toggle('is-active', state.inputView === 'clock');
    $('tab-rail').setAttribute('aria-selected', String(state.inputView === 'rail'));
    $('tab-clock').setAttribute('aria-selected', String(state.inputView === 'clock'));

    // Sync settings drawer segmented buttons
    document.querySelectorAll('[data-pref-theme]').forEach((b) => b.classList.toggle('is-active', b.dataset.prefTheme === state.theme));
    document.querySelectorAll('[data-pref-input]').forEach((b) => b.classList.toggle('is-active', b.dataset.prefInput === state.inputView));
    document.querySelectorAll('[data-pref-spelling]').forEach((b) => b.classList.toggle('is-active', b.dataset.prefSpelling === state.spelling));
    document.querySelectorAll('[data-pref-sound]').forEach((b) => b.classList.toggle('is-active', b.dataset.prefSound === (state.soundOn ? 'on' : 'muted')));

    renderVoiceChips();
    if (state.inputView === 'rail') {
      renderRail();
    } else {
      renderClock();
    }
    renderSteppers();
  }

  function renderAll() {
    renderHeader();
    renderAnchors();
    renderLadder();
    renderHud();
    renderConsole();
  }

  // Scripted Step Handling (Zero-logic mock playback)
  function handleStepperPress(delta) {
    const p = currentPreset();
    if (p.rule.maxStep === 1 && Math.abs(delta) === 2) {
      VisualHooks.onVoiceSlide(state.selectedVoice, 0, 0, false, 'half-step-locked');
      return;
    }

    const active = getActiveChord();
    const fromPc = active.pitchClasses[state.selectedVoice];
    const toPc = ((fromPc + delta) % 12 + 12) % 12;

    if (p.rule.forbiddenPc === toPc) {
      VisualHooks.onVoiceSlide(state.selectedVoice, fromPc, toPc, false, 'lava-blocked');
      return;
    }

    const nextStep = p.steps[state.stepIndex];
    if (nextStep && nextStep.move.voiceIndex === state.selectedVoice && nextStep.move.delta === delta) {
      state.stepIndex++;
      state.outOfMovesPreview = false;
      state.tensionOverride = false;
      // Pre-select the next scripted voice if another step remains
      if (p.steps[state.stepIndex]) {
        state.selectedVoice = p.steps[state.stepIndex].move.voiceIndex;
      }
      VisualHooks.onStepCommit();
      if (nextStep.satisfiesCheckpoint) {
        VisualHooks.onCheckpointSatisfied();
      }
      if (state.stepIndex === p.steps.length) {
        setTimeout(() => VisualHooks.onResolve('solved'), 380);
      }
    } else {
      VisualHooks.onVoiceSlide(state.selectedVoice, fromPc, toPc, false, 'invalid-cluster');
    }
  }

  function stepForwardScripted() {
    const p = currentPreset();
    if (state.stepIndex >= p.steps.length) {
      VisualHooks.onResolve('solved');
      return;
    }
    const nextStep = p.steps[state.stepIndex];
    state.selectedVoice = nextStep.move.voiceIndex;
    handleStepperPress(nextStep.move.delta);
  }

  function undoStep() {
    if (state.stepIndex <= 0) return;
    state.stepIndex--;
    state.undosUsed++;
    state.outOfMovesPreview = false;
    const p = currentPreset();
    if (p.steps[state.stepIndex]) {
      state.selectedVoice = p.steps[state.stepIndex].move.voiceIndex;
    }
    VisualHooks.onUndo();
  }

  // Resolution Modal, Replay Scrubber & Optimal Comparison
  function openResolutionModal(mode = 'solved') {
    const p = currentPreset();
    const isFail = mode === 'out-of-moves';
    const stepsForPreview = isFail && state.stepIndex > 0 ? p.steps.slice(0, state.stepIndex) : p.steps;
    const movesUsed = isFail ? p.maxMoves : stepsForPreview.length;

    const medalImg = $('resolve-medal-img');
    const medalFrame = $('resolve-medal-frame');
    const rankPill = $('resolve-rank-pill');

    if (isFail) {
      medalImg.src = '../../assets/medals/medal-solved.png';
      medalFrame.src = '../../assets/medals/medal-frame.svg';
      rankPill.dataset.rank = 'outOfMoves';
      rankPill.textContent = 'OUT OF MOVES';
      $('resolve-title').textContent = 'So Close — Out of Moves';
      $('res-moves').textContent = `${p.maxMoves} / ${p.maxMoves}`;
      $('res-par-diff').textContent = 'Hard Ceiling';
    } else {
      const m = p.medal;
      medalImg.src = `../../assets/medals/${m.id}.png`;
      medalFrame.src = `../../assets/medals/${m.frame}.svg`;
      rankPill.dataset.rank = m.rank;
      rankPill.textContent = m.rankLabel;
      $('resolve-title').textContent = 'Harmonic Resolution';
      $('res-moves').textContent = `${stepsForPreview.length} / ${p.parMoves}`;
      $('res-par-diff').textContent = stepsForPreview.length < p.parMoves ? 'Under Par' : 'On Par';
    }

    $('resolve-subtitle').textContent = `Puzzle #${p.puzzleNumber} · ${p.rule.label} · ${chordLabel(p.start)} → ${chordLabel(p.target)}`;
    $('res-semitones').textContent = `${stepsForPreview[stepsForPreview.length - 1].semitones} st`;
    $('res-st-sub').textContent = `Optimal ${p.parSemitones} st`;
    $('res-undos').textContent = String(state.undosUsed);
    $('res-undo-sub').textContent = state.undosUsed === 0 ? 'Zero Undos' : 'Adjusted';

    // Populate replay lists
    const userItems = [{ symbol: chordLabel(p.start), moveText: 'Start' }].concat(
      stepsForPreview.map((s) => ({
        symbol: chordLabel(s.chord),
        moveText: `V${s.move.voiceIndex + 1} ${s.move.delta > 0 ? '+' : ''}${s.move.delta}`,
      }))
    );
    $('replay-user-meta').textContent = `${stepsForPreview.length} moves · ${stepsForPreview[stepsForPreview.length - 1].semitones} st`;
    $('replay-user-list').innerHTML = userItems.map((it, idx) => `
      <li class="sw-replay-step-item" data-replay-idx="${idx}">
        <span class="sw-replay-step-chord">${it.symbol}</span>
        <span class="sw-replay-step-move">${it.moveText}</span>
      </li>`).join('');

    const optItems = [{ symbol: chordLabel(p.start), moveText: 'Start' }].concat(
      p.optimalPath.map((o) => ({ symbol: o.symbol, moveText: o.moveText }))
    );
    $('replay-opt-meta').textContent = `${p.parMoves} moves · ${p.parSemitones} st`;
    $('replay-opt-list').innerHTML = optItems.map((it, idx) => `
      <li class="sw-replay-step-item" data-replay-idx="${idx}">
        <span class="sw-replay-step-chord">${it.symbol}</span>
        <span class="sw-replay-step-move">${it.moveText}</span>
      </li>`).join('');

    stopPlaybackCascade();
    $('modal-resolve').hidden = false;
  }

  function stopPlaybackCascade() {
    clearInterval(state.playbackTimerId);
    state.playbackActive = false;
    $('icon-play-btn').innerHTML = ICONS.play;
    $('play-btn-label').textContent = 'Play My Ladder';
    $('replay-progress-fill').style.width = '0%';
    document.querySelectorAll('.sw-replay-step-item').forEach((el) => el.classList.remove('is-playing'));
  }

  function togglePlaybackCascade() {
    if (state.playbackActive) {
      stopPlaybackCascade();
      return;
    }
    state.playbackActive = true;
    $('icon-play-btn').innerHTML = ICONS.pause;
    $('play-btn-label').textContent = 'Pause Cascade';

    const listSelector = state.compareOptimal ? '#replay-opt-list .sw-replay-step-item' : '#replay-user-list .sw-replay-step-item';
    const items = Array.from(document.querySelectorAll(listSelector));
    let idx = 0;

    const tick = () => {
      document.querySelectorAll('.sw-replay-step-item').forEach((el) => el.classList.remove('is-playing'));
      if (idx >= items.length) {
        stopPlaybackCascade();
        return;
      }
      items[idx].classList.add('is-playing');
      const pct = ((idx + 1) / items.length) * 100;
      $('replay-progress-fill').style.width = `${pct.toFixed(0)}%`;
      idx++;
    };

    tick();
    state.playbackTimerId = setInterval(tick, 680);
  }

  function buildShareCardText() {
    const p = currentPreset();
    const stepsForShare = p.steps;
    const voicesCount = p.start.pitchClasses.length;
    const rows = stepsForShare.map((step) => {
      const cells = Array.from({ length: voicesCount }, (_, v) => {
        if (v !== step.move.voiceIndex) return '⬜';
        return step.satisfiesCheckpoint ? '💎' : '🟩';
      }).join('');
      const d = step.move.delta > 0 ? `+${step.move.delta}` : `${step.move.delta}`;
      return `${cells}  (${d})`;
    }).join('\n');

    const finalSemis = stepsForShare[stepsForShare.length - 1].semitones;
    return `🪜 STEPWISE #${p.puzzleNumber} (${p.rule.label})\n${chordLabel(p.start)} ──▶ ${chordLabel(p.target)} | Par ${p.parMoves}\n${rows}\nScore: ${stepsForShare.length} moves · ${finalSemis} st (⛳ ${p.medal.rankLabel} · ${state.undosUsed} undos)`;
  }

  function openShareModal() {
    $('share-preview-text').textContent = buildShareCardText();
    const copyBtn = $('btn-copy-share');
    copyBtn.classList.remove('is-copied');
    $('copy-share-label').textContent = 'Copy Scorecard';
    $('modal-share').hidden = false;
  }

  function switchPreset(presetKey) {
    state.presetKey = presetKey;
    const p = PRESETS[presetKey];
    state.stepIndex = p.defaultStepIndex;
    state.selectedVoice = p.steps[state.stepIndex] ? p.steps[state.stepIndex].move.voiceIndex : 0;
    state.undosUsed = 0;
    state.tensionOverride = false;
    state.outOfMovesPreview = false;
    state.clockRenderedCoords = null;
    document.querySelectorAll('[data-preset]').forEach((b) => b.classList.toggle('is-active', b.dataset.preset === presetKey));
    renderAll();
  }

  function setTheme(theme) {
    state.theme = theme;
    document.documentElement.dataset.theme = theme;
    renderHeader();
    renderConsole();
  }

  function bindEvents() {
    // Header Actions
    $('btn-demo-toggle').addEventListener('click', () => {
      const bar = $('demo-bar');
      const open = bar.hidden;
      bar.hidden = !open;
      $('btn-demo-toggle').setAttribute('aria-expanded', String(open));
    });

    $('rule-pill').addEventListener('click', () => {
      const banner = $('rule-banner');
      banner.hidden = !banner.hidden;
    });
    $('rule-banner-close').addEventListener('click', () => { $('rule-banner').hidden = true; });

    $('btn-sound').addEventListener('click', () => {
      state.soundOn = !state.soundOn;
      renderHeader();
      renderConsole();
    });

    $('btn-theme').addEventListener('click', () => {
      setTheme(state.theme === 'light' ? 'dark' : 'light');
    });

    $('btn-stats').addEventListener('click', () => { $('drawer-stats').hidden = false; });
    $('btn-help').addEventListener('click', () => { $('modal-howto').hidden = false; });

    // Input Mode Switch
    $('tab-rail').addEventListener('click', () => { state.inputView = 'rail'; renderConsole(); });
    $('tab-clock').addEventListener('click', () => { state.inputView = 'clock'; renderConsole(); });

    // Steppers & Undo
    $('step-btn-m2').addEventListener('click', () => handleStepperPress(-2));
    $('step-btn-m1').addEventListener('click', () => handleStepperPress(-1));
    $('step-btn-p1').addEventListener('click', () => handleStepperPress(1));
    $('step-btn-p2').addEventListener('click', () => handleStepperPress(2));
    $('btn-undo').addEventListener('click', undoStep);

    // Demo State Controls
    document.querySelectorAll('[data-preset]').forEach((btn) => {
      btn.addEventListener('click', () => switchPreset(btn.dataset.preset));
    });
    $('demo-reset-0').addEventListener('click', () => {
      state.stepIndex = 0;
      state.tensionOverride = false;
      state.outOfMovesPreview = false;
      state.selectedVoice = currentPreset().steps[0].move.voiceIndex;
      renderAll();
    });
    $('demo-step-next').addEventListener('click', stepForwardScripted);
    $('demo-invalid').addEventListener('click', () => {
      const pc = getActiveChord().pitchClasses[state.selectedVoice];
      VisualHooks.onVoiceSlide(state.selectedVoice, pc, (pc + 1) % 12, false, 'invalid-cluster');
    });
    $('demo-tension').addEventListener('click', () => {
      state.tensionOverride = !state.tensionOverride;
      state.outOfMovesPreview = false;
      renderHud();
    });
    $('demo-out-of-moves').addEventListener('click', () => {
      state.outOfMovesPreview = true;
      renderHud();
      openResolutionModal('out-of-moves');
    });
    $('demo-open-resolve').addEventListener('click', () => openResolutionModal('solved'));
    $('demo-open-share').addEventListener('click', openShareModal);
    $('demo-open-howto').addEventListener('click', () => { $('modal-howto').hidden = false; });
    $('demo-open-stats').addEventListener('click', () => { $('drawer-stats').hidden = false; });
    $('demo-spelling-toggle').addEventListener('click', () => {
      state.spelling = state.spelling === 'sharp' ? 'flat' : 'sharp';
      renderAll();
    });

    // Resolution & Share Controls
    $('btn-play-ladder').addEventListener('click', togglePlaybackCascade);
    $('btn-compare-optimal').addEventListener('click', () => {
      state.compareOptimal = !state.compareOptimal;
      $('btn-compare-optimal').setAttribute('aria-pressed', String(state.compareOptimal));
      $('replay-optimal-col').hidden = !state.compareOptimal;
      $('replay-columns').classList.toggle('is-comparing', state.compareOptimal);
      $('compare-btn-label').textContent = state.compareOptimal ? 'Hide Optimal Par' : 'Compare Optimal Par';
      stopPlaybackCascade();
    });
    $('btn-open-share-from-resolve').addEventListener('click', () => {
      $('modal-resolve').hidden = true;
      stopPlaybackCascade();
      openShareModal();
    });
    $('btn-copy-share').addEventListener('click', async () => {
      const txt = $('share-preview-text').textContent;
      try {
        await navigator.clipboard.writeText(txt);
      } catch {
        // Safe clipboard fallback when previewed without HTTPS permissions
      }
      $('btn-copy-share').classList.add('is-copied');
      $('copy-share-label').textContent = '✓ Copied to Clipboard';
      setTimeout(() => {
        $('btn-copy-share').classList.remove('is-copied');
        $('copy-share-label').textContent = 'Copy Scorecard';
      }, 2000);
    });

    // Modal & Drawer Close Handlers
    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.closeModal;
        $(id).hidden = true;
        if (id === 'modal-resolve') stopPlaybackCascade();
      });
    });
    document.querySelectorAll('.sw-modal-backdrop, .sw-drawer-backdrop').forEach((backdrop) => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          backdrop.hidden = true;
          if (backdrop.id === 'modal-resolve') stopPlaybackCascade();
        }
      });
    });

    // Settings Drawer Segmented Controls
    document.querySelectorAll('[data-pref-theme]').forEach((b) => {
      b.addEventListener('click', () => setTheme(b.dataset.prefTheme));
    });
    document.querySelectorAll('[data-pref-input]').forEach((b) => {
      b.addEventListener('click', () => { state.inputView = b.dataset.prefInput; renderConsole(); });
    });
    document.querySelectorAll('[data-pref-spelling]').forEach((b) => {
      b.addEventListener('click', () => { state.spelling = b.dataset.prefSpelling; renderAll(); });
    });
    document.querySelectorAll('[data-pref-sound]').forEach((b) => {
      b.addEventListener('click', () => { state.soundOn = b.dataset.prefSound === 'on'; renderHeader(); renderConsole(); });
    });

    // Desktop Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = Number(e.key) - 1;
        if (idx < getActiveChord().pitchClasses.length) {
          state.selectedVoice = idx;
          renderConsole();
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleStepperPress(e.shiftKey ? -2 : -1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleStepperPress(e.shiftKey ? 2 : 1);
      } else if (e.key.toLowerCase() === 'z') {
        undoStep();
      } else if (e.key.toLowerCase() === 'm') {
        state.inputView = state.inputView === 'rail' ? 'clock' : 'rail';
        renderConsole();
      } else if (e.key === 'Escape') {
        document.querySelectorAll('.sw-modal-backdrop, .sw-drawer-backdrop').forEach((m) => { m.hidden = true; });
        stopPlaybackCascade();
      }
    });
  }

  // Initialize Prototype
  initStaticIcons();
  initClockBackdrop();
  bindEvents();
  switchPreset('halfstep');
})();
