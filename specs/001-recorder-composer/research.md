# Research: Recorder Composer

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-29

Each entry: Decision / Rationale / Alternatives considered. All Technical Context unknowns are
resolved here.

## R1. Build tooling and language

- **Decision**: TypeScript 5.x (`strict`, `noUncheckedIndexedAccess`), React 18, Vite 5 as dev server
  and bundler; static build output.
- **Rationale**: The request prefers TypeScript/React; Vite gives instant dev reloads and a static
  bundle that can be hosted anywhere (Principle VI: no backend).
- **Alternatives**: Next.js (server features unused, heavier); Create React App (unmaintained).

## R2. Application state and undo/redo

- **Decision**: One Zustand store holding the `Melody` (Principle I). All mutations go through pure
  domain commands (`(melody, args) => Result<melody>`) executed by a `history` module that keeps
  immutable snapshots (structural sharing via Immer `produce`), capped at 200 steps (FR-007 needs ≥100).
  UI-only state (selection, zoom, scroll, playback position) lives in separate store slices that are
  never saved with the melody.
- **Rationale**: Melodies are small (≤ ~1000 notes), so snapshot history is simpler and safer than
  inverse operations; pure commands are unit-testable without React (Principle III).
- **Alternatives**: Redux Toolkit (more boilerplate for the same result); command pattern with inverse
  ops (more code, more bug surface); Immer patches (only needed for very large documents).

## R3. Timeline (piano roll) rendering

- **Decision**: SVG rendered by React, with pointer events and pointer capture for drag/resize/box
  selection; horizontal virtualization (render only notes in the visible range plus a margin).
- **Rationale**: 500 notes × a few elements each is well within SVG limits; SVG gives hit-testing,
  accessibility attributes and crisp print for free; shared x-scale with other panels is trivial.
- **Alternatives**: Canvas (faster for 10k+ items but manual hit-testing and a11y); DOM divs (fine but
  harder to align with SVG notation).

## R4. Sheet music rendering (time-aligned on screen, wrapped in print)

- **Decision**: Split into two layers:
  1. **Notation layout (domain, pure TS)**: converts the melody into notation events per bar — note
     values (whole … thirty-second, single dots), ties for bar crossings and non-representable lengths,
     rests for gaps, accidentals from key signature with per-bar courtesy rules, beam groups by time
     signature, written pitch (−12 semitones) and staff position.
  2. **Renderer (UI)**: a small custom SVG engraver drawing staff lines, clef, key/time signature,
     noteheads, stems, flags, beams, dots, accidentals, ties and rests using SMuFL glyphs from the
     **Bravura** font (SIL OFL 1.1). It only draws: x positions come from the shared time axis on
     screen (FR-013a) or from the pure `src/domain/printLayout.ts` (`layoutPrintSystems`: systems of
     whole bars fitted to page width) in print.
- **Rationale**: Monophonic treble-clef notation is a narrow, well-defined subset; general engravers
  (VexFlow, OSMD, abcjs) compute their own horizontal spacing, which fights the required shared time
  axis. A custom layout keeps all musical logic testable and lets screen and print share one renderer.
- **Alternatives**: VexFlow 4 (MIT) — excellent glyphs, but forcing per-note x positions requires
  per-note staves or internal overrides, fragile; abcjs (MIT) — text-based input, own spacing;
  OpenSheetMusicDisplay (BSD) — MusicXML-based, heavy, own spacing. VexFlow remains the fallback for
  print-only engraving if the custom renderer underperforms.

## R5. Audio playback and synchronization

- **Decision**: Tone.js (MIT) `Transport` for scheduling, tempo, pause/resume and seek; a custom
  recorder-like voice (`Tone.Synth` with triangle/sine mix, soft attack ~20 ms, light vibrato, filtered
  noise "breath" layer). The playhead position is read each animation frame from
  `Transport.seconds` minus `context.outputLatency`/`lookAhead` compensation by
  `src/audio/playheadSync.ts` and written to the shared playback slice (Principle I). Edits during playback reschedule events after the current position.
  Audio context is started on the first Play click (autoplay policy edge case).
- **Rationale**: Transport solves the tricky parts (look-ahead scheduling, tempo changes, seek) and
  keeps cursor drift < 50 ms (SC-003). A synth avoids sample loading and licensing.
- **Alternatives**: Raw Web Audio scheduling (reimplements Transport); sampled recorder via
  `Tone.Sampler` (better sound, needs a free-licensed sample set — kept as a later enhancement);
  soundfont-player (General MIDI recorder patch, larger downloads).

## R6. Persistence (auto-save library)

- **Decision**: IndexedDB through `idb` (ISC) — object store `melodies` keyed by `id`, storing the same
  JSON document as the export format (R7). Writes are debounced 500 ms and flushed on
  `visibilitychange`/`pagehide` (FR-019: ≤ 1 s, flush on close). Preferences (language, naming,
  layout, snap, zoom, last opened melody) in `localStorage` under one versioned key. Storage failures
  (unavailable, quota) set a persistent warning banner state; export still works.
- **Rationale**: IndexedDB has larger quotas and async writes; reusing the file format for storage
  means one schema, one migration path and one round-trip test (Principle V).
- **Alternatives**: localStorage for melodies (5 MB limit, synchronous); File System Access API
  (Chromium only, needs permission prompts).

## R7. Melody file format and validation

- **Decision**: JSON document `{ "format": "recorder-composer", "formatVersion": 1, "melody": {...} }`
  with extension `.rcm.json`, validated with Zod (MIT) on import and on load from storage; a
  `migrations` table maps `formatVersion n → n+1`. Unknown future versions are rejected with a clear
  message. Schema in [contracts/melody-file.schema.json](./contracts/melody-file.schema.json).
- **Rationale**: Human-readable, diffable, trivially versioned; Zod gives runtime validation plus
  TypeScript types from one definition.
- **Alternatives**: MusicXML as primary format (heavy, lossy for app metadata — could be a later
  export); MIDI as storage (loses key spelling, title metadata quirks, not human-readable).

## R8. Time and pitch representation

- **Decision**: Time in integer **ticks** at **PPQ = 480** (thirty-second = 60 ticks, sixteenth =
  120, quarter = 480). Pitch as MIDI number at sounding pitch, range 72 (C5) – 98 (D7). Spelling
  (letter + accidental) is not stored; it is derived from the key (major/minor key-signature
  preference table) at render time. Written pitch = sounding − 12.
- **Rationale**: Integers avoid floating-point drift; 480 divides by 2, 3, 4, 5, 6, 8 leaving room
  for triplets later; MIDI numbers make range, transposition and MIDI export simple.
- **Alternatives**: Fractions of a whole note (needs rational arithmetic); seconds (tempo-dependent).

## R9. Fingering data

- **Decision**: A typed data table `fingerings.soprano-baroque.ts` mapping every MIDI number 72–98 to
  `{ standard: Fingering, alternates: LabeledFingering[] }`, where `Fingering` is the state of 8
  positions (thumb + 7 front holes, holes 6 and 7 as double holes) each `open | closed | half`
  (thumb `half` = pinched). Source: **only** Yamaha's official fingering chart for baroque (English)
  system soprano recorders; `standard` is transcribed from it and alternates are included only where
  that chart lists them. The chart title/edition and URL are recorded in the file header; the table is
  reviewed note by note and locked by a snapshot test (SC-004).
- **Rationale**: Principle II requires fingerings as data; snapshot plus a reviewed fixture catches
  accidental edits.
- **Alternatives**: Deriving fingerings algorithmically (not possible — cross/forked fingerings are
  idiomatic); mixing several manufacturers' charts (rejected: charts differ on alternates and some
  high notes, so one reference keeps SC-004 verifiable).

## R10. Internationalization and note naming

- **Decision**: i18next + react-i18next (MIT) with `ru` and `en` JSON resources; language detection
  from `navigator.languages` (ru → Russian, otherwise English) overridable in preferences. A pure
  `formatNoteName(pitch, { style: 'letter'|'solfege', octaveSystem: 'russian'|'scientific', key })`
  function in the domain layer (FR-025/025a); octave system follows UI language. A unit test asserts
  `ru` and `en` have identical key sets (SC-007); ESLint `i18next/no-literal-string` blocks hard-coded
  JSX text (Principle IV).
- **Rationale**: Standard, small, supports interpolation and plurals (Russian plurals need it).
- **Alternatives**: FormatJS/react-intl (heavier ICU syntax); hand-rolled dictionary (no plurals).

## R11. Resizable, toggleable panels

- **Decision**: `react-resizable-panels` (MIT) vertical `PanelGroup` with three panels, collapsible,
  layout persisted to preferences. A shared horizontal scroll container wraps all three panels'
  content so they scroll together; zoom is a single `pxPerTick` value in UI state.
- **Rationale**: Mature, accessible (keyboard-resizable) and supports persistence.
- **Alternatives**: Custom splitter (reinventing a11y and persistence).

## R12. Printing

- **Decision**: A print view rendered into a hidden container with `@media print` styles (A4/Letter
  via `@page`), using the wrapped print layout from R4 and an optional fingering row under each system;
  triggered with `window.print()`. Print shows title, clef, key and time signature on each system.
- **Rationale**: No extra dependency; users can "Save as PDF" from the browser dialog.
- **Alternatives**: jsPDF/pdfmake generation (extra dependency, font embedding work).

## R13. MIDI export (optional, P4)

- **Decision**: `@tonejs/midi` (MIT) to write a single-track SMF type 1 with tempo, time signature,
  key signature meta events and notes; GM program 74 (Recorder).
- **Rationale**: Small, typed, and from the same ecosystem as Tone.js.
- **Alternatives**: midi-writer-js (MIT) — also fine, less typed.

## R14. Testing strategy

- **Decision**: Vitest for unit tests of all domain modules, with **fast-check** property tests for
  editing invariants (random command sequences never produce overlaps or out-of-range notes — SC-005)
  and save/load round-trips (SC-006); React Testing Library for component flows; Playwright for
  end-to-end flows (draw note → visible in three panels, auto-save across reload, language switch,
  print preview DOM). ESLint + Prettier; `tsc --noEmit` in CI.
- **Rationale**: Matches Principle III; property tests are the cheapest way to prove invariants.
- **Alternatives**: Jest (slower with Vite/ESM); Cypress (heavier than Playwright for this scope).

## R15. Performance approach

- **Decision**: Derived views (notation layout, fingering list) are memoized selectors over the
  melody, recomputed per bar when possible; SVG virtualization by visible tick range; playhead drawn in
  a separate overlay layer updated via `requestAnimationFrame` without re-rendering note layers.
- **Rationale**: Meets SC-002 (< 100 ms after an edit at 500 notes) and SC-003 (cursor < 50 ms drift).
- **Alternatives**: Web Workers for layout (unnecessary at this scale).

## License check (Principle VI)

| Dependency | License | Purpose |
|------------|---------|---------|
| react, react-dom | MIT | UI |
| zustand | MIT | state |
| immer | MIT | immutable updates |
| tone | MIT | audio scheduling and synth |
| @tonejs/midi | MIT | MIDI export (optional) |
| idb | ISC | IndexedDB wrapper |
| zod | MIT | file validation |
| i18next, react-i18next | MIT | i18n |
| react-resizable-panels | MIT | panel layout |
| Bravura font | SIL OFL 1.1 | music glyphs |
| vitest, fast-check, @testing-library/react, @playwright/test | MIT / Apache-2.0 | testing |

All are compatible with open distribution.
