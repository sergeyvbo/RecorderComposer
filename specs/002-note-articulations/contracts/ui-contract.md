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
- A toggle that is both pressed and disabled (for example Legato with only the melody's last note
  selected) is styled differently from an enabled pressed toggle: no accent fill, an accent outline
  and reduced opacity. The rule is `.toggle[aria-pressed='true']:disabled` in
  `src/ui/styles/global.css`.
- Applying legato to a selection with gaps is refused with `notConsecutive` (see Refusal messages).
- The buttons show Bravura glyphs (staccato dot, tenuto line, slur arc). Their accessible names and
  tooltips include the shortcut.

## Keyboard shortcuts

These shortcuts apply only when focus is not in a text input. With nothing selected they show the
`edit.emptySelection` message.

| Key | Action |
|-----|--------|
| `S` | Toggle staccato on the selection |
| `T` | Toggle tenuto on the selection |
| `L` | Apply legato (slur) to the selection |
| `Shift+L` | Remove legato from the selection |

None of these conflicts with the existing shortcuts: Space, Home, Escape, Delete or Backspace,
arrows, and Ctrl/Cmd + Z/Y/A/C/X/V.

## Refusal messages (FR-020)

Every refused command shows its message in the existing edit hint (`EditHint`, `role="status"`,
`aria-live="polite"`) for about 2.5 seconds. Refusing the same command again shows the message
again. This applies to the existing editing commands as well as the new ones.

| Reason | When | Key |
|--------|------|-----|
| `noRoom` | no free space for the note | `edit.noRoom` (existing) |
| `outOfRange` | the note would leave C5–D7 | `edit.outOfRange` (existing) |
| `emptySelection` | a command or key that acts on the selection, with nothing selected (Delete, arrows, Ctrl/Cmd+C/X, S, T, L, Shift+L) | `edit.emptySelection` (existing) |
| `invalidArgs` | the command would change nothing, for example legato on the last note alone via `L` | `edit.invalidArgs` (existing) |
| `notConsecutive` | legato on a selection with gaps | `edit.notConsecutive` |
| `clipboardEmpty` | paste with an empty clipboard | `edit.clipboardEmpty` |
| `nothingToUndo` / `nothingToRedo` | undo or redo with an empty history | `edit.nothingToUndo` / `edit.nothingToRedo` |

Adjustments (clamped or shortened edits that still succeed) keep their current behaviour.

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
| `edit.notConsecutive` | Legato needs consecutive notes: the selection has gaps | Легато ставится только на ноты подряд: в выделении есть пропуски |
| `edit.clipboardEmpty` | The clipboard is empty | Буфер обмена пуст |
| `edit.nothingToUndo` | Nothing to undo | Нечего отменять |
| `edit.nothingToRedo` | Nothing to redo | Нечего повторять |
