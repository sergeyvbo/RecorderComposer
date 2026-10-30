# Data Model: Recorder Composer

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md) | **Date**: 2026-10-29

Units (R8): time in integer ticks, PPQ = 480; pitch as MIDI number at sounding pitch.

## Persisted entities

### Melody

| Field | Type | Rules |
|-------|------|-------|
| `id` | string (UUID v4) | unique, immutable |
| `title` | string | 1–120 chars after trim; default localized "Untitled melody" |
| `tempoBpm` | integer | 30–240 (FR-017); default 100 |
| `timeSignature` | `{ beats: 2\|3\|4\|6, beatUnit: 4\|8 }` | allowed: 2/4, 3/4, 4/4, 6/8 (FR-009); default 4/4 |
| `key` | `Key` | default C major |
| `notes` | `Note[]` | sorted by `start`; invariants below |
| `createdAt` | ISO-8601 string | set on create |
| `updatedAt` | ISO-8601 string | set on every persisted change |

**Invariants** (enforced by every domain command, verified by property tests — SC-005):

1. Range: `72 ≤ note.pitch ≤ 98` for every note (FR-005).
2. Monophony: for consecutive notes `a`, `b` sorted by start, `a.start + a.duration ≤ b.start`
   (touching is allowed) (FR-006).
3. `note.start ≥ 0`, `note.duration ≥ 60` (one thirty-second, the finest grid step).
4. `note.start` and `note.duration` are multiples of 60 ticks (finest grid).
5. Note `id`s are unique within the melody.

### Note

| Field | Type | Rules |
|-------|------|-------|
| `id` | string | unique within melody; stable across edits (selection, highlight) |
| `pitch` | integer | MIDI 72–98 (sounding) |
| `start` | integer ticks | ≥ 0, multiple of 60 |
| `duration` | integer ticks | ≥ 60, multiple of 60 |

Spelling (e.g. F♯ vs G♭) is **derived** from `key` and never stored (R8).

### Key

| Field | Type | Rules |
|-------|------|-------|
| `tonic` | pitch class name, e.g. `"C"`, `"F#"`, `"Bb"` | only keys with ≤ 4 sharps/flats (FR-027) |
| `mode` | `"major" \| "minor"` | |

Derived: `fifths` (−4…+4), key-signature accidentals, preferred spelling per pitch class.
Allowed set: major C G D A E F B♭ E♭ A♭; minor A E B F♯ C♯ D G C F.

### Preferences (localStorage, key `rc.prefs`, versioned)

| Field | Type | Default |
|-------|------|---------|
| `version` | integer | 1 |
| `language` | `"ru" \| "en"` | from browser (ru → ru, else en) |
| `noteNaming` | `"letter" \| "solfege"` | `letter` for en, `solfege` for ru |
| `panels` | `{ timeline, sheet, fingering: { visible: boolean, size: number } }` | all visible |
| `snapTicks` | `480 \| 240 \| 120 \| 60` | 120 (sixteenth) |
| `defaultNoteTicks` | integer | 480 (quarter) |
| `pxPerTick` | number | fits ~4 bars of 4/4 in the default viewport |
| `lastMelodyId` | string \| null | null |

Octave system is **not** a preference; it follows `language` (FR-025a).

## Reference data (bundled, read-only)

### Fingering

```text
HoleState   = "open" | "closed" | "half"
Fingering   = { thumb: HoleState,                      // "half" = pinched thumb
                holes: [h1, h2, h3, h4, h5,            // single holes, top to bottom
                        h6: DoubleHole, h7: DoubleHole] }
DoubleHole  = { left: HoleState, right: HoleState }     // the two lowest double holes
FingeringEntry = { pitch: 72..98, standard: Fingering,
                   alternates: { fingering: Fingering, labelKey: string }[] }
```

- Exactly one entry for each MIDI pitch 72–98 (27 entries); `standard` is required (FR-011).
- `labelKey` is an i18n key (e.g. `fingering.alt.trill`) — no literal strings (Principle IV).
- Alternates are display-only (FR-011a): never referenced from `Melody`; only those listed on the
  Yamaha baroque soprano chart are included (`alternates: []` otherwise).

### Pitch-class colors

Fixed table of 12 colors (one per pitch class) used by the timeline (FR-008); chosen for contrast in
light and dark themes and distinguishable for common color-vision deficiencies (pair with note-name
label on the rectangle when width allows).

## UI state (not persisted with the melody)

| Slice | Fields |
|-------|--------|
| `selection` | `Set<noteId>`, `hoverNoteId \| null`, box-selection rect |
| `view` | `pxPerTick`, `scrollTick`, panel visibility/sizes (mirrors Preferences) |
| `playback` | `status: "stopped" \| "playing" \| "paused"`, `positionTicks`, `playingNoteId \| null` |
| `history` | `past: Melody[]`, `future: Melody[]` (cap 200), session only |
| `storage` | `status: "ok" \| "saving" \| "unavailable" \| "quota"`, last saved time |
| `library` | list of `{ id, title, updatedAt }` |

## State transitions

### Playback

```text
stopped --play--> playing --pause--> paused --play--> playing
playing --end of melody--> stopped (position reset to 0)
any --seek(t)--> same status, position = t
any --open other melody--> stopped
```

### Auto-save

```text
idle --melody changed--> pending (debounce 500 ms) --write ok--> idle
pending --page hidden/closed--> flush --> idle
write fails --> error ("unavailable" | "quota"), banner shown; retried on next change
```

### Import

```text
file chosen --> parse JSON --> check format id --> formatVersion < current: migrate
            --> formatVersion > current: reject ("made by a newer version")
            --> validate (schema + invariants) --> ok: new library entry with fresh id, opened
            --> any failure: error message, current melody untouched
```

## Derived models (pure functions, no storage)

- **NotationModel** (`layoutNotation(melody)`): bars → events
  `{ kind: "note"|"rest", noteId?, writtenPitch?, staffStep?, accidental?, value, dots, tieToNext,
  beamGroup, startTick }`. Rules: split at bar lines with ties; decompose non-representable lengths
  into tied values aligned to beats; fill gaps with rests; apply key signature and per-bar accidental
  memory.
- **FingeringRow** (`fingeringRow(melody)`): one item per note `{ noteId, startTick, entry }`.
- **TransposePreview** (`previewTranspose(melody, semitones, selection?)`): `{ ok, outOfRange:
  noteId[], octaveUpOk, octaveDownOk }` (FR-028).
