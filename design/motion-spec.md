# STEPWISE — Motion, Micro-Interaction & Audio-Reactive Visual Specification

> **Design Principle:** *Tactile Swiss Kinematics.* Motion in STEPWISE behaves like precision machined faders, weighted brass detents, and illuminated drafting ink—crisp deceleration, zero syrupy float, and instant legibility when muted on a train.

---

## 1. Timing Curves & Token Primitives

All timing curves and durations map directly to [`design/tokens.css`](file:///C:/Users/itail/Documents/claude-projects/IO_GAMES/StepWise/design/tokens.css) and [`design/tokens.json`](file:///C:/Users/itail/Documents/claude-projects/IO_GAMES/StepWise/design/tokens.json):

| Token | Curve / Value | Acoustic / Physical Metaphor |
| :--- | :--- | :--- |
| `--sw-ease-snappy` | `cubic-bezier(0.22, 1, 0.36, 1)` | Precision magnetic detent locking a fader onto a fret |
| `--sw-ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Elastic rebound when testing a non-chord cluster or Lava note |
| `--sw-ease-thread` | `cubic-bezier(0.4, 0, 0.2, 1)` | Smooth vector ink stroke tracing a voice transition down the ladder |
| `--sw-ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Fast toast / rejection pill dismissal |

| Duration Token | Default | Reduced Motion (`prefers-reduced-motion: reduce`) |
| :--- | :--- | :--- |
| `--sw-dur-instant` | `120ms` | `0ms` |
| `--sw-dur-fast` | `180ms` | `0ms` |
| `--sw-dur-normal` | `280ms` | `0ms` |
| `--sw-dur-thread` | `340ms` | `0ms` |
| `--sw-dur-bounce` | `380ms` | `0ms` |
| `--sw-dur-halo` | `420ms` | `0ms` |
| `--sw-dur-playback-step` | `680ms` | `680ms` *(keeps replay rhythm intact without parallax/bounce)* |

---

## 2. Six Core Motion Systems & Choreography

### 2.1 Voice Puck Slide, Snap-to-Grid & Invalid-Cluster Bounce
- **Valid Slide & Snap (`180ms`, `--sw-ease-snappy`):**
  1. `0ms`: User taps `-1` / `+1` / `-2` / `+2` or releases a dragged puck over destination pitch class `toPc`.
  2. `0ms -> 180ms`: Puck `left` / `transform` slides cleanly along the rail channel (`scale(1.06)` briefly at launch, settling to `1.0`). If `fromPc` and `toPc` cross the `B <-> C` boundary (`11 <-> 0`), the primary puck fades out into the ghost edge (`120ms`) while its octave wrap twin fades/slides in from the opposite edge so modular motion feels continuous.
  3. `180ms`: Brief emerald snap ring (`box-shadow: 0 0 0 6px rgba(19, 122, 75, 0)`) expands and dissolves over `260ms`.
- **Invalid Cluster Bounce (`380ms`, `--sw-ease-spring`):**
  1. `0ms -> 90ms`: Puck lunges ~`65%` toward `toPc` and flashes `--sw-invalid-solid` border.
  2. `90ms -> 380ms`: Springs back onto `fromPc` accompanied by a damped horizontal damped-sine keyframe (`translateX(0 -> +6px -> -5px -> +3px -> 0)`).
  3. `40ms`: Rejection toast (`"Not a recognized chord — 0 moves used"`) enters with `translateY(6px -> 0)` + `opacity(0 -> 1)` over `160ms`, holds `2200ms`, fades out `120ms`.
- **Lava Note Reject (`380ms`, `--sw-ease-spring`):**
  - Identical non-punishing rebound, while the targeted Lava slot pulses its 45° crimson hazard stripe (`opacity 0.55 -> 1.0 -> 0.55`) and shows `"G# is Lava today — detour required"`.

---

### 2.2 SVG Voice-Leading Thread Draw (Row `N-1` -> Row `N`)
Every committed move inserts a `30px` SVG connector band between the previous chord row and the newly stamped row, aligned to the shared 12-pitch horizontal coordinate space (`viewBox="0 0 240 30"`, `x(pc) = ((pc + 0.5) / 12) * 240`).
- **Stationary Voices (`fromPc === toPc`):**
  - Vertical straight `<line>` (`stroke-width: 2`, `opacity: 0.52`). Fades in softly over `180ms` (`--sw-ease-snappy`).
- **Moved Voice (`fromPc !== toPc`, non-wrapping):**
  - Smooth S-curve `<path d="M x1 0 C x1 16, x2 14, x2 30" />` (`stroke-width: 2.75`, rounded caps).
  - Animated via `stroke-dasharray: <pathLength>` and `stroke-dashoffset: <pathLength> -> 0` over **`340ms` (`--sw-ease-thread`)**, starting `60ms` after the step row settles so the eye reads *Previous Note -> Motion Curve -> New Chord* in one fluid sweep.
- **Octave-Wrapped Voice (`B -> C` / `C -> B` / `Bb -> C`, etc.):**
  - Splits into two crisp directional edge-portal curves (`M x1 0 C x1 12, edgeOut 10, edgeOut 15` and `M edgeIn 15 C edgeIn 20, x2 18, x2 30`) with small midpoint chevrons indicating cyclic wrap without crossing all 11 middle tracks!

---

### 2.3 Chromatic Clock Polygon Vertex Morph (`280ms`, `--sw-ease-snappy`)
- On the 12-Tone Chromatic Clock (`viewBox="0 0 320 320"`, center `(160, 160)`, radius `112`), vertices sit at angle `θ = (pc * 30 - 90)°`.
- When a single voice shifts from `fromPc` to `toPc`, **only that vertex's `(x, y)` coordinate interpolates along the circular arc** (via JS `requestAnimationFrame` interpolation over `280ms` using `--sw-ease-snappy` easing `1 - (1 - t)^3`, or CSS transitions on vertex circles + SVG `<polygon>` points) so the triangle/quadrilateral visibly *hinges* on the two/three stationary common tones!
- Stationary vertices remain anchored with a `1px` bright ring, reinforcing Neo-Riemannian voice-leading geometry.

---

### 2.4 Target-Note Harmonic Halo Illumination (`420ms`, `--sw-ease-snappy`)
Whenever any voice lands on a pitch class contained in `puzzle.target.pitchClasses`:
1. Both the **rail/clock voice puck** and the corresponding **Target Goal Bar pitch beacon** receive `.is-target-match`.
2. Over `420ms`, a **Brass Gold halo ring** (`--sw-target-match-ring`) expands from `scale(0.85)` to `scale(1.0)` with a single soft radial aura bloom (`--sw-target-match-halo`), settling into a crisp `3px` persistent gold outer ring.
3. On `Target-Match Loss` (e.g., player moves *off* a target pitch temporarily as a pivot), the gold halo cleanly reverses over `180ms`.

---

### 2.5 "Play My Ladder" Sequential Row & Thread Cascade (`680ms / step`)
Triggered automatically by user tap in the Resolution Modal (`"▶ Play My Ladder"` or `"▶ Play Optimal"`), or driven frame-by-frame by Claude Code's `Tone.Transport` / Web Audio scheduler via `onPlaybackStep(stepIndex)`:
- **Step `0` (Start Anchor, `t = 0ms`):** Start row illuminates (`border-color` highlights to primary ink + gentle `scale(1.01)` surface tint); its 3/4 pitch nodes light up.
- **Step `k` (`t = k * 680ms`):**
  1. Thread connector above Row `k` surges briefly (`stroke-width: 2.75 -> 4`, glow drop-shadow for `360ms`).
  2. Row `k` badge highlights (`background: voice-tint`), its moved-voice delta pill pops (`scale(1 -> 1.12 -> 1)` over `240ms`), and the scrubber playhead bar advances smoothly (`(k / totalSteps) * 100%`).
  3. Final step (`k === totalSteps`): All target pitch beacons fire a synchronized **Brass Gold harmonic shimmer** (`480ms`).

---

### 2.6 Resolution Bloom & Machined Medal Stamp-In (`420ms`)
Upon reaching the Target Chord (with Checkpoint satisfied, if active):
1. `0ms -> 220ms`: Final ladder step snaps + all target beacons ignite Brass Gold simultaneously.
2. `220ms -> 420ms`: Resolution modal backdrop fades in (`180ms`), card scales from `0.95 -> 1.0` (`240ms`, `--sw-ease-snappy`).
3. `300ms -> 720ms`: The machined medal PNG + SVG chromatic bezel performs a physical **stamp-in** (`scale(1.22) rotate(-8deg) opacity(0)` -> `scale(1.0) rotate(0deg) opacity(1)` using `--sw-ease-spring`), followed by a subtle diagonal brushed-metal sheen sweep (`background-position` across an angled specular overlay, once only).

---

## 3. Reduced Motion Fallbacks (`prefers-reduced-motion: reduce`)

Under `@media (prefers-reduced-motion: reduce)`:
- All spatial translations, elastic bounces, medal rotation/scale stamps, and SVG `stroke-dashoffset` sweeps collapse to **`0ms` instant state swaps** (`--sw-dur-*: 0ms` in `tokens.css`).
- **What stays visible:** Instant color shifts, Brass Gold Target-Match rings, Invalid Cluster toast banners, and sequential **Play My Ladder** active-row highlighting (`680ms` step dwell via opacity/border state) remain 100% intact so functional feedback is never lost.

---

## 4. Framework-Agnostic Visual Trigger Hooks API

Claude Code's solver, state reducer, and Web Audio / Tone.js synth clock trigger visual animations strictly through the following pure callback interface—keeping rendering decoupled from theory/audio computation:

```typescript
export interface StepwiseVisualHooks {
  /**
   * Fires when user drags or steps a single voice puck.
   * valid = false triggers the non-punishing Invalid Cluster bounce-back.
   */
  onVoiceSlide(
    voiceIdx: number,
    fromPc: number,
    toPc: number,
    valid: boolean,
    reason?: 'invalid-cluster' | 'lava-blocked' | 'half-step-locked'
  ): void;

  /**
   * Fires when a valid move commits a new chord row and SVG thread to the ladder.
   */
  onStepCommit(stepIndex: number, stepData: LadderStep): void;

  /**
   * Fires when the user taps Undo, smoothly collapsing the top step row & threads.
   */
  onUndo(removedStepIndex: number): void;

  /**
   * Fires synchronously from Tone.js / Web Audio playback clock during "Play My Ladder"
   * or "Compare Optimal Par" replay (stepIndex = 0 is Start Chord).
   */
  onPlaybackStep(stepIndex: number, mode?: 'user' | 'optimal'): void;

  /**
   * Fires once when a Checkpoint rule (e.g. Diminished chord) transitions hollow -> lit emerald.
   */
  onCheckpointSatisfied(stepIndex: number, ruleLabel: string): void;

  /**
   * Fires when remainingMoves drops to <= 2 to activate Budget Tension pulse.
   */
  onBudgetTension(remainingMoves: number): void;

  /**
   * Fires upon solving the puzzle or exhausting maxMoves; opens Resolution view & stamps medal.
   */
  onResolve(summary: SolveSummary): void;
}
```
