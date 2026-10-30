# Feature Specification: Recorder Composer

**Feature Branch**: `001-recorder-composer`

**Created**: 2026-10-29

**Status**: Draft

**Input**: User description: "Web application 'Recorder Composer' for writing music for the soprano baroque
recorder and learning to play it with fingering charts and playback. Three resizable, toggleable
panels: a composing timeline with a piano keyboard covering the recorder's range, synchronized sheet
music, and a fingering chart per note. Draw melodies (add, move, stretch, delete, drag and drop,
multi-selection; no polyphony, no out-of-range notes), play/pause with tempo and a position tracked on
all panels, store melodies, optional MIDI export, print sheet music with or without fingerings, Russian
and English interface, do-re-mi and CDEFGAB note names, selectable keys with transposition." (source:
`plan.txt`, UI sketch `ui.png`)

## Clarifications

### Session 2026-10-29

- Q: How are overlaps resolved when a note is moved or stretched into a neighbour? → A: Clamp to the
  neighbour — the edited note stops at the neighbour's boundary; a dropped note is shortened to fit
  the free gap, or the drop is refused if there is no room; neighbours are never changed.
- Q: Do the three panels share one horizontal time axis on screen? → A: Yes — all panels scroll and
  zoom together; staff notes and fingering diagrams sit at their note's start time; one play-marker
  line spans all panels. Print uses its own wrapped page layout.
- Q: How are octaves labelled on note names? → A: By interface language, always at written pitch:
  Russian uses first/second/third octave numbering (C¹–D³ / до¹–ре³); English uses scientific
  numbering (C4–D6 / do4–re6).
- Q: Explicit save or auto-save? → A: Auto-save — every change is persisted shortly after it is made;
  a library lets users create, open, rename, duplicate and delete melodies; no unsaved-changes prompts.
- Q: Are alternate fingerings shown in v1? → A: As a hint only — the standard fingering is always
  shown; hovering (or tapping) a diagram shows common alternates in a tooltip; they cannot be chosen
  per note and are not printed.
- Q (from /speckit-analyze): Can a dragged note jump over its neighbour? → A: Yes, into any free gap
  (shortened to fit if needed); if the target starts inside another note, the note stops at the
  boundary. Multi-selections are never shortened. Fingering reference: Yamaha baroque soprano chart
  only.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Compose a melody on the timeline (Priority: P1)

A recorder learner opens the app and draws a melody on the timeline panel. A vertical keyboard on the
left lists every note the soprano recorder can play; time runs left to right on a grid. The learner
clicks to place notes as colored rectangles, drags them to change pitch or position, drags their edges
to change length, selects several notes at once to move or delete them together, and undoes mistakes.

**Why this priority**: Writing a melody is the core purpose; every other panel and feature depends on
there being a melody.

**Independent Test**: With only the composing panel visible, a user can create, edit and delete a
melody of at least 16 notes, and the result never contains overlapping or out-of-range notes.

**Acceptance Scenarios**:

1. **Given** an empty melody, **When** the user clicks a grid cell in the row of a note, **Then** a
   note of the default length appears at that pitch and time.
2. **Given** a note on the timeline, **When** the user drags it up two rows, **Then** its pitch rises
   two semitones and its start time is unchanged unless also dragged horizontally.
3. **Given** a note, **When** the user drags its right edge, **Then** its length changes in grid
   steps and never becomes shorter than one grid step.
4. **Given** two notes, **When** the user moves or stretches one so it would overlap the other,
   **Then** the edited note stops at the neighbour's boundary (or is shortened to fit), the neighbour is
   unchanged, and the result contains no overlapping notes (see FR-006).
5. **Given** a note at the top of the range, **When** the user tries to drag it higher, **Then** it
   stays at the highest playable note.
6. **Given** several notes selected by box selection or modifier-click, **When** the user presses
   Delete or drags them, **Then** all selected notes are deleted or moved together.
7. **Given** any edit, **When** the user invokes undo and then redo, **Then** the melody returns to
   the state before the edit and then back to the state after it.

---

### User Story 2 - See sheet music and fingerings for the melody (Priority: P1)

While composing, the learner sees the same melody as standard sheet music in a second panel and as a
row of recorder fingering diagrams (one per note, showing which holes to cover) in a third panel.
Every edit on the timeline immediately appears in both. The learner can resize the panels and hide any
of them.

**Why this priority**: Learning to read music and finger notes is the learning goal; this is what
distinguishes the product from a generic piano-roll editor.

**Independent Test**: Draw a known scale (C5 to C6) and verify the staff shows the correct notes and
rhythms and the fingering panel shows the correct baroque fingering for each note, aligned in order.

**Acceptance Scenarios**:

1. **Given** a melody, **When** the user adds, moves, stretches or deletes a note, **Then** the sheet
   music and fingering chart reflect the change without any manual refresh.
2. **Given** a note of a given length, **Then** the sheet music shows the matching note value
   (whole, half, quarter, eighth, sixteenth, dotted values, ties across bar lines) and rests fill gaps.
3. **Given** any playable note, **Then** the fingering panel shows its standard baroque fingering,
   including thumb hole and half-covered holes where required.
4. **Given** a note whose pitch has common alternate fingerings, **When** the user hovers its
   diagram, **Then** a tooltip shows the alternates; the displayed standard fingering is unchanged.
5. **Given** the user selects a note in any panel, **Then** the same note is highlighted in the other
   two panels.
6. **Given** three panels, **When** the user drags a divider or toggles a panel off, **Then** the
   remaining panels resize to fill the space and the layout is remembered on the next visit.

---

### User Story 3 - Play back the melody (Priority: P2)

The learner presses Play to hear the melody at a chosen tempo, with a moving position marker shown on
the timeline (with a time ruler on top), on the sheet music, and on the fingering chart, so they can
follow along. Pause stops at the current position; Play resumes from there.

**Why this priority**: Hearing the melody and seeing the current fingering in sync is the main
practice aid, but composing and reading work without it.

**Independent Test**: Play a melody of quarter notes at 60 BPM and confirm one note per second sounds
and the marker reaches each note in all three panels as it sounds.

**Acceptance Scenarios**:

1. **Given** a melody, **When** the user presses Play, **Then** notes sound in order at the set tempo
   and the position marker moves across all visible panels.
2. **Given** playback in progress, **When** the user presses Pause, **Then** sound stops and the
   marker stays; pressing Play resumes from that point.
3. **Given** the user clicks the time ruler, **Then** the playback position moves to that time.
4. **Given** the user changes the tempo (range 30–240 BPM), **Then** subsequent playback uses the new
   tempo.
5. **Given** the playing note, **Then** its fingering diagram is highlighted.

---

### User Story 4 - Save and reopen melodies (Priority: P2)

The learner's melody is saved automatically as they work. A library lists all melodies; the learner
can create, open, rename, duplicate and delete them, and can export a melody to a file and import it
again (for backup or sharing).

**Why this priority**: Without saving, all work is lost on closing the page.

**Independent Test**: Create a melody, edit it, reload the app without any explicit save, and verify
it reopens identical (notes, tempo, key, time signature, title).

**Acceptance Scenarios**:

1. **Given** a new melody, **When** the user makes any edit, **Then** it appears in the library and
   the latest state survives closing and reopening the app, with no save action needed.
2. **Given** a saved melody, **When** the user exports it to a file and imports that file, **Then**
   the imported melody is identical to the original.
3. **Given** an invalid or unsupported file, **When** the user imports it, **Then** a clear error is
   shown and the current melody is untouched.
4. **Given** the user edits a melody and immediately opens another melody or closes the app, **Then**
   no edit is lost and no confirmation prompt is shown.
5. **Given** the user deletes a melody from the library, **Then** they are asked to confirm, since
   deletion cannot be undone.

---

### User Story 5 - Print sheet music (Priority: P3)

The learner prints the melody as sheet music only, or as sheet music with a fingering diagram under
each note, to practice away from the screen.

**Why this priority**: Valuable for practice, but secondary to on-screen composing and learning.

**Independent Test**: Print (or print-preview) a 3-bar melody in both modes and verify content and
layout.

**Acceptance Scenarios**:

1. **Given** a melody, **When** the user chooses "Print sheet music", **Then** the output contains the
   title, clef, key and time signature, all notes across as many lines/pages as needed, and no
   on-screen controls.
2. **Given** a melody, **When** the user chooses "Print with fingerings", **Then** each note has its
   fingering diagram aligned beneath it.

---

### User Story 6 - Choose language and note naming (Priority: P3)

The learner switches the interface between Russian and English and, independently, switches note names
between solfège (do re mi fa sol la si) and letters (C D E F G A B).

**Why this priority**: Required for the target audience, but does not block composing.

**Independent Test**: Switch each setting and verify every visible label and note name changes, and
the choice persists across visits.

**Acceptance Scenarios**:

1. **Given** English UI, **When** the user selects Russian, **Then** all interface text appears in
   Russian with no untranslated strings.
2. **Given** letter note names, **When** the user selects solfège, **Then** keyboard labels, tooltips
   and any printed note names use do–si (with sharp/flat signs as needed).

---

### User Story 7 - Change key and transpose (Priority: P3)

The learner selects a key for the melody (the sheet music shows its key signature) and can transpose
the whole melody into another key.

**Why this priority**: Useful for learning keys and adapting tunes, but most beginner melodies work in
one key.

**Independent Test**: Write a melody in C major, transpose it to G major, and verify every note moved
by the same interval, the key signature shows one sharp, and no note left the range.

**Acceptance Scenarios**:

1. **Given** a melody, **When** the user sets the key to F major, **Then** the staff shows one flat and
   note spellings follow the key (B♭ rather than A♯).
2. **Given** a melody, **When** the user transposes it to another key and every note stays within the
   range, **Then** all notes move by the same interval and the key changes.
3. **Given** a transposition that would push notes out of range, **Then** the user is told which notes
   would be affected and can choose the transposition one octave up or down instead, or cancel; notes
   are never silently dropped or moved.

---

### User Story 8 - Export as MIDI (Priority: P4, optional)

The learner exports the melody as a standard MIDI file to open it in other music software.

**Why this priority**: Explicitly optional in the request.

**Independent Test**: Export a melody and open it in any MIDI-capable program; pitches, lengths and
tempo match.

**Acceptance Scenarios**:

1. **Given** a melody, **When** the user exports MIDI, **Then** a file downloads whose notes, durations
   and tempo match the melody when opened elsewhere.

---

### Edge Cases

- Empty melody: Play, Print and Export are disabled or produce an empty result with a clear message;
  the sheet music panel shows an empty staff.
- A note ends exactly where the next begins: allowed (not an overlap).
- A long note crosses one or more bar lines: shown on the staff as tied notes; one fingering diagram.
- A note length that has no single note value (e.g. 5 sixteenths): shown as tied notes.
- Moving a multi-selection so any selected note would go out of range or overlap an unselected note:
  the whole move is limited or refused as a unit; the selection never splits.
- Editing the melody during playback: playback continues and uses the updated melody from the
  current position.
- Very long melodies (e.g. 500 notes): all panels scroll horizontally together and stay aligned.
- Many short notes close together (e.g. thirty-seconds): when horizontal zoom is too small for staff
  notes or fingering diagrams to fit without overlapping, the user can zoom in; diagrams MUST NOT be
  drawn on top of each other (they may be reduced in size or shown on hover).
- On-device storage is unavailable or full (private mode, cleared data, quota): the user is warned
  persistently that changes are not being saved and can still export to a file.
- Importing a file saved by an older version of the app: it opens correctly or a clear message
  explains why it can't.
- Audio cannot start (browser blocks sound until the user interacts): the first Play click starts
  sound; if audio is unavailable, the user is told.

## Requirements *(mandatory)*

### Functional Requirements

**Melody editing**

- **FR-001**: The timeline panel MUST show a vertical keyboard covering every chromatic note of the
  soprano baroque recorder range, C5 to D7 (sounding pitch), and a time grid aligned with it.
- **FR-002**: Users MUST be able to add a note by clicking the grid, move it by dragging (pitch and/or
  time), change its length by dragging its edges, and delete it.
- **FR-003**: Note positions and lengths MUST snap to a grid; the default step is a sixteenth note and
  the user MUST be able to choose quarter, eighth, sixteenth or thirty-second.
- **FR-004**: Users MUST be able to select multiple notes (box selection, modifier-click, select all)
  and move, copy/paste or delete them as a group.
- **FR-005**: The system MUST NOT allow any note outside the playable range; edits that would leave
  the range are limited to the nearest in-range pitch.
- **FR-006**: The melody MUST be monophonic: no two notes may sound at the same time. Overlaps MUST be
  resolved by clamping the edited note(s) only. Moving: if the note fits entirely in a free gap at
  the target position it is placed there, even beyond a neighbour; if the target starts in a free gap
  but would overlap the next note, the note is shortened to fit that gap (minimum one grid step); if
  the target starts inside another note, the note stays at its last valid position along the drag
  (it stops at the neighbour's boundary). A multi-selection moves as a unit and is never shortened:
  it is placed only where all selected notes fit, otherwise it stays at its last valid position.
  Resizing: a stretched edge stops where the neighbour begins (or ends). Non-edited notes MUST NOT be
  shortened, moved or deleted by this rule.
- **FR-007**: Every edit MUST be undoable and redoable (at least 100 steps).
- **FR-008**: Notes MUST be displayed with a color per pitch class, consistent across sessions, so
  the same note always has the same color.
- **FR-009**: Users MUST be able to set the time signature (at least 2/4, 3/4, 4/4, 6/8) and the
  timeline MUST show bar lines accordingly.

**Synchronized views**

- **FR-010**: The sheet music panel MUST show the melody in treble clef using standard recorder
  convention (written one octave below sounding pitch), with key signature, time signature, bar lines,
  correct note values, rests, ties and accidentals.
- **FR-011**: The fingering panel MUST show a baroque fingering diagram for each note, placed under
  that note on the shared time axis (FR-013a), including thumb hole, double holes and half-holes.
- **FR-011a**: For pitches that have common alternate fingerings, hovering or tapping a fingering
  diagram MUST show those alternates (diagram plus short label, e.g. "trill", "alternative") in a
  tooltip. Alternates are taken only from the reference chart (SC-004); pitches for which it lists
  none show no tooltip. Alternates are informational only: they cannot be assigned to a note, are not saved with
  the melody, and are not printed.
- **FR-012**: Every change to the melody MUST appear in all visible panels without a manual refresh.
- **FR-013**: Selecting or hovering a note in one panel MUST highlight the same note in the others.
- **FR-013a**: On screen, all three panels MUST share one horizontal time axis: they scroll and zoom
  together, each staff note and fingering diagram is positioned at its note's start time (vertically
  aligned with its timeline rectangle), and the playback position is one vertical line across all
  visible panels. Printed output (FR-023) uses a separate wrapped, page-based layout.
- **FR-014**: The three panels MUST be resizable by dragging dividers and individually toggleable on
  and off; the layout MUST be remembered between visits.

**Playback**

- **FR-015**: Users MUST be able to play and pause the melody; playback MUST sound each note at its
  pitch and length using a recorder-like sound (a soft, breathy, flute-like tone without a
  percussive attack).
- **FR-016**: A time ruler MUST be shown above the timeline; clicking it MUST move the playback
  position; during playback the view MUST auto-scroll to keep the playback line (FR-013a) visible.
- **FR-017**: Users MUST be able to set the tempo between 30 and 240 beats per minute.
- **FR-018**: The note currently playing MUST be highlighted, including its fingering diagram.

**Storage and export**

- **FR-019**: Melodies MUST be auto-saved on the user's device: every change is persisted within 1
  second of being made, and immediately when the app is hidden or closed, without any explicit save
  action. A library MUST let users create, list,
  open, rename, duplicate and delete melodies, each with a title, tempo, key, time signature and notes;
  the last opened melody reopens on the next visit.
- **FR-020**: Users MUST be able to export a melody to a file and import it again with no loss; the
  file format MUST carry a version so older files remain readable.
- **FR-021**: The system MUST NOT show unsaved-changes prompts (auto-save makes them unnecessary);
  deleting a melody from the library MUST require confirmation. Undo history covers the current
  session only.
- **FR-022**: Users MAY export the melody as a standard MIDI file (optional feature, lowest priority).

**Printing**

- **FR-023**: Users MUST be able to print the melody as sheet music only, or as sheet music with each
  note's fingering diagram beneath it, with title, key and time signature, and without on-screen
  controls.

**Language and naming**

- **FR-024**: The interface MUST be available in Russian and English, switchable at any time, with all
  text translated.
- **FR-025**: Note names MUST be displayable as solfège (do re mi fa sol la si) or letters
  (C D E F G A B), selectable independently of interface language.
- **FR-025a**: Note names shown to the user (keyboard labels, tooltips, any printed names) MUST use
  written pitch (one octave below sounding, matching the staff) and an octave label that depends on
  the interface language: Russian uses the Russian octave system (first octave starts at written
  C4), so the range reads C¹–D³ / до¹–ре³ (full form, e.g. "до первой октавы"); English uses
  scientific numbering, so the range reads C4–D6 / do4–re6. Naming style (FR-025) and octave system
  are independent: both work with solfège and letter names.
- **FR-026**: Language and note-name preferences MUST persist between visits; the default language
  follows the browser language (Russian or English, otherwise English).

**Keys and transposition**

- **FR-027**: Users MUST be able to choose the melody's key from all major and minor keys with up to
  four sharps or flats; the staff MUST show the key signature and spell notes accordingly.
- **FR-028**: Users MUST be able to transpose the whole melody (or a selection) to another key or by
  a chosen number of semitones; if any note would leave the range, the system MUST list affected notes
  and offer the octave-shifted alternative or cancel, never silently drop or move notes.

### Key Entities

- **Melody**: a composition — unique identifier, title, tempo, key, time signature, ordered list of
  notes, created and modified dates.
- **Note**: one sounded event — pitch (within range), start time and length (in grid units), with a
  spelling (e.g. F♯ vs G♭) derived from the key.
- **Fingering**: for each playable pitch, the open/closed/half-covered state of each hole (thumb,
  seven front holes, with the two lowest as double holes); one standard fingering per pitch, plus zero
  or more labelled alternates shown as hints (FR-011a).
- **Key**: tonic and mode (major/minor), defining the key signature and preferred spellings.
- **Preferences**: interface language, note-naming style, panel layout, snap value, horizontal zoom.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time user can enter a 16-note melody (e.g. "Twinkle Twinkle") and play it back
  within 5 minutes without instructions.
- **SC-002**: After any edit, the sheet music and fingering panels show the change in under 0.1 s for
  melodies up to 500 notes, with no noticeable delay.
- **SC-003**: During playback, the position marker is visually in time with the sound (no perceptible
  lag, under 50 ms) on all panels.
- **SC-004**: 100% of notes in the range C5–D7 show a fingering that matches Yamaha's official
  baroque (English) soprano recorder fingering chart, the single reference for fingerings.
- **SC-005**: No sequence of user edits produces overlapping notes or notes outside the range
  (verified by randomized editing tests).
- **SC-006**: An auto-saved or exported melody reopens identical to its last state in 100% of cases,
  including after the tab is closed within 1 second of the last edit.
- **SC-007**: 100% of interface text is available in both Russian and English.
- **SC-008**: Printed sheet music for a 32-bar melody fits on standard A4/Letter pages with readable
  notes and correctly aligned fingering diagrams.

## Assumptions

- Target users are individual recorder learners and hobbyists, using a desktop or laptop browser with
  a mouse or trackpad; touch-first and phone layouts are out of scope for v1 (tablets should work but
  are not optimized).
- Only the soprano (descant) recorder in C with baroque (English) fingering is supported; alto,
  tenor, bass and German fingering are out of scope for v1.
- Melodies are single-voice; lyrics, dynamics, articulation marks, repeats and multiple voices are
  out of scope for v1.
- Internally pitch is sounding pitch (C5–D7); written pitch and octave labels are display concerns.
- Notes are chromatic: all semitones in range are allowed (the keyboard shows black keys), not only
  the notes of the selected key.
- Setting the key changes the key signature and spelling only; it does not move notes. Moving notes
  is the separate Transpose action.
- There are no user accounts, server or cloud sync; melodies live on the user's device and in
  exported files.
- Sound is a synthesized recorder-like tone; realistic sampled sound is a nice-to-have.
- Default new melody: 4/4, 100 BPM, C major, sixteenth-note snap, quarter-note default length.
- The app works offline after it has loaded once (desirable, not required for v1).
