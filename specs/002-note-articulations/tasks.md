---

description: "Task list for Note Articulations (Legato, Staccato, Tenuto)"
---

# Tasks: Note Articulations (Legato, Staccato, Tenuto)

**Input**: Design documents from `/specs/002-note-articulations/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Constitution Principle III requires tests for this feature:
- domain tests are written first and must fail before the implementation;
- each story's primary UI flow gets a component or e2e test.

**Organization**: Tasks are grouped by user story. Paths are relative to the repository root and
follow the existing single-project layout.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1–US4 from spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: The project and toolchain already exist (001). Only the shared resources are added.

- [X] T001 [P] Add the i18n keys from contracts/ui-contract.md § i18n keys (`articulation.group`, `articulation.staccato`, `articulation.tenuto`, `articulation.legato`, `articulation.a11y.staccato`, `articulation.a11y.tenuto`, `articulation.a11y.slurred`, `edit.notConsecutive`, `edit.clipboardEmpty`, `edit.nothingToUndo`, `edit.nothingToRedo`) with the exact en/ru texts to src/i18n/en.json and src/i18n/ru.json. Then run the existing key-parity test.
- [X] T002 [P] Add the SMuFL code points `articStaccatoAbove` U+E4A2, `articStaccatoBelow` U+E4A3, `articTenutoAbove` U+E4A4 and `articTenutoBelow` U+E4A5 to `GLYPH` in src/ui/Sheet/glyphs.ts. Also add `articGlyph(mark: NoteMark, above: boolean)`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the note fields, the invariant, file format v2 and a message for every refused command. Every story relies on these.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Add `export type NoteMark = 'staccato' | 'tenuto'` and the optional fields `mark?: NoteMark` and `slurNext?: true` to `Note` in src/domain/types.ts. Document them: absent means plain or not slurred; the fields are never written as `null`, `'none'` or `false` (data-model.md § Note). Add `'notConsecutive'` to `RejectReason`.
- [X] T004 [P] Write failing tests in tests/unit/domain/invariants.test.ts (new). `checkInvariants` must report `note <id>: slurNext on last note` when the last note in start order has `slurNext`. It must accept `slurNext` on any other note and accept `mark` on any note.
- [X] T005 [P] Write failing tests in tests/unit/domain/serialization.test.ts:
  - `serialize` writes `formatVersion: 2`.
  - A v2 document with `mark: 'staccato' | 'tenuto'` and `slurNext: true` parses unchanged.
  - Each fixture in tests/fixtures (twinkle, long-500, print-32-bars; all v1) parses with `migratedFrom: 1` and has no `mark` or `slurNext`.
  - `formatVersion: 3` returns `newerVersion`.
  - `mark: 'accent'`, `slurNext: false` and `mark: null` are each rejected as `invalid`.
- [X] T006 [P] Extend the melody arbitrary in tests/unit/domain/arbitraries.ts to generate optional `mark` and `slurNext`, never on the last note. tests/unit/domain/serialization.property.test.ts must then check that `parseMelodyFile(serialize(m))` deep-equals `m` including marks and slurs.
- [X] T007 Implement the invariant `slurNext on last note` in src/domain/invariants.ts so that T004 passes.
- [X] T008 Implement file format v2 in src/domain/serialization.ts so that T005 and T006 pass:
  - `CURRENT_FORMAT_VERSION = 2`;
  - `noteSchema` gains `mark: z.enum(['staccato','tenuto']).optional()` and `slurNext: z.literal(true).optional()`, and stays `.strict()`;
  - `fileSchemaV2` with `formatVersion: z.literal(2)`;
  - type `MelodyFileV2`;
  - `MIGRATIONS[1] = (doc) => ({ ...doc, formatVersion: 2 })`;
  - `serialize` returns v2.

  Update every importer of `MelodyFileV1` (grep `src/` and `tests/`).
- [X] T009 Point the schema references at the v2 contract:
  - the test "accepts the example in contracts/melody-file.schema.json" in tests/unit/domain/serialization.test.ts reads `specs/002-note-articulations/contracts/melody-file.schema.json`, and its v2 example (with `slurNext` and marks) must parse unchanged;
  - keep a second case that the 001 v1 example parses with `migratedFrom: 1`;
  - update the `Mirrors …` comment at the top of src/domain/serialization.ts;
  - replace `MelodyFileV1` with `MelodyFileV2` in src/persistence/db.ts (the import, the `put` signature and the `getAll` cast).

- [X] T010 Show a message for every refused command (FR-020, contracts/ui-contract.md § Refusal messages):
  - first write failing tests in tests/component/EditHint.test.tsx (new), using tests/component/renderApp.tsx:
    - each `RejectReason` (`noRoom`, `outOfRange`, `emptySelection`, `invalidArgs`, `notConsecutive`) shows its `edit.<reason>` text in the `role="status"` hint;
    - the message clears after about 2.5 s, and the same refusal twice in a row shows it again;
    - `Delete`, an arrow key or Ctrl/Cmd+C/X with nothing selected shows `edit.emptySelection`;
    - Ctrl/Cmd+V with an empty clipboard shows `edit.clipboardEmpty`;
    - Ctrl/Cmd+Z or Ctrl/Cmd+Y with nothing to undo or redo shows `edit.nothingToUndo` or `edit.nothingToRedo`;
  - in src/ui/Toolbar/EditHint.tsx, show every refusal reason; keep the `SHOWN` filter for adjustments only;
  - in src/state/store.ts, widen `lastEdit.reason` to `NoticeReason = RejectReason | 'clipboardEmpty' | 'nothingToUndo' | 'nothingToRedo'`, and make `copy`, `cut`, `paste`, `undo` and `redo` record their refusal there (bumping `seq`) instead of doing nothing;
  - in src/ui/useShortcuts.ts, keys that act on the selection report `emptySelection` instead of returning silently.

**Checkpoint**: `npm run check` is green. Existing melodies load as v1 and are saved as v2. Every refused command shows a message.

---

## Phase 3: User Story 1 - Mark notes as staccato or tenuto (Priority: P1) 🎯 MVP

**Goal**: The user selects notes and makes them staccato, tenuto or plain. The marks appear on the
staff and the timeline, take one undo step each and survive a reload.

**Independent Test**:
1. Add 4 notes, mark 2 staccato (`S`) and 1 tenuto (`T`).
2. Check the dots and the line on the staff and the markers on the timeline.
3. Undo, redo, reload; the marks are kept each time (quickstart scenarios 1–2).

### Tests for User Story 1 ⚠️ (write first, must fail)

- [X] T011 [P] [US1] Write failing tests for `setMark` in tests/unit/domain/articulation.test.ts (new):
  - it sets `mark` on all listed ids, and `null` deletes the key;
  - unlisted notes are unchanged;
  - staccato → tenuto replaces the mark;
  - it fails with `emptySelection` for no existing ids, and with `invalidArgs` when nothing changes;
  - `slurNext` is never touched.
- [X] T012 [P] [US1] Write failing tests for `articulationState(m, ids).mark` in tests/unit/domain/articulation.test.ts: `null` for an empty selection; `'none'`, `'staccato'` or `'tenuto'` when all selected notes agree; `'mixed'` otherwise.
- [X] T013 [P] [US1] Write failing tests in tests/unit/domain/notation.test.ts:
  - `layoutNotation` sets `event.mark` from the note;
  - for a note split into tied pieces (for example a half note starting on beat 2 of 4/4), only the first piece has `mark`;
  - rests never have `mark`.
- [X] T014 [P] [US1] Write failing tests in tests/unit/domain/commands.test.ts: `moveNotes`, `resizeNote`, `transpose` and `pasteNotes` keep `mark`. The `ClipboardNote` built by the store's `copy` carries `mark`, and so does the clipboard after the store's `cut`.
- [X] T015 [P] [US1] Write a failing component test in tests/component/ArticulationControls.test.tsx (new), using tests/component/renderApp.tsx:
  - the Staccato and Tenuto buttons are disabled with no selection;
  - `aria-pressed` is `true`, `mixed` or `false` to match the selection;
  - clicking sets the mark, and clicking again clears it;
  - keys `S` and `T` toggle the mark;
  - a single Undo reverts a multi-note change;
  - pressing `S` while typing in the title input does nothing;
  - pressing `S` with nothing selected shows the `edit.emptySelection` text.

### Implementation for User Story 1

- [X] T016 [US1] Create src/domain/articulation.ts with `setMark(m, ids, mark: NoteMark | null): EditResult` and `articulationState(m, ids)`, with only the `mark` field for now. Use the `done`/`fail` result shapes from src/domain/commands.ts; export them from commands.ts if needed. T011 and T012 must pass.
- [X] T017 [US1] Extend `ClipboardNote` in src/domain/commands.ts with `mark?: NoteMark`, and make `pasteNotes` pass it to created notes. In src/state/store.ts, `copy` includes `mark` when present. T014 must pass.
- [X] T018 [US1] Add `mark?: NoteMark` to `NotationEvent` in src/domain/notation.ts and set it on the first piece of each note only. T013 must pass.
- [X] T019 [US1] Draw the marks in `StaffNotes` in src/ui/Sheet/StaffRenderer.tsx:
  - glyph from `articGlyph` on the side opposite the stem (`!p.up` means above);
  - one staff space from the notehead;
  - centred on the head;
  - moved to the next space when it would sit on a staff line;
  - drawn in the same fill as the note, so the selection, hover and playing colours apply.
- [X] T020 [US1] Increase the vertical room in `staffHeight` and `staffTop` in src/ui/Sheet/StaffRenderer.tsx by one staff space above and below, so that marks on extreme notes (C5 and D7 sounding) are not clipped on screen or in print.
- [X] T021 [P] [US1] Draw the timeline markers in src/ui/Timeline/NoteRect.tsx:
  - staccato: a dot at the right end of the rectangle;
  - tenuto: a short horizontal bar at the right end;
  - in `labelColor(pitchColor(pitch))`, `aria-hidden`;
  - drawn inside the note's group, underneath the end resize handle, with `pointerEvents="none"` so resizing still works.

  Also extend the note's `aria-label` with the translated `articulation.a11y.*` text. Pass the label from src/ui/Timeline/TimelinePanel.tsx.
- [X] T022 [US1] Create src/ui/Toolbar/ArticulationControls.tsx, a `toolbar-group` labelled `articulation.group` with Staccato and Tenuto toggle buttons (contracts/ui-contract.md § Toolbar):
  - `aria-pressed` comes from `articulationState(...).mark`;
  - each button dispatches `setMark`;
  - each shows its Bravura glyph and uses `articulation.staccato` or `articulation.tenuto` as its `aria-label` and `title`.

  Render it after `<EditControls />` in src/ui/App.tsx.
- [X] T023 [US1] Add the shortcuts `S` and `T` to src/ui/useShortcuts.ts: toggle the mark on the selection (set it if the state is not that mark, otherwise clear it). With nothing selected they report `emptySelection` (T010). They must not fire while typing or with Ctrl, Cmd or Alt held. T015 must pass.

**Checkpoint**: US1 works on its own, and `npm run check` is green.

---

## Phase 4: User Story 2 - Join notes with a legato slur (Priority: P1)

**Goal**: The user selects consecutive notes and applies or removes legato. One slur is drawn per
run. Slurs merge, split and survive edits as described in data-model.md.

**Independent Test**:
1. Add 5 notes and slur notes 2–4 (`L`): one slur, and none on notes 1 or 5.
2. Extend to 2–6 by slurring 4–6.
3. Remove legato from note 3 (`Shift+L`): the slur splits.
4. With the last note selected alone, Legato is disabled (quickstart scenarios 3–4).

### Tests for User Story 2 ⚠️ (write first, must fail)

- [X] T024 [P] [US2] Write failing tests for `setLegato` in tests/unit/domain/articulation.test.ts:
  - with 3 selected notes, the first 2 get `slurNext`;
  - with 1 note, that note gets `slurNext`;
  - with the last note alone, it fails with `invalidArgs`;
  - with notes 1 and 3 selected and note 2 not, it fails with `notConsecutive` and nothing changes;
  - with notes 1 and 2 selected and a rest between them, it succeeds (a rest is not a gap);
  - selecting 2–4 and then 4–6 gives one chain from 2 to 6;
  - removing on note 3 of a 2–5 run clears note 2 → 3 and note 3 → 4 and leaves 4 → 5;
  - it fails with `emptySelection` or `invalidArgs` when there is nothing to do;
  - `mark` is never touched.
- [X] T025 [P] [US2] Write failing tests for `deriveSlurs` and for `articulationState` (`legatoApplied`, `canApplyLegato`, `canRemoveLegato`) in tests/unit/domain/articulation.test.ts:
  - runs come in start order, and `noteIds` include the end note;
  - a rest between notes of a run is allowed;
  - with no links there are no slurs;
  - `canApplyLegato` is `true` for a selection with gaps (so the attempt reports `notConsecutive`) and `false` for the last note alone.
- [X] T026 [P] [US2] Write failing tests for `reconcileSlurs(prev, next, freshIds)` in tests/unit/domain/articulation.test.ts, one per row of data-model.md § Slur reconciliation:
  - deleting a middle note closes the run up;
  - deleting the last note of a run ends the run at the previous note;
  - a run left with one note disappears;
  - dragging a note out of the run clears its link;
  - adding or pasting a note between slurred notes splits the run;
  - a pasted slurred pair stays slurred;
  - moving a whole run, or transposing, changes nothing;
  - the last note never keeps `slurNext`.
- [X] T027 [P] [US2] Write a failing property test in tests/unit/domain/articulation.property.test.ts (new), using fast-check and the existing arbitraries:
  - for random sequences of addNote, moveNotes, resizeNote, deleteNotes, pasteNotes, setMark and setLegato, every result passes `checkInvariants`;
  - every `slurNext` link from `n` to its successor `s` after a step satisfies one of: `s` came after `n` in the same slurred run before the step (an unchanged link, or a run that closed up after a deletion); the link was created by `setLegato`; or `n` and `s` are both fresh (contracts/domain-api.md § Invariants).
- [X] T028 [P] [US2] Write failing tests in tests/unit/domain/notation.test.ts:
  - `layoutNotation(m).slurs` equals the `{ fromNoteId, toNoteId }` of `deriveSlurs`;
  - tests/unit/domain/printLayout.test.ts: a slur whose ends fall in different systems gives per-system pieces with `null` at the open end (contracts/domain-api.md § Notation).
- [X] T029 [P] [US2] Write failing component tests in tests/component/ArticulationControls.test.tsx:
  - the Legato button applies and removes legato;
  - `aria-pressed` follows `legatoApplied`;
  - the button is disabled for the last note alone; when it is also pressed there, it has both `disabled` and `aria-pressed="true"`;
  - `L` and `Shift+L` work;
  - one Undo step per command;
  - with notes 1 and 3 selected, `L` changes nothing and the edit hint (`role="status"`) shows the `edit.notConsecutive` text.

  Also in tests/component/Timeline.test.tsx: slurred notes render a connecting arc (`data-testid="slur-arc"`).

### Implementation for User Story 2

- [X] T030 [US2] Implement `setLegato(m, ids, on)`, `deriveSlurs(m)`, the legato fields of `articulationState`, and `reconcileSlurs(prev, next, freshIds = [])` in src/domain/articulation.ts, following data-model.md § State transitions and § Slur reconciliation. Each function must be O(n). T024–T026 must pass.
- [X] T031 [US2] Make `addNote` (fresh = the new id), `moveNotes`, `resizeNote`, `deleteNotes` and `pasteNotes` (fresh = all created ids) in src/domain/commands.ts return `reconcileSlurs(m, result, fresh)`, by applying it in one helper used before `done(...)`. Then make T027 pass.
- [X] T032 [US2] Extend `ClipboardNote` with `slurNext?: true` in src/domain/commands.ts and pass it on in `pasteNotes`. In `copy` in src/state/store.ts, keep `slurNext` only where the next copied note is also the note's successor in the melody, and never on the last copied note.
- [X] T033 [US2] Add `slurs: { fromNoteId: string; toNoteId: string }[]` to `NotationModel` in src/domain/notation.ts, built from `deriveSlurs`. In src/domain/printLayout.ts, give each `PrintSystem` its slur pieces `{ fromNoteId: string | null; toNoteId: string | null }[]`, splitting slurs at system breaks. T028 must pass.
- [X] T034 [US2] Draw slurs in src/ui/Sheet/StaffRenderer.tsx (research R5):
  - a new `slurs` prop on `StaffNotes`, with a filled crescent `<path>` made of two quadratic curves (about 0.1 staff space thick at the ends and 0.25 in the middle);
  - it runs from the first tied piece of the first note to the last tied piece of the last note;
  - it goes below the noteheads when every stem in the run points up, and above the staff otherwise;
  - its ends are lifted clear of the articulation marks;
  - an open (`null`) end runs to the system edge.

  Pass the slurs from src/ui/Sheet/SheetPanel.tsx (model slurs) and src/ui/Print/PrintView.tsx (per-system pieces).
- [X] T035 [P] [US2] Draw a thin arc for each consecutive linked pair in src/ui/Timeline/TimelinePanel.tsx, from the top centre of one note rectangle to the top centre of the next (`data-testid="slur-arc"`, `aria-hidden`, `pointerEvents="none"`). Add `articulation.a11y.slurred` to the note `aria-label` in src/ui/Timeline/NoteRect.tsx.
- [X] T036 [US2] Add the Legato toggle button to src/ui/Toolbar/ArticulationControls.tsx:
  - `aria-pressed` comes from `legatoApplied`;
  - it is disabled unless `canApplyLegato || canRemoveLegato`;
  - clicking calls `setLegato(ids, !legatoApplied)`;
  - it shows a slur-arc symbol.

  Add `L` (apply) and `Shift+L` (remove) to src/ui/useShortcuts.ts. Add a `.toggle[aria-pressed='true']:disabled` rule to src/ui/styles/global.css that differs from the enabled pressed style: no accent fill, an accent outline and reduced opacity (contracts/ui-contract.md § Toolbar). T029 must pass.

**Checkpoint**: US1 and US2 work together. Slurs and marks combine (a staccato note inside a slur
shows both).

---

## Phase 5: User Story 3 - Hear the articulations on playback (Priority: P2)

**Goal**: Staccato, tenuto and slurred notes sound different. Plain notes sound unchanged. The
playhead follows written values.

**Independent Test**: Play four equal notes plain, then staccato, then tenuto, then slurred, and
hear four distinct versions. The highlight lasts the written length (quickstart scenario 5).

### Tests for User Story 3 ⚠️ (write first, must fail)

- [X] T037 [P] [US3] Write failing tests for `toSchedule` in tests/unit/domain/schedule.test.ts (research R7, data-model.md § Playback schedule):
  - a plain note has `soundSec = durationSec − 0.015`, `tongued: true`, `connected: false`, `velocity: 0.85`;
  - a staccato note has `soundSec = min(durationSec − 0.015, max(0.5 × durationSec, 0.06))`;
  - a tenuto note has `soundSec = durationSec` and `velocity: 1.0`;
  - a slurred-into note right after a full-length note has `tongued: false` and `connected: true`, and the previous note's `soundSec = durationSec`;
  - a slurred-into note after a rest or after a staccato note has `tongued: false` and `connected: false`;
  - starting mid-note (`fromTick` inside a slurred note) gives `tongued: true` and `connected: false`;
  - `durationSec` and `noteAt` are unchanged for every articulation.

### Implementation for User Story 3

- [X] T038 [US3] Extend `ScheduledNote` and `toSchedule` in src/domain/schedule.ts with `soundSec`, `tongued`, `connected` and `velocity`. Move the 15 ms gap constant from src/audio/player.ts into the domain as `ARTICULATION_GAP_SEC = 0.015`. T037 must pass.
- [X] T039 [US3] Update `schedule` in src/audio/player.ts:
  - not connected: `synth.triggerAttack(hz, time, velocity)`, then `synth.triggerRelease(time + soundSec)` unless the next note is connected; the breath chiff only when `tongued`;
  - connected: `synth.setNote(hz, time)` with no release or re-attack.

  Keep the `Math.max(0.03, …)` floor for the sound length, and keep the pause, seek and reschedule behaviour.
- [X] T040 [US3] Extend tests/component/Playback.test.tsx (it mocks the player and the schedule): a slurred melody produces `setNote` calls with no extra `triggerAttack`, and the playing-note highlight still switches at written note boundaries.

**Checkpoint**: Playback of all articulations works; the existing playback e2e (us3) still passes.

---

## Phase 6: User Story 4 - Keep articulations in files, print and MIDI (Priority: P3)

**Goal**: Articulations survive export and import, appear in print and shorten staccato notes in
MIDI. Old files open as plain notes.

**Independent Test**:
1. Export and re-import a melody with every articulation: it is identical.
2. Import a v1 fixture: its notes are plain.
3. In print preview, the marks and slurs match the screen.
4. In the MIDI export, staccato notes are half length (quickstart scenario 6).

### Tests for User Story 4 ⚠️ (write first, must fail)

- [X] T041 [P] [US4] Write failing tests in tests/unit/domain/midi.test.ts:
  - a staccato note of 480 ticks is exported with `durationTicks` 240, and one of 60 ticks with 30 (`max(30, floor(duration / 2))`);
  - tenuto, slurred and plain notes keep their full `duration`;
  - velocity is unchanged.
- [X] T042 [P] [US4] Write a failing e2e test in tests/e2e/us9-articulations.spec.ts (new; reuse tests/e2e/helpers.ts), covering quickstart scenarios 1, 3 and 6.1:
  - mark and slur via shortcuts, and check the staff (`data-testid` hooks for marks and slurs) and the timeline;
  - reload, and the marks are kept;
  - export `.rcm.json`, import it into a new melody, and it is identical;
  - cut and paste a slurred, marked pair: it keeps its marks and slur;
  - duplicate the melody in the library: the copy has the same marks and slurs;
  - select notes 1 and 3 and press `L`: the refusal message appears and disappears again;
  - an axe check passes with the articulation toolbar visible.

### Implementation for User Story 4

- [X] T043 [US4] Implement the staccato length in `toMidiBytes` in src/domain/midi.ts. T041 must pass.
- [X] T044 [US4] Add `data-testid="artic-mark"` and `data-testid="slur"` to the mark and slur elements in src/ui/Sheet/StaffRenderer.tsx. Check in src/ui/Print/PrintView.tsx that print mode (with and without fingerings) passes the system slur pieces and that the fingering row clears the extra staff space from T020. T042 must pass.
- [X] T045 [P] [US4] Extend tests/e2e/us5-print.spec.ts: a melody with a slur that crosses a printed system break shows two open slur halves, and marks are present in both print modes.

**Checkpoint**: All four stories are complete.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T046 [P] Update README.md: add articulations (staccato, tenuto, legato slurs; S/T/L shortcuts) to Features, and note that the file format is `formatVersion: 2`, with a link to specs/002-note-articulations/contracts/melody-file.schema.json.
- [X] T047 [P] Check edit-to-display time with tests/e2e/perf.spec.ts on tests/fixtures/long-500.rcm.json with every note articulated and slurred in runs of 4. An articulation command must reflect in all panels in under 100 ms (SC-003).
- [ ] T048 Run `npm run check`, `npm run test:e2e` (chromium, firefox, webkit) and `npm run build`. Fix any failures, then walk through every quickstart.md scenario once manually. During the walkthrough:
  - do the SC-004 listening check by ear: 10 trials, each playing the four-note phrase as plain, staccato, tenuto or slurred in random order and naming the version. Record the score in specs/002-note-articulations/checklists/requirements.md, and tune the R7 values if fewer than 9 of 10 are right;
  - check that a pressed and disabled Legato button looks different from an enabled pressed one.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: T010 needs the message texts from T001; the rest of Phase 2 has no dependency on Phase 1. It blocks every story, because the note fields, the v2 format and the refusal messages are needed everywhere.
- **US1 (Phase 3)**: depends on Phase 2.
- **US2 (Phase 4)**: depends on Phase 2. It shares src/domain/articulation.ts, ArticulationControls.tsx, useShortcuts.ts and StaffRenderer.tsx with US1, so do it after US1 or coordinate on those files.
- **US3 (Phase 5)**: depends on Phase 2. It reads `mark` (US1) and `slurNext` (US2) fields from the data only, so its tests can use hand-built melodies and it can run in parallel with US1 and US2.
- **US4 (Phase 6)**: the MIDI part (T041, T043) depends only on Phase 2. The e2e and print parts (T042, T044, T045) need US1 and US2.
- **Polish (Phase 7)**: after all stories.

### Within Each Story

Tests come first and must fail. Then domain, then notation and layout, then rendering, then
toolbar and shortcuts.

### Parallel Opportunities

- T001 and T002; T004, T005 and T006.
- US1: T011–T015 together; T021 alongside T019 and T020.
- US2: T024–T029 together; T035 alongside T034.
- US3 can proceed in parallel with US1 and US2. Its files are schedule.ts and player.ts.
- US4: T041 and T043 can start right after Phase 2.

## Parallel Example: User Story 1

```text
Task: "T011 setMark tests in tests/unit/domain/articulation.test.ts"
Task: "T013 notation mark tests in tests/unit/domain/notation.test.ts"
Task: "T014 clipboard/move keep mark tests in tests/unit/domain/commands.test.ts"
Task: "T015 ArticulationControls component test in tests/component/ArticulationControls.test.tsx"
```

## Parallel Example: User Story 2

```text
Task: "T026 reconcileSlurs tests in tests/unit/domain/articulation.test.ts"
Task: "T027 property test in tests/unit/domain/articulation.property.test.ts"
Task: "T028 slur model tests in tests/unit/domain/notation.test.ts + printLayout.test.ts"
```

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 and Phase 2: file format v2 ships first, which is harmless because every note is plain.
2. Phase 3 (US1): staccato and tenuto on the staff, timeline and toolbar, saved with the melody.
3. **Stop and validate**: quickstart scenarios 1–2.

### Incremental Delivery

1. US1, the MVP: single-note marks.
2. US2: slurs. All three requested articulations are then visible and editable.
3. US3: articulations become audible.
4. US4: MIDI, print verification and full e2e coverage.
5. Polish: README, performance check, full validation.
