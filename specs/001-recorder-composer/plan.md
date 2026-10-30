# Implementation Plan: Recorder Composer

**Branch**: `001-recorder-composer` | **Date**: 2026-10-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-recorder-composer/spec.md`

## Summary

A browser-only single-page app for composing monophonic melodies for the soprano baroque recorder
(C5–D7) and learning to play them. Three resizable, toggleable panels — timeline, sheet music
and fingering diagrams — share one horizontal time axis and are pure views of a single melody
model edited through undoable domain commands. Playback uses Tone.js with one shared playhead;
melodies auto-save to IndexedDB in a versioned JSON format that is also the export format; the UI is
bilingual (RU/EN) with solfège/letter naming; printing uses a wrapped page layout of the same custom
notation renderer. Technical decisions are in [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.x (`strict`), React 18, built with Vite 5

**Primary Dependencies**: zustand + immer (state/history), tone (audio), idb (IndexedDB), zod
(validation), i18next + react-i18next (i18n), react-resizable-panels (layout), Bravura SMuFL font
(notation glyphs), @tonejs/midi (optional MIDI export) — licenses in research.md

**Storage**: IndexedDB (`melodies` store, documents in melody-file v1 format); localStorage for
preferences; `.rcm.json` files for export/import

**Testing**: Vitest + fast-check (domain unit/property tests), React Testing Library (components),
Playwright (e2e); `tsc --noEmit`, ESLint (incl. `i18next/no-literal-string`), Prettier

**Target Platform**: Current desktop Chrome/Edge, Firefox and Safari (last 2 versions); static
hosting; no server

**Project Type**: Client-side web application (single project)

**Performance Goals**: Edit reflected in all panels < 100 ms for 500-note melodies (SC-002);
playhead–audio drift < 50 ms (SC-003); 60 fps playhead animation; production JS bundle ≤ 400 KB gzip
excluding the font (checked in the final verification task; this is the measurable stand-in for a
fast initial load)

**Constraints**: Offline-capable after first load is desirable (not required); no network calls at
runtime; monophony and range invariants enforced in the domain layer; no hard-coded UI text

**Scale/Scope**: Single user per browser; melodies up to ~1000 notes (500 is the performance
target); ~10 UI components groups, 1 screen plus print view; 27 fingering entries

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Gates from `.specify/memory/constitution.md` (v1.0.0):

- [x] ✅ **I. Single Melody Model** — one Zustand melody slice; timeline, staff and fingering row are
  memoized selectors over it; all edits go through `domain/commands` + `domain/history` (undo/redo);
  playback position is one shared slice drawn as a single line (FR-013a).
- [x] ✅ **II. Instrument Fidelity** — range 72–98 and monophony are data-model invariants enforced by
  every command and verified by property tests; fingerings are a reviewed data table with snapshot
  test; staff written an octave below sounding; `previewTranspose` reports out-of-range notes.
- [x] ✅ **III. Test-First Domain Logic** — `src/domain` has no React/DOM/Tone imports (enforced by an
  ESLint `no-restricted-imports` rule); domain tasks are test-first; each user story has a component
  or Playwright test for its primary flow (US8 included: `tests/e2e/us8-midi.spec.ts`); the RU/EN
  key-parity test runs from Phase 2.
- [x] ✅ **IV. Bilingual by Design** — i18next resources `ru`/`en` with key-parity test; lint rule
  against literal JSX strings; `formatNoteName` is the single formatter; pitch stored as MIDI number.
- [x] ✅ **V. Open, Versioned Data** — `formatVersion: 1` with JSON Schema contract, migrations table,
  clear `newerVersion` rejection, round-trip property test; storage reuses the file format.
- [x] ✅ **VI. Client-Side Simplicity** — static app, no backend; each dependency justified with
  license in research.md; MIDI export isolated in its own module and lowest-priority phase.

**Result**: PASS — no violations; Complexity Tracking not needed.

**Post-design re-check (after Phase 1)**: PASS. The data model keeps spelling and fingerings derived
(not stored), contracts keep the domain pure, and the custom notation renderer is justified in
research R4 as the simpler option given the shared time axis (it adds no dependency).

## Project Structure

### Documentation (this feature)

```text
specs/001-recorder-composer/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions R1–R15, license table
├── data-model.md        # Phase 1 — entities, invariants, state transitions
├── quickstart.md        # Phase 1 — run + validation scenarios
├── contracts/
│   ├── melody-file.schema.json   # file/storage format v1
│   ├── domain-api.md             # pure domain module API
│   └── ui-contract.md            # layout, gestures, shortcuts, message keys
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
index.html
package.json
vite.config.ts
tsconfig.json
public/
└── fonts/Bravura.woff2

src/
├── domain/                  # pure TS — no React/DOM/audio (Principle III)
│   ├── types.ts             # Melody, Note, Key, TimeSignature, constants (PPQ, range)
│   ├── commands.ts          # add/move/resize/delete/paste/transpose, setters
│   ├── history.ts           # snapshot undo/redo
│   ├── keys.ts              # key signatures, spelling
│   ├── naming.ts            # formatNoteName (solfège/letter, russian/scientific)
│   ├── notation.ts          # layoutNotation: bars, values, ties, rests, beams, accidentals
│   ├── printLayout.ts       # layoutPrintSystems: wrapped page systems
│   ├── fingering.ts         # lookup + fingeringRow
│   ├── fingerings.soprano-baroque.ts   # 27 entries, transcribed from Yamaha baroque soprano chart only
│   ├── colors.ts            # pitch-class colors
│   ├── schedule.ts          # ticks ↔ seconds, playback schedule
│   ├── serialization.ts     # serialize / parseMelodyFile + migrations (zod)
│   └── midi.ts              # optional MIDI export
├── state/
│   ├── store.ts             # zustand: melody, history, selection, view, playback, storage, prefs
│   └── selectors.ts         # memoized derived views
├── audio/
│   ├── player.ts            # Tone.js transport + recorder voice
│   └── playheadSync.ts      # rAF playhead → store; reschedule on edits/tempo while playing
├── persistence/
│   ├── db.ts                # idb melodies store
│   ├── autosave.ts          # debounce + flush on hide/close
│   └── preferences.ts       # localStorage prefs (versioned)
├── i18n/
│   ├── index.ts
│   ├── en.json
│   └── ru.json
├── ui/
│   ├── App.tsx
│   ├── Toolbar/
│   ├── Layout/              # PanelGroup, shared horizontal scroll + zoom, TimeRuler, Playhead
│   ├── Timeline/            # Keyboard, Grid, NoteRect, BoxSelect, pointer gestures
│   ├── Sheet/               # SVG engraver (glyphs, staff, time-aligned layout)
│   ├── Fingering/           # FingeringDiagram, row, alternates tooltip
│   ├── Library/             # list, rename, duplicate, delete, import/export
│   ├── Transpose/           # dialog with out-of-range preview
│   └── Print/               # PrintView + print.css (layout from domain/printLayout.ts)
├── bootstrap.ts             # composition root: load prefs + last melody, wire autosave
└── main.tsx

tests/
├── unit/domain/             # *.test.ts, *.property.test.ts, fingering snapshot
├── unit/i18n/               # key parity
├── component/               # React Testing Library
├── e2e/                     # Playwright specs per user story
└── fixtures/                # sample .rcm.json files incl. long-500
```

**Structure Decision**: Single client-side project (no backend, Principle VI). Layering is
`domain` ← `state` ← (`ui`, `audio`, `persistence`) ← `bootstrap.ts`/`main.tsx`; `domain` imports
nothing from the other layers and `state` imports only `domain`, both enforced by lint. Preferences
are loaded by `main.tsx` and passed into `createAppStore(initialPrefs)`. Tests mirror layers under `tests/`.

## Implementation Phases (input for /speckit-tasks)

1. **Setup** — Vite + TS strict, lint/format, Vitest/Playwright, i18n skeleton, layering lint rule.
2. **Domain foundation (test-first)** — types, commands + invariants (property tests), history,
   keys/spelling, naming, schedule, serialization + schema.
3. **US1 + US2 (P1, MVP)** — store, shared-axis layout and panels, timeline editing, notation layout
   + SVG renderer, fingering table + diagrams + tooltip, cross-panel selection.
4. **US3 + US4 (P2)** — audio player and playhead; IndexedDB auto-save, library, import/export.
5. **US5–US7 (P3)** — print view; RU/EN + naming switches; key selection + transpose dialog.
6. **US8 (P4, optional)** — MIDI export.
7. **Polish** — performance pass with 500-note fixture, accessibility pass, offline caching (optional).

## Complexity Tracking

No constitution violations to justify.
