# STEPWISE — Brand Identity & Art Direction Bible

> **Aesthetic North Star:** *Swiss Acoustic Minimalism & Architectural Precision* — Dieter Rams / Braun industrial restraint meets NYT Games editorial clarity, illuminated by precision vector voice-leading geometry.

---

## 1. Brand Positioning & Visual Philosophy

**STEPWISE** is *Weaver* for musical harmony: morphing a Start Chord into a Target Chord by sliding **one voice at a time by ±1 or ±2 semitones**, where every step must snap onto a real chord, aiming for **Par** or **Eagle**.

### What STEPWISE Looks & Feels Like
- **Tactile Industrial Instrument (Braun / Teenage Engineering Restraint):** Crisp hairline borders (`1px`), purposeful matte surfaces, physical slider channels, circular dial degree markings, and intentional color discipline. Every pixel earns its keep as either structural scaffolding or real harmonic feedback.
- **Silent-First Commute Editorial (NYT Games Clarity):** Opens immediately onto the puzzle with **zero blocking audio splash screen**, **zero DAW clutter** (no skeuomorphic brushed-aluminum rack screws, glowing equalizer bars, piano-roll transport timelines, or neon purple synthwave grids), and **zero conservatory exam intimidation** (no staff clefs, treble/bass staves, or Roman-numeral pop-quiz banners).
- **Luminous Geometry as Theory Teacher:** Voice leading becomes self-evident without reading a textbook. Stationary common tones stay razor-straight vertical lines; moving voices draw gentle luminous cubic-bezier threads (`+1`, `-1`, `+2`, `-2`); and landing a voice on a pitch class present in the Target Chord lights up a warm brass-gold **Target-Match Halo**.

---

## 2. Silent-First Dual-Theme Color Architecture

STEPWISE ships with **Archival Paper (Light)** as its default theme—engineered for zero-glare daytime commuting, subways, and quiet breakrooms—paired with **Midnight Studio (Dark)** for evening/low-light play. All hex values live in [`design/tokens.json`](file:///C:/Users/itail/Documents/claude-projects/IO_GAMES/StepWise/design/tokens.json) and [`design/tokens.css`](file:///C:/Users/itail/Documents/claude-projects/IO_GAMES/StepWise/design/tokens.css).

### 2.1 Surface, Structural & Typography Tokens

| Token Role | CSS Custom Property | Light (`Archival Paper`) | Dark (`Midnight Studio`) | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| Canvas Background | `--sw-bg-canvas` | `#F5F3EE` | `#111318` | Outer app backdrop |
| Card / Surface | `--sw-bg-surface` | `#FFFFFF` | `#191C24` | Ladder workspace, target card, modals |
| Recessed Well | `--sw-bg-recessed` | `#ECE8DF` | `#0D0F14` | Rail trough, clock recessed disc, badge wells |
| Elevated Popover | `--sw-bg-elevated` | `#FAF9F6` | `#222631` | Floating feedback pills, drawers |
| Subtle Hairline | `--sw-border-subtle` | `#DDD7CC` | `#2A2F3D` | Card frames, row dividers |
| Strong Rule | `--sw-border-strong` | `#B8B0A2` | `#434A5E` | Active anchors, focus boundaries |
| Primary Ink | `--sw-text-primary` | `#18191C` | `#F3F1EC` | Chord symbols, primary labels |
| Secondary Ink | `--sw-text-secondary` | `#4E525B` | `#B4B9C6` | Subtitles, pitch lists, rule text |
| Muted Ink | `--sw-text-muted` | `#5D626D` | `#8A90A0` | Axis tick labels, semitone deltas |
| White Key Slot | `--sw-rail-white-key` | `#FFFFFF` | `#1E222C` | Natural pitch-class rail tiles (`C D E F G A B`) |
| Black Key Slot | `--sw-rail-black-key` | `#DFD9CD` | `#12151C` | Accidental pitch-class rail tiles (`C# D# F# G# A#`) |

---

### 2.2 Four Colorblind-Safe Voice Accent Colors (Dual-Coded)

Because a single chord changes **only one voice per row**, players must track Voices 1–4 effortlessly down the ladder and across octave wraps (`B -> C`). Voice accents follow an **Okabe-Ito-derived colorblind-safe separation** (distinct hue + lightness + chroma across deuteranopia, protanopia, and tritanopia) AND carry mandatory **dual-coding (numeric index `1–4` + geometric micro-shape)** so color alone is never the sole differentiator.

| Voice | Accent Name | Shape Glyph | Light Solid (`onSolid`) | Light Tint | Dark Solid (`onSolid`) | Dark Tint |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Voice 1** | Cobalt Blue | Circle (`●`) | `#1D5FD6` (`#FFFFFF`) | `#E8F0FE` | `#5C9BFF` (`#0B111E`) | `rgba(92, 155, 255, 0.16)` |
| **Voice 2** | Braun Vermilion | Rounded Square (`■`) | `#C24E00` (`#FFFFFF`) | `#FFF0E5` | `#FF8F3F` (`#1A1008`) | `rgba(255, 143, 63, 0.16)` |
| **Voice 3** | Botanical Teal | Diamond (`◆`) | `#0D7A6D` (`#FFFFFF`) | `#E5F6F3` | `#34D1BC` (`#081B18`) | `rgba(52, 209, 188, 0.16)` |
| **Voice 4** *(7ths)* | Orchid Plum | Triangle (`▲`) | `#8E3A8A` (`#FFFFFF`) | `#F7EBF6` | `#D982E6` (`#1C0B1F`) | `rgba(217, 130, 230, 0.16)` |

> [!IMPORTANT]
> **Why Target-Match Glow is Brass Gold (`#B77900` / `#F5C451`) instead of Green:** Voice 3 uses Botanical Teal (`#0D7A6D` / `#34D1BC`), and Valid Snap uses Emerald (`#137A4B` / `#3DD68C`). Using **warm Brass Gold** exclusively for the **Target-Note Match Halo** guarantees zero visual collision between "which voice is this" (Cobalt/Vermilion/Teal/Orchid), "did this chord validate" (Emerald), and "is this note in the Target Chord" (Brass Gold outer ring + aura).

---

### 2.3 Semantic Feedback, Hazards & Golf Rank Tokens

| State / Tier | Light Accent / Ring | Light Surface | Light Text | Dark Accent / Ring | Dark Surface | Dark Text |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Target-Note Match Glow** | `#B77900` (`halo 0.28`) | `#FEF6DF` | `#7A5100` | `#F5C451` (`halo 0.32`) | `rgba(245,196,81,0.16)` | `#FAD679` |
| **Valid Chord Snap** | `#137A4B` | `#E6F6EE` | `#0E5C38` | `#3DD68C` | `rgba(61,214,140,0.14)` | `#6FE8AE` |
| **Invalid Cluster Reject** | `#B83242` | `#FDECEF` | `#8F1F2D` | `#FF6B7A` | `rgba(255,107,122,0.15)` | `#FF99A3` |
| **Lava Note Hazard** | `#C62828` (45° hatch) | `#FDE8E8` | `#991B1B` | `#FF4D5A` (45° hatch) | `rgba(255,77,90,0.16)` | `#FF99A1` |
| **Budget Tension (`<=2` left)** | `#B45309` | `#FEF3C7` | `#7C3504` | `#FBBF24` | `rgba(251,191,36,0.14)` | `#FDE08D` |
| **Checkpoint Pending / Lit** | `#0D7A6D` -> `#137A4B` | `#E5F6F3` -> `#E6F6EE` | `#095B51` -> `#0E5C38` | `#34D1BC` -> `#3DD68C` | `rgba(52,209,188,0.14)` -> `0.16` | `#76E6D7` -> `#7BF0B8` |
| **Rank: Eagle** (`< Par`) | `#9A6700` | `#FEF6DF` | `#734B00` | `#F6C85F` | `rgba(246,200,95,0.15)` | `#FAD987` |
| **Rank: Par / Par Pure** | `#137A4B` | `#E6F6EE` | `#0E5C38` | `#3DD68C` | `rgba(61,214,140,0.14)` | `#7BF0B8` |
| **Rank: Solved** (`<= Par+3`) | `#2855A8` | `#E8F0FE` | `#1E4287` | `#7AA7FF` | `rgba(122,167,255,0.15)` | `#A3C4FF` |
| **Rank: Out of Moves** | `#5E636E` | `#ECE8DF` | `#454952` | `#9AA0AE` | `rgba(154,160,174,0.14)` | `#C2C7D1` |

---

### 2.4 Subtle Chord-Quality Badge Tints

Each snapped chord row stamps a compact quality tag alongside its symbol using muted architectural tints:
- **Major (`Maj`):** Cool Cobalt tint (`#EFF4FC` light / `rgba(92,155,255,0.14)` dark)
- **Minor (`Min`):** Slate Indigo tint (`#F2EFF9` light / `rgba(167,139,250,0.14)` dark)
- **Suspended (`sus2` / `sus4`):** Botanical Teal tint (`#E9F5F3` light / `rgba(52,209,188,0.14)` dark)
- **Diminished (`dim` / `ø7`):** Muted Rose-Crimson tint (`#FDF0F2` light / `rgba(255,107,122,0.14)` dark)
- **Augmented (`aug`):** Warm Amber tint (`#FEF3E8` light / `rgba(255,143,63,0.14)` dark)
- **Seventh (`maj7` / `7` / `m7` / `m7b5`):** Orchid Plum tint (`#F8ECF7` light / `rgba(217,130,230,0.14)` dark)

---

### 2.5 Verified WCAG AA Contrast Summary

All **106 foreground/background and UI-graphic contrast checks** defined across both Light and Dark themes in `tokens.json` pass automated WCAG 2.1 validation (`>= 4.5:1` for normal text, `>= 3.0:1` for graphical marks/rings):
- Light theme primary ink on canvas/surface: **`15.85:1` – `17.58:1`**; muted ink on recessed wells (`#5D626D` on `#ECE8DF`): **`5.00:1`**; all 4 voice pucks (`white` on solid): **`4.79:1` – `6.73:1`**; Target-Match ring on white surface: **`3.65:1`**; all rank & quality badge texts: **`6.12:1` – `8.39:1`**.
- Dark theme primary ink on canvas/surface: **`15.09:1` – `16.46:1`**; muted ink on elevated (`#8A90A0` on `#222631`): **`4.73:1`**; all 4 voice pucks (`onSolid` dark ink on bright accent): **`6.82:1` – `9.31:1`**; Target-Match ring on surface: **`10.46:1`**; all rank & quality badge texts: **`7.25:1` – `9.73:1`**.

---

## 3. Typography System

### Google Fonts Pairing
1. **Display & Chord Symbols — `Space Grotesk` (`500`, `600`, `700`):** Geometric, architectural grotesque with crisp apertures and sharp accidental clarity (`#`, `b`, `dim`, `maj7`). Used for the `STEPWISE` wordmark, anchor/row chord symbols (`C Maj`, `F# Min`, `Dbsus4`), and modal headlines.
2. **UI & Body Copy — `Plus Jakarta Sans` (`400`, `500`, `600`, `700`):** Friendly, legible humanist-geometric sans for instructions, modal explanations, rule descriptions, and action buttons.
3. **Telemetry & Counters — `JetBrains Mono` (`500`, `600`, `700`, `font-variant-numeric: tabular-nums`):** Prevents horizontal jitter when step counters, semitone travel (`5 st`), puzzle numbers (`#88`), and move deltas (`+1`, `-2`) update live.

### Type Scale & Chord Notation Rules

| Token | Size / Line | Font | Weight | Usage |
| :--- | :--- | :--- | :--- | :--- |
| `--sw-text-micro` | `11px / 14px` | `JetBrains Mono` | `600` | Chromatic rail labels (`C`, `C#`), step deltas (`+1`), uppercase eyebrow tags (`START`, `TARGET`) |
| `--sw-text-caption` | `12px / 16px` | `Plus Jakarta Sans` / `Mono` | `500`–`600` | Rule badge text, pitch spelling list (`C · E · G`), status hints |
| `--sw-text-body-sm` | `13px / 18px` | `Plus Jakarta Sans` | `500`–`600` | HUD metric labels, stepper subtext, secondary controls |
| `--sw-text-body` | `15px / 22px` | `Plus Jakarta Sans` | `400`–`500` | Modal body copy, How-to-Play steps |
| `--sw-text-chord-row` | `16px / 20px` | `Space Grotesk` | `700` | Committed ladder row chord symbols (`Csus4`, `F Min`) |
| `--sw-text-chord-anchor` | `19px / 24px` | `Space Grotesk` | `700` | Start & Target Chord Anchor headers (`C Maj`, `F# Min`) |
| `--sw-text-title` | `22px / 28px` | `Space Grotesk` | `700` | Modal headings (`Par Pure!`, `How to Play`) |
| `--sw-text-modal` | `28px / 34px` | `Space Grotesk` | `700` | Rank callouts & hero stats |

**Chord Formatting Standard:**
- Separate root + quality nicely for triads (`C Maj`, `F# Min`, `C# Dim`, `C Aug`), keep suspended compact (`Csus4`, `Dbsus2`), and compact for 7ths (`Cmaj7`, `Cm7`, `Cm7b5`).
- Use true musical typographic styling (`♯` / `♭` or clean ASCII `#` / `b` consistent with user `#` vs `b` preference setting—never mix `C#` and `Db` within the same chord spelling unless structurally required, while gracefully showing enharmonic equivalence where a target note is spelled `F#` and the player currently reads `Gb` via a subtle `= F#` match glow).

---

## 4. Brand Mark, Iconography & Medal Direction

### Logo & Marks (`assets/brand/`)
- **[`logo.svg`](file:///C:/Users/itail/Documents/claude-projects/IO_GAMES/StepWise/assets/brand/logo.svg):** Horizontal architectural lockup combining the rounded-chamfer slate tile (3 parallel voice channels with Voice 2 stepping smoothly along a cubic-bezier path onto a gold target dot) and uppercase `STEPWISE` in `Space Grotesk` (`+0.11em` tracking). Minimum clearspace around the mark = `0.5×` tile height (`20px` at standard display). Never stretch, add drop shadows, or recolor the three voice dots outside the palette.
- **[`favicon.svg`](file:///C:/Users/itail/Documents/claude-projects/IO_GAMES/StepWise/assets/brand/favicon.svg) & [`apple-touch-icon.png`](file:///C:/Users/itail/Documents/claude-projects/IO_GAMES/StepWise/assets/brand/apple-touch-icon.png):** Full-bleed dark anodized slate (`#14171F`) physical fader plate showcasing the three recessed channels and enamel voice caps.
- **[`og-image.png`](file:///C:/Users/itail/Documents/claude-projects/IO_GAMES/StepWise/assets/brand/og-image.png):** `1200×630` editorial social card pairing bold Swiss typography on midnight drafting paper with a 12-tone voice-leading chord ring.

### Custom UI Icon Grid (`assets/icons/`)
All 16 UI icons follow one uniform geometry: `24×24` viewBox, `1.75px` stroke, `stroke-linecap="round"`, `stroke-linejoin="round"`, inheriting `currentColor` for seamless Light/Dark adaptation.

### Machined-Metal / Architectural Enamel Medals (`assets/medals/`)
Each achievement medal shares identical physical photography and lighting rules—overhead flat-lay, soft top-left directional highlight, brushed metal outer bezel with 12 chromatic rim ticks, and matte recessed architectural enamel—framed dynamically in UI inside [`medal-frame.svg`](file:///C:/Users/itail/Documents/claude-projects/IO_GAMES/StepWise/assets/medals/medal-frame.svg) (or rank-specific `frame-eagle.svg`, `frame-par.svg`, `frame-solved.svg`, `frame-challenge.svg`):
1. **`Eagle`** ([`medal-eagle.png`](file:///C:/Users/itail/Documents/claude-projects/IO_GAMES/StepWise/assets/medals/medal-eagle.png)): Brushed champagne gold + deep navy enamel + brass wing chevron above Par bar.
2. **`Par Pure`** ([`medal-par-pure.png`](file:///C:/Users/itail/Documents/claude-projects/IO_GAMES/StepWise/assets/medals/medal-par-pure.png)): Machined platinum + emerald enamel + concentric 3-dot alignment ring (0 undos at Par).
3. **`Par`** ([`medal-par.png`](file:///C:/Users/itail/Documents/claude-projects/IO_GAMES/StepWise/assets/medals/medal-par.png)): Brushed titanium + emerald enamel + silver pin and 3-step harmonic stair.
4. **`Solved`** ([`medal-solved.png`](file:///C:/Users/itail/Documents/claude-projects/IO_GAMES/StepWise/assets/medals/medal-solved.png)): Matte satin aluminum + cobalt enamel + checkmark stair path.
5. **`Half-Step Master`** ([`medal-half-step-master.png`](file:///C:/Users/itail/Documents/claude-projects/IO_GAMES/StepWise/assets/medals/medal-half-step-master.png)): Anodized gunmetal + vermilion enamel + interlocking `+1` micro-step geometry.
6. **`Four-Voice Virtuoso`** ([`medal-four-voice-virtuoso.png`](file:///C:/Users/itail/Documents/claude-projects/IO_GAMES/StepWise/assets/medals/medal-four-voice-virtuoso.png)): Brushed rose-gold + obsidian enamel + 12-point ring + glowing 4-voice quadrilateral.
