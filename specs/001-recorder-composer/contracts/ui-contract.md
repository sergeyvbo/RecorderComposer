# Contract: User Interface

User-facing interface of the single-page app. All labels come from i18n keys (Principle IV); key names
below are the canonical ones used by tests.

## Layout

```text
┌ Toolbar ───────────────────────────────────────────────────────────────────────┐
│ ▶/❚❚  Tempo [100] BPM  Snap [1/16]  Key [C major]  Time [4/4]  Transpose…        │
│ Library ▾  Import  Export ▾ (file · MIDI)  Print ▾ (sheet · sheet+fingering)      │
│ Panels: [Timeline] [Sheet] [Fingering]   Lang [RU|EN]   Names [do re mi|C D E]   │
├ Time ruler (click = seek) ───────────────────────────────────────────────────────┤
│ Panel 1: keyboard (fixed left column) + timeline grid          ┊ playhead line    │
├──────── resizable divider ──────────────────────────────────────┊────────────────┤
│ Panel 2: staff, time-aligned (clef/key/time sticky at left)     ┊                │
├──────── resizable divider ──────────────────────────────────────┊────────────────┤
│ Panel 3: fingering diagrams under each note                     ┊                │
└ Status: auto-save state · storage warning banner when unavailable ───────────────┘
```

All three panels share one horizontal scroll position and zoom (FR-013a); the playhead is one line
across them.

## Pointer interactions (timeline)

| Gesture | Effect |
|---------|--------|
| Click empty cell | Add note, default length, at snapped time (FR-002) |
| Drag note body | Move (time and pitch), clamped (FR-006) |
| Drag note left/right edge (6 px handle) | Resize, clamped |
| Click note | Select only it; Ctrl/Cmd-click toggles; Shift-click extends |
| Drag on empty area | Box select |
| Double-click note | Delete |
| Ctrl/Cmd + wheel / pinch | Horizontal zoom |
| Wheel / Shift+wheel | Vertical / horizontal scroll |
| Hover fingering diagram | Tooltip with alternates (FR-011a) |
| Click note in staff or fingering panel | Selects that note (FR-013) |

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| Space | Play / Pause |
| Home | Move playhead to start |
| Delete / Backspace | Delete selection |
| Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z (Ctrl+Y) | Undo / Redo |
| Ctrl/Cmd+A, C, X, V | Select all, copy, cut, paste at playhead |
| ↑ / ↓ | Selection pitch ±1 semitone (Shift: ±1 octave) |
| ← / → | Selection time ± one grid step |
| Esc | Clear selection |

All toolbar actions are buttons/selects with accessible names in both languages (constitution
quality constraints).

## Messages (i18n keys)

| Key | When |
|-----|------|
| `edit.clampedToNeighbor` | Move/resize stopped at a neighbour (transient hint) |
| `edit.shortenedToFit` | Moved/added/pasted note shortened to fit a free gap |
| `edit.noRoom` | Add/paste refused, no free gap |
| `edit.clampedToRange` | Pitch limited to C5–D7 |
| `transpose.outOfRange` | Lists affected notes, offers octave up/down or cancel (FR-028) |
| `storage.unavailable`, `storage.quota` | Persistent banner (edge case) |
| `import.notJson`, `import.wrongFormat`, `import.newerVersion`, `import.invalid` | Import errors |
| `library.confirmDelete` | Confirm melody deletion (FR-021) |
| `audio.unavailable` | Audio cannot start |
| `export.emptyMidi` | Export MIDI disabled for an empty melody |

## Files

| Action | File |
|--------|------|
| Export | `<title>.rcm.json` per [melody-file.schema.json](./melody-file.schema.json) |
| Export MIDI (optional) | `<title>.mid` |
| Import | accepts `.rcm.json` / `.json` |
| Print | browser print dialog; A4/Letter |
