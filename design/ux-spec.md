# STEPWISE — Mobile-First UX & State Architecture Specification

> **Primary Canvas:** One-thumb portrait mobile (`390×844` viewport, `100dvh` safe-area aware)  
> **Secondary Canvas:** Desktop / Studio two-column workstation (`1280×800`, breakpoint `>= 960px`)  
> **Audio Gate Policy:** **ZERO blocking audio splash screen.** STEPWISE launches straight into the active daily board in Silent-First parity; Web Audio unlocks transparently on the first gameplay gesture when Sound is enabled.

---

## 1. Viewport Spatial Budget & Ergonomics (`390×844`)

On mobile portrait, the user holds the phone with one hand. All frequent actions (`-2`, `-1`, `+1`, `+2`, voice puck selection, `Undo`, `Rail/Clock` toggle) sit strictly inside the **bottom thumb comfort zone (lower 320px)**. Read-only anchors, header controls, and progression history stack cleanly above.

```text
+---------------------------------------------------+  y = 0
| [Logo] STEPWISE  #88  [±1 Half-Steps]  🔊 📊 ❓   |  52px  Compact Header
+---------------------------------------------------+  y = 52
| START   C Maj · C  E  G                 [0 st]    |  48px  Start Anchor
| ------------------------------------------------- |
|  Step 1  Csus4    (1)───(2)╮      (3)       +1    |  Auto-scrolling
|  Step 2  F Min    (1)       (2)────(3)╮     +1    |  Vertical Ladder
|  Step 3  Db Maj       ╰(1)  (2)       (3)   +1    |  (flex: 1, min 180px,
|  [Active Preview / Next Step Slot]                |   aligned 12-pitch X-axis)
| ------------------------------------------------- |
| TARGET  F# Min · C#  F#  A        [Match 1/3]     |  56px  Target Goal Bar
+---------------------------------------------------+
| Moves 3/8  |  Par 5  |  Travel 3 st  |  [↩ Undo]  |  44px  Telemetry HUD
+---------------------------------------------------+
| [Linear Rail | 12-Tone Clock]   V1(Db) V2(F) V3(Ab)|  36px  Input Switch + Voice Tabs
|  ┌──────────────────────────────────────────────┐ |
|  │ A# B │ C C# D D# E F F# G G# A A# B │ C C#   │ |  118px Tactile Input Stage
|  │      │ (1)      (2)     (3)         │        │ |  (Pucks >= 48px, 2-tier stagger)
|  └──────────────────────────────────────────────┘ |
| [  -2 🔒 ]  [  -1  ]   [  +1  ]  [  +2 🔒 ]       |  60px  Precision Stepper Dock
+---------------------------------------------------+  y = 844 (plus safe-area-inset-bottom)
```

### Desktop Workstation Layout (`1280×800`, `>= 960px`)
- **Left Column (`480px–540px` fixed-flex):** Header bar + **Start Anchor** -> **Vertical Harmonic Ladder** -> **Target Goal Bar**. Generous breathing room lets 7–8 steps display simultaneously without scrolling.
- **Right Column (`460px–520px` sticky console):** **Telemetry HUD Card** at top, followed by the **Input Mode Switcher** (`Linear Chromatic Rail` / `12-Tone Chromatic Clock`), an enlarged **Interactive Input Stage** (`152px` rail height OR `340×340` Chromatic Clock dial), and the **Precision Stepper Dock** (`-2 / -1 / +1 / +2`) + keyboard shortcuts hint (`← / →` `-1 / +1`, `Shift + ← / →` `-2 / +2`, `1–4` select voice, `Z` undo).

### Touch-Target Compliance
- **Voice Pucks (Rail & Clock):** `48px × 48px` visual puck (`--sw-puck-size`), `>= 48px` drag/tap surface.
- **Stepper Buttons (`-2`, `-1`, `+1`, `+2`) & `Undo`:** `min-height: 48px`, `min-width: 44px` (`--sw-tap-min: 44px`).
- **Header Icon Buttons (`Sound`, `Stats`, `Help`, `Theme`):** `44px × 44px` hit box surrounding `20px` crisp SVG icon.

---

## 2. All 8 Core Views & State Specifications

### View 1: Main Harmonic Ladder Workspace

1. **Compact Header (`52px`):**
   - Left: Mini `STEPWISE` monogram mark + title + puzzle index (`#88` in tabular mono).
   - Center/Below on `390px` (or inline on desktop): **Daily Rule Pill** (`Half-Steps Only ±1`, `Lava Note: G#`, `Checkpoint: Dim`, or `4-Voice 7ths`). Tapping the pill opens a concise 2-line tooltip explaining today's rule.
   - Right: Unobtrusive `44×44` icon cluster: **Sound On / Silent** (`sound-muted.svg` / `sound-on.svg`), **Stats** (`stats.svg`), **Help** (`help.svg`), and quick **Theme Toggle** (`theme-sun.svg` / `theme-moon.svg`).

2. **Start Chord Anchor Card (`48px`):**
   - Displays `START` micro-eyebrow, bold chord name (`C Maj`), quality tint badge, and aligned pitch nodes along the **12-pitch horizontal coordinate axis** (`x = (pc + 0.5) / 12 * 100%`).

3. **Vertical Progression Ladder (Aligned 12-Pitch Axis + Luminous SVG Voice Threads):**
   - Each row splits into two synchronized columns:
     - **Left Label Column (`96px` mobile / `124px` desktop):** Step number (`01`), chord symbol (`Csus4`), quality pill, and delta badge (`+1`).
     - **Right 12-Pitch Track Column (`flex: 1`):** Subtle architectural vertical gridlines marking the 12 pitch classes (`C` through `B`), matching the exact X-positions of the Start Anchor above and Target Goal Bar below.
   - **Inter-Row SVG Thread Layer (`30px` height):** Between Row `N-1` and Row `N`, an `<svg viewBox="0 0 240 30" preserveAspectRatio="none">` draws one path per voice:
     - **Stationary Common Tones (`delta === 0`):** Crisp straight vertical line at `0.55` opacity (`stroke-width: 2`).
     - **Moved Voice (`delta !== 0`):** Luminous smooth cubic-bezier curve (`M x1 0 C x1 16, x2 14, x2 30`) at `1.0` opacity (`stroke-width: 2.75`) in that voice's accent color (`Cobalt / Vermilion / Teal / Orchid`), wrapping cleanly around octave boundaries with a dashed portal exit/entry arrow if `B -> C` or `C -> B` wraps!

4. **Target Chord Goal Bar (`56px`):**
   - Pinned directly beneath the ladder scroll area.
   - Shows `TARGET` eyebrow, target chord symbol (`F# Min`), target note spellings (`C# · F# · A`), and **Live Target-Match Beacons** (3 or 4 small diamond/circle slots aligned at the target's pitch classes that fill with **Brass Gold** `#B77900` / `#F5C451` and pulse whenever any voice in the current active chord occupies that target pitch class!).
   - Match summary counter (`Match: 2 / 3`) gives immediate feedback on how close the current voicing is to solving.

5. **Telemetry HUD Bar (`44px`):**
   - Displays 4 tabular metrics cleanly across one row:
     - `Moves: 3 / 8` (switches to **Budget Tension** warm amber styling + pulse when `remaining <= 2`)
     - `Par: 5`
     - `Semitones: 3 st`
     - `Undo` pill button (`undo.svg`, `44px` tap height, disabled subtly when `steps.length === 0`).

---

### View 2: Dual Tactile Pitch-Class Input Control

Players can switch freely between **Linear Rail** (default, beginner-friendly) and **Chromatic Clock** (geometry/theory pro view) via a crisp 2-tab pill toggle (`linear-rail.svg` | `chromatic-clock.svg`), plus quick **Voice Selector Chips** (`V1: Db`, `V2: F`, `V3: Ab`) directly beside it so tapping a congested cluster is effortless.

#### 2A. Default View — Wrapping Linear Chromatic Rail
- **16-Slot Track (`2 ghosted left + 12 core + 2 ghosted right`):**
  - Left ghost edge (`-2, -1`): `A#`, `B` (tinted `--sw-rail-ghost-edge-bg`, `0.55` opacity)
  - Core octave (`0..11`): `C`, `C#`, `D`, `D#`, `E`, `F`, `F#`, `G`, `G#`, `A`, `A#`, `B`
  - Right ghost edge (`12, 13`): `C`, `C#`
- **Piano Landmark Scaffolding:** Natural notes (`C D E F G A B`) sit on crisp light/slate key columns; accidentals (`C# D# F# G# A#`) sit slightly recessed with a compact upper dark piano-key cap (`--sw-rail-black-key-cap`) so piano/ableton users orient in 0.5 seconds without full keyboard clutter.
- **Voice Pucks (`48px`):** Active voices render as solid colorblind-safe pucks showing both the note name (`C#`) and subtle shape/voice badge (`1`, `2`, `3`, `4`).
  - **Target-Match State:** When a voice lands on a pitch class present in the Target Chord, its puck gains a crisp **Brass Gold double halo ring** (`--sw-shadow-target-glow`).
  - **2-Tier Semitone Collision Stagger:** Because `390px / 16` slots is `~21px` wide, two voices spaced 1 semitone apart (e.g., `E` and `F`, or `C` and `C#`) automatically offset vertically onto **Upper Tier (`top: 14px`)** and **Lower Tier (`top: 52px`)** inside the `114px` rail track—preserving `48px` tap targets with zero overlap!
  - **Ghost Octave Echo:** Any active voice on `C` or `C#` (slots `0–1`) renders a translucent ghost echo on right-edge `12–13`, and voices on `A#` or `B` (`10–11`) echo on left-edge `-2..-1`, visually teaching `B <-> C` modular wrapping.
- **Precision Stepper Dock (`60px`):** Four `>=48px`-tall thumb buttons (`-2`, `-1`, `+1`, `+2`) anchored directly beneath the rail, operating on the currently selected voice (auto-selects Voice 1 on start, updates to whichever puck was touched last). Shows the selected voice color badge + projected destination note (e.g., `+1 -> F#`).

#### 2B. Pro / Geometry View — 12-Tone Chromatic Clock Toggle
- **Circular Dial (`250px` mobile / `320px` desktop SVG):**
  - `C (0)` fixed at 12 o'clock, ascending clockwise in `30°` increments (`C#` at 1, `D` at 2 ... `B` at 11).
  - **Target Ghost Polygon:** Faint dashed line (`stroke-dasharray: 4 4`, `--sw-target-match-ring` at `0.55` opacity) connecting the Target Chord's 3 or 4 pitch classes + subtle gold corner rings.
  - **Active Morphing Polygon:** Translucent tinted fill + crisp solid stroke connecting the active chord's vertices (`triangle` for triads, `quadrilateral` for weekend 7th chords). Sliding one voice smoothly morphs that single vertex across the dial while keeping the other 2–3 vertices locked—making Neo-Riemannian `P/L/R` flips and `B -> C` wrapping visually unmistakable.
  - **Interactive Node Hit Targets:** Every pitch class node carries an invisible `44×44` SVG hit target; tapping/selecting an active vertex selects that voice, and tapping an adjacent vertex (`±1` or `±2` away) triggers that move directly (in addition to using the `-2 / -1 / +1 / +2` stepper dock below).
  - **Center Dial Readout:** Displays active chord symbol (`Db Maj`) and live match count (`1/3`) in crisp tabular text inside the polygon center.

---

### View 3: Daily Twist Visual States

| Twist | Header Pill | Linear Rail Treatment | Chromatic Clock Treatment | Stepper / Ladder Treatment |
| :--- | :--- | :--- | :--- | :--- |
| **Lava Note** (e.g., `G#`) | Crimson warning chip + `lava-hazard.svg` | Target slot (`G#` + ghost echo if edge) renders 45° crimson hatched overlay + hazard icon | `30°` wedge + node at `G#` turns crimson hatched with forbidden `×` badge | Trying to land on Lava triggers hazard shudder + `"G# is Lava today — detour required"` pill (`0 moves used`) |
| **Checkpoint** (e.g., `Dim`) | Teal diamond chip (`hollow` -> `lit emerald`) | Standard rail + subtle emerald cue when previewing a Dim chord | Dashed inner badge indicator at dial bottom | Target bar carries a **Checkpoint Diamond Badge** (`checkpoint-diamond.svg`): hollow until any committed step has quality `dim`, then ignites solid emerald with check badge |
| **Half-Steps Only (`±1`)** | Slate lock chip + `half-step-lock.svg` | Standard rail | `±2` ghost step indicators suppressed | `-2` and `+2` stepper buttons visibly dimmed, non-interactive (`aria-disabled="true"`), stamped with small padlock badge |
| **4-Voice 7ths** | Orchid 4-dot chip + `4-Voice 7ths` | 4 active voice pucks (`Cobalt, Vermilion, Teal, Orchid`) across 2-tier stagger | Morphing **4-vertex quadrilateral** against 4-vertex dashed target quad | 4-voice thread bundles (`4` parallel/curved SVG lines per step) & 4-column emoji share grid (`⬜⬜🟩⬜`) |

---

### View 4: Live Move Micro-States

1. **Valid Chord Snap:**
   - Selected puck animates along the rail/clock onto the destination slot (`180ms` snappy ease).
   - Row `N` stamps into the ladder with an emerald brief flash border (`--sw-valid-solid`), chord symbol (`Csus4`), quality pill, and delta (`+1`).
   - SVG voice thread draws cleanly from Row `N-1` to Row `N` (`340ms`).
   - Any voice now matching a Target Chord pitch class illuminates its **Brass Gold Target-Match Halo** (`420ms`).
2. **Invalid Cluster Bounce (Non-Punishing):**
   - If the target pitch set is not a recognized chord (e.g., `{C, C#, G}`), the puck momentarily stretches toward the target pitch, then **springs back** to its origin (`380ms` elastic spring + `±6px` horizontal shake).
   - A compact floating pill appears above the rail in `--sw-invalid-surface`: `"Not a recognized chord — 0 moves used"`. Move counter does NOT increment.
3. **Budget Tension (`<= 2` Moves Remaining):**
   - When `maxMoves - movesUsed <= 2` (e.g., `6 / 8` or `7 / 8`), the HUD `Moves` pill transitions to warm amber `--sw-tension-surface` / `--sw-tension-border` with a subtle `2.2s` breathing ring pulse and `"2 moves left"` urgency cue.

---

### View 5: Harmonic Resolution & Post-Game Playback View

Triggered automatically when all Target Chord pitch classes are matched (and Checkpoint rule, if any, is satisfied)—or gracefully when `movesUsed === maxMoves` without solving (**Out of Moves**).

- **Hero Rank Presentation:**
  - Displays the earned **Machined Medal PNG** (`medal-eagle.png`, `medal-par-pure.png`, `medal-par.png`, `medal-solved.png`, or challenge badge `medal-half-step-master.png` / `medal-four-voice-virtuoso.png`) inside its tiered SVG bezel (`frame-eagle.svg` etc.).
  - Rank Banner: `EAGLE` (`-1 under Par`), `PAR PURE` (`Optimal Par · 0 Undos`), `PAR` (`Optimal Par`), `SOLVED` (`+1/+2/+3`), or `OUT OF MOVES`.
- **Triad Telemetry Card (Tabular Mono):**
  - `Moves`: `5 / 5 Par` | `Semitones`: `5 st` | `Undos`: `0`
- **Interactive Scrubber: `"▶ Play My Ladder"` vs. `"▶ Compare Optimal Par"`:**
  - Embedded compact **Ladder Replay Card** showing every committed chord row (`C Maj -> Csus4 -> Fm -> Db Maj -> Dbsus4 -> F#m`) with a horizontal progress scrub indicator.
  - Tapping **`▶ Play My Ladder`** (`play.svg` / `pause.svg`) cascades visually down the player's rows at `680ms` per step (synced with Claude Code's Web Audio playback hook `onPlaybackStep`), highlighting the active chord pill and pulsing its incoming voice thread.
  - Tapping **`Compare Optimal Par`** (`compare-optimal.svg`) splits or toggles cleanly to display the solver's **Optimal Par Path** side-by-side (`Your Path: 6 moves` vs. `Optimal Par: 5 moves`, or showing an alternate Par voicings route when tied at Par) and lets the user cascade-play the Optimal path too!
- **Primary CTA:** `Share Result` (opens Share Modal) + subtle `Close / Inspect Board`.

---

### View 6: Viral Share Modal

Spoiler-free scorecard formatted identically to the product spec so commuters and musicians share achievements cleanly without spoiling chords:

```text
🪜 STEPWISE #88 (Half-Steps Only)
C Maj ──▶ F# Min | Par 5
⬜🟩⬜  (+1)
⬜⬜🟩  (+1)
🟩⬜⬜  (+1)
⬜🟩⬜  (+1)
⬜⬜🟩  (+1)
Score: 5 moves · 5 semitones (⛳ PAR PURE · 0 undos)
```

- **Note on Voice Column Mapping:** Each row shows `N` square glyphs (`3` for triads, `4` for 7ths) matching Voices `1..N`, lighting up the moved voice (`🟩` / voice indicator, `🟨` or `💎` if checkpoint step) plus parenthetical semitone delta `(+1)` / `(-2)`.
- **Actions:** Full-width `48px` `"Copy Scorecard"` button (`share.svg`) that copies plain text to clipboard and switches cleanly to `"✓ Copied to Clipboard"` (`--sw-valid-surface`) for `2000ms`.

---

### View 7: 15-Second Visual How-to-Play Modal

Zero walls of music-theory jargon. Designed to be comprehended in 3 glances using three custom inline architectural SVG diagrams:
1. **Frame 1 — Slide 1 Voice:** Diagram of 3 pucks on the Chromatic Rail with one puck sliding `+1` (`±1–2 semitones` normally, `±1` on Half-Steps days). Caption: *"Nudge a single voice node 1 or 2 semitones."*
2. **Frame 2 — Snap to Real Chords:** Diagram contrasting an emerald snapped row (`Csus4 ✓`) against a soft crimson bounced cluster (`✗ 0 moves lost`). Caption: *"Every step must form a real chord. Bad guesses cost 0 moves."*
3. **Frame 3 — Match & Beat Par:** Diagram of the Target Goal Bar lighting up in Brass Gold as threads converge (`Moves <= Par`). Caption: *"Match every target note within your move budget—aim for Par or Eagle!"*
- Plus a compact **Visual Key Legend** (`Gold Ring = Target Note Match`, `Hatched Red = Lava Blocked`, `Diamond = Checkpoint Required`).

---

### View 8: Stats / Streak Drawer & Settings

Accessible via the top-right `Stats` icon (`stats.svg`), sliding up as a bottom sheet on mobile (`<= 767px`) or right-side drawer on desktop (`>= 768px`):
- **4-Cell KPI Strip:** `Played` | `Win %` | `Current Streak` | `Max Streak` (all `tabular-nums`).
- **Solve Distribution Histogram:** Horizontal Swiss bar chart for `Eagle`, `Par Pure`, `Par`, `+1`, `+2`, `+3`, and `Missed`, highlighting today's earned tier in accent color.
- **Medal Shelf:** Miniature row of the 6 machined medals showing earned counts (`×3`, `×12`, etc.) or dimmed silhouette when locked.
- **Preferences & Settings (Instant Visual Switches):**
  - **Theme:** `Archival Paper (Light)` / `Midnight Studio (Dark)`
  - **Default Input View:** `Linear Chromatic Rail` / `12-Tone Chromatic Clock`
  - **Note Spelling:** `Sharps (#)` / `Flats (b)` (dynamically re-labels all accidentals across rail, clock, and ladder)
  - **Audio Playback:** `Silent Mode` / `Rhodes Synth On`
