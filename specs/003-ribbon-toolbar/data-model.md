# Data Model: Ribbon Toolbar

This feature has no melody or file-format changes. All entities below are UI-layer data.

## RibbonTabId

`'home' | 'melody' | 'file' | 'view'`. The order is fixed: `RIBBON_TABS = ['home', 'melody', 'file', 'view']`.

## RibbonPrefs (persisted, part of `Preferences`)

| Field | Type | Default | Validation on load |
|-------|------|---------|--------------------|
| `tab` | `RibbonTabId` | `'home'` | not one of `RIBBON_TABS` → `'home'` |
| `collapsed` | `boolean` | `false` | not a boolean → `false` |

- `Preferences.version` stays `1`.
- A stored object without `ribbon`, or with a malformed one, loads with the defaults, field by field
  (see the existing `loadPreferences`).
- Written through `actions.setPrefs({ ribbon })`. The existing preference persistence saves it.

## CommandId

`paste | cut | copy | delete | undo | redo | playPause | toStart | staccato | tenuto | legato |
transpose | library | import | exportFile | exportMidi | printSheet | printWithFingering |
panelTimeline | panelSheet | panelFingering | zoomIn | zoomOut | collapseRibbon`

## FieldId

Value controls rendered with `RibbonField` rather than as buttons:

`tempo | key | timeSignature | snap | language | noteNaming`

## CommandDescriptor (derived; recomputed from state on render)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `CommandId` | |
| `label` | string (translated) | Visible label |
| `name` | string (translated) | Accessible name: the label, or the existing toolbar name where it differs (for example `articulation.staccato` "Staccato (S)" for the visible "Staccato"). Unchanged from today where the command existed |
| `icon` | icon component or `glyph` | A Lucide icon, or for staccato, tenuto and legato the existing musical-symbol face |
| `shortcut?` | `{ key: string; mod?: true; shift?: true }` | Display only. Formatted by `shortcutLabel()` as `Ctrl+Z`, or `⌘Z` on macOS. `key: 'wheel'` means the mouse wheel and formats as `Ctrl+wheel` / `⌘+wheel` (i18n `ribbon.key.wheel`) |
| `enabled` | `boolean` | |
| `pressed?` | `boolean \| 'mixed'` | Toggles only: panels, articulations |
| `reason?` | string (translated) | Tooltip second line: why the command is disabled (FR-008), or a warning such as `audio.unavailable` |
| `expanded?` | `boolean` | Collapse/pin command only (`aria-expanded`) |
| `run` | `() => void` | Calls existing store or controller actions. While the ribbon is collapsed, the ribbon wraps it to also close the popup |

### Enabling rules (new or moved)

| Command | Enabled when | Reason key when disabled |
|---------|--------------|--------------------------|
| cut, copy, delete | selection is not empty | `ribbon.reason.noSelection` |
| paste | clipboard is not empty | `ribbon.reason.clipboardEmpty` |
| undo / redo | history can undo / redo | `ribbon.reason.nothingToUndo` / `nothingToRedo` |
| playPause | as today: notes exist and audio is available | `playback.empty` / `audio.unavailable` (existing) |
| printSheet, printWithFingering, exportMidi | as today: melody not empty | `print.empty` / `export.emptyMidi` (existing) |
| staccato, tenuto, legato | as today (002 `articulationState`) | `ribbon.reason.noSelection`, or for legato `ribbon.reason.legatoUnavailable` |
| panel toggles | as today: not the last visible panel | `ribbon.reason.lastPanel` |
| zoomIn / zoomOut | as today: below max / above min zoom | none |

Paste runs `actions.paste(playback.positionTicks)`, which is identical to Ctrl+V: it inserts after the selected notes, or at the playhead with nothing selected, shifting later notes right (001 domain-api `pasteNotes`).

## RibbonLayout (static data, `layout.ts`)

```text
RibbonLayout = Tab[]
Tab   = { id: RibbonTabId; groups: Group[] }            // label: ribbon.tab.<id>
Group = { id: string; items: Item[] }                 // label: ribbon.group.<id>
Item  = { command: CommandId; size: 'large' | 'small' } | { field: FieldId }
```

The content is the table in [contracts/ui-contract.md](./contracts/ui-contract.md). An invariant,
enforced by a unit test: every `CommandId` and `FieldId`, apart from `collapseRibbon`, appears
exactly once in the layout.

## Fit state (derived, per visible tab)

```text
GroupState = 'full' | 'iconsOnly' | 'folded'
fitLevels(groups: { id; widths: Record<GroupState, number>; foldable: boolean }[], available: number)
  → Record<groupId, GroupState>
```

- **Order:**
  1. All groups start `full`.
  2. While the total width is greater than `available`, take the rightmost `full` group with a
     small item and make it `iconsOnly`.
  3. After that, take the rightmost foldable group that is not yet `folded` and make it `folded`.
  4. The first group is not foldable.
- **Result:**
  - The least compact assignment that fits.
  - If even the most compact state doesn't fit, the most compact state is returned. The ribbon
    row then wraps, rather than scrolling the page.
- **Property:** `fitLevels` is monotonic. A wider `available` never yields a more compact state for
  any group. This is unit-tested.

## Popup state (local, not persisted)

`popupOpen: boolean`. It is meaningful only while `collapsed`.
- Set to true when a tab is clicked.
- Set to false on: a command button run, Escape, a pointerdown outside, or a tab double-click
  (which pins the ribbon). Field edits leave it open.
