# Implementation Plan: Ribbon Toolbar

**Branch**: `003-ribbon-toolbar` | **Date**: 2026-10-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-ribbon-toolbar/spec.md`

## Summary

This feature replaces the wrapping toolbar row with an Office-style ribbon: a title bar, a tab row
(Home, Melody, File, View) and a tab panel of labelled groups.

- **Commands**: every command is described once, as a *command descriptor* (label key, icon,
  shortcut, enabled state, pressed state, disabled reason, run). The ribbon groups and the
  quick-access strip both render from these descriptors, so the two can never disagree.
- **Existing controls**: their logic is reused.
  - Buttons become descriptors.
  - Value controls (tempo, snap, key, time signature, language, note names) keep their inputs,
    restyled as ribbon fields.
  - Dialogs and the print view move into a `document.body` portal, so they survive tab switches
    and a collapsed ribbon closing.
- **Icons**: Lucide (ISC licence), bundled as tree-shaken inline SVG that follows `currentColor`.
  This gives light/dark support, works offline, and adds no runtime dependencies of its own.
- **Narrow windows**: the ribbon is fitted to the window width with a `ResizeObserver` and a fixed
  compaction order. Small labels hide first, then groups fold into drop-downs, right to left.
- **Remembered state**: the selected tab and the collapsed state are stored in the existing
  preferences, with per-field fallback.
- **No domain or file-format change.** The four new clipboard buttons call existing store actions.

Decisions are in [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.x (`strict`, `exactOptionalPropertyTypes`), React 18, Vite 5.
Unchanged.

**Primary Dependencies**: one new runtime dependency, **`lucide-react` 1.59.0** (ISC). It is used for icons
only and is tree-shaken, so only imported icons are bundled. See research R1. Everything else is
unchanged.

**Storage**: `localStorage` preferences (`rc.prefs`, version 1) gain an optional `ribbon` field, and
older stored preferences fall back to defaults. IndexedDB and `.rcm.json` are untouched.

**Testing**:
- Vitest and React Testing Library: ribbon keyboard pattern, fitting levels, descriptors,
  preference fallback.
- Playwright on 3 browsers, with axe on every tab: existing scenarios updated to select tabs, plus a
  new ribbon scenario.

**Target Platform**: desktop Chrome/Edge, Firefox and Safari, plus narrow widths down to 360 px.

**Project Type**: client-side web application (single project).

**Performance Goals**:
- tab switch and collapsed-tab open under 100 ms (SC-003);
- fitting is at most one re-layout pass per resize;
- no effect on the 100 ms edit budget.

**Constraints**:
- accessible names of existing controls unchanged (spec Assumptions), so tests and assistive
  technology keep working;
- no hard-coded strings;
- the ribbon is hidden in print;
- no horizontal page scroll at 360 px or wider.

**Scale/Scope**:
- 4 tabs, 13 groups, about 30 commands;
- about 8 new UI modules, about 10 toolbar components reworked;
- 1 new dependency; 0 domain changes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Gates from `.specify/memory/constitution.md` (v1.0.0):

- [x] ✅ **I. Single Melody Model**
  - Ribbon commands call the same store actions as today.
  - Clipboard buttons reuse `copy`, `cut`, `paste(positionTicks)` and `deleteNotes` through
    `dispatch`, so undo/redo and refusal messages are unchanged.
- [x] ✅ **II. Instrument Fidelity**: not affected, since no music logic changes.
- [x] ✅ **III. Test-First**
  - There is no new domain code.
  - The pure UI logic (fitting levels, descriptor enabling, preference parsing, tab keyboard
    model) gets unit or component tests written first.
  - The primary flow gets an e2e test.
- [x] ✅ **IV. Bilingual by Design**
  - All tab, group, tooltip and reason strings are new i18n keys in `en` and `ru`. The key-parity
    test and the `i18next/no-literal-string` lint rule cover them.
  - Shortcuts are formatted per platform (Ctrl vs ⌘) through one helper.
- [x] ✅ **V. Open, Versioned Data**
  - The melody format is untouched.
  - Preferences keep `version: 1`. The new field is optional and validated field by field, which
    is the existing loader rule.
- [x] ✅ **VI. Client-Side Simplicity**
  - One new runtime dependency, justified in R1: an ISC licence, no transitive dependencies,
    tree-shakable, and SVG bundled into the app, so no CDN and no font.
  - The ribbon is built from small in-house components, because no maintained React ribbon
    library fits our accessibility and i18n needs (R2).
  - The spec's out-of-scope list (KeyTips, a customisable quick-access strip) is respected.
- [x] ✅ **Quality constraint "toolbar actions keyboard-reachable with accessible labels"** is met
  by the WAI-ARIA tabs pattern and named groups (R5).

**Result**: PASS. There are no violations.

**Post-design re-check (after Phase 1)**: PASS.
- Descriptors keep one definition per command, and the quick-access strip and ribbon share them.
- Keeping all tab panels mounted (R4) preserves component state without adding a global dialog
  manager.
- Print hiding reuses the existing `@media print` rule.

## Project Structure

### Documentation (this feature)

```text
specs/003-ribbon-toolbar/
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R10
├── data-model.md        # Phase 1: command descriptor, ribbon layout, ribbon prefs, fit levels
├── quickstart.md        # Phase 1: validation scenarios
├── contracts/
│   └── ui-contract.md   # layout, tabs/groups/commands with icons and shortcuts, ARIA, i18n keys
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks; not created here)
```

### Source Code (repository root)

```text
src/
├── state/
│   └── prefs.ts                 # + RibbonPrefs { tab, collapsed } in Preferences (optional field)
├── persistence/
│   └── preferences.ts           # + parse/fallback for prefs.ribbon
├── ui/
│   ├── App.tsx                  # <TitleBar/> + <Ribbon/> replace <header class="toolbar">; footer status moves to title bar
│   ├── Ribbon/                  # NEW
│   │   ├── Ribbon.tsx           # tab row + tab panels (all mounted, inactive `hidden`), collapse/pin, popup mode
│   │   ├── RibbonGroup.tsx      # labelled group; folded mode = group drop-down button
│   │   ├── RibbonButton.tsx     # large/small button from a CommandDescriptor (icon, label, tooltip, pressed, disabled)
│   │   ├── RibbonField.tsx      # label + existing input/select, ribbon styling
│   │   ├── Tooltip.tsx          # hover-delay/focus tooltip, linked via aria-describedby
│   │   ├── TitleBar.tsx         # app name, TitleInput, quick-access strip, SaveStatus
│   │   ├── layout.ts            # RIBBON_LAYOUT: tabs → groups → command ids / field ids (pure data)
│   │   ├── fit.ts               # pure: compaction levels for a given available width
│   │   ├── useRibbonFit.ts      # ResizeObserver + measure → current level
│   │   ├── shortcutLabel.ts     # "Ctrl+Z" / "⌘Z" formatting
│   │   └── icons.ts             # command id → Lucide icon component (single import point)
│   ├── commands/                # NEW
│   │   └── useCommands.ts       # CommandDescriptor map built from store + playback controller
│   ├── Toolbar/*                # reworked: logic kept, rendering via descriptors/fields; dialogs portalled
│   ├── Library/FileActions.tsx  # library/import/export as descriptors; LibraryPanel portalled
│   ├── Transpose/TransposeDialog.tsx  # portalled
│   └── styles/global.css        # ribbon styles, tokens reused; .toolbar rules replaced
├── i18n/en.json, ru.json        # + ribbon.*, command reasons, quick-access label
public/
└── licenses/lucide-LICENSE.txt  # ISC notice shipped with the app (FR-005)

tests/
├── unit/ui/fit.test.ts, shortcutLabel.test.ts, ribbonPrefs.test.ts
├── component/Ribbon.test.tsx, TitleBar.test.tsx, (updated) Playback.test.tsx, ArticulationControls.test.tsx
└── e2e/helpers.ts (+ openTab), us10-ribbon.spec.ts, existing specs updated to select tabs
```

**Structure Decision**: a single web project, as before. Ribbon presentation goes in
`src/ui/Ribbon/`. Command semantics go in `src/ui/commands/`, which is UI-layer code and may read
the store; the lint layering rules are unchanged. Pure helpers (`fit.ts`, `layout.ts`,
`shortcutLabel.ts`) contain no React, so they can be unit-tested directly.

## Complexity Tracking

No violations. This section is not needed.
