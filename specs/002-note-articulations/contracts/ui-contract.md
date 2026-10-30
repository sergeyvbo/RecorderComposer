# Contract: UI changes

This is a change to [001 ui-contract.md](../../001-recorder-composer/contracts/ui-contract.md). All
labels come from i18n keys in both `ru` and `en` (Principle IV).

## Toolbar: articulation group

The group sits in a new `ArticulationControls` toolbar group, after the edit controls.

| Control | Kind | State | Action |
|---------|------|-------|--------|
| Staccato | toggle button | `aria-pressed` = `true` (all selected staccato), `mixed` (some), `false` | not pressed → `setMark(ids, 'staccato')`; pressed → `setMark(ids, null)` |
| Tenuto | toggle button | as above, for tenuto | as above |
| Legato | toggle button | `aria-pressed` = `articulationState.legatoApplied` | not pressed → `setLegato(ids, true)`; pressed → `setLegato(ids, false)` |

- Every button is disabled when the selection is empty.
- Legato is disabled when it can neither apply nor remove anything.
- The buttons show Bravura glyphs (staccato dot, tenuto line, slur arc). Their accessible names and
  tooltips include the shortcut.

## Keyboard shortcuts

These shortcuts apply only when focus is not in a text input, and only when notes are selected.

| Key | Action |
|-----|--------|
| `S` | Toggle staccato on the selection |
| `T` | Toggle tenuto on the selection |
| `L` | Apply legato (slur) to the selection |
| `Shift+L` | Remove legato from the selection |

None of these conflicts with the existing shortcuts: Space, Home, Escape, Delete or Backspace,
arrows, and Ctrl/Cmd + Z/Y/A/C/X/V.

## Panels

- **Timeline**: a staccato dot or tenuto bar at the right end of the note rectangle. Slurred notes
  are joined by a thin arc above the rectangles. The marks are `aria-hidden`. The note's
  `aria-label` becomes, for example, "G5, staccato, slurred to next".
- **Sheet music** (screen and print): articulation glyphs opposite the stem, and slur curves, as
  described in research R5. Print staves reserve vertical room so that marks never overlap the
  fingering row.
- **Fingering panel**: unchanged.

## i18n keys (new)

| Key | en | ru |
|-----|----|----|
| `articulation.group` | Articulation | Штрихи |
| `articulation.staccato` | Staccato (S) | Стаккато (S) |
| `articulation.tenuto` | Tenuto (T) | Тенуто (T) |
| `articulation.legato` | Legato (L, Shift+L to remove) | Легато (L, Shift+L — убрать) |
| `articulation.a11y.staccato` | staccato | стаккато |
| `articulation.a11y.tenuto` | tenuto | тенуто |
| `articulation.a11y.slurred` | slurred to next | связано со следующей |
