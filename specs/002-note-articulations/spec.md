# Feature Specification: Note Articulations (Legato, Staccato, Tenuto)

**Feature Branch**: `002-note-articulations`

**Created**: 2026-10-30

**Status**: Draft

**Input**: User description: "I want to add Legato, Staccato, Tenuto"

**Builds on**: [001-recorder-composer](../001-recorder-composer/spec.md). The timeline, sheet music,
fingering panel, playback, saving, printing and MIDI export all exist already.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mark notes as staccato or tenuto (Priority: P1)

A recorder learner is writing an exercise. They select one or more notes and mark them staccato
(short, detached) or tenuto (held for their full value). The marks appear in standard notation on
the sheet music: a dot for staccato, a short horizontal line for tenuto. A marker on each note in
the timeline shows which articulation it has. They can change a note back to plain (no mark) at
any time.

**Why this priority**: Staccato and tenuto are single-note marks, the simplest articulations to
read and write. With these alone the melody already says how each note is tongued.

**Independent Test**: Add four notes, mark two staccato and one tenuto. Check that the sheet music
shows dots and a line on exactly those notes and the timeline shows matching markers. Undo, redo,
reload the page, and check the marks are kept each time.

**Acceptance Scenarios**:

1. **Given** a melody with a selected note, **When** the user applies staccato, **Then** the sheet
   music shows a staccato dot on that note and the timeline shows the staccato marker on it.
2. **Given** several selected notes, **When** the user applies tenuto, **Then** every selected note
   gets a tenuto line, in one undo step.
3. **Given** a staccato note, **When** the user applies tenuto to it, **Then** it becomes tenuto
   (a note has at most one of staccato / tenuto).
4. **Given** notes with marks, **When** the user clears the articulation, **Then** the marks are
   removed and the notes are plain again.
5. **Given** a marked melody, **When** the user reloads the page or reopens the melody, **Then**
   all marks are still there.

---

### User Story 2 - Join notes with a legato slur (Priority: P1)

The learner wants a phrase played smoothly, tonguing only its first note. They select two or more
consecutive notes and apply legato. The sheet music draws one slur (a curved line) from the first
to the last selected note. The timeline shows the notes as connected.

**Why this priority**: Legato is the third articulation the user asked for and the most common
marking in recorder music. It works on groups of notes rather than single notes, so it gets its
own story.

**Independent Test**: Add five notes, select notes 2–4 and apply legato. Check that the sheet
music shows one slur from note 2 to note 4 and none on notes 1 and 5. Remove the slur and check it
disappears.

**Acceptance Scenarios**:

1. **Given** three consecutive selected notes, **When** the user applies legato, **Then** one slur
   spans from the first to the last of them in the sheet music.
2. **Given** a single selected note that has a following note, **When** the user applies legato,
   **Then** that note is slurred to the next note.
3. **Given** a slur over notes 2–4, **When** the user applies legato to notes 4–6, **Then** one slur
   spans notes 2–6 (touching or overlapping slurs merge).
4. **Given** a slur over notes 2–5, **When** the user removes legato from note 3 or 4,
   **Then** the slur is split at the removed note and no slur passes through it.
5. **Given** a slur that crosses a barline or a staff line break in print, **Then** it is drawn
   continuing across the barline or break.
6. **Given** a selected note that is the last note of the melody, **When** the user applies
   legato to it alone, **Then** nothing changes and the command is unavailable (there is no
   next note to slur to).

---

### User Story 3 - Hear the articulations on playback (Priority: P2)

When the learner presses play, the articulations sound different, so they can hear how the
phrase should be played before trying it on the recorder.

**Why this priority**: The marks are useful on paper without sound. Hearing them helps learning,
but depends on stories 1 and 2.

**Independent Test**: Play a melody of four equal notes once plain, then staccato, then tenuto,
then slurred. Each version sounds clearly different from the plain one.

**Acceptance Scenarios**:

1. **Given** a staccato note, **When** it plays, **Then** it sounds for about half its written
   length, followed by silence until the next note.
2. **Given** a tenuto note, **When** it plays, **Then** it sounds for its full written length with
   a slightly stronger start than a plain note.
3. **Given** slurred notes, **When** they play, **Then** each note after the first follows without
   a gap and without a new tongued attack.
4. **Given** plain notes, **When** they play, **Then** they sound exactly as they do today.
5. **Given** an articulated note is playing, **Then** the playhead and the highlight of the playing
   note still follow the written note values (a staccato note stays highlighted for its whole
   written length).

---

### User Story 4 - Keep articulations in files, print and MIDI (Priority: P3)

Articulations go wherever the melody goes: exported melody files, printed sheet music (with or
without fingerings) and, where the format allows, MIDI export.

**Why this priority**: Saving to the device (story 1) already keeps the marks. Sharing and printing
complete the feature but are not needed to use it.

**Independent Test**: Mark a melody with all three articulations, export it to a file, import the
file and compare. Print preview shows all marks. Export MIDI and check that staccato notes are
shorter.

**Acceptance Scenarios**:

1. **Given** a melody with articulations, **When** it is exported to a file and imported again,
   **Then** every mark and slur is identical.
2. **Given** a melody file saved before this feature, **When** it is opened, **Then** it opens
   without error and all its notes are plain.
3. **Given** a melody with articulations, **When** it is printed with or without fingerings,
   **Then** the printed staff shows the same dots, lines and slurs as the screen.
4. **Given** a melody with staccato notes, **When** it is exported as MIDI, **Then** those notes
   are about half their written length in the MIDI file. Slurred notes are full length with no
   gap, and tenuto notes are full length.

---

### Edge Cases

- **Editing marked notes**: moving, stretching, copying, cutting, pasting, duplicating a melody and
  transposing all keep each note's articulation. A pasted note keeps the mark it had when copied.
- **Deleting a slurred note**: if the deleted note was inside a slur, the slur closes up over the
  remaining neighbours when they are still next to each other. A slur left with one note disappears.
- **Moving a slurred note out of order**: if a note is dragged so that it is no longer next to its
  slur partners, it leaves the slur. The rest of the slur stays and is split if needed.
- **Rests inside a slur**: a slur may join two notes separated by a rest. On playback the rest is
  still silent. The note after the rest is not re-tongued.
- **Staccato inside a slur**: a note can be both slurred and staccato or tenuto, as in recorder
  music (portato). Playback shortens it as staccato, but without a new tongued attack.
- **Very short notes**: a staccato note of the shortest grid value (a thirty-second) still sounds
  audibly. It is never shortened to zero.
- **Mixed selection**: when the selected notes have different articulations, the controls show a
  mixed state. Applying a mark sets it on all of them.
- **Empty selection**: the articulation commands are unavailable when no note is selected.
- **Mark placement**: dots and lines are placed on the notehead side opposite the stem, as in
  standard notation, and never overlap the fingering diagram.

## Requirements *(mandatory)*

### Functional Requirements

**Marks on notes**

- **FR-001**: Each note MUST have a note mark, one of: none (default), staccato or tenuto.
- **FR-002**: Each note MUST also record whether it is slurred to the next note (legato).
  This is independent of the note mark, so a note can be both slurred and staccato or tenuto.
- **FR-003**: A slur MUST be shown as one curve over a maximal run of consecutive slurred notes
  plus the note that follows the run. The last note of the melody cannot be slurred onward.

**Applying articulations**

- **FR-004**: Users MUST be able to apply staccato, apply tenuto and clear the note mark on all
  selected notes from the toolbar and with keyboard shortcuts.
- **FR-005**: Users MUST be able to apply and remove legato on the selected notes:
  - Applying it to a selection of two or more notes slurs every selected note into the next one,
    except the last selected note.
  - Applying it to a single note slurs it to the following note.
  - Removing it unslurs the selected notes and the link into the first selected note, so no slur
    passes through any selected note.
- **FR-006**: Each articulation command MUST be one undoable and redoable step, whatever the number
  of notes it changes.
- **FR-007**: The toolbar MUST show the articulation state of the current selection: one mark,
  several (mixed) or none. A command MUST be unavailable when it would have no effect (for example,
  no selection, or legato on the melody's last note alone).

**Display**

- **FR-008**: The sheet music MUST show articulations in standard notation:
  - a staccato dot or a tenuto line on the notehead side opposite the stem;
  - a slur curve from the first to the last note of each slurred run, continuing across barlines
    and print line breaks.
- **FR-009**: The timeline MUST show each note's articulation with a distinct marker that is
  readable at the default zoom. Notes in one slur MUST be visibly connected.
- **FR-010**: Every articulation change MUST appear in all visible panels without a manual refresh,
  like every other edit.

**Editing**

- **FR-011**: Moving, stretching, copying, cutting, pasting, transposing and duplicating MUST keep
  each note's mark and slur link.
- **FR-012**: Deleting or moving notes MUST keep slurs well-formed:
  - a note only stays slurred to the note that actually follows it;
  - a slur MUST never span a note that is not part of it;
  - a slur left with fewer than two notes is removed.

**Playback and export**

- **FR-013**: Playback MUST make the articulations audible:
  - staccato sounds for about half of the written length, never less than an audible minimum;
  - tenuto sounds for the full written length with a slightly stronger attack than a plain note;
  - a note reached by a slur starts without a gap and without a new tongued attack;
  - plain notes sound exactly as before this feature.
- **FR-014**: The playhead and the playing-note highlight MUST follow written note values, not the
  shortened sounding length.
- **FR-015**: Melody files MUST store the note mark and slur link of every note. Export and import
  MUST round-trip them without loss.
- **FR-016**: Files and stored melodies from before this feature MUST open unchanged, with every
  note plain and unslurred. A file from a newer, unknown format MUST be refused with a clear
  message, as today.
- **FR-017**: Printed sheet music, with or without fingerings, MUST show the same articulations as
  the screen.
- **FR-018**: MIDI export MUST write staccato notes at about half their written length and tenuto
  and slurred notes at full length. The plain-note behavior of MIDI export is unchanged.

**Language and access**

- **FR-019**: All new labels, tooltips, shortcuts help and accessible names MUST be available in
  Russian and English. The articulation of a note MUST be included in its accessible description.

### Key Entities

- **Note** (extended): gains a *note mark* (none, staccato or tenuto) and a *slurred-to-next* flag.
  All existing attributes (pitch, start, length) and rules (range, single voice) are unchanged.
- **Slur** (derived, not stored): a maximal run of consecutive notes joined by slurred-to-next
  flags. It is used for display, playback and printing.
- **Melody file** (extended): carries the new note attributes. A new format version is needed;
  older versions are still read.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can mark a selection of notes staccato, tenuto or legato in at most two
  actions (select, then one click or one shortcut).
- **SC-002**: 100% of articulations survive undo/redo, reload, file export/import and printing in
  automated round-trip tests.
- **SC-003**: Articulation edits appear in all visible panels within the same 100 ms limit as other
  edits, for melodies of up to 500 notes.
- **SC-004**: In a listening check, a listener tells plain, staccato, tenuto and slurred versions
  of the same four-note phrase apart in at least 9 out of 10 trials.
- **SC-005**: All melodies saved before this feature open with identical notes, timing and pitches;
  zero files fail to load.
- **SC-006**: Every articulation is shown in standard notation that a recorder teacher can read
  without explanation: a dot, a line above or below the note, and a slur curve.

## Assumptions

- **Legato means a slur**: in written recorder music legato is shown as a slur over two or more
  notes, which means "tongue only the first note". Legato is not a single-note mark here.
- **Supported marks**: only the three requested articulations are added. Accents, fermatas,
  marcato, breath marks, ties and dynamics are out of scope.
- **Sound values**:
  - staccato ≈ 50% of written length;
  - tenuto = 100% of written length with a slightly stronger attack;
  - plain notes keep their current sound.
  These are common performance conventions; exact values are tuned during planning.
- **Fingering panel**: it is unchanged, because articulation does not change fingering. Marks are
  shown on the staff and timeline only.
- **Format version**: the melody file format version is increased by one. Loading an older version
  migrates it with all notes plain, in line with the project's data-format principle.
- **Keyboard shortcuts**: the specific keys are chosen during planning and must not conflict with
  existing shortcuts.
