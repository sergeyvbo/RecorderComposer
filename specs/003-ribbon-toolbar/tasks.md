---

description: "Task list for Ribbon Toolbar"
---

# Tasks: Ribbon Toolbar

**Input**: Design documents from `/specs/003-ribbon-toolbar/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/ui-contract.md](./contracts/ui-contract.md),
[quickstart.md](./quickstart.md)

**Tests**: Constitution Principle III applies:
- pure UI logic (`fit.ts`, `layout.ts`, `shortcutLabel.ts`, preference parsing, command enabling)
  gets tests written first, and they must fail before the implementation;
- each story's primary flow gets a component or e2e test.

**Organization**: Tasks are grouped by user story, in priority order US1, US2 (P1), then US3, US5
(P2), then US4 (P3). Paths are relative to the repository root.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1–US5 from spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the icon dependency and its licence notice.

- [X] T001 Ask the user to confirm the download. Then install `lucide-react` (latest, ISC) as a
  runtime dependency in `package.json`, and record the installed version in plan.md's Technical
  Context.
- [X] T002 [P] Copy the Lucide ISC licence text from `node_modules/lucide-react/LICENSE` to
  `public/licenses/lucide-LICENSE.txt`.
- [X] T003 [P] Check every icon name in the contract's icon column (for example `clipboard-paste`,
  `chart-gantt`, `metronome`, `key-round`, `printer-check`) against the installed version. Correct
  any that differ in `specs/003-ribbon-toolbar/contracts/ui-contract.md`, leaving exactly one icon
  per row.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Pure helpers, preferences, i18n keys, the command descriptor layer and dialog portals.
Every story builds on these.

**⚠️ CRITICAL**: no user-story work starts until this phase is complete.

### Tests (write first, must fail)

- [X] T004 [P] Unit test `tests/unit/ui/ribbonPrefs.test.ts`:
  - `loadPreferences` returns `ribbon: { tab: 'home', collapsed: false }` when the field is missing;
  - it keeps valid values;
  - it falls back field by field: an unknown `tab` such as `"backstage"` becomes `'home'`, and a
    non-boolean `collapsed` becomes `false`;
  - `version` stays `1`.
- [X] T005 [P] Unit test `tests/unit/ui/layout.test.ts`:
  - every `CommandId` except `collapseRibbon`, and every `FieldId`, appears exactly once in
    `RIBBON_LAYOUT`;
  - the tab order is `home, melody, file, view`;
  - the group ids and order match the contract table;
  - `paste`, `playPause`, `transpose` and `library` are `large`.
- [X] T006 [P] Unit test `tests/unit/ui/shortcutLabel.test.ts`:
  - `{key:'z', mod:true}` → `Ctrl+Z`, or `⌘Z` on macOS;
  - `{key:'z', mod:true, shift:true}` → `Ctrl+Shift+Z`, or `⌘⇧Z`;
  - `Delete`, `Space` and `Home` are named keys;
  - `{key:'wheel', mod:true}` → `Ctrl+wheel`, or `⌘+wheel`;
  - `S` and `T` stay single letters.
- [X] T007 [P] Component test `tests/component/Commands.test.tsx`, for `useCommands()` rendered
  through a probe component:
  - cut, copy and delete are disabled with `ribbon.reason.noSelection` when there is no selection,
    and enabled with one;
  - paste is disabled with `ribbon.reason.clipboardEmpty` until a copy;
  - paste `run()` pastes at `playback.positionTicks`, and selects the pasted notes;
  - undo and redo follow history;
  - panel toggles report `pressed`, and the last visible panel is disabled with
    `ribbon.reason.lastPanel`;
  - playPause's label switches between `toolbar.play` and `toolbar.pause` with playback status.

### Implementation

- [X] T008 [P] Add `RibbonTabId`, `RIBBON_TABS` and `RibbonPrefs` to `src/state/prefs.ts`, plus
  `ribbon` in `Preferences` and `defaultPreferences`. Parse `ribbon` field by field in
  `src/persistence/preferences.ts` (makes T004 pass).
- [X] T009 [P] Write `src/ui/Ribbon/shortcutLabel.ts`, which detects the platform with
  `navigator.platform` / `userAgentData` and allows an override for tests (makes T006 pass).
- [X] T010 [P] Add all new keys from the contract's i18n table (`ribbon.label`, `ribbon.quickAccess`,
  `ribbon.collapse`, `ribbon.pin`, `ribbon.tab.*`, `ribbon.group.*`, `ribbon.cmd.*`,
  `ribbon.reason.*`, `ribbon.key.wheel`) to `src/i18n/en.json` and `src/i18n/ru.json`. The existing parity test must
  pass.
- [X] T011 Write `src/ui/Ribbon/layout.ts`, with `CommandId`, `FieldId`, the `Item`, `Group` and
  `Tab` types, and `RIBBON_LAYOUT` exactly as in the contract table (makes T005 pass).
- [X] T012 Write `src/ui/Ribbon/icons.ts`, the single import point mapping each `CommandId` and
  `FieldId` to a Lucide component. It imports named icons only, so they tree-shake. Articulation
  commands map to the existing glyph faces from `ArticulationControls.tsx`, which move into
  exported `StaccatoFace`, `TenutoFace` and `LegatoFace` components.
- [X] T013 Write `src/ui/commands/useCommands.ts`. It returns a `CommandDescriptor` for every
  `CommandId` (data-model.md), reusing the logic now in these files:
  - `TransportControls` (play/pause, to start);
  - `EditControls` (undo, redo, zoom);
  - `ArticulationControls` (`articulationState`, `toggledMark`, `setLegato`);
  - `PanelToggles`;
  - `FileActions` (library, import, export file, export MIDI);
  - `PrintMenu`;
  - `KeyControls` (transpose);
  - plus the new clipboard actions: `copy`, `cut`, `paste(positionTicks)` with selection of the
    pasted notes, and `dispatch(deleteNotes)` for delete.

  This makes T007 pass. Commands that open a dialog or print only call a small
  `RibbonDialogsContext` (`openLibrary`, `openTranspose`, `pickImportFile`, `print(mode)`); the
  provider itself is written in T014.
- [X] T014 Write the `RibbonDialogsContext` provider in `src/ui/commands/dialogs.tsx`. It renders
  `LibraryPanel`, `TransposeDialog` and `PrintView` once, through `createPortal(…, document.body)`
  (research R4), plus the hidden import file input (keep `data-testid="import-input"`). Mount it in
  `src/ui/App.tsx` around the toolbar. Remove the inline dialog rendering from
  `src/ui/Library/FileActions.tsx`, `src/ui/Toolbar/KeyControls.tsx` and
  `src/ui/Toolbar/PrintMenu.tsx`, and switch their buttons to open the dialogs through
  `RibbonDialogsContext` until T025 removes them, so the old toolbar keeps working.

**Checkpoint**: `npm run check` passes. The old toolbar still renders, built from the same logic.

---

## Phase 3: User Story 1 - Find every command in a tabbed ribbon (Priority: P1) 🎯 MVP

**Goal**: the ribbon (tab row and grouped commands) replaces the old toolbar row, and every old
control works from it. This includes the narrow-width fitting that keeps commands reachable.

**Independent Test**: quickstart scenarios 1, 2 and 7. Every old control is used from its tab and
behaves as before.

### Tests for User Story 1 ⚠️ (write first, must fail)

- [X] T015 [P] [US1] Unit test `tests/unit/ui/fit.test.ts` for `fitLevels`:
  - with enough width, every group is `full`;
  - shrinking makes the rightmost group with small items `iconsOnly` first, then moves leftward;
  - after that, groups fold right to left;
  - the first group never folds;
  - with impossible widths, the most compact state is returned;
  - property (fast-check): a wider `available` never yields a more compact state for any group.
- [X] T016 [P] [US1] Component test `tests/component/Ribbon.test.tsx`:
  - the Home tab is selected by default and shows the groups Clipboard, History, Playback and
    Articulation, as `role="group"` with names;
  - clicking File shows the Melodies, Export and Print groups, and the Home panel is `hidden`;
  - each command button's accessible name equals its label;
  - toggles expose `aria-pressed`;
  - after Copy, Paste becomes enabled;
  - selecting a tab writes `prefs.ribbon.tab`;
  - Russian UI: the tab and group names are in Russian.
- [X] T017 [P] [US1] Update `tests/component/Playback.test.tsx` and
  `tests/component/ArticulationControls.test.tsx` to render through the ribbon (or `RibbonButton`
  from descriptors), keeping their assertions on names, states and behaviour.

### Implementation for User Story 1

- [X] T018 [P] [US1] Write `src/ui/Ribbon/RibbonButton.tsx`:
  - it renders a `CommandDescriptor` with `size` `large` (icon above the label) or `small` (icon
    beside the label);
  - in `iconsOnly` mode it renders the icon only and keeps `aria-label`;
  - toggles use `aria-pressed`, and disabled commands use `disabled`.
  Reuse the `.toggle` mixed and disabled-pressed styles from 002.
- [X] T019 [P] [US1] Write `src/ui/Ribbon/RibbonField.tsx`: a label line above a compact control
  slot. Move the existing inputs into field renderers, keeping their current `aria-label`s:
  - tempo number input with BPM, from `TransportControls`;
  - snap and time signature, from `EditControls`;
  - key, from `KeySelect`;
  - language and note names, from `LanguageSwitch`.
- [X] T020 [US1] Write `src/ui/Ribbon/RibbonGroup.tsx`:
  - `role="group"` with `aria-label`, and a visible caption that is `aria-hidden`;
  - `data-fit` set to `full`, `iconsOnly` or `folded`;
  - in folded mode, a group button (`aria-haspopup`, `aria-expanded`) opens a drop-down with the
    full items; Escape closes it and returns focus to the button.
- [X] T021 [US1] Write `src/ui/Ribbon/fit.ts` (`fitLevels`, pure, to make T015 pass) and
  `src/ui/Ribbon/useRibbonFit.ts`. The hook uses a `ResizeObserver` on the ribbon and an off-screen,
  `aria-hidden` measuring copy that measures each group's three widths. Widths are re-measured when
  the language changes.
- [X] T022 [US1] Write `src/ui/Ribbon/Ribbon.tsx`:
  - a `role="tablist"` tab row from `RIBBON_LAYOUT`, with click selection;
  - four `role="tabpanel"` panels, all mounted, with the inactive ones `hidden`;
  - groups from the layout, fitted by `useRibbonFit`;
  - the selected tab read from and written to `prefs.ribbon.tab`.
  This makes T016 pass.
- [X] T023 [US1] In `src/ui/App.tsx`:
  - replace `<header className="toolbar">…</header>` with `<Ribbon />`, wrapped in the dialogs
    provider (T014);
  - move `<EditHint />` out of the header into a toast container at the top centre of
    `.workspace`, using `pointer-events: none` (FR-014, R10).
- [X] T024 [US1] In `src/ui/styles/global.css`:
  - add `.ribbon`, `.ribbon-tabs`, `[role=tab][aria-selected]`, `.ribbon-panel`, `.ribbon-group`
    (with caption), `.rb-large`, `.rb-small`, `.rb-icon` (sized 20 px or 16 px, `currentColor`),
    `.ribbon-field` and `.edit-toast`, using the existing tokens only;
  - make disabled commands dimmed in both themes;
  - add the folded drop-down, and ensure no horizontal page scroll (`min-width: 0`, wrapping as
    the last resort);
  - remove the obsolete `.toolbar` and `.toolbar-group` rules once nothing uses them.
- [X] T025 [US1] Delete or trim the now-unused presentational parts of `src/ui/Toolbar/*.tsx` and
  `src/ui/Library/FileActions.tsx`. Keep `EditHint`, `TitleInput`, the field renderers and the
  exported glyph faces. Lint must report no unused exports.
- [X] T026 [US1] Add `openTab(page, name)` and `tabPanel(page)` (the visible `role="tabpanel"`) to
  `tests/e2e/helpers.ts`. Update every existing e2e spec (`us1` to `us9`, `a11y`, `perf`) that
  uses a toolbar control to select its tab first. Scope Play, Undo and Redo queries to the visible
  tab panel, since the quick-access strip does not exist until US2 (SC-007).
- [X] T027 [US1] e2e `tests/e2e/us10-ribbon.spec.ts` (quickstart scenarios 1, 2 and 7):
  - tabs and groups;
  - every command reachable;
  - the clipboard buttons, including the noRoom toast staying below the ribbon;
  - at 360 px and 800 px viewports: no horizontal scroll, the right-hand groups fold, and a folded
    group's command works, in English and Russian.

**Checkpoint**: the ribbon is fully usable, and the old toolbar is gone. MVP.

---

## Phase 4: User Story 2 - Always-visible essentials (Priority: P1)

**Goal**: a title bar with the editable title, a quick-access strip (Undo, Redo, Play/Pause) and
the save status, visible on every tab and while the ribbon is collapsed.

**Independent Test**: quickstart scenario 3.

### Tests for User Story 2 ⚠️ (write first, must fail)

- [X] T028 [P] [US2] Component test `tests/component/TitleBar.test.tsx`:
  - the title input renames the melody, with today's validation;
  - the quick-access toolbar (`role="toolbar"`, name "Quick access") contains Undo, Redo and Play;
  - its Play toggles playback and shows Pause, in step with the Home tab's button;
  - Undo is disabled with nothing to undo;
  - the save status is shown in the title bar.

### Implementation for User Story 2

- [X] T029 [US2] Write `src/ui/Ribbon/TitleBar.tsx`:
  - a `<header className="titlebar">` with the app name (`app.title`) and `TitleInput`;
  - a quick-access `role="toolbar"` rendering `RibbonButton`s for undo, redo and playPause from
    `useCommands()` (small, icons only, with tooltips);
  - `SaveStatus` at the right end.
- [X] T030 [US2] In `src/ui/App.tsx`, render `<TitleBar />` above `<Ribbon />` and remove the
  `<footer className="statusbar">` (R10). Update `global.css` with `.titlebar` styles and remove the
  `.statusbar` rules. Keep `StorageBanner` under the ribbon.
- [X] T031 [US2] Add `quickAccess(page)` (the "Quick access" `role="toolbar"`) to
  `tests/e2e/helpers.ts`. Move the e2e Play/Undo/Redo uses that do not need a particular tab to it,
  and add a check to `tests/e2e/us10-ribbon.spec.ts` (quickstart scenario 3): from the File tab,
  quick-access Play starts playback and Undo reverts an edit.

**Checkpoint**: US1 and US2 together deliver the complete P1 ribbon.

---

## Phase 5: User Story 3 - Recognisable icons with tooltips (Priority: P2)

**Goal**: Lucide icons on every command, plus tooltips with the name, shortcut and disabled
reason, readable in both themes and offline.

**Independent Test**: quickstart scenario 4.

### Tests for User Story 3 ⚠️ (write first, must fail)

- [X] T032 [P] [US3] Component test `tests/component/Tooltip.test.tsx`:
  - focusing Undo shows `role="tooltip"` "Undo (Ctrl+Z)" at once;
  - hover shows it after 500 ms (fake timers) and leaving hides it;
  - Escape hides it;
  - the button's accessible name is unchanged and `aria-describedby` points at the tooltip;
  - a disabled Copy shows a second line, "Select notes first";
  - a disabled Play shows `playback.empty` for an empty melody, and `audio.unavailable` when the
    audio engine is unavailable;
  - every command in `RIBBON_LAYOUT` renders an `<svg>` icon or a glyph face.

### Implementation for User Story 3

- [X] T033 [US3] Write `src/ui/Ribbon/Tooltip.tsx` (R6): a 500 ms hover delay, immediate on
  `:focus-visible`, `role="tooltip"`, `data-testid="ribbon-tooltip"`, positioned below its anchor
  and kept inside the viewport.
- [X] T034 [US3] In `src/ui/Ribbon/RibbonButton.tsx`, wire `Tooltip` with the shortcut
  (`shortcutLabel`) and the disabled reason. Remove the native `title` attributes it replaces, in
  `PrintMenu`, `TransportControls` and `FileActions` (now descriptors).
- [X] T035 [P] [US3] Theme check in `src/ui/styles/global.css`:
  - icons use `currentColor`;
  - disabled is `opacity: 0.45` plus `--muted`;
  - tooltip colours come from `--panel`, `--fg` and `--line-strong`, in both the light and the
    `prefers-color-scheme: dark` blocks.
- [X] T036 [P] [US3] Add an "Icons: Lucide (ISC)" line to the Licenses section of `README.md`, with a
  link to `public/licenses/lucide-LICENSE.txt` and to lucide.dev.

**Checkpoint**: icons and tooltips are complete.

---

## Phase 6: User Story 5 - Keyboard access (Priority: P2)

**Goal**: WAI-ARIA tabs with automatic activation; every command reachable by keyboard; global
shortcuts keep working from inside the ribbon.

**Independent Test**: quickstart scenario 5.

### Tests for User Story 5 ⚠️ (write first, must fail)

- [X] T037 [P] [US5] Component test, in `tests/component/Ribbon.test.tsx`:
  - with Home focused, ArrowRight ×2 focuses and selects File;
  - ArrowLeft from Home wraps to View;
  - Home and End jump to the first and last tab;
  - only the selected tab has `tabIndex=0`;
  - tab and panel `aria-controls` / `aria-labelledby` pair up;
  - with a ribbon button focused, Ctrl+Z undoes (`useShortcuts` mounted);
  - with the Copy button focused (notes selected), Space copies and does **not** toggle play;
  - with a tab focused, Space does not toggle play;
  - with focus on the timeline, Space still toggles play;
  - inside the tempo input, Space does not toggle play.
- [X] T038 [P] [US5] e2e, in `tests/e2e/us10-ribbon.spec.ts`:
  - a keyboard-only flow: Tab to the tab row, Right ×1 to Melody, Tab to Transpose…, Enter opens
    the dialog, Escape closes it;
  - axe (wcag2a/aa) on each of the four tabs, and on a folded group's drop-down, reports no
    serious or critical violations (SC-004);
  - axe on the Home tab with `colorScheme: 'dark'` (`page.emulateMedia`) also reports no serious or
    critical violations, which covers the dark-mode contrast in US3 scenario 2.

### Implementation for User Story 5

- [X] T039 [US5] In `src/ui/Ribbon/Ribbon.tsx`:
  - roving `tabIndex`, plus ArrowLeft/ArrowRight (with wrap), Home and End handling on the
    tablist;
  - selection on focus;
  - `id`, `aria-controls` and `aria-labelledby` wiring;
  - `aria-label` = `ribbon.label`.
- [X] T040 [US5] In `src/ui/useShortcuts.ts`, skip the Space (Play/Pause) shortcut when the event
  target is a `button`, `[role=tab]` or `select`, so the focused control activates natively
  instead (FR-009, research R5). Every other shortcut keeps working with focus in the ribbon.

**Checkpoint**: the keyboard and screen-reader requirements are met.

---

## Phase 7: User Story 4 - Collapse the ribbon for more room (Priority: P3)

**Goal**: collapse to the tab row, show a tab's panel as a popup while collapsed, and remember the
state.

**Independent Test**: quickstart scenario 6.

### Tests for User Story 4 ⚠️ (write first, must fail)

- [X] T041 [P] [US4] Component test, in `tests/component/Ribbon.test.tsx`:
  - double-clicking the selected tab sets `prefs.ribbon.collapsed` and hides the panel row;
  - while collapsed, clicking File opens the popup;
  - running Export file closes the popup;
  - changing the tempo field in the Home popup does not close it;
  - Escape closes it and returns focus to the File tab;
  - a pointerdown outside `.ribbon` closes it;
  - the collapse button toggles `aria-expanded` and its label (`ribbon.collapse` ↔ `ribbon.pin`);
  - with the ribbon collapsed, the quick-access strip is still present.
- [X] T042 [P] [US4] e2e, in `tests/e2e/us10-ribbon.spec.ts`:
  - collapse, and check that the timeline panel's height grows;
  - with the View popup open, a click in the timeline closes it and adds a note;
  - reload: still collapsed, with View selected;
  - a corrupted `rc.prefs.ribbon.tab` falls back to Home.

### Implementation for User Story 4

- [X] T043 [US4] In `src/ui/Ribbon/Ribbon.tsx`:
  - the collapsed mode (no reserved panel height);
  - a local `popupOpen`;
  - the panel rendered as an overlay with a shadow while collapsed;
  - double-click on the tab, and the collapse/pin button (`chevron-up` / `pin`, `aria-expanded`);
  - a document `pointerdown` listener that closes the popup when the pointer is outside `.ribbon`;
  - Escape handling;
  - when collapsed, a wrapped `run()` that closes the popup after a command button (fields do
    not close it).
- [X] T044 [US4] Add `.ribbon[data-collapsed]` and `.ribbon-popup` styles in
  `src/ui/styles/global.css`: absolute, under the tab row, `z-index` above the panels and below
  dialogs.

**Checkpoint**: all stories are complete.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T045 [P] In the `@media print` rule in `src/ui/styles/global.css`, hide `.titlebar`, `.ribbon`
  and `.edit-toast` (FR-015). Extend `tests/e2e/us5-print.spec.ts` to assert that the print
  emulation has no ribbon.
- [X] T046 [P] Update `specs/001-recorder-composer/contracts/ui-contract.md`. Its Layout section
  should point to `003 ui-contract.md`, and the "Toolbar" box should become title bar plus ribbon.
- [X] T047 [P] Update `README.md`:
  - Features: the ribbon (tabs, quick access, collapse, keyboard);
  - links to the 003 specs.
  Then retake `docs/screenshot.png` on request, since the user supplied the original.
- [X] T048 Performance check:
  - in `tests/e2e/perf.spec.ts`, measure a tab switch, which must be under 100 ms (SC-003);
  - at 1280×720, check that the ribbon and title bar take at most 20% of the height pinned and at
    most 10% collapsed (SC-002).
- [ ] T049 Run `npm run check`, `npm run build` and the full `npm run test:e2e` on 3 browsers. Then
  run the quickstart scenarios 1–9 by hand. SC-006 (the hallway usability test) is left to the
  user, and its result goes in `checklists/requirements.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** comes first. T001 needs the user's consent to download.
- **Foundational (Phase 2)** depends on Setup and blocks every story.
- **US1 (Phase 3)** depends on Foundational. It is the MVP, and it removes the old toolbar.
- **US2 (Phase 4)** depends on US1 (App layout, `RibbonButton`).
- **US3 (Phase 5)** depends on US1 (`RibbonButton`). It can run in parallel with US2.
- **US5 (Phase 6)** depends on US1 (`Ribbon.tsx`). It can run in parallel with US2 and US3, but it
  shares `Ribbon.tsx` with US4, so it goes before US4.
- **US4 (Phase 7)** depends on US1 and US5 (the same file, `Ribbon.tsx`).
- **Polish (Phase 8)** comes after all the stories.

### Within Each Story

- Tests are written first and must fail.
- Pure helpers come before components, and components before App wiring.
- e2e updates come after the wiring.

### Parallel Opportunities

- **Setup:** T002 and T003.
- **Foundational tests:** T004–T007, then T008, T009 and T010 in parallel.
- **US1:** tests T015–T017, then T018 and T019.
- **Across stories:** US2 (T028–T031) and US3 (T032–T036) after US1.
- **Polish:** T045, T046 and T047.

## Parallel Example: Foundational

```text
T004 ribbonPrefs.test.ts   T005 layout.test.ts   T006 shortcutLabel.test.ts   T007 Commands.test.tsx
→ T008 prefs              T009 shortcutLabel.ts  T010 i18n keys
```

## Parallel Example: User Story 1

```text
T015 fit.test.ts   T016 Ribbon.test.tsx   T017 component test updates
→ T018 RibbonButton.tsx   T019 RibbonField.tsx
```

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phases 1 and 2: the dependency, descriptors and portals. The old toolbar keeps working.
2. Phase 3: the ribbon replaces the toolbar, and every command is reachable at every width.
3. **Stop and validate**: quickstart scenarios 1, 2 and 7, and the full e2e suite.

### Incremental Delivery

1. US1 → the ribbon (MVP).
2. US2 → title bar and quick access.
3. US3 → icons and tooltips.
4. US5 → keyboard polish and axe.
5. US4 → collapse and pin.
6. Polish.
