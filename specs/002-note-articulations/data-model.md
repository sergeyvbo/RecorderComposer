# Data Model: Note Articulations

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md) | **Date**: 2026-10-30

This is a change to the [001 data model](../001-recorder-composer/data-model.md). Everything not
listed here is unchanged.

## Note (extended)

| Field | Type | Rules |
|-------|------|-------|
| `id`, `pitch`, `start`, `duration` | — | unchanged |
| `mark` | `'staccato' \| 'tenuto'`, optional | absent means a plain note (FR-001); never written as `null` or `"none"` |
| `slurNext` | `true`, optional | absent means not slurred into the next note (FR-002); never written as `false` |

**New invariant 6**: the last note in start order has no `slurNext` (FR-003). It is checked by
`checkInvariants`, so a file that breaks it is rejected as `invalid`.

The existing invariants 1–5 (range, monophony, start ≥ 0, grid, unique ids) are unchanged.
Articulation never affects pitch or timing.

## Slur (derived, never stored)

A **slurred run** is a maximal sequence of notes `n[i] … n[j]`, in start order, where `j > i`,
`n[k].slurNext === true` for every `i ≤ k < j`, and `n[j].slurNext` is absent. It is drawn as one
curve from `n[i]` to `n[j]`.

- Rests between notes of a run are allowed.
- Runs never overlap and never nest, because each note has at most one outgoing link.

```text
deriveSlurs(m): { fromNoteId: string; toNoteId: string; noteIds: string[] }[]
```

## Selection state (derived, UI only)

```text
articulationState(m, ids) = {
  mark:        'staccato' | 'tenuto' | 'none' | 'mixed' | null,   // null = empty selection
  legatoApplied: boolean,   // setLegato(m, ids, true) would change nothing
  canApplyLegato: boolean,  // false for an empty selection, or for the melody's last note alone;
                            // true for a selection with gaps, so the attempt can report notConsecutive
  canRemoveLegato: boolean, // some link would be cleared
}
```

## State transitions

These commands are domain commands. Each `dispatch` is one undo step.

| Command | Effect | Fails with |
|---------|--------|------------|
| `setMark(m, ids, 'staccato' \| 'tenuto' \| null)` | sets or clears `mark` on every listed note | `emptySelection` if no id exists; `invalidArgs` if nothing changes |
| `setLegato(m, ids, true)` | sorts the listed notes by start. With ≥ 2 notes, sets `slurNext` on all but the last listed note. With 1 note, sets it on that note | `emptySelection`; `notConsecutive` if a note that is not listed lies between the first and the last listed note in start order (rests are not gaps); `invalidArgs` if nothing changes, e.g. a single note that is the last note of the melody |
| `setLegato(m, ids, false)` | clears `slurNext` on the listed notes and on the note just before the first listed note | `emptySelection`; `invalidArgs` if nothing changes |

### Slur reconciliation

`reconcileSlurs(prev, next, freshIds)` runs after every command that adds, moves, resizes,
deletes or pastes notes. For each note `n` in `next` that has `slurNext`, let `s` be its successor
in `next`:

1. There is no successor → clear the link.
2. `n` is fresh (just pasted) → keep the link only if `s` is also fresh.
3. `n` existed before → keep the link only if `s` existed in `prev` and came after `n` in the same
   slurred run of `prev`.

Consequences, as listed in the spec's edge cases:

| Edit | Result |
|------|--------|
| Delete a note inside a run | The run closes up, because the successor was later in the same run. |
| Delete or move away the last note of a run | The run ends at the previous note. A run left with one note disappears, because rule 3 fails for it. |
| Drag a note out of the run | The moved note's link is cleared. The run continues around the gap. |
| Paste or add a note between two slurred notes | The earlier note's successor is now the fresh note, so its link is cleared and the run splits. |
| Move a whole run together, transpose, change mark | No slur changes. |

`RejectReason` gains `'notConsecutive'`. The UI shows it as a short transient message, like the
existing edit refusals.

## Clipboard (extended)

```text
ClipboardNote = { pitch, offset, duration, mark?, slurNext? }
```

When copying, `slurNext` is kept only between copied notes that are consecutive in the melody.
The last copied note never has `slurNext`.

## Playback schedule (extended, domain)

```text
ScheduledNote = {
  noteId, pitch, startSec,
  durationSec,   // written length: drives playhead and highlight (FR-014)
  soundSec,      // sounding length (FR-013), ≤ durationSec
  tongued,       // false when reached by a slur → no breath chiff
  connected,     // slurred from the previous note and the previous note sounds up to this start → no release/re-attack
  velocity,      // 0.85 plain/staccato, 1.0 tenuto
}
```

These are the rules from research R7. When playback starts in the middle of a slurred note, that
first note is scheduled with `tongued: true` and `connected: false`.

## Melody file (v2)

The new contract is [contracts/melody-file.schema.json](./contracts/melody-file.schema.json),
`formatVersion: 2`.

- The v1 → v2 migration only bumps the version; every note becomes plain and unslurred.
- `serialize` always writes v2.
- Documents stored in IndexedDB and the localStorage rescue copy use the same format and the same
  migration.
