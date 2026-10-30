# Quickstart & Validation: Recorder Composer

How to run the app and prove the feature works end to end. Details live in
[data-model.md](./data-model.md) and [contracts/](./contracts/).

## Prerequisites

- Node.js 20 LTS or newer, npm 10+
- A Chromium, Firefox or Safari browser (desktop)
- For e2e tests: `npx playwright install` once

## Setup and run

```powershell
npm install
npm run dev          # http://localhost:5173
npm run build        # static bundle in dist/
npm run preview      # serve the built bundle
```

## Automated checks (all must pass — constitution "Development Workflow")

```powershell
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint incl. i18next/no-literal-string
npm test             # Vitest: domain unit + property tests, component tests
npm run test:e2e     # Playwright end-to-end scenarios below
```

Key automated assertions:

| Check | Proves |
|-------|--------|
| `commands.property.test.ts` — 10 000 random edit sequences | No overlaps, no out-of-range notes (SC-005) |
| `serialization.property.test.ts` | `parse(serialize(m)) == m` (SC-006) |
| `fingering.snapshot.test.ts` | All 27 pitches have the reviewed fingering (SC-004) |
| `i18n.keys.test.ts` | `ru` and `en` key sets identical (SC-007) |
| `notation.test.ts` | Note values, ties across bars, rests, accidentals, key signatures |
| `naming.test.ts` | Examples table in [domain-api.md](./contracts/domain-api.md) |

## Manual / e2e validation scenarios

1. **Compose (US1)** — Open the app, click 8 cells to enter C D E F G A B C (do¹…do²). Drag one note
   onto its neighbour: it stops at the boundary and the neighbour is unchanged. Drag the top note
   above D7: it stays at D7. Box-select 3 notes, press Delete, then Ctrl+Z: they return.
2. **Synchronized views (US2)** — With the scale above, the staff shows C4–C5 written in treble clef
   and the fingering row shows one diagram under each note, vertically aligned with its rectangle.
   Stretch a note across a bar line: the staff shows a tie and still one fingering diagram. Hover the
   F♯ diagram: alternates tooltip appears. Hide the sheet panel: the others fill the space; reload:
   layout persists.
3. **Playback (US3)** — Set tempo to 60 and enter 4 quarter notes. Press Space: one note per second,
   the single playhead line crosses all panels and the playing fingering is highlighted. Pause,
   resume, then click the ruler at bar 1 beat 3: playback jumps there.
4. **Auto-save (US4)** — Edit a melody, close the tab within 1 s, reopen: the last edit is present
   and the same melody is opened. Export to `.rcm.json`, delete the melody (confirm prompt), import
   the file: it is identical. Import a random `.txt`: error shown, current melody untouched.
5. **Print (US5)** — Print → "Sheet + fingering", inspect print preview: title, clef, key and time
   signature, wrapped systems, a fingering under each note, no toolbar.
6. **Language & naming (US6)** — Switch to Russian: all labels Russian, keyboard shows до¹…ре³.
   Switch names to letters while in Russian: C¹…D³. Switch to English: C4…D6.
7. **Key & transpose (US7)** — Set key to F major: staff shows one flat; a B♭ note is spelled B♭.
   Transpose a melody that reaches D7 up by 2 semitones: dialog lists out-of-range notes and offers
   octave down or cancel.
8. **MIDI (US8, optional)** — Export MIDI, open in any MIDI player/DAW: pitches, lengths, tempo match.
9. **Performance (SC-002/003)** — Load the bundled 500-note fixture (`fixtures/long-500.rcm.json`):
   dragging a note updates staff and fingering with no visible lag (Performance panel: < 100 ms per
   edit); playhead stays on the sounding note.
