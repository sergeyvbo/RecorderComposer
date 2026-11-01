# Quickstart: Ribbon Toolbar validation

## Prerequisites

```sh
npm install          # includes lucide-react after this feature
npm run dev          # http://localhost:5173
npm run check        # typecheck + lint + unit/component tests
npm run test:e2e     # Playwright, 3 browsers (scenarios below are automated in us10-ribbon.spec.ts)
```

Use a fresh profile, or clear `rc.prefs`, so that the default tab and pinned state apply.

## Scenarios

### 1. Tabs and groups (US1, FR-001, FR-002)

1. Open the app. The **Home** tab is selected and shows the Clipboard, History, Playback and
   Articulation groups. Each command has an icon and a label.
2. Click each of **Melody**, **File** and **View**. The groups match the table in
   [contracts/ui-contract.md](./contracts/ui-contract.md).
3. From the ribbon, run: Transpose… (dialog opens), Export file (download), each panel toggle (the
   last visible panel cannot be hidden), Zoom in/out, Snap, Key, Time signature, Language and Note
   names. Each one behaves as the old toolbar control did.

### 2. Clipboard buttons (FR-003)

1. With no selection, Cut, Copy and Delete are disabled. Their tooltips say "Select notes first".
   Paste is disabled with "Nothing has been copied yet".
2. Add three notes, select two and click **Copy**. Paste becomes enabled.
3. Click **Paste**. The copies are inserted right after the selected notes, the later notes move
   right, and the copies become the selection.
4. Press Escape, click the start of the ruler and click **Paste**: the copies go first and every
   note moves right. Press Delete with nothing selected: the refusal toast shows "Nothing selected"
   below the ribbon, without covering any command.
5. Click **Cut** (the notes go, one undo step), then **Delete** on another selection.

### 3. Title bar and quick access (US2, FR-007)

1. Switch to **File**. In the title bar:
   - Play starts playback, and the Home tab's button also shows Pause;
   - Undo reverts the last edit;
   - renaming the title works.
2. The save status ("Saved") is in the title bar, and there is no footer.

### 4. Icons, tooltips and themes (US3, FR-004 to FR-006, FR-008)

1. Hover Undo for about half a second. The tooltip shows "Undo (Ctrl+Z)", or "⌘Z" on macOS. Tab to
   Redo: its tooltip appears immediately.
2. Switch the OS to dark mode. Icons and labels stay readable, and disabled commands are dimmed.
3. In DevTools, set the network to Offline and reload. Every icon still renders.
4. `public/licenses/lucide-LICENSE.txt` is served, and the README links it.

### 5. Keyboard and screen reader (US5, FR-009, FR-010, SC-004)

1. Press Tab until Home is focused. Press Right twice: **File** is selected and its panel shown.
2. Press Tab to reach Melodies… and press Enter. The library dialog opens. Press Escape.
3. With focus on a ribbon button, press Ctrl+Z: the last edit is undone. Focus Copy (with notes
   selected) and press Space: the notes are copied and playback does **not** start. Click the
   timeline and press Space: playback starts.
4. axe on each tab reports no serious or critical violations (automated).

### 6. Collapse and remember (US4, FR-011, FR-012)

1. Double-click **Home**. Only the tab row remains, and the panels grow taller.
2. Click **File**, then **Export MIDI**. The file downloads and the popup closes.
   Click **Home** and change the tempo in the popup: it stays open until you click elsewhere.
3. Click **View**, then click in the timeline. The popup closes, and the click still adds a note.
4. Reload. The ribbon is still collapsed. Click the pin button, and the ribbon is pinned open again
   with View selected.
5. In DevTools, set `rc.prefs.ribbon.tab` to `"backstage"` and reload. The Home tab is selected.

### 7. Narrow widths (FR-013, SC-005)

1. Resize the window from 1400 px down to 360 px. Groups on the right lose their small labels
   first, then fold into drop-down buttons. Clipboard, the first group, never folds.
2. At 360 px, open the folded Playback group and change the tempo. It works.
3. Switch the language to Russian. The longer labels fit by the same rules, and there is never a
   horizontal page scrollbar.

### 8. Print (FR-015)

Print sheet music (File tab). The preview has no title bar or ribbon.

### 9. Regression (SC-007)

The full `npm run test:e2e` suite passes, with existing scenarios reaching controls through
`openTab` and `quickAccess`.
