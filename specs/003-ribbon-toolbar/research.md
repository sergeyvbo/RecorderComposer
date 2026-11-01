# Research: Ribbon Toolbar

Decisions behind [plan.md](./plan.md). There were no open NEEDS CLARIFICATION items in the spec.
Each item below resolves a design choice the spec left to planning.

## R1 Icon set

- **Decision**: **Lucide**, through the `lucide-react` package. It uses the ISC licence. The current
  version is installed at implement time, after the user confirms the download.
- **Rationale**:
  - **Licence:** ISC, a permissive licence compatible with open distribution (constitution VI). It
    only requires the notice to be kept, so we ship `public/licenses/lucide-LICENSE.txt` and link it
    from the README (FR-005).
  - **Coverage:** about 1,500 consistent 24 px line icons cover every command. See the icon column
    in [contracts/ui-contract.md](./contracts/ui-contract.md).
  - **Offline and themes:** each icon is an ES module that renders inline `<svg stroke="currentColor">`.
    Icons are bundled by Vite, so they appear with no network access (FR-006). They take the text
    colour, so the existing light/dark tokens apply with no extra work.
  - **Size:** the package has no runtime dependencies besides React and is tree-shaken. About 30
    icons add roughly 15 KB minified to the bundle.
- **Alternatives considered**:
  - **Fluent UI System Icons** (`@fluentui/react-icons`, MIT): this is the closest match to the
    real Office look. It was rejected because it pulls in Griffel (a CSS-in-JS runtime) and a much
    larger package.
  - **Tabler Icons** (MIT): a similar style. It was not chosen because Lucide's music and file icons
    fit our commands slightly better. Either would be acceptable.
  - **Material Symbols** (Apache-2.0): delivered as a font or a large package; a font is a heavier
    asset, and its filled style doesn't sit well next to the Bravura glyphs.
  - **Hand-drawn SVGs**: inconsistent, and they would be maintenance we don't need.

## R2 Ribbon implementation: in-house components

- **Decision**: build the ribbon from about six small components (`Ribbon`, `RibbonGroup`,
  `RibbonButton`, `RibbonField`, `Tooltip`, `TitleBar`) styled with the existing CSS tokens.
- **Rationale**:
  - The ribbon needs exact WAI-ARIA tab semantics, our i18n, our refusal-message plumbing and the
    width-fitting rules from FR-013. All of that amounts to a few hundred lines.
  - Existing React "ribbon" packages are either abandoned or bound to a component framework
    (Fluent UI, Syncfusion, DevExtreme). The commercial ones also have licences that don't fit
    this project.
- **Alternatives considered**:
  - **Fluent UI React v9 Toolbar and TabList**: it gives correct ARIA, but brings a large framework
    and its own theming. That would be overkill next to our tokens.

## R3 One command descriptor per command

- **Decision**: a `useCommands()` hook builds a map `CommandId → CommandDescriptor`. Each
  descriptor has a label key, an icon, a size hint, a shortcut, `enabled`, `pressed?`, a
  `disabledReasonKey?` and `run()`. It is built from the store and the playback controller.
  - The ribbon layout (`layout.ts`) refers to commands by id.
  - Both the ribbon and the quick-access strip render `RibbonButton`s from the same descriptors.
- **Rationale**:
  - Undo, Redo and Play/Pause appear twice, in the quick-access strip and on the Home tab, so a
    single definition keeps their enabled and pressed states identical.
  - It also gives one place to unit-test enabling rules, such as Cut, Copy and Delete needing a
    selection and Paste needing a clipboard (FR-003).
  - Keyboard shortcuts (`useShortcuts`) stay as they are. Descriptors only *display* the shortcut
    text and call the same store actions, so there is no behaviour drift.
- **Alternatives considered**:
  - **Keeping each toolbar component as-is and restyling it**: rejected. Undo/Redo and Play would be
    duplicated, and one component (for example `EditControls`) mixes groups that the ribbon puts on
    different tabs.

## R4 Tab panels stay mounted, and dialogs move to a portal

- **Decision**:
  - All four tab panels stay mounted, and inactive ones get the `hidden` attribute.
  - `LibraryPanel`, `TransposeDialog` and the print view (already portalled) render through
    `createPortal(…, document.body)`.
- **Rationale**:
  - Dialogs today render inline, inside the component that opened them. Without these changes,
    switching tabs, or the collapsed ribbon's popup closing after "Melodies…" was clicked (FR-011),
    would unmount or hide the dialog just opened.
  - Keeping panels mounted also keeps local component state, such as a half-typed tempo, and
    makes tab switches instant (SC-003).
  - About 30 buttons cost nothing to keep mounted.
- **Alternatives considered**:
  - **A global "open dialog" state in the store**: it works, but it moves UI-only state into the
    app store, and changes three components rather than adding three portal calls.

## R5 Keyboard and ARIA model

- **Decision**: the WAI-ARIA *Tabs* pattern with **automatic activation**.
  - The tab row is `role="tablist"`, with roving `tabIndex`. Left and Right arrows move between
    tabs and Home and End jump to the ends; focusing a tab selects it.
  - Each panel is `role="tabpanel"`, labelled by its tab.
  - Each group is `role="group"`, with `aria-label` set to the group name.
  - Commands are ordinary buttons in DOM order, so Tab and Shift+Tab move through them (FR-009).
  - Toggles use `aria-pressed` (true, false or mixed), as the 002 articulation toggles already do.
  - The quick-access strip is `role="toolbar"`, with `aria-label` "Quick access".
  - The collapse button is a toggle with `aria-expanded`.
- **Rationale**:
  - Automatic activation matches Office and the spec scenario "Right twice → File is selected".
  - Using a plain Tab order inside panels, rather than a roving toolbar, keeps the existing
    `useShortcuts` rules simple. Shortcuts are already ignored only in text and number inputs,
    so they keep working from ribbon buttons, as FR-009 requires.
  - **Space and Enter exception:** a focused button, tab or select activates natively on Space
    and Enter. `useShortcuts` therefore skips its Space (Play/Pause) shortcut when the event
    target is a `button`, `[role=tab]` or `select`, so Space never both activates the control and
    toggles playback. All other shortcuts (Ctrl+Z, S, T, L, arrows, Delete) are unaffected.
- **Alternatives considered**:
  - **Manual activation** (arrows move focus; Enter selects): it adds a step, and Office doesn't
    work that way.
  - **A `role="toolbar"` with arrow navigation inside each panel**: it adds a second keyboard model
    for no gain.

## R6 Tooltips

- **Decision**: a small `Tooltip` component.
  - It opens after a 500 ms hover or immediately on `:focus-visible`, and closes on leave, blur or
    Escape.
  - It is connected through `aria-describedby`, so the accessible **name** stays the label
    (spec Assumptions: names unchanged) and the tooltip adds a description.
  - Its content is the full name, then the shortcut in parentheses, then a second line with the
    disabled reason when there is one.
  - The native `title` attribute is removed where `Tooltip` replaces it. This is where the
    existing `print.empty`, `playback.empty` and `audio.unavailable` explanations end up (FR-008).
- **Rationale**: native `title` tooltips don't appear on keyboard focus and can't be styled for
  dark mode.
- **Alternatives considered**: a tooltip library such as Floating UI. It adds a dependency, and
  ribbon tooltips always open below their button, so placement is trivial.

## R7 Width fitting (FR-013)

- **Decision**: a pure function `fitLevels(groups, availableWidth, measure)` decides the
  compaction state of the visible tab panel. `useRibbonFit` feeds it widths measured once per
  layout, through a `ResizeObserver` on the ribbon.
  - **Compaction order:**
    1. hide the labels of *small* commands in the rightmost group, then the next group to the
       left, and so on;
    2. if that is not enough, fold whole groups, rightmost first, into a group button that opens a
       drop-down with the group's full content.
    The first group of each tab never folds; it keeps its large command.
  - **Measuring:** each group's width is measured in all three states (full, icons only, folded)
    from an off-screen, `aria-hidden` measuring copy of the panel. Widths are recalculated when
    the language changes. The function then picks the least compact state that fits.
- **Rationale**:
  - This is Office's own order, with the right-hand groups compacting first.
  - Measuring once and computing purely gives a single layout pass per resize, with no flicker
    loops.
  - The pure function is easy to unit-test with fake widths.
  - Russian labels are longer, so measuring per language is required.
- **Alternatives considered**:
  - **CSS-only wrapping or horizontal scroll**: it breaks "no horizontal scroll, everything
    reachable" (SC-005).
  - **Container queries with fixed breakpoints**: wrong for two languages with different label
    lengths.

## R8 Collapsed ribbon (FR-011)

- **Decision**:
  - `prefs.ribbon.collapsed` hides the panel row.
  - While collapsed, clicking a tab sets a local `popupOpen` state. The panel then renders
    absolutely positioned over the workspace, with a shadow.
  - The popup closes on:
    - any command button's `run()`; editing a field (tempo, key, time signature, snap, language,
      note names) does not close it, so a value can be typed in several keystrokes;
    - Escape, which returns focus to the tab;
    - a pointerdown outside the ribbon, which includes starting a timeline drag (spec edge case),
      since the pointerdown on the timeline closes the popup before the drag begins.
  - Double-clicking the selected tab toggles `collapsed`. So does a collapse/pin button at the
    right end of the tab row.
  - The panel's height is not reserved while collapsed, so the workspace grows (US4 scenario 1).
- **Rationale**: this matches Office's "Show tabs only" mode with the least state.

## R9 Ribbon preferences (FR-012)

- **Decision**: `Preferences.ribbon = { tab: RibbonTabId, collapsed: boolean }`, stored in the
  existing `rc.prefs`. Preferences keep `version: 1`.
  - `loadPreferences` validates the field on its own: an unknown `tab` falls back to `home` and a
    non-boolean `collapsed` falls back to `false`.
  - Selecting a tab and collapsing go through `setPrefs`, so the existing preference persistence
    saves them.
- **Rationale**: the loader is already per-field tolerant. Adding an optional field needs no version
  bump (constitution V applies to melody data, and preferences are a convenience).

## R10 Placement of the existing pieces

- **Title**: `TitleInput` moves to the title bar.
- **Save status**: `SaveStatus` moves from the footer to the title bar's right end, and the footer is
  removed, which gives back about 24 px. `StorageBanner` stays under the ribbon.
- **Refusal messages** (`EditHint`): its `role="status"` element moves out of the toolbar row into
  a toast anchored to the top centre of the workspace, below the ribbon. It uses
  `pointer-events: none`, so it never covers commands (FR-014).
- **Value controls**: tempo (number input with its BPM suffix), snap, key, time signature, language
  and note names become `RibbonField`s. Each is a label line above a compact input, as in Office's
  font-size box. The existing `aria-label`s are unchanged.
- **Accessible names stay the same for all buttons**, for example "Play", "Export file",
  "Melodies…" and "Transpose…". Play, Undo and Redo now appear twice, in the quick-access strip and
  on the Home tab, so tests scope their queries to the quick-access toolbar or to the tab panel.
  `tests/e2e/helpers.ts` gets `openTab(page, name)` and `quickAccess(page)` helpers.
- **Print**: the existing `@media print` rule that hides `.toolbar` now targets `.titlebar` and
  `.ribbon`.
