# Research: Note Articulations (Legato, Staccato, Tenuto)

**Feature**: [spec.md](./spec.md) | **Date**: 2026-10-30

This feature adds no unknowns at the stack level. It reuses the stack of
[001](../001-recorder-composer/research.md) and adds **no new dependencies**. The decisions below
settle how the spec maps onto the existing code.

## R1. How notes store articulation

- **Decision**: Two optional fields on `Note`:
  - `mark?: 'staccato' | 'tenuto'` (absent means a plain note);
  - `slurNext?: true` (absent means the note is not slurred into the next one).

  Default values are never written, so a melody without articulations is stored exactly as today
  except for the version number.
- **Rationale**:
  - The spec allows a note to be both slurred and staccato or tenuto, so the two fields must be
    independent.
  - A per-note "slurred to the next note" link keeps slurs inside the single melody model
    (Principle I). No separate slur list needs to be kept in sync with note ids.
  - Optional fields that are omitted when empty keep `load(save(m))` deep-equal, which the existing
    round-trip property test requires. They also fit `exactOptionalPropertyTypes`.
- **Alternatives considered**:
  - A separate `slurs: {from, to}[]` array: every move, delete and paste would have to repair
    references by id. This is more state to keep consistent and no easier to render.
  - A single `articulation` enum including `legato`: this cannot express a slur combined with
    staccato or tenuto (portato), and it treats legato as a mark on one note, which the spec
    rejects.

## R2. Keeping slurs well-formed after edits (FR-012)

- **Decision**: One pure function, `reconcileSlurs(prev, next)`, runs at the end of every
  note-changing command. Slur state is computed by comparing the melody before and after the edit.
  - A note keeps `slurNext` only if its new successor (by start time) was already inside the same
    slurred run after that note in `prev`.
  - The last note never keeps `slurNext`.
- **Rationale**: One rule covers every case in the spec:
  - deleting a note inside a slur closes the slur up, because the new successor was later in the
    same run;
  - a note dragged away leaves its slur, because its new successor was not in its run;
  - pasting into a slur splits it;
  - transposing, and moving a whole slurred group together, change nothing.

  Commands stay simple and a property test can check the rule over random edits.
- **Alternatives considered**: Repairing slurs separately in each command duplicates logic in six
  places and is easy to get wrong.

## R3. The legato command (FR-005, FR-007)

- **Decision**: Two commands.
  - `setLegato(m, ids, true)` sorts the selection by start time.
    - For two or more notes, it sets `slurNext` on every selected note except the last selected one.
    - For one note, it sets `slurNext` on that note, so it slurs to the next note.
    - It fails with `invalidArgs` when nothing would change, for example a single selected note that
      is the melody's last note.
  - `setLegato(m, ids, false)` clears `slurNext` on all selected notes and on the note just before
    the first selected one.

  The toolbar button shows `aria-pressed=true` when applying legato would change nothing, and
  clicking it then removes legato. Keyboard: `L` applies legato, `Shift+L` removes it.
- **Rationale**: Applying legato to a run that touches an existing slur merges with it
  automatically, because the links simply chain. Removing legato guarantees that no slur passes
  through a selected note.
- **Alternatives considered**: A single toggle that guesses intent from a mixed selection is
  ambiguous. Explicit apply and remove, with the toggle state derived from "apply is a no-op", is
  predictable.

## R4. Staccato and tenuto commands

- **Decision**: `setMark(m, ids, mark | null)` sets or clears the mark on every selected note.
  - It fails with `emptySelection` when no listed note exists.
  - It fails with `invalidArgs` when nothing changes.

  The Staccato and Tenuto buttons are toggles (`aria-pressed`), and they show a mixed state when the
  selection has different marks. Clicking an active button clears the mark. Keyboard: `S` toggles
  staccato, `T` toggles tenuto. Neither single letter is used today, and typing in inputs is
  already ignored by `useShortcuts`.
- **Rationale**: This matches FR-004 and FR-007, and every change is one undo step because it is one
  `dispatch`.

## R5. Engraving: marks and slurs

- **Decision**: Marks and slurs are drawn by the custom SVG renderer with Bravura SMuFL glyphs.
  - **Marks**: `articStaccatoAbove` U+E4A2, `articStaccatoBelow` U+E4A3, `articTenutoAbove` U+E4A4,
    `articTenutoBelow` U+E4A5. The mark goes on the notehead side opposite the stem, one staff space
    from the head, and is moved out of the staff onto the next space when it would sit on a line.
    For a note split into tied pieces, the mark goes on the first piece only.
  - **Slurs**: a filled crescent path, two quadratic curves thicker in the middle. It runs from the
    first piece of the first note to the last piece of the last note of each run. It is placed on
    the notehead side when every stem in the run points the same way, and above the staff
    otherwise.
  - **Print line breaks**: a slur that crosses a system break is drawn as two open halves, one to the
    end of the first system and one from the start of the next.
  - **Notation model**: `layoutNotation` gains `slurs: { fromNoteId, toNoteId }[]` and a `mark`
    field on note events. The renderer resolves positions from those.
- **Rationale**: This follows standard engraving practice (Gould, *Behind Bars*) and uses glyphs from
  the font already bundled, with no new dependency. Slurs over ties come out as an outer curve
  because the slur endpoints are the run's outer pieces.
- **Alternatives considered**: An engraving library such as VexFlow was already rejected in 001 R4
  because of the shared time axis.

## R6. Timeline markers (FR-009)

- **Decision**: Inside `NoteRect`, at the right end, a small dot for staccato or a short horizontal
  bar for tenuto, in the label colour. Slurred notes are joined by a thin arc above the rectangles,
  from the top centre of one note to the top centre of the next. Marks use `aria-hidden`; the note's
  `aria-label` gets the translated articulation (FR-019).
- **Rationale**: The markers stay readable at the default zoom without covering the note name, which
  sits at the left.

## R7. Sound (FR-013, FR-014)

- **Decision**: The domain function `toSchedule` returns these extra fields per note:
  - `soundSec`: the sounding length;
  - `tongued`: false when the note is reached by a slur;
  - `connected`: true when the note is slurred from the previous note and that note sounds right up
    to this one's start;
  - `velocity`.

  The sounding rules:

  | Note | Sounding length | Attack |
  |------|-----------------|--------|
  | plain | written − 15 ms (unchanged) | velocity 0.85, breath chiff |
  | staccato | max(50% of written, 60 ms), capped at written − 15 ms | as plain or slurred |
  | tenuto | full written length | velocity 1.0 (slightly stronger) |
  | slurred, connected | previous note held, no release; pitch changes with `synth.setNote` at the start | no breath chiff |
  | slurred after a rest or a staccato note | new attack | no breath chiff |

  The playhead and the highlighted note keep using written values; `noteAt` and the playhead code
  are not changed.
- **Rationale**: Putting the rules in the domain makes them testable without audio (Principle III).
  The player only maps the fields to Tone calls. `Tone.Synth.setNote` changes pitch without
  re-triggering the envelope, which is how slurring sounds on a recorder.
- **Alternatives considered**: Re-triggering every note and only removing the gap leaves an audible
  re-attack, so the slurred version would be hard to tell apart (SC-004).

## R8. File format v2 (FR-015, FR-016)

- **Decision**: `CURRENT_FORMAT_VERSION = 2`. The schema adds the two optional note fields. The
  `MIGRATIONS[1]` step only changes the version number, because v1 notes are valid v2 plain notes.
  - `serialize` always writes version 2.
  - Melodies stored in IndexedDB as v1 are migrated when read; they are written as v2 on the next
    auto-save.
  - The localStorage rescue copy uses the same `serialize` and `parseMelodyFile`, so it needs no
    change.
  - A new invariant in `checkInvariants`: the last note has no `slurNext`.
- **Rationale**: Principle V requires a version increase whenever the schema changes. Older app
  builds reject v2 files with the existing `newerVersion` message instead of failing on unknown
  keys.

## R9. Clipboard and other edits (FR-011)

- **Decision**: `ClipboardNote` gains `mark?` and `slurNext?`.
  - Copying keeps the slur links between the copied notes only. The last copied note's link is
    cleared.
  - `pasteNotes` creates notes with these fields, and then `reconcileSlurs` runs. Notes created by
    a paste are exempt from the "successor was in the same run" rule.
  - Move, resize and transpose spread `...n`, so marks are kept automatically.
  - Duplicating a melody copies the whole document.

## R10. MIDI export (FR-018)

- **Decision**: Staccato notes are written with `durationTicks = max(30, floor(duration / 2))`.
  Every other note keeps its full `duration`, as today. Velocity is unchanged.
- **Rationale**: Standard MIDI has no slur event. Full length with no gap is the closest match, and
  it is already what the export writes for plain notes.
