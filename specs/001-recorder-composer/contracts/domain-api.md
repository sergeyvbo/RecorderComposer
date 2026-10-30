# Contract: Domain API (`src/domain`)

Framework-independent TypeScript (no React, no DOM, no Tone.js) — Principle III. Every function is
pure and deterministic; the UI and audio layers depend on this module, never the reverse. Types refer
to [data-model.md](../data-model.md).

## Result type

```ts
type EditResult =
  | { ok: true; melody: Melody; adjusted?: AdjustReason[] } // adjusted = clamped by range/overlap
  | { ok: false; reason: RejectReason };                   // melody unchanged
type AdjustReason = "clampedToRange" | "clampedToNeighbor" | "shortenedToFit";
type RejectReason = "noRoom" | "outOfRange" | "emptySelection" | "invalidArgs";
```

`adjusted` / `reason` are i18n-mapped by the UI to explain clamping (spec US1 scenario 4).

## Editing commands (`domain/commands.ts`)

All commands preserve the invariants in data-model.md and snap to `snapTicks` supplied by the caller.

| Function | Behavior (spec refs) |
|----------|----------------------|
| `addNote(m, { pitch, start, duration, snap })` | Insert at snapped start; if the slot is occupied → `noRoom`; if the free gap is shorter than `duration` → shortened to fit (≥ one grid step) else `noRoom` (FR-002, FR-006) |
| `moveNotes(m, ids, { dTicks, dPitch, snap, lastValid })` | Pitch delta clamped so every selected note stays in 72–98. Time: single note — placed at target if it fits a free gap (may jump over neighbours); if target start is in a free gap but overlaps the next note → shortened to fit (`shortenedToFit`, ≥ one grid step); if target start is inside another note → returns `lastValid` position (`clampedToNeighbor`). Multi-selection — moved as a unit, never shortened; placed only if all fit, else `lastValid`. Unselected notes never change (FR-004–006, edge case "selection never splits") |
| `resizeNote(m, id, { edge: "start"\|"end", toTick, snap })` | New edge clamped between neighbour boundary and min length of one grid step (FR-002, FR-006) |
| `deleteNotes(m, ids)` | Removes notes |
| `pasteNotes(m, clipboard, atTick, snap)` | Places copied notes relative to `atTick`; notes falling on occupied time are shortened to fit or the paste is rejected with `noRoom` |
| `setTempo(m, bpm)` / `setTimeSignature(m, ts)` / `setKey(m, key)` / `setTitle(m, title)` | Validated setters; `setKey` changes spelling only, never pitches |
| `previewTranspose(m, semitones, ids?)` | `{ ok, outOfRange: id[], octaveUpOk, octaveDownOk }` (FR-028) |
| `transpose(m, semitones, ids?, targetKey?)` | Applies only if every affected note stays in range, else `outOfRange`; when `targetKey` given also sets key |

## History (`domain/history.ts`)

```ts
createHistory(initial: Melody, cap = 200): History
apply(h, result: EditResult): History    // no-op entry when !ok
undo(h): History; redo(h): History; canUndo(h); canRedo(h)
```

## Notation (`domain/notation.ts`)

| Function | Output |
|----------|--------|
| `layoutNotation(m)` | `NotationModel` — bars, note/rest events, values, dots, ties, beams, accidentals, written pitch and staff step (FR-010) |
| `spell(pitch, key)` | `{ letter, accidental: -1\|0\|1, octave }` at written pitch |
| `keySignature(key)` | `{ fifths, accidentals: { letter, accidental }[] }` |

## Note naming (`domain/naming.ts`)

```ts
formatNoteName(pitch, {
  style: "letter" | "solfege",
  octaveSystem: "russian" | "scientific",   // from UI language (FR-025a)
  key,                                       // for spelling
  form?: "short" | "long",                   // "до¹" vs "до первой октавы" (long uses i18n)
}): string | { i18nKey: string; params: object }
```

Required examples (unit tests):

| pitch (sounding) | style / system | result |
|---|---|---|
| 72 | letter / scientific | `C4` |
| 72 | solfege / russian | `до¹` |
| 98 | letter / russian | `D³` |
| 78, key G major | letter / scientific | `F♯4` |
| 78, key F major | solfege / scientific | `sol♭4` |

Spelling rule for chromatic (out-of-key) notes: keys with sharps and C major / A minor spell with
sharps; keys with flats spell with flats. Exceptions (e.g. B♭ in C major) are not applied in v1.

## Fingering (`domain/fingering.ts`)

```ts
getFingering(pitch): FingeringEntry          // throws for out-of-range (cannot occur by invariants)
fingeringRow(m): { noteId; startTick; entry }[]
```

## Serialization (`domain/serialization.ts`)

```ts
serialize(m): MelodyFileV1                     // matches melody-file.schema.json
parseMelodyFile(json: unknown):
  | { ok: true; melody: Melody; migratedFrom?: number }
  | { ok: false; error: "notJson" | "wrongFormat" | "newerVersion" | "invalid"; details?: string }
```

Contract test: for any valid melody `m` (fast-check arbitrary), `parseMelodyFile(serialize(m))`
returns `{ ok: true, melody: m }` (SC-006).

## MIDI (`domain/midi.ts`, optional P4)

```ts
toMidiBytes(m): Uint8Array   // 1 track, PPQ 480, tempo, time sig, key sig, program 74
```

## Playback schedule (`domain/schedule.ts`)

```ts
toSchedule(m, fromTick = 0): { noteId; pitch; startSec; durationSec }[]  // uses tempoBpm
ticksToSeconds(ticks, bpm); secondsToTicks(sec, bpm)
```

The audio adapter (`src/audio`) consumes `toSchedule` and reports position in ticks back to the
shared playback slice.
