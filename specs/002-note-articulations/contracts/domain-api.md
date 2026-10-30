# Contract: Domain API changes (`src/domain`)

This is a change to [001 domain-api.md](../../001-recorder-composer/contracts/domain-api.md).
Everything not listed here is unchanged. The domain stays pure: no React, DOM or Tone.js
(Principle III). Types refer to [data-model.md](../data-model.md).

## Types (`domain/types.ts`)

```ts
type NoteMark = "staccato" | "tenuto";
interface Note { id; pitch; start; duration; mark?: NoteMark; slurNext?: true }
```

## Articulation commands (`domain/articulation.ts`)

| Function | Behavior (spec refs) |
|----------|----------------------|
| `setMark(m, ids, mark: NoteMark \| null)` | Sets or clears `mark` on the listed notes; `null` clears it. Fails with `emptySelection` or `invalidArgs` (no change) (FR-001, FR-004) |
| `setLegato(m, ids, on: boolean)` | `on`: with ≥ 2 notes, slurs each listed note into the next except the last listed; with 1 note, slurs it into the next note. `off`: clears links on the listed notes and the link into the first listed note. Fails with `emptySelection` or `invalidArgs` (no change) (FR-002, FR-003, FR-005) |
| `deriveSlurs(m)` | `{ fromNoteId, toNoteId, noteIds }[]` in start order (FR-003, FR-008) |
| `articulationState(m, ids)` | `{ mark, legatoApplied, canApplyLegato, canRemoveLegato }` for the toolbar (FR-007) |
| `reconcileSlurs(prev, next, freshIds?)` | Applies the rules in data-model.md § Slur reconciliation (FR-012) |

## Editing commands (`domain/commands.ts`)

- `addNote`, `moveNotes`, `resizeNote`, `deleteNotes` and `pasteNotes` call `reconcileSlurs` before
  they return. `addNote` and `pasteNotes` pass their new ids as `freshIds`.
- Moved, resized and transposed notes keep `mark` and `slurNext` (FR-011).
- `ClipboardNote` gains `mark?` and `slurNext?`. The store's `copy` keeps links only between copied
  notes that are consecutive in the melody, and clears the link on the last copied note.

## Invariants (`domain/invariants.ts`)

`checkInvariants` also reports `note <id>: slurNext on last note`.

**Property test**: for any random sequence of commands, every result satisfies all invariants, and
every `slurNext` link points to a note that was already linked to it before that step, or both
notes are fresh.

## Notation (`domain/notation.ts`)

- `NotationEvent` gains `mark?: NoteMark`. It is set only on the first piece of a note that is
  split by ties.
- `NotationModel` gains `slurs: { fromNoteId, toNoteId }[]` (from `deriveSlurs`).
- `layoutPrintSystems` passes slurs through. A slur whose ends fall in different systems is
  reported as `{ fromNoteId | null, toNoteId | null }` pieces per system, where `null` means an
  open end at the system edge.

## Serialization (`domain/serialization.ts`)

```ts
CURRENT_FORMAT_VERSION = 2
serialize(m): MelodyFileV2                  // contracts/melody-file.schema.json
MIGRATIONS[1] = (doc) => ({ ...doc, formatVersion: 2 })
```

**Contract tests**:

- `parseMelodyFile(serialize(m))` deep-equals `m` for any melody, including marks and slurs.
- Every v1 fixture in `tests/fixtures` parses with `migratedFrom: 1` and plain notes.
- `formatVersion: 3` is rejected with `newerVersion`.

## Playback schedule (`domain/schedule.ts`)

```ts
toSchedule(m, fromTick = 0): {
  noteId; pitch; startSec;
  durationSec;   // written (playhead/highlight)
  soundSec;      // sounding
  tongued; connected; velocity;
}[]
```

These are the rules from research R7: staccato is max(50%, 60 ms) capped at written − 15 ms;
tenuto is the full length at velocity 1.0; plain notes are unchanged. `noteAt` is unchanged and
still uses written values.

## MIDI (`domain/midi.ts`)

Staccato notes are written with `durationTicks = max(30, floor(duration / 2))`. All other notes are
unchanged (FR-018).
