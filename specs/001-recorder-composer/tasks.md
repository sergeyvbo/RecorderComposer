# Tasks: Recorder Composer

**Input**: Design documents from `/specs/001-recorder-composer/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Per Constitution Principle III, test tasks are REQUIRED for music-domain logic (written
first, must fail before implementation) and for each user story's primary UI flow.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested
independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: US1–US8, matching spec.md user stories
- Paths are relative to the repository root (single client-side project, see plan.md)

## Conventions used by all tasks

- Time unit: integer ticks, `PPQ = 480` (thirty-second = 60, sixteenth = 120, quarter = 480).
- Pitch: MIDI number at sounding pitch, `MIN_PITCH = 72` (C5), `MAX_PITCH = 98` (D7); written pitch =
  sounding − 12.
- `src/domain/**` MUST NOT import React, DOM APIs, `tone`, `idb` or anything from `src/state`,
  `src/ui`, `src/audio`, `src/persistence`.
- All user-visible text goes through i18n keys in `src/i18n/en.json` and `src/i18n/ru.json`; add both
  translations in the same task that introduces a key.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and tooling

- [X] T001 Initialize a Vite 5 + React 18 + TypeScript project at the repo root: `package.json`
  (name `recorder-composer`, `"type": "module"`), `index.html`, `vite.config.ts`, `src/main.tsx`
  rendering `<App />` from `src/ui/App.tsx`
- [X] T002 Configure `tsconfig.json` with `"strict": true`, `"noUncheckedIndexedAccess": true`,
  `"noImplicitOverride": true`, `"exactOptionalPropertyTypes": true`, path alias `@/*` → `src/*`
  (also mirrored in `vite.config.ts`)
- [X] T003 Install runtime dependencies listed in research.md (zustand, immer, tone, idb, zod,
  i18next, react-i18next, react-resizable-panels, @tonejs/midi) and dev dependencies (vitest,
  @vitest/coverage-v8, fast-check, @testing-library/react, @testing-library/user-event, @testing-library/jest-dom, jsdom, fake-indexeddb,
  @playwright/test, eslint, typescript-eslint, eslint-plugin-react-hooks, eslint-plugin-i18next,
  prettier) in `package.json`
- [X] T004 [P] Configure ESLint flat config in `eslint.config.js`: typescript-eslint strict,
  react-hooks, `i18next/no-literal-string` for `src/ui/**/*.tsx` (allow only class names/test ids),
  and `no-restricted-imports` forbidding `react`, `react-dom`, `tone`, `idb`, `@/ui/*`, `@/state/*`,
  `@/audio/*`, `@/persistence/*` inside `src/domain/**`, and
  forbidding `@/ui/*`, `@/audio/*`, `@/persistence/*` inside `src/state/**` (layering from plan.md)
- [X] T005 [P] Configure Prettier in `.prettierrc` (printWidth 100, singleQuote, trailingComma all)
- [X] T006 [P] Configure Vitest in `vite.config.ts` (`test.environment = 'jsdom'` for
  `tests/component/**`, `node` for `tests/unit/**`, setup file `tests/setup.ts` with
  @testing-library/jest-dom)
- [X] T007 [P] Configure Playwright in `playwright.config.ts` (webServer `npm run dev`, baseURL
  `http://localhost:5173`, projects chromium + firefox + webkit, testDir `tests/e2e`)
- [X] T008 Add npm scripts in `package.json`: `dev`, `build`, `preview`, `typecheck`
  (`tsc --noEmit`), `lint`, `format`, `test` (`vitest run`), `test:watch`, `test:e2e`
  (`playwright test`), `check` (typecheck && lint && test)
- [X] T009 [P] Add the Bravura font (SIL OFL 1.1) as `public/fonts/Bravura.woff2` with its license
  `public/fonts/OFL.txt`, and declare `@font-face` in `src/ui/styles/global.css`
- [X] T010 [P] Create `.gitignore` (node_modules, dist, coverage, playwright-report, test-results)
  and `README.md` with run commands from quickstart.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Domain types, key/spelling and naming logic, store skeleton, i18n and the app shell —
needed by every story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests first (must fail before implementation)

- [X] T011 [P] Write `tests/unit/domain/keys.test.ts`: `keySignature` returns fifths −4…+4 for the
  allowed keys only — major `C G D A E F Bb Eb Ab`, minor `A E B F# C# D G C F`; `spell(pitch, key)`
  returns letter/accidental/written octave (e.g. 78 in G major → F♯ octave 4; 78 in F major → G♭
  octave 4; 82 in F major → B♭); chromatic notes spelled with sharps in sharp keys and C major /
  A minor, flats in flat keys
- [X] T012 [P] Write `tests/unit/domain/naming.test.ts` covering every row of the examples table in
  `specs/001-recorder-composer/contracts/domain-api.md` (72 letter/scientific → `C4`;
  72 solfege/russian → `до¹`; 98 letter/russian → `D³`; 78 in G major letter/scientific → `F♯4`;
  78 in F major solfege/scientific → `sol♭4`), plus solfège syllables `do re mi fa sol la si` and
  Russian `до ре ми фа соль ля си`, and `form: 'long'` returning an i18n key + params
  (e.g. `{ i18nKey: 'note.octave.russian.1', ... }`)
- [X] T013 [P] Write `tests/unit/i18n/keys.test.ts`: `en.json` and `ru.json` have identical key
  sets and no empty values (SC-007, Principle IV) — enforced from Phase 2 on, so every story ships
  with complete Russian and English text
- [X] T014 [P] Write `tests/unit/domain/defaults.test.ts`: `createEmptyMelody(now, id)` returns 4/4,
  100 BPM, C major, empty `notes`, a title of 1–120 chars after trim, `createdAt === updatedAt ===
  now`; `src/domain/colors.ts` exports exactly 12 unique colors, one per pitch class (FR-008)

### Implementation

- [X] T015 Create domain types and constants in `src/domain/types.ts`: `PPQ = 480`,
  `MIN_PITCH = 72`, `MAX_PITCH = 98`, `GRID_MIN = 60`, `SnapTicks = 480 | 240 | 120 | 60`,
  `Note { id: string; pitch: number; start: number; duration: number }`,
  `TimeSignature { beats: 2|3|4|6; beatUnit: 4|8 }` limited to 2/4, 3/4, 4/4, 6/8,
  `Key { tonic; mode: 'major'|'minor' }`, `Melody { id; title (1–120 chars after trim); tempoBpm
  (integer 30–240); timeSignature; key; notes; createdAt; updatedAt (ISO-8601) }`,
  `EditResult`, `AdjustReason`, `RejectReason` exactly as in contracts/domain-api.md, and
  `createEmptyMelody(now, id)` with defaults 4/4, 100 BPM, C major (makes the
  `createEmptyMelody` part of T014 pass)
- [X] T016 Implement `src/domain/keys.ts` (`ALLOWED_KEYS`, `keySignature`, `spell`,
  `ticksPerBar(ts)`, `ticksPerBeat(ts)`) to make T011 pass
- [X] T017 Implement `src/domain/naming.ts` (`formatNoteName(pitch, { style, octaveSystem, key,
  form })`; russian octave index = scientific written octave − 3, rendered as superscript ¹²³) to
  make T012 pass
- [X] T018 [P] Create pitch-class color table in `src/domain/colors.ts` (12 fixed colors, one per
  pitch class, FR-008), chosen to stay distinguishable in light and dark themes; makes the colors part of T014 pass
- [X] T019 [P] Set up i18n in `src/i18n/index.ts` (i18next + react-i18next, resources `en` / `ru`,
  `fallbackLng: 'en'`) and seed `src/i18n/en.json` / `src/i18n/ru.json` with app title, panel names
  (`panel.timeline`, `panel.sheet`, `panel.fingering`), toolbar labels and note-octave keys
- [X] T020 [P] Implement preferences persistence in `src/persistence/preferences.ts`: localStorage
  key `rc.prefs`, `version: 1`, fields and defaults from data-model.md Preferences table
  (`language` from `navigator.languages` ru→ru else en; `noteNaming` letter for en / solfege for ru;
  `snapTicks` 120; `defaultNoteTicks` 480; panels all visible; `lastMelodyId` null); every read/write
  wrapped in try/catch, falling back to defaults
- [X] T021 Create the Zustand store in `src/state/store.ts` as `createAppStore(initialPrefs)` with
  slices `melody`, `selection` (`Set<noteId>`, `hoverNoteId`), `view` (`pxPerTick`, `scrollTick`,
  panels), `playback` (`status`, `positionTicks`, `playingNoteId`), `storage` (`status`), `prefs`;
  initial melody from `createEmptyMelody`. The store MUST NOT import `src/persistence` or
  `src/audio`: `src/main.tsx` loads preferences via `src/persistence/preferences.ts`, passes them
  in, and subscribes a preferences writer to the `prefs` slice
- [X] T022 Build the app shell in `src/ui/App.tsx` and `src/ui/Layout/PanelLayout.tsx`: toolbar
  placeholder, vertical `PanelGroup` (react-resizable-panels) with three panels, and a shared
  horizontal scroll container (`src/ui/Layout/SharedTimeAxis.tsx`) exposing `tickToX`/`xToTick`
  from `view.pxPerTick` and `view.scrollTick` via React context so all panels use one x-scale
  (FR-013a)

**Checkpoint**: `npm run check` passes; the app renders three empty panels.

---

## Phase 3: User Story 1 — Compose a melody on the timeline (Priority: P1) 🎯 MVP

**Goal**: Draw, move, stretch, select and delete notes with undo/redo; range and monophony always hold.

**Independent Test**: With only the timeline panel visible, create, edit and delete a 16-note melody;
no overlaps or out-of-range notes can be produced (spec US1).

### Tests for User Story 1 (REQUIRED — write first, ensure they FAIL) ⚠️

- [X] T023 [P] [US1] Write `tests/unit/domain/commands.test.ts` for `addNote`, `moveNotes`,
  `resizeNote`, `deleteNotes`, `pasteNotes`, `setTimeSignature`, `setTitle`, covering FR-006 clamp
  semantics: a moved note whose target fits entirely in a free gap is placed there, even beyond a
  neighbour; a target starting in a free gap but overlapping the next note is shortened to fit that
  gap (≥ one grid step); a target starting inside another note leaves the note at its last valid
  position (it stops at the neighbour's boundary); a stretched edge stops where the
  neighbour begins; a note dropped on an occupied position is shortened to fit the free gap, or
  rejected with `noRoom` if the gap is shorter than one grid step; touching notes are allowed;
  multi-selection moves as a unit and never splits; pitch clamped to 72–98 with
  `adjusted: ['clampedToRange']`; non-edited notes never change
- [X] T024 [P] [US1] Write `tests/unit/domain/commands.property.test.ts` with fast-check: 10 000
  random command sequences from an empty melody never violate the data-model invariants (range
  72–98, no overlaps, `start ≥ 0`, `duration ≥ 60`, multiples of 60, unique ids, sorted by start)
  (SC-005)
- [X] T025 [P] [US1] Write `tests/unit/domain/history.test.ts`: apply/undo/redo restore exact prior
  states; rejected results add no entry; new edit after undo clears redo; cap of 200 drops oldest
- [X] T026 [P] [US1] Write `tests/component/Timeline.test.tsx` (React Testing Library): clicking an
  empty cell adds a note of default length at the snapped tick; Delete removes the selection;
  Ctrl+Z restores it
- [X] T027 [P] [US1] Write `tests/e2e/us1-compose.spec.ts` (Playwright) implementing quickstart.md
  scenario 1

### Implementation for User Story 1

- [X] T028 [US1] Implement `src/domain/commands.ts` (all editing commands and setters from
  contracts/domain-api.md; notes kept sorted by start; ids via injected `newId()`) to make T023–T024
  pass
- [X] T029 [US1] Implement `src/domain/history.ts` (`createHistory`, `apply`, `undo`, `redo`,
  `canUndo`, `canRedo`, cap 200, Immer structural sharing) to make T025 pass
- [X] T030 [US1] Wire commands into the store in `src/state/store.ts`: `dispatch(command, args)`
  runs the command, pushes one history entry per committed command (drag previews use
  `preview(command, args)`, which never touches history), updates `melody.updatedAt`, stores the last `adjusted` /
  `reason` for user hints; add `undo`, `redo`, `select`, `toggleSelect`, `selectRange`,
  `clearSelection`, clipboard copy/cut/paste
- [X] T031 [P] [US1] Implement `src/ui/Timeline/Keyboard.tsx`: vertical keyboard rows for pitches
  98 → 72 (top to bottom) with black keys shown, labels from `formatNoteName` using current
  `noteNaming` and the octave system of the UI language (FR-001, FR-025a), fixed left column
- [X] T032 [P] [US1] Implement `src/ui/Timeline/Grid.tsx`: SVG grid aligned to keyboard rows, beat
  and bar lines from `ticksPerBar` / `ticksPerBeat`, snap-step subdivision lines, x from
  `SharedTimeAxis` (FR-009)
- [X] T033 [US1] Implement `src/ui/Timeline/NoteRect.tsx`: rectangle colored by pitch class
  (`src/domain/colors.ts`), selected/hover styles, 6 px left/right resize handles, note name label
  when width allows
- [X] T034 [US1] Implement pointer gestures in `src/ui/Timeline/useTimelineGestures.ts`
  (click-to-add, drag-move with pointer capture, edge-resize, modifier-click and shift-click
  selection, double-click delete, box selection in `src/ui/Timeline/BoxSelect.tsx`), all
  dispatching domain commands with the current `snapTicks`. During a drag, track `lastValid` (the last
  position the command accepted), pass it to `moveNotes`, and render the result of `preview` on a
  draft so clamping is visible while dragging; dispatch one committed command on pointer-up, so one
  drag = one undo step
- [X] T035 [US1] Implement `src/ui/Timeline/TimelinePanel.tsx` composing Keyboard, Grid, NoteRects
  and BoxSelect with horizontal virtualization (render notes in visible tick range ± one viewport)
- [X] T036 [US1] Implement keyboard shortcuts in `src/ui/useShortcuts.ts` per
  contracts/ui-contract.md (Delete/Backspace, Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl+Y, Ctrl/Cmd+A/C/X/V,
  ↑/↓ ±1 semitone, Shift+↑/↓ ±octave, ←/→ ± grid step, Esc)
- [X] T037 [P] [US1] Add toolbar controls in `src/ui/Toolbar/EditControls.tsx`: snap select
  (1/4, 1/8, 1/16, 1/32 → 480/240/120/60; default 1/16, FR-003), time signature select (2/4, 3/4,
  4/4, 6/8), undo/redo buttons; every control keyboard-reachable
  with an accessible name in both languages
- [X] T038 [P] [US1] Implement transient edit hints in `src/ui/Toolbar/EditHint.tsx` showing
  `edit.clampedToNeighbor`, `edit.shortenedToFit`, `edit.noRoom`, `edit.clampedToRange` (add en/ru
  strings)
- [X] T039 [US1] Implement horizontal zoom (Ctrl/Cmd+wheel, pinch) and scroll in
  `src/ui/Layout/SharedTimeAxis.tsx` updating `view.pxPerTick` / `view.scrollTick`

**Checkpoint**: US1 independently functional — T023–T027 pass.

---

## Phase 4: User Story 2 — Sheet music and fingerings for the melody (Priority: P1)

**Goal**: The staff and fingering panels mirror the melody instantly on the shared time axis;
cross-panel selection; resizable/toggleable panels.

**Independent Test**: Draw C5–C6; the staff shows correct written notes/rhythms and the fingering
row shows the correct baroque fingering under each note (spec US2).

### Tests for User Story 2 (REQUIRED — write first, ensure they FAIL) ⚠️

- [X] T040 [P] [US2] Write `tests/unit/domain/notation.test.ts` for `layoutNotation`: quarter /
  half / whole / eighth / sixteenth / thirty-second values and single dots; a note crossing a bar
  line splits into tied notes; 5 sixteenths → tied values aligned to beats; gaps → rests; written
  pitch = sounding − 12 and staff step relative to treble clef; key signature accidentals and
  per-bar accidental memory (natural after an altered note); beam groups per time signature (4/4
  beats, 6/8 dotted-quarter groups); each event carries `noteId` and `startTick`
- [X] T041 [P] [US2] Write `tests/unit/domain/fingering.test.ts`: exactly 27 entries for pitches
  72–98, each with `standard`; every `labelKey` exists in `src/i18n/en.json`; `fingeringRow(m)`
  returns one item per note in start order
- [X] T042 [P] [US2] Write `tests/unit/domain/fingering.snapshot.test.ts` snapshotting the full table
  so any change requires deliberate review (SC-004)
- [X] T043 [P] [US2] Write `tests/e2e/us2-views.spec.ts` implementing quickstart.md scenario 2
  (staff + fingering update on edit, tie across bar with one diagram, alternates tooltip, hide
  panel, layout persists after reload)

### Implementation for User Story 2

- [X] T044 [US2] Implement `src/domain/notation.ts` (`layoutNotation`, `NotationModel` types from
  data-model.md "Derived models") to make T040 pass
- [X] T045 [US2] Create the reviewed fingering table `src/domain/fingerings.soprano-baroque.ts`:
  one entry per pitch 72–98 with `standard` (thumb + holes 1–5 single, holes 6–7 as
  `{ left, right }` double holes, each `open|closed|half`; thumb `half` = pinched) and labelled
  `alternates` (`labelKey` like `fingering.alt.trill`). The ONLY source is Yamaha's official
  fingering chart for baroque (English) system soprano recorders: transcribe `standard` from it and
  add alternates only where that chart lists them (otherwise `alternates: []`). Record the chart
  title/edition and URL in a header comment and verify every entry against it
- [X] T046 [US2] Implement `src/domain/fingering.ts` (`getFingering`, `fingeringRow`) to make
  T041–T042 pass; add `fingering.alt.*` keys to en/ru JSON
- [X] T047 [US2] Add memoized derived selectors in `src/state/selectors.ts`
  (`selectNotation`, `selectFingeringRow`) keyed on the melody object identity
- [X] T048 [P] [US2] Implement SMuFL glyph helpers in `src/ui/Sheet/glyphs.ts` (codepoints for
  G clef, noteheads, flags, rests, accidentals, dots, time-signature digits; Bravura metrics)
- [X] T049 [US2] Implement the SVG engraver in `src/ui/Sheet/StaffRenderer.tsx`: staff lines,
  clef/key/time signature in a sticky left column, noteheads with ledger lines, stems (direction by
  staff position), flags, beams, dots, accidentals, ties and rests from `NotationModel`; x positions
  supplied by a `layout` prop
- [X] T050 [US2] Implement time-aligned layout in `src/ui/Sheet/SheetPanel.tsx`: x = `tickToX(event
  .startTick)` from `SharedTimeAxis`, bar lines at bar ticks, horizontal virtualization (FR-010,
  FR-013a)
- [X] T051 [P] [US2] Implement `src/ui/Fingering/FingeringDiagram.tsx`: SVG recorder diagram (thumb
  hole, holes 1–5, double holes 6–7, half-covered as half-filled), size prop, highlighted state
- [X] T052 [US2] Implement `src/ui/Fingering/FingeringPanel.tsx`: one diagram per note positioned at
  `tickToX(startTick)`, shrinking diagrams (min size) and switching to hover-only display when
  neighbours would overlap at the current zoom (spec edge case)
- [X] T053 [P] [US2] Implement alternates tooltip in `src/ui/Fingering/AlternatesTooltip.tsx`
  (hover or tap shows alternate diagrams with translated labels; informational only, FR-011a)
- [X] T054 [US2] Implement cross-panel selection and hover in `SheetPanel.tsx` and
  `FingeringPanel.tsx` (click selects the note via store; hover sets `hoverNoteId`; all three
  panels highlight selected/hovered note, FR-013)
- [X] T055 [US2] Implement panel visibility toggles in `src/ui/Toolbar/PanelToggles.tsx` and persist
  panel sizes/visibility to preferences (`panels` field) in `src/ui/Layout/PanelLayout.tsx` (FR-014)

**Checkpoint**: US1 + US2 together form the MVP — all P1 tests pass.

---

## Phase 5: User Story 3 — Play back the melody (Priority: P2)

**Goal**: Play/pause with tempo, one shared playhead across panels, ruler seek, playing-note highlight.

**Independent Test**: Four quarter notes at 60 BPM sound one per second and the playhead reaches
each note in all panels as it sounds (spec US3).

### Tests for User Story 3 (REQUIRED — write first, ensure they FAIL) ⚠️

- [X] T056 [P] [US3] Write `tests/unit/domain/schedule.test.ts`: `ticksToSeconds(480, 60) === 1`,
  `secondsToTicks` inverse, `toSchedule(m, fromTick)` drops notes ending before `fromTick` and
  trims a note in progress; tempo bounds 30–240
- [X] T057 [P] [US3] Write `tests/component/Playback.test.tsx` with a mocked `src/audio/player.ts`:
  Play/Pause button and Space toggle status `stopped → playing → paused → playing`; end of melody
  → `stopped` with position 0; clicking the ruler seeks; editing a note or the tempo while playing
  calls `reschedule` with the updated melody
- [X] T058 [P] [US3] Write `tests/unit/audio/playheadSync.test.ts` with a mocked Tone clock and output
  latency: for a 60 BPM quarter-note melody, the `positionTicks` reported each frame stays within
  50 ms (converted at the tempo) of the audible position, and `playingNoteId` switches within 50 ms
  of each scheduled note start (SC-003)
- [X] T059 [P] [US3] Write `tests/e2e/us3-playback.spec.ts` implementing quickstart.md scenario 3
  (assert playhead position and playing-note highlight over time; audio output not asserted)

### Implementation for User Story 3

- [X] T060 [US3] Implement `src/domain/schedule.ts` to make T056 pass
- [X] T061 [US3] Implement `src/audio/player.ts`: Tone.js Transport at melody tempo, recorder-like
  voice (`Tone.Synth` triangle/sine mix, ~20 ms attack, light vibrato, filtered-noise breath layer),
  `play(fromTick)`, `pause()`, `seek(tick)`, `reschedule(melody)` for edits during playback,
  `Tone.start()` on first Play (autoplay policy), `onUnavailable` callback
- [X] T062 [US3] Implement playhead sync in `src/audio/playheadSync.ts`: requestAnimationFrame loop
  reading `Transport.seconds` minus output latency, converting to ticks, and writing
  `playback.positionTicks` and `playingNoteId` into the store; stops on melody end (playback state
  machine in data-model.md)
- [X] T063 [US3] Wire live updates in `src/audio/playheadSync.ts`: while `playback.status` is
  `playing`, subscribe to melody changes and call `player.reschedule(melody)` from the current
  position; on `tempoBpm` change update `Transport.bpm` while keeping the current tick position
  (spec edge case "editing during playback", US3 scenario 4)
- [X] T064 [P] [US3] Implement `src/ui/Layout/Playhead.tsx`: one absolutely positioned vertical line
  across all visible panels in an overlay layer (no re-render of note layers), auto-scrolling the
  shared axis to keep it visible (FR-016)
- [X] T065 [P] [US3] Implement `src/ui/Layout/TimeRuler.tsx`: bar/beat numbers above the timeline;
  click seeks (FR-016)
- [X] T066 [US3] Implement `src/ui/Toolbar/TransportControls.tsx`: Play/Pause toggle (Space),
  tempo number input + slider 30–240 BPM dispatching `setTempo` (FR-017), Home → start; disabled
  with explanation when the melody is empty; `audio.unavailable` message; every control keyboard-reachable
  with an accessible name in both languages
- [X] T067 [US3] Highlight the playing note in `NoteRect.tsx`, `StaffRenderer.tsx` and
  `FingeringDiagram.tsx` from `playback.playingNoteId` (FR-018)

**Checkpoint**: US3 works on top of US1/US2.

---

## Phase 6: User Story 4 — Auto-save and melody library (Priority: P2)

**Goal**: Every change auto-saved; library to create/open/rename/duplicate/delete; file export/import.

**Independent Test**: Edit a melody, reload without saving; it reopens identical (spec US4).

### Tests for User Story 4 (REQUIRED — write first, ensure they FAIL) ⚠️

- [X] T068 [P] [US4] Write `tests/unit/domain/serialization.property.test.ts` (fast-check):
  `parseMelodyFile(serialize(m))` equals `{ ok: true, melody: m }` for any valid melody (SC-006)
- [X] T069 [P] [US4] Write `tests/unit/domain/serialization.test.ts`: errors `notJson`,
  `wrongFormat` (format ≠ `"recorder-composer"`), `newerVersion` (formatVersion > 1), `invalid`
  (schema violations: title > 120 chars, tempo outside 30–240, pitch outside 72–98, start/duration
  not multiples of 60, duration < 60, more than 5000 notes) and invariant violations (overlap,
  duplicate ids); the example in `contracts/melody-file.schema.json` parses
- [X] T070 [P] [US4] Write `tests/unit/persistence/autosave.test.ts` with fake timers and
  `fake-indexeddb`: change → write within 500 ms debounce; `visibilitychange`/`pagehide` flushes
  immediately; write failure sets `storage.status` to `unavailable` or `quota`
- [X] T071 [P] [US4] Write `tests/e2e/us4-library.spec.ts` implementing quickstart.md scenario 4

### Implementation for User Story 4

- [X] T072 [US4] Implement `src/domain/serialization.ts`: Zod schema mirroring
  `contracts/melody-file.schema.json` (format `"recorder-composer"`, `formatVersion: 1`, all field
  constraints), post-schema invariant check, `migrations` table (empty for v1), `serialize`,
  `parseMelodyFile` to make T068–T069 pass
- [X] T073 [US4] Implement `src/persistence/db.ts` with `idb`: database `recorder-composer`, store
  `melodies` keyed by `id` holding serialized documents; `list()` returning `{ id, title,
  updatedAt }`, `get`, `put`, `delete`
- [X] T074 [US4] Implement `src/persistence/autosave.ts`: subscribe to melody changes, debounce 500 ms,
  flush on `visibilitychange` (hidden) and `pagehide`, update `storage.status`, save
  `lastMelodyId` in preferences (FR-019) to make T070 pass
- [X] T075 [US4] Load on startup in `src/bootstrap.ts` (composition root
  called from `src/main.tsx`): open `lastMelodyId` if present, else
  most recent, else create a new melody; history starts empty (session-only)
- [X] T076 [US4] Implement `src/ui/Library/LibraryPanel.tsx`: list sorted by `updatedAt`, New, Open,
  Rename (title 1–120 chars after trim), Duplicate, Delete with `library.confirmDelete`
  confirmation; opening another melody stops playback; no unsaved-changes prompts (FR-021)
- [X] T077 [US4] Implement export/import in `src/ui/Library/FileActions.tsx`: export downloads
  `<title>.rcm.json` (also for an empty melody: a valid file with zero notes); import accepts `.rcm.json`/`.json`, assigns a fresh id, opens it, and shows
  `import.notJson` / `import.wrongFormat` / `import.newerVersion` / `import.invalid` on failure
  leaving the current melody untouched (FR-020)
- [X] T078 [P] [US4] Implement `src/ui/StorageBanner.tsx`: persistent warning for
  `storage.unavailable` / `storage.quota` with an Export shortcut

**Checkpoint**: US4 works; work survives reloads.

---

## Phase 7: User Story 5 — Print sheet music (Priority: P3)

**Goal**: Print sheet music only, or sheet music with fingerings, in a wrapped page layout.

**Independent Test**: Print preview of a 3-bar melody in both modes shows the correct content and no
controls (spec US5).

### Tests for User Story 5 (REQUIRED — write first, ensure they FAIL) ⚠️

- [X] T079 [P] [US5] Write `tests/unit/domain/printLayout.test.ts` for the pure function
  `layoutPrintSystems(notation, pageWidth)`: whole bars only per system, spacing by note value,
  every system starts with clef + key signature, the first also with time signature, and no system
  is wider than `pageWidth`
- [X] T080 [P] [US5] Write `tests/e2e/us5-print.spec.ts`: open print view in both modes and assert
  DOM (title, systems, one fingering diagram per note in fingering mode, toolbar hidden under
  `emulateMedia({ media: 'print' })`); with fixture `tests/fixtures/print-32-bars.rcm.json` (created
  in this task) at A4 and Letter, no system overflows the page content width and no system is split
  across a page break (SC-008)

### Implementation for User Story 5

- [X] T081 [US5] Implement `src/domain/printLayout.ts` (`layoutPrintSystems`) to make T079 pass
- [X] T082 [US5] Implement `src/ui/Print/PrintView.tsx` reusing `StaffRenderer` with the print layout,
  title header, optional `FingeringDiagram` row aligned under each note
- [X] T083 [P] [US5] Add print styles in `src/ui/Print/print.css` (`@page` A4/Letter margins, hide
  app chrome, page breaks between systems only, SC-008)
- [X] T084 [US5] Add Print menu in `src/ui/Toolbar/PrintMenu.tsx` ("Print sheet music", "Print with
  fingerings") mounting `PrintView` then calling `window.print()`; disabled for an empty melody

---

## Phase 8: User Story 6 — Language and note naming (Priority: P3)

**Goal**: RU/EN interface and independent solfège/letter naming, persisted.

**Independent Test**: Switch each setting; all labels and note names change and persist (spec US6).

### Tests for User Story 6 (REQUIRED — write first, ensure they FAIL) ⚠️

- [X] T085 [P] [US6] Write `tests/e2e/us6-language.spec.ts` implementing quickstart.md scenario 6
  (Russian labels and до¹…ре³; letters in Russian C¹…D³; English C4…D6; persists after reload)

### Implementation for User Story 6

- [X] T086 [US6] Implement `src/ui/Toolbar/LanguageSwitch.tsx` (RU/EN) and
  `src/ui/Toolbar/NamingSwitch.tsx` (do re mi / C D E) updating preferences and i18next; octave
  system follows language (FR-024–FR-026); every control keyboard-reachable
  with an accessible name in both languages
- [X] T087 [US6] Review all Russian translations in `src/i18n/ru.json` for wording quality and
  correct Russian plural forms where counts are shown (key parity is already enforced by T013
  since Phase 2)
- [X] T088 [US6] Ensure all note-name displays (Keyboard labels, tooltips, transpose dialog lists,
  print) call `formatNoteName` with current `noteNaming` and language octave system; set
  `<html lang>` on language change

---

## Phase 9: User Story 7 — Change key and transpose (Priority: P3)

**Goal**: Choose a key (signature + spelling) and transpose without ever losing notes.

**Independent Test**: C major melody transposed to G major: same interval for all notes, one sharp,
range respected (spec US7).

### Tests for User Story 7 (REQUIRED — write first, ensure they FAIL) ⚠️

- [X] T089 [P] [US7] Write `tests/unit/domain/transpose.test.ts`: `setKey` changes key only, pitches
  unchanged; `previewTranspose` lists out-of-range note ids and `octaveUpOk` / `octaveDownOk`;
  `transpose` rejects with `outOfRange` if any affected note would leave 72–98, applies to a
  selection only when ids given, sets `targetKey` when provided (FR-027, FR-028)
- [X] T090 [P] [US7] Write `tests/e2e/us7-transpose.spec.ts` implementing quickstart.md scenario 7

### Implementation for User Story 7

- [X] T091 [US7] Implement `setKey`, `previewTranspose`, `transpose` in `src/domain/commands.ts` to
  make T089 pass
- [X] T092 [P] [US7] Implement `src/ui/Toolbar/KeySelect.tsx` listing only the allowed keys (major
  C G D A E F B♭ E♭ A♭; minor A E B F♯ C♯ D G C F) with translated names; every control keyboard-reachable
  with an accessible name in both languages
- [X] T093 [US7] Implement `src/ui/Transpose/TransposeDialog.tsx`: target key or ± semitones, whole
  melody or selection, live preview; when out of range show `transpose.outOfRange` listing affected
  notes (via `formatNoteName`) and offer octave up / octave down (when ok) or cancel

---

## Phase 10: User Story 8 — Export as MIDI (Priority: P4, optional)

**Goal**: Download a standard MIDI file matching the melody.

**Independent Test**: Exported file opened elsewhere matches pitches, lengths and tempo (spec US8).

### Tests for User Story 8 (REQUIRED — write first, ensure they FAIL) ⚠️

- [X] T094 [P] [US8] Write `tests/unit/domain/midi.test.ts`: parse `toMidiBytes(m)` back with
  `@tonejs/midi`; PPQ 480, one track, program 74, tempo, time signature and key signature meta
  events, note pitches/ticks/durations equal the melody
- [X] T095 [P] [US8] Write `tests/e2e/us8-midi.spec.ts`: with a 4-note melody click "Export MIDI",
  assert a `<title>.mid` download, parse it with `@tonejs/midi` and compare note count, pitches,
  durations and tempo with the melody; with an empty melody the button is disabled

### Implementation for User Story 8

- [X] T096 [US8] Implement `src/domain/midi.ts` (`toMidiBytes`) to make T094 pass (uses `@tonejs/midi`)
- [X] T097 [US8] Add "Export MIDI" to `src/ui/Library/FileActions.tsx` downloading `<title>.mid`;
  disabled for an empty melody with the hint `export.emptyMidi` (add en/ru strings)

---

## Phase 11: Polish & Cross-Cutting Concerns

- [X] T098 [P] Create fixtures `tests/fixtures/twinkle.rcm.json` and `tests/fixtures/long-500.rcm.json`
  (500 valid notes) generated by `scripts/make-fixtures.ts`
- [X] T099 Performance pass with `long-500.rcm.json`: measure edit → all panels updated < 100 ms
  (SC-002) and playhead drift < 50 ms (SC-003); add `tests/e2e/perf.spec.ts` asserting edit latency
  via `performance.mark`
- [X] T100 [P] Accessibility pass: accessible names for all toolbar controls in both languages,
  keyboard reachability, focus styles, `aria-label`s on SVG notes; add `@axe-core/playwright` check
  in `tests/e2e/a11y.spec.ts`
- [X] T101 [P] Light/dark theme tokens in `src/ui/styles/global.css` and contrast check of pitch
  colors and staff
- [ ] T102 [P] (Optional) Offline caching via `vite-plugin-pwa` service worker in `vite.config.ts`
- [X] T103 Update `README.md` (features, commands, file format link) and run every scenario in
  `specs/001-recorder-composer/quickstart.md`; fix discrepancies
- [X] T104 Final `npm run check` and `npm run test:e2e` across chromium, firefox, webkit; verify the
  production JS bundle in `dist/` is ≤ 400 KB gzip excluding the font (plan Performance Goals)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → user stories.
- **US1 (Phase 3)** is required by every other story (they need notes to exist).
- **US2 (Phase 4)** depends on US1. US1 + US2 = MVP.
- **US3, US4** depend on US1 only (US3 uses US2 panels for highlight if present; T067 touches US2
  files, so run it after US2).
- **US5** depends on US2 (reuses `StaffRenderer`, `FingeringDiagram`).
- **US6** depends on Foundational naming (T017); can start after US1.
- **US7** depends on US1; best after US2 so key signatures are visible.
- **US8** depends on US1 only.
- **Polish** after all desired stories.

### Story completion graph

```text
Setup → Foundational → US1 ─┬─> US2 ─┬─> US5
                            │        └─> US7
                            ├─> US3 (T067 after US2)
                            ├─> US4
                            ├─> US6
                            └─> US8
                                        → Polish
```

### Within each story

- Tests first; confirm they fail.
- Domain (`src/domain`) before state, state before UI.
- Commit after each task or logical group; `npm run check` green at each checkpoint.

### Parallel Opportunities

- Setup: T004–T007, T009–T010.
- Foundational: T011–T014 (tests), then T018–T020 alongside T016–T017.
- US1 tests T023–T027 all parallel; UI T031, T032, T037, T038 parallel after T030.
- US2 tests T040–T043 parallel; T048, T051, T053 parallel.
- After US1, US3 / US4 / US6 / US8 can proceed in parallel (separate files, except shared
  files: `src/domain/commands.ts` is extended by T091 after T028; `FileActions.tsx` by T097 after
  T077; `src/audio/playheadSync.ts` is written by T062 then T063).

---

## Parallel Example: User Story 1

```text
# Tests together (all must fail first):
T023 tests/unit/domain/commands.test.ts
T024 tests/unit/domain/commands.property.test.ts
T025 tests/unit/domain/history.test.ts
T026 tests/component/Timeline.test.tsx
T027 tests/e2e/us1-compose.spec.ts

# After T028–T030, UI pieces together:
T031 src/ui/Timeline/Keyboard.tsx
T032 src/ui/Timeline/Grid.tsx
T037 src/ui/Toolbar/EditControls.tsx
T038 src/ui/Toolbar/EditHint.tsx
```

## Parallel Example: User Story 2

```text
T040 tests/unit/domain/notation.test.ts
T041 tests/unit/domain/fingering.test.ts
T042 tests/unit/domain/fingering.snapshot.test.ts
T043 tests/e2e/us2-views.spec.ts
# then
T048 src/ui/Sheet/glyphs.ts
T051 src/ui/Fingering/FingeringDiagram.tsx
T053 src/ui/Fingering/AlternatesTooltip.tsx
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Phase 1 Setup → Phase 2 Foundational.
2. Phase 3 US1 → validate (compose with invariants).
3. Phase 4 US2 → validate (staff + fingerings in sync). **Stop and demo: this is the MVP.**

### Incremental Delivery

1. MVP (US1 + US2).
2. + US3 playback and US4 auto-save → practice-ready release.
3. + US6 language, US5 print, US7 transpose.
4. + US8 MIDI (optional), then Polish.

### Notes

- [P] = different files, no dependency on incomplete tasks.
- Never weaken an invariant test to make it pass; fix the command instead.
- The fingering table (T045) is the highest-risk content task: review every entry against the Yamaha
  baroque soprano chart (the only source) before T042's snapshot is accepted.
