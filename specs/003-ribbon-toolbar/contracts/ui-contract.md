# Contract: Ribbon User Interface

This document replaces the **Toolbar** part of
[001 ui-contract](../../001-recorder-composer/contracts/ui-contract.md#layout). Pointer
interactions, keyboard shortcuts, panels and print are unchanged, except as noted below. All text
comes from i18n keys (constitution IV).

## Layout

```text
┌ Title bar (.titlebar) ───────────────────────────────────────────────────────────┐
│ Recorder Composer · [Melody title______]   [↶][↷][▶]  (quick access)  Saved ✓   │
├ Tab row (role=tablist) ──────────────────────────────────────────────────────────┤
│  Home │ Melody │ File │ View                                             [⌃ pin] │
├ Tab panel (role=tabpanel) ───────────────────────────────────────────────────────┤
│ ┌───────┬─────┐ ┌──────┐ ┌─────────────────┐ ┌────────────────────┐              │
│ │ [📋]  │✂ Cut│ │↶ Undo│ │ [▶]  ⏮ To start  │ │ • Stacc  – Ten  ⌒ L │              │
│ │ Paste │⧉Copy│ │↷ Redo│ │ Play Tempo [100] │ │                    │              │
│ │       │🗑 Del│ │      │ │                  │ │                    │              │
│ │   Clipboard │ │History│ │    Playback      │ │   Articulation     │              │
│ └─────────────┘ └──────┘ └─────────────────┘ └────────────────────┘              │
├ Storage banner (when needed) ────────────────────────────────────────────────────┤
│                 ┌ refusal toast (role=status), top-centre ┐                      │
│ Time ruler / panels (unchanged)                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

- The footer status bar is removed. The save status now lives in the title bar.
- **Collapsed ribbon:** only the title bar and tab row are shown. Clicking a tab opens its panel as
  a popup over the workspace.

## Tabs, groups, commands

Each Lucide icon is listed by its kebab-case name. The exact component names are checked at
implement time against the installed version. The ★ mark means a large button (icon above the
label); every other command is small (icon beside the label).

| Tab (`ribbon.tab.*`) | Group (`ribbon.group.*`) | Item | Label key (= accessible name) | Icon | Shortcut shown |
|---|---|---|---|---|---|
| home | clipboard | paste ★ | `ribbon.cmd.paste` | `clipboard-paste` | Ctrl+V |
| | | cut | `ribbon.cmd.cut` | `scissors` | Ctrl+X |
| | | copy | `ribbon.cmd.copy` | `copy` | Ctrl+C |
| | | delete | `ribbon.cmd.delete` | `trash-2` | Delete |
| | history | undo | `toolbar.undo` | `undo-2` | Ctrl+Z |
| | | redo | `toolbar.redo` | `redo-2` | Ctrl+Shift+Z |
| | playback | playPause ★ | `toolbar.play` / `toolbar.pause` | `play` / `pause` | Space |
| | | toStart | `toolbar.toStart` | `skip-back` | Home |
| | | tempo (field) | `toolbar.tempo` (+ `toolbar.bpm`) | `gauge` | — |
| | articulation | staccato | `articulation.staccato` | Bravura glyph (002) | S |
| | | tenuto | `articulation.tenuto` | Bravura glyph (002) | T |
| | | legato | `articulation.legato` | slur-arc SVG (002) | L / Shift+L |
| melody | properties | key (field) | `toolbar.key` | `key-round` | — |
| | | timeSignature (field) | `toolbar.timeSignature` | `metronome` | — |
| | transform | transpose ★ | `toolbar.transpose` | `arrow-up-down` | — |
| file | melodies | library ★ | `toolbar.library` | `library` | — |
| | | import | `toolbar.import` | `folder-open` | — |
| | export | exportFile | `toolbar.exportFile` | `file-down` | — |
| | | exportMidi | `toolbar.exportMidi` | `file-music` | — |
| | print | printSheet | `toolbar.printSheet` | `printer` | — |
| | | printWithFingering | `toolbar.printWithFingering` | `printer-check` | — |
| view | panels | panelTimeline | `panel.timeline` | `chart-gantt` | — |
| | | panelSheet | `panel.sheet` | `music` | — |
| | | panelFingering | `panel.fingering` | `hand` | — |
| | zoom | zoomIn | `toolbar.zoomIn` | `zoom-in` | Ctrl+wheel (`key: 'wheel'`, see data-model) |
| | | zoomOut | `toolbar.zoomOut` | `zoom-out` | Ctrl+wheel (`key: 'wheel'`, see data-model) |
| | grid | snap (field) | `toolbar.snap` | `grid-3x3` | — |
| | language | language (field) | `toolbar.language` | `languages` | — |
| | | noteNaming (field) | `toolbar.naming` | `type` | — |

- **Quick-access strip** (`role="toolbar"`, `aria-label` = `ribbon.quickAccess`): undo, redo and
  playPause, built from the same descriptors.
- **Tab-row end:** a collapse/pin toggle. Its label is `ribbon.collapse` when pinned and
  `ribbon.pin` when collapsed. Its icon is `chevron-up` / `pin`. It has `aria-expanded`, which is
  true while pinned.

## ARIA and keyboard (FR-009, FR-010)

- **Tab row:** `role="tablist"`, with `aria-label` = `ribbon.label`. Each tab is `role="tab"`, with
  `aria-selected`, `aria-controls` and `id="ribbon-tab-{id}"`.
  - Roving `tabIndex`: 0 on the selected tab, −1 on the others.
  - Left and Right arrows move between tabs and wrap; Home and End go to the first and last tab.
  - Focus selects (automatic activation).
- **Panel:** `role="tabpanel"`, `aria-labelledby` = the tab, `id="ribbon-panel-{id}"`. Inactive panels
  are `hidden`.
- **Group:** `role="group"`, `aria-label` = the group name. The visible group caption is
  `aria-hidden`, to avoid announcing it twice.
  - A folded group is a button whose name is the group name, with `aria-haspopup="true"` and
    `aria-expanded`.
  - Its drop-down contains the group's full items. Escape closes it and returns focus to the
    button.
- **Command:** `<button>` with its name from `labelKey`, even in icons-only mode (`aria-label`).
  - Toggles use `aria-pressed` (true, false or mixed).
  - Disabled commands use the `disabled` attribute.
  - The tooltip is linked with `aria-describedby`.
- **Global shortcuts** keep working while focus is anywhere in the ribbon, except inside text and
  number inputs, as today. **Space and Enter** on a focused ribbon control (button, tab or field)
  activate that control only; the global Space (Play/Pause) shortcut is skipped for them.
- **Double-click** on the selected tab toggles collapsed or pinned.
- **Popup (collapsed mode)** closes on Escape (focus back to its tab), on a command button run, and
  on a pointerdown outside `.ribbon`. Editing a field does not close it.

## Tooltips (FR-008)

- **Opening:** after 500 ms of hover, or at once on keyboard focus. Closes on leave, blur or Escape.
- **Content:**
  - line 1: the full name, then the shortcut in parentheses, formatted per platform (`Ctrl+Z`,
    `⌘Z`, `⌘⇧Z`);
  - line 2, only when disabled and a reason key exists: the reason.
- **Element:** `role="tooltip"`, `data-testid="ribbon-tooltip"`.

## Fitting (FR-013)

Groups compact from the right:
1. the labels of small commands are hidden (icon and tooltip stay);
2. then whole groups fold into a group drop-down button.

The first group of each tab never folds. The page never scrolls horizontally at 360 px or wider.
Each group carries `data-fit="full|iconsOnly|folded"` for tests.

## New i18n keys (en / ru)

| Key | en | ru |
|-----|----|----|
| `ribbon.label` | Ribbon | Лента |
| `ribbon.quickAccess` | Quick access | Панель быстрого доступа |
| `ribbon.collapse` | Collapse the ribbon | Свернуть ленту |
| `ribbon.pin` | Pin the ribbon | Закрепить ленту |
| `ribbon.tab.home` / `melody` / `file` / `view` | Home / Melody / File / View | Главная / Мелодия / Файл / Вид |
| `ribbon.group.clipboard` | Clipboard | Буфер обмена |
| `ribbon.group.history` | History | История |
| `ribbon.group.playback` | Playback | Воспроизведение |
| `ribbon.group.articulation` | Articulation | Артикуляция |
| `ribbon.group.properties` | Properties | Свойства |
| `ribbon.group.transform` | Transform | Преобразование |
| `ribbon.group.melodies` | Melodies | Мелодии |
| `ribbon.group.export` | Export | Экспорт |
| `ribbon.group.print` | Print | Печать |
| `ribbon.group.panels` | Panels | Панели |
| `ribbon.group.zoom` | Zoom | Масштаб |
| `ribbon.group.grid` | Grid | Сетка |
| `ribbon.group.language` | Language | Язык |
| `ribbon.cmd.paste` / `cut` / `copy` / `delete` | Paste / Cut / Copy / Delete | Вставить / Вырезать / Копировать / Удалить |
| `ribbon.reason.noSelection` | Select notes first | Сначала выделите ноты |
| `ribbon.reason.clipboardEmpty` | Nothing has been copied yet | Ещё ничего не скопировано |
| `ribbon.reason.nothingToUndo` / `nothingToRedo` | Nothing to undo / Nothing to redo | Нечего отменять / Нечего повторять |
| `ribbon.reason.lastPanel` | At least one panel stays visible | Хотя бы одна панель остаётся видимой |
| `ribbon.reason.legatoUnavailable` | Select consecutive notes | Выделите ноты подряд |
| `ribbon.key.wheel` | wheel | колесо |

The existing keys (`toolbar.*`, `panel.*`, `articulation.*`, `print.empty`, `playback.empty`,
`audio.unavailable`, `export.emptyMidi`) are reused unchanged.

## Test hooks

| Element | Hook |
|---------|------|
| Title bar | `.titlebar` (`role="banner"`) |
| Quick-access strip | `getByRole('toolbar', { name: 'Quick access' })` |
| Tab | `getByRole('tab', { name: 'File' })` |
| Visible panel | `getByRole('tabpanel')` (only one is not hidden) |
| Group | `getByRole('group', { name: 'Export' })`, `[data-fit]` |
| Refusal toast | `getByRole('status')`, unchanged |

## Print

`.titlebar`, `.ribbon` and the refusal toast are hidden by `@media print`, as `.toolbar` was before
(FR-015).
