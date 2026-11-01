# Feature Specification: Ribbon Toolbar

**Feature Branch**: `003-ribbon-toolbar`

**Created**: 2026-10-31

**Status**: Draft

**Input**: User description: "replace the top controls with a ribbon menu as in the MS Office. Use some free icon pack"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Find every command in a tabbed ribbon (Priority: P1)

Today all controls sit in one long, wrapping row of buttons, selects and text labels at the top of
the window. The user wants an Office-style ribbon instead: a row of tabs; each tab shows its
commands arranged in named groups; each command is an icon button with a short label. The commands
themselves do exactly what they do now. Only their place and look change.

The tabs and groups (labels in both languages):

| Tab | Group | Commands |
|-----|-------|----------|
| **Home** | Clipboard | Paste (large), Cut, Copy, Delete |
| | History | Undo, Redo |
| | Playback | Play/Pause (large), Back to start, Tempo |
| | Articulation | Staccato, Tenuto, Legato |
| **Melody** | Properties | Key, Time signature |
| | Transform | Transpose… |
| **File** | Melodies | Melodies… (library, large), Import… |
| | Export | Export file, Export MIDI |
| | Print | Print sheet music, Print with fingerings |
| **View** | Panels | Timeline, Sheet music, Fingering |
| | Zoom | Zoom in, Zoom out |
| | Grid | Snap |
| | Language | Language, Note names |

**Why this priority**: this is the feature. Without it nothing else in this spec applies.

**Independent Test**: open the app, go through each tab, and use every command. Each one behaves as
before and none of the old top controls is missing.

**Acceptance Scenarios**:

1. **Given** the app is open, **When** it first loads, **Then** the ribbon shows the Home tab, with
   its groups labelled and each command shown as an icon plus a text label.
2. **Given** the Home tab is shown, **When** the user clicks the View tab, **Then** the View tab's
   groups replace Home's, and the View tab is shown as selected.
3. **Given** any tab, **When** the user uses a command (for example Transpose…, Export MIDI or a
   panel toggle), **Then** the result is the same as the old toolbar control gave, including its
   enabled/disabled and pressed states.
4. **Given** no notes are selected, **When** the user looks at Cut, Copy and Delete, **Then** they
   are shown disabled. With notes selected they are enabled. Paste is disabled while the clipboard
   is empty.
5. **Given** a command is impossible (for example Delete with nothing selected), **When** the user uses
   it, **Then** the same short refusal message as today appears, positioned so it does not cover
   the ribbon's commands.
6. **Given** the interface language is Russian, **When** the user looks at the ribbon, **Then**
   every tab, group, label and tooltip is in Russian. The same holds in English.

---

### User Story 2 - Always-visible essentials (Priority: P1)

Some things must be reachable whichever tab is open, as in Office's title bar and Quick Access
Toolbar. Above the tabs a slim title bar shows:

- the app name and the melody title, still editable in place;
- a quick-access strip with Undo, Redo and Play/Pause;
- the auto-save status.

**Why this priority**: playing the melody and undoing a mistake are the most frequent actions. They
must never be one tab away.

**Independent Test**: open the File tab, then start playback, undo an edit and rename the melody
without leaving it.

**Acceptance Scenarios**:

1. **Given** any tab is open, **When** the user clicks Play/Pause in the quick-access strip,
   **Then** playback starts or pauses exactly as with the Home tab's Play/Pause.
2. **Given** any tab is open, **When** the user edits the title in the title bar, **Then** the
   melody is renamed, with the same validation as today.
3. **Given** Undo has nothing to undo, **When** the user looks at the quick-access Undo, **Then** it
   is disabled.

---

### User Story 3 - Recognisable icons with tooltips (Priority: P2)

Each command has an icon from one free, openly licensed icon set, so that the whole ribbon looks
consistent. The articulation commands keep their musical symbols (staccato dot, tenuto line, slur
arc). Hovering or focusing a command shows a tooltip with its full name and, where one exists, its
keyboard shortcut (for example "Undo (Ctrl+Z)").

**Why this priority**: icons make the ribbon quick to scan. The ribbon still works without them,
since every command also has a text label.

**Independent Test**: hover each command and check that a tooltip with its name, and its shortcut
if it has one, appears. Switch between the light and dark themes and check that the icons stay
clearly visible in both.

**Acceptance Scenarios**:

1. **Given** the pointer rests on a command for about half a second, or the command gets keyboard
   focus, **When** the tooltip appears, **Then** it shows the command's name in the current
   language, and its shortcut where one exists.
2. **Given** the system is in dark mode, **When** the ribbon is shown, **Then** icons and labels
   meet the same contrast as the rest of the interface. Disabled commands are visibly dimmed in
   both themes.
3. **Given** the app is installed or opened without network access, **When** the ribbon is shown,
   **Then** every icon is shown. Icons ship with the app.

---

### User Story 4 - Collapse the ribbon for more room (Priority: P3)

When composing on a small screen, the user wants the panels to have as much height as possible. As
in Office:

- double-clicking the selected tab, or using a collapse button at the ribbon's right end, collapses
  the ribbon to its tab row only;
- clicking a tab then opens that tab's commands over the panels, and they close again after a
  command is used, after a click elsewhere, or on Escape;
- double-clicking a tab, or the same button, pins the ribbon open again.

The selected tab and the collapsed or pinned state are remembered between sessions.

**Why this priority**: it is useful but optional. The ribbon is fully usable without it.

**Independent Test**: collapse the ribbon and check that the panels grow. Use a command from a
temporarily opened tab. Reload the page and check that the ribbon is still collapsed and the same
tab is selected.

**Acceptance Scenarios**:

1. **Given** the ribbon is pinned open, **When** the user double-clicks the selected tab, **Then**
   only the tab row remains, and the panels below gain the freed height.
2. **Given** the ribbon is collapsed, **When** the user clicks the File tab and then Export MIDI,
   **Then** the export happens and the File tab's commands close again.
3. **Given** the ribbon was collapsed with the View tab selected, **When** the user reloads the
   page, **Then** the ribbon is still collapsed and View is the selected tab.

---

### User Story 5 - Keyboard access (Priority: P2)

A keyboard user can reach every ribbon command:

- Tab moves focus into the tab row;
- Left and Right arrows move between tabs, and the focused tab is selected;
- Tab again moves into the selected tab's commands;
- each command is activated with Enter or Space.

All existing keyboard shortcuts (Space, Ctrl+Z, S, T, L and the others) keep working whichever tab
is open, and whether or not the ribbon is collapsed. One exception: Space and Enter on a focused
ribbon control activate that control rather than the global shortcut, so Space on a focused Copy
button copies and does not start playback.

**Why this priority**: the constitution requires all toolbar actions to be keyboard-reachable with
accessible labels in both languages.

**Independent Test**: using only the keyboard, select the Melody tab and open Transpose…, then go
back to the timeline and press Space to play.

**Acceptance Scenarios**:

1. **Given** focus is on the Home tab, **When** the user presses Right twice, **Then** the File tab
   is focused and selected and its commands are shown.
2. **Given** focus is in the ribbon, **When** the user presses Ctrl+Z, **Then** the last edit is
   undone, as when the timeline has focus.
3. **Given** a screen reader, **When** it reads the ribbon, **Then** it announces a tab list with
   named tabs, named groups, and commands with their names and pressed or disabled states.

### Edge Cases

- **Narrow window** (for example 360–800 px wide): every command must still be reachable.
  - First, groups drop their text labels and show icons only.
  - If that is still too wide, whole groups fold into one group button that opens the group's
    commands in a drop-down.
  - The page never scrolls sideways, and no command is cut off.
- **Command with a value** (Tempo, Snap, Key, Time signature, Language, Note names) keeps its
  current kind of input (number field or drop-down). It sits inside its group with its label, and
  its value stays visible.
- **Printing**: the ribbon and title bar are not printed, as the toolbar isn't today.
- **A dialog is open** (Melodies…, Transpose…): the ribbon behaves as other page content does today
  under a modal dialog. It is inert until the dialog closes.
- **Playback running**: Play/Pause shows Pause in both the Home tab and the quick-access strip.
  Commands that are blocked during playback today stay blocked in the same way.
- **Audio unavailable, or an empty melody**: Play/Pause is disabled with the same explanation as
  today, now shown in its tooltip.
- **A temporarily opened tab while the ribbon is collapsed**: if the user starts a drag on the
  timeline, the tab's commands close first. They never cover a drag in progress.
- **Remembered tab no longer exists** (stored preference from a future or older version): the Home
  tab is shown.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST replace the current top toolbar with a ribbon. The ribbon has a tab row
  (Home, Melody, File, View) and, under it, the selected tab's commands arranged in labelled groups
  as listed in User Story 1.
- **FR-002**: Every action available from the current top toolbar MUST be available from the
  ribbon, with unchanged behaviour, enabled/disabled rules, pressed states and refusal messages.
- **FR-003**: The ribbon MUST add Cut, Copy, Paste and Delete commands (Home → Clipboard). They act
  as the existing Ctrl+X, Ctrl+C, Ctrl+V and Delete shortcuts do, including their
  refusal messages. Cut, Copy and Delete are disabled with no selection, and Paste is disabled with
  an empty clipboard.
- **FR-004**: Each command MUST show an icon and a text label. The group's most important commands
  (Paste, Play/Pause, Melodies…) are shown large, with the icon above the label. The other commands
  are small, with the icon beside the label.
- **FR-005**: Icons MUST come from a single free, openly licensed icon set whose licence allows
  redistribution in an open-source web app. The licence notice MUST be included with the app and
  listed in the README. The articulation commands keep their musical-symbol faces.
- **FR-006**: Icons MUST be bundled with the app, so they appear without network access. They MUST
  follow the light and dark themes.
- **FR-007**: A title bar above the tabs MUST always show the editable melody title, the auto-save
  status and a quick-access strip with Undo, Redo and Play/Pause, whichever tab is selected and
  whether or not the ribbon is collapsed.
- **FR-008**: Each command MUST have a tooltip with its full name in the current language. It shows
  on hover after a short delay and on keyboard focus, and includes the keyboard shortcut where one
  exists. A disabled command's tooltip says why it is disabled where the app already knows (for
  example, no notes selected, or audio unavailable).
- **FR-009**: The ribbon MUST follow the tab-list keyboard pattern:
  - Tab or Shift+Tab moves between the tab row and the commands;
  - Left and Right arrows move between tabs, and the focused tab is selected;
  - Home and End go to the first and last tab;
  - commands are activated with Enter or Space.
  All other existing global shortcuts MUST work while focus is in the ribbon, except where a text
  or number input has focus, as today. Space and Enter on a focused ribbon control (a command
  button, tab or field) MUST activate that control only, never the global Space (Play/Pause)
  shortcut.
- **FR-010**: Tabs, groups and commands MUST expose accessible roles, names and states (selected
  tab; pressed, mixed or disabled commands) in both languages.
- **FR-011**: The user MUST be able to collapse the ribbon to its tab row and pin it open again,
  both by double-clicking the selected tab and with a dedicated button. While collapsed:
  - clicking a tab opens its commands over the panels;
  - they close after a command button is used, on Escape, or on a click outside the ribbon;
  - editing a field (Tempo, Key, Time signature, Snap, Language, Note names) does not close them,
    so a value can be typed or changed in several steps.
- **FR-012**: The selected tab and the collapsed or pinned state MUST be remembered between sessions
  as user preferences, never as part of the melody. An unknown stored tab falls back to Home.
- **FR-013**: At window widths too narrow for a tab's groups, the ribbon MUST first hide small
  commands' labels (the icon and tooltip remain), then fold whole groups into drop-down group
  buttons. This keeps every command reachable, with no horizontal page scroll down to 360 px wide.
- **FR-014**: The refusal and adjustment messages shown today in the toolbar MUST still appear for
  every rejected or adjusted command. They MUST NOT cover ribbon commands or the title bar.
- **FR-015**: The ribbon and title bar MUST NOT appear in printed output.
- **FR-016**: All new labels, group names, tab names and tooltips MUST exist in both Russian and
  English, through the existing translation layer.

### Key Entities

- **Ribbon tab**: a named page of the ribbon (Home, Melody, File, View) with an ordered list of
  groups.
- **Ribbon group**: a labelled cluster of related commands within a tab, which can fold into one
  drop-down button when space is short.
- **Ribbon command**: one action, with an icon, a label, a size (large or small), a tooltip, an
  optional shortcut, an enabled state and, for toggles, a pressed state. It is bound to an existing
  app action.
- **Ribbon preferences**: the selected tab and the collapsed or pinned state, stored with the other
  per-browser preferences.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the actions available in the current top toolbar can be done from the ribbon.
  At window widths of 1280 px or more, each is reachable in at most two clicks from any tab: one to
  select the tab, one to use the command. At narrower widths, where a group may be folded, it takes
  at most three clicks.
- **SC-002**: At a 1280×720 window with the ribbon pinned open, the ribbon and title bar together
  take no more than 20% of the window height. Collapsed, they take no more than 10%.
- **SC-003**: Switching tabs, or opening a tab while the ribbon is collapsed, shows its commands
  within 100 ms.
- **SC-004**: Every command can be reached and used with the keyboard alone. An automated
  accessibility check of the ribbon on each tab reports no serious or critical violations.
- **SC-005**: At every window width from 360 px upward, every command stays reachable and the page
  never scrolls horizontally.
- **SC-006**: In a hallway test with five people who have used Office, each given ten tasks (such
  as "export MIDI", "hide the sheet panel" or "transpose up a tone"), at least 90% of the tasks are
  completed within 10 seconds each, without help.
- **SC-007**: All existing end-to-end scenarios still pass, with only their way of reaching controls
  updated.

## Assumptions

- **"Free icon pack"** means an open-source icon set under a permissive licence (for example MIT,
  ISC or Apache-2.0) with consistent line-style icons covering clipboard, undo/redo, playback, file,
  print, zoom and view actions. The specific set is chosen during planning and its licence is
  recorded there.
- **Tab arrangement:** the tab names and command grouping in User Story 1 follow Office
  conventions:
  - Home holds the most frequent actions;
  - File holds library, import, export and print;
  - View holds layout, zoom and display settings.
  Unlike Office, File is an ordinary tab, not a full-screen "backstage" view, which keeps the app
  simple.
- **Out of scope:**
  - Office "KeyTips", the letter badges shown on Alt;
  - a user-customisable quick-access strip;
  - contextual tabs that appear only for a selection;
  - ribbon search ("Tell me").
- **No change to the melody file format, history or editing behaviour.** Only the controls' layout,
  look and the four new clipboard buttons change.
- **Existing tests stay valid.** Existing accessible names of controls (for example "Play", "Export
  file", "Melodies…") stay the same, so that tests and assistive technology keep working.
- **Theme:** the app's existing light and dark theme handling stays. The ribbon uses the same
  colour tokens.
