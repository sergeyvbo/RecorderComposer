# Quickstart: Note Articulations

**Feature**: [spec.md](./spec.md) | **Contracts**: [domain-api](./contracts/domain-api.md),
[ui-contract](./contracts/ui-contract.md), [file schema v2](./contracts/melody-file.schema.json)

## Run

```sh
npm install
npm run dev              # http://localhost:5173
npm run check            # typecheck + lint + unit/property/component tests
npm run test:e2e         # Playwright (chromium, firefox, webkit)
```

## Validation scenarios

Each scenario maps to a user story in the spec. The e2e versions live in
`tests/e2e/us9-articulations.spec.ts`.

1. **Staccato and tenuto (US1)**
   1. Add four quarter notes.
   2. Select notes 1–2 and press `S`, then select note 3 and press `T`.
   3. Expected:
      - the staff shows dots on notes 1–2 and a line on note 3, opposite the stems;
      - the timeline shows matching markers;
      - Undo restores all four as plain notes in one step, and Redo brings the marks back;
      - after a reload, the marks are still there.
2. **Toggle and mixed state (US1)**
   1. Select notes 1–3. The Staccato button shows mixed.
   2. Click Staccato: all three become staccato.
   3. Click it again: all three become plain.
3. **Legato (US2)**
   1. Add five notes, select notes 2–4 and press `L`. Expected: one slur from note 2 to note 4.
   2. Select notes 4–5 and press `L`. Expected: the slur now spans notes 2–5.
   3. Select note 3 and press `Shift+L`. Expected: there is no slur through note 3; notes 4–5 stay
      slurred.
   4. Select only the last note. Expected: the Legato button is disabled.
4. **Slurs survive edits (FR-012)**
   1. Slur notes 1–3 and delete note 2. Expected: the slur covers notes 1–3 again (the old notes 1
      and 3).
   2. Drag note 3 far to the right. Expected: it leaves the slur.
   3. Copy a slurred pair and paste it elsewhere. Expected: the pasted pair is slurred.
5. **Playback (US3)**
   1. Play four equal notes, first plain, then all staccato, then all tenuto, then all slurred.
   2. Expected:
      - staccato is clearly detached;
      - slurred notes have no breath chiff and no gap after the first note;
      - plain notes sound as before;
      - the playhead highlight lasts the written length in every case.
6. **Files and print (US4)**
   1. Export a melody that uses all three articulations, then import it. Expected: it is identical.
   2. Import `tests/fixtures/twinkle.rcm.json` (a v1 file). Expected: it opens with plain notes.
   3. In print preview, with and without fingerings, the marks and slurs match the screen,
      including a slur that crosses a line break.
   4. Export MIDI. Expected: staccato notes are half length.

## Automated checks

| Area | Test |
|------|------|
| Commands, state, reconciliation | `tests/unit/domain/articulation.test.ts` (examples) and `articulation.property.test.ts` (random edit sequences keep invariants) |
| Serialization | `tests/unit/domain/serialization.test.ts`: v2 round-trip, v1 migration, v3 rejected |
| Notation | `tests/unit/domain/notation.test.ts`: `mark` on the first tied piece only; `slurs` list; print system splitting |
| Schedule | `tests/unit/domain/schedule.test.ts`: soundSec, tongued, connected and velocity per R7; written `durationSec` unchanged |
| MIDI | `tests/unit/domain/midi.test.ts`: staccato is half length |
| UI | `tests/component/ArticulationControls.test.tsx` (buttons, aria-pressed/mixed, shortcuts) and `StaffRenderer` snapshot with marks and slurs |
| E2E | `tests/e2e/us9-articulations.spec.ts`: scenarios 1, 3 and 6.1 plus axe checks |
