# Implementation Plan: Note Articulations (Legato, Staccato, Tenuto)

**Branch**: `002-note-articulations` | **Date**: 2026-10-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-note-articulations/spec.md`

## Summary

This feature adds staccato and tenuto note marks and legato slurs to the existing melody model.

- **Storage**: each note gets two optional fields, `mark` and `slurNext`. Slurs are derived from
  chains of `slurNext` links, and one reconciliation rule keeps them well-formed after every edit.
- **Editing**: new domain commands set marks and legato. They are reachable from three toolbar
  toggles and the `S`, `T`, `L` and `Shift+L` keys.
- **Display**: the custom staff renderer draws SMuFL articulation glyphs and slur curves on screen
  and in print. The timeline shows small markers.
- **Sound and export**: the domain playback schedule gains sounding length, tonguing and legato
  connection, which the Tone.js player maps to its calls. MIDI export shortens staccato notes.
- **File format**: version 2, with a trivial migration from v1.
- **Refusals**: every refused command, old or new, shows a short message in the existing edit hint
  (FR-020).

Decisions are in [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.x (`strict`, `exactOptionalPropertyTypes`), React 18, Vite 5.
Unchanged from 001.

**Primary Dependencies**: no new dependencies. Bravura already contains the articulation glyphs.
`Tone.Synth.setNote` is used for slurred notes.

**Storage**: IndexedDB and `.rcm.json` files move to melody-file **v2**. v1 is migrated on read.

**Testing**: Vitest and fast-check (domain), React Testing Library (toolbar, renderer),
Playwright (e2e, 3 browsers, axe).

**Target Platform**: desktop Chrome/Edge, Firefox and Safari, as in 001.

**Project Type**: client-side web application (single project).

**Performance Goals**:
- an articulation edit is reflected in all panels in under 100 ms for 500 notes (SC-003);
- `reconcileSlurs` is O(n) per edit;
- the playhead drift target of under 50 ms still holds.

**Constraints**:
- monophony and range invariants are untouched;
- plain notes sound and export exactly as before;
- old files keep loading;
- no hard-coded UI text.

**Scale/Scope**:
- 3 articulations;
- about 4 domain modules touched and 1 added;
- about 5 UI components touched and 1 added;
- 1 format version bump.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Gates from `.specify/memory/constitution.md` (v1.0.0):

- [x] ✅ **I. Single Melody Model**
  - Articulation lives on `Note` in the one melody model, and slurs are derived from it.
  - All changes go through `dispatch`, so each is one undo/redo step.
  - Timeline, staff, print and playback all read the same data.
- [x] ✅ **II. Instrument Fidelity**
  - Range and monophony are unaffected, because marks never change pitch or timing.
  - Recorder notation follows standard engraving: marks opposite the stem and slurs over runs.
  - Fingerings are unchanged.
- [x] ✅ **III. Test-First Domain Logic**
  - `articulation.ts`, reconciliation, notation, schedule and MIDI rules are pure domain code,
    written test-first.
  - A property test covers random edit sequences.
  - There is a component test for the toolbar and an e2e test for the primary flow.
- [x] ✅ **IV. Bilingual by Design**
  - The new labels, tooltips and accessible strings are in both `ru` and `en`. The existing
    key-parity test and lint rule apply.
- [x] ✅ **V. Open, Versioned Data**
  - `formatVersion` goes to 2, with the schema contract and a v1 → v2 migration in `MIGRATIONS`.
  - v3 is rejected with `newerVersion`.
  - The round-trip property test is extended to marks and slurs.
- [x] ✅ **VI. Client-Side Simplicity**
  - No backend and no new dependency.
  - Scope is limited to the three requested articulations.

**Result**: PASS. There are no violations.

**Post-design re-check (after Phase 1)**: PASS.
- The slur representation (`slurNext` links rather than a separate slur list) was chosen
  specifically to keep a single source of truth (I).
- The format bump follows V.
- The playback rules sit in the domain (III); the player only maps fields to Tone calls.

## Project Structure

### Documentation (this feature)

```text
specs/002-note-articulations/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions R1–R10
├── data-model.md        # Phase 1 — Note fields, slur derivation, reconciliation, schedule
├── quickstart.md        # Phase 1 — validation scenarios
├── contracts/
│   ├── melody-file.schema.json   # file/storage format v2
│   ├── domain-api.md             # domain changes
│   └── ui-contract.md            # toolbar, shortcuts, panels, i18n keys
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── types.ts             # + NoteMark, Note.mark?, Note.slurNext?
│   ├── articulation.ts      # NEW: setMark, setLegato, deriveSlurs, articulationState, reconcileSlurs
│   ├── commands.ts          # call reconcileSlurs; ClipboardNote + mark/slurNext
│   ├── invariants.ts        # + no slurNext on last note
│   ├── serialization.ts     # v2 schema, MIGRATIONS[1]
│   ├── notation.ts          # event.mark, model.slurs
│   ├── printLayout.ts       # per-system slur pieces
│   ├── schedule.ts          # soundSec, tongued, connected, velocity
│   └── midi.ts              # staccato half length
├── state/store.ts           # copy keeps marks and internal slur links; copy/cut/paste/undo/redo report refusals
├── audio/player.ts          # slurred notes: setNote, no breath; velocity; soundSec
├── i18n/{en,ru}.json        # articulation.* keys
└── ui/
    ├── Toolbar/ArticulationControls.tsx   # NEW
    ├── useShortcuts.ts      # S, T, L, Shift+L; report emptySelection instead of ignoring keys
    ├── Toolbar/EditHint.tsx # show every refusal reason
    ├── Timeline/NoteRect.tsx, TimelinePanel.tsx   # markers, slur arcs, aria-label
    ├── Sheet/glyphs.ts, StaffRenderer.tsx         # artic glyphs, slur paths
    └── Print/PrintView.tsx  # pass system slur pieces, reserve vertical room

tests/
├── unit/domain/             # articulation(.property), serialization, notation, schedule, midi
├── component/               # ArticulationControls, StaffRenderer
├── fixtures/                # existing v1 fixtures reused for migration tests
└── e2e/us9-articulations.spec.ts
```

**Structure Decision**: this is the existing single-project layout from 001. All new domain logic
goes in one new module, `src/domain/articulation.ts`; the other files are extended in place.

## Complexity Tracking

No constitution violations; nothing to justify.
