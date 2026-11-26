# STEPWISE

Daily voice-leading ladder puzzle: slide one voice ±1/±2 semitones per move to morph the Start chord into the Target chord. Every step must be a real chord. Beat Par.

Static Vite + React + TypeScript app, zero backend. Live at https://itailiors.github.io/stepwise/ — every push to `main` runs `npm run check` and deploys `dist/` to GitHub Pages (`.github/workflows/deploy.yml`, same setup as Reharm; PRs only check). `SITE_URL` makes `og:image`/`og:url` absolute for link previews; `base: './'` keeps the build portable to any host or sub-path.

## Commands

- `npm run dev` — dev server. In dev only, `?date=YYYY-MM-DD` loads another day's puzzle.
- `npm run check` — typecheck + unit tests + production build (the definition of done).
- `npm test` — Vitest (chord recognizer, solver benchmarks, 365-day generator stress test, scoring/storage, reducer).

## Layout

- `src/engine/` — `chords.ts` (52 triad / 51 seventh pitch-class sets), `graph.ts` (voice moves + rule validation), `solver.ts` (Dijkstra on `(chordMask, checkpointVisited)`, lexicographic `(moves, semitones)`), `daily.ts` (UTC-seeded mulberry32 generator, Mon–Sun twists).
- `src/audio/synth.ts` — silent-first Web Audio FM electric piano, pre-allocated 4-voice pool, iOS unlock (audioSession + silent loop), playback clock.
- `src/state/` — scoring/medals/share card and `localStorage` persistence.
- `src/game/gameState.ts` — pure reducer for the UI state machine.
- `src/ui/` + `src/App.tsx` — views. Styling is `design/tokens.css` + a verbatim copy of `design/preview/preview.css` (`src/styles/preview.css`) + production-only states in `src/styles/app.css`.

`design/` and `assets/` are the design source of truth and are served as-is (never edited).

## Engine notes

- Lava days: a single blocked pitch class almost never lengthens par in the triad graph (0 of 3,096 major/minor cases), so the generator requires the lava note to block ≥25% of the unrestricted optimal routes (or to worsen par).
- Puzzle #1 is `2026-11-26` (`LAUNCH_EPOCH_UTC` in `src/engine/daily.ts`). Changing the epoch, the seed string or the hash changes every future puzzle.
