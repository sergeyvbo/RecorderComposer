<!--
Sync Impact Report
==================
Version change: (none — no prior constitution) → 1.0.0
Modified principles: n/a (initial ratification)
Added principles:
  - I. Single Melody Model, Synchronized Views
  - II. Instrument Fidelity (Soprano Baroque Recorder)
  - III. Test-First Music Domain Logic
  - IV. Bilingual by Design
  - V. Open, Versioned Data Formats
  - VI. Client-Side Simplicity
Added sections:
  - Technology & Quality Constraints
  - Development Workflow
  - Governance
Removed sections: none
Templates requiring updates:
  - ✅ .specify/templates/plan-template.md — Constitution Check gates list Principles I–VI
  - ✅ .specify/templates/tasks-template.md — tests marked REQUIRED (Principle III)
  - ✅ .specify/templates/spec-template.md — no change needed
  - ✅ .claude/skills/speckit-*/SKILL.md — generic; no change needed
  - ✅ README.md / runtime docs — none exist; nothing to update
Follow-up TODOs: none
-->

# Recorder Composer Constitution

## Core Principles

### I. Single Melody Model, Synchronized Views

- The application MUST hold exactly one in-memory melody model (notes, tempo, key, time
  signature) as the single source of truth.
- The composing timeline, the sheet-music panel, and the fingering-chart panel MUST be pure
  views derived from that model; no panel may keep its own divergent copy of note data.
- Every edit (add, move, stretch, delete, multi-select operations) MUST mutate the model
  through one command layer that supports undo/redo, and all visible panels MUST reflect the
  change without a manual refresh.
- The playback position MUST be a single shared value rendered by all three panels.

Rationale: three synchronized panels are the core product; a shared model makes sync
correct by construction instead of by coordination.

### II. Instrument Fidelity (Soprano Baroque Recorder)

- The playable range MUST be the soprano recorder range C5–D7 (sounding pitch); the editor
  MUST reject or clamp any note outside it.
- Melodies MUST be monophonic: overlapping notes are not allowed, and every edit operation
  MUST preserve this invariant (resolve or refuse overlaps, never store them).
- Fingerings MUST use baroque (English) fingering, kept as data (a lookup table per pitch,
  including enharmonics and documented alternates), not hard-coded in rendering code.
- Sheet music MUST follow standard recorder notation: treble clef, written one octave below
  sounding pitch (optionally marked 8va), applied consistently across screen, print, and
  export.
- Transposition between keys MUST either keep every note in range or report which notes
  would fall out of range; it MUST NOT silently drop or move notes.

Rationale: the app teaches a real instrument; wrong ranges or fingerings teach wrong
habits.

### III. Test-First Music Domain Logic

- Domain logic — pitch math, note naming, transposition, duration/quantization, overlap
  rules, fingering lookup, model-to-notation conversion, serialization, MIDI export — MUST
  live in framework-independent TypeScript modules with no React or DOM dependency.
- Domain code MUST be written test-first (failing test, then implementation) with unit
  tests covering the full instrument range and edge cases (range boundaries, enharmonics,
  overlaps, ties across bars).
- UI features MUST have at least one component or end-to-end test for their primary flow
  (e.g. draw a note → it appears in all three panels).
- CI/build MUST fail on type errors, lint errors, or failing tests.

Rationale: musical correctness is the hardest thing to eyeball and the cheapest to test in
isolation.

### IV. Bilingual by Design

- All user-facing strings MUST come from an i18n resource layer; Russian and English MUST
  both be complete for every released feature. Hard-coded UI text is a defect.
- Note-name display MUST support both solfège (do re mi fa sol la si) and letter names
  (C D E F G A B), selectable independently of UI language, through one shared formatter.
- Internal note representation MUST be language-neutral (e.g. MIDI number plus spelling),
  never a localized string.

Rationale: bilingual UI and dual naming are explicit requirements; retrofitting i18n is
far more costly than building with it.

### V. Open, Versioned Data Formats

- Melodies MUST be stored in a documented JSON format that carries an explicit
  `formatVersion`; loading an older version MUST either migrate it or fail with a clear
  message, never corrupt data.
- Save/load MUST round-trip losslessly (load(save(m)) equals m), enforced by tests.
- Export formats (MIDI, printable sheet music with or without fingering chart) MUST be
  generated from the same model and MUST NOT be the primary storage format.

Rationale: users' compositions must survive app updates and be portable.

### VI. Client-Side Simplicity

- The app MUST run fully in the browser with no required backend; local persistence
  (browser storage and file import/export) is the default.
- Prefer well-maintained open-source libraries (audio, notation, MIDI) over custom
  implementations, provided their licenses are compatible with open distribution; each new
  runtime dependency MUST be justified in the plan.
- YAGNI: optional features (MIDI export, auto-transposition) MUST NOT complicate the core
  model before they are scheduled.

Rationale: a personal learning tool benefits most from zero setup and a small codebase.

## Technology & Quality Constraints

- Language: TypeScript with `strict` mode; React for UI. No `any` in domain modules without
  an inline justification.
- Panels MUST be resizable and individually toggleable; layout state is a UI concern, kept
  out of the melody model.
- Interaction responsiveness: an edit MUST be visible in all open panels within 100 ms for
  melodies up to 500 notes; the playback cursor MUST stay visually aligned with audio
  (target drift < 50 ms).
- Accessibility: all toolbar actions MUST be keyboard-reachable and have accessible labels
  in both languages.
- Printing MUST produce clean output via print stylesheets or generated documents,
  without on-screen controls.

## Development Workflow

- Features follow the spec-kit flow: specify → clarify (as needed) → plan → tasks →
  implement. Each plan MUST include a Constitution Check against Principles I–VI and record
  any justified deviation in its complexity-tracking section.
- Domain tasks precede the UI tasks that depend on them; tests precede implementation
  within each task group (Principle III).
- Every change MUST pass type-check, lint, and the full test suite before it is considered
  done.
- Reviews (self or peer) MUST verify: single-model sync (I), range/monophony invariants
  (II), i18n completeness (IV), and format version handling for any storage change (V).

## Governance

- This constitution supersedes other project practices. Conflicts are resolved in its
  favor or by amending it.
- Amendments: propose the change with rationale, update this file and its Sync Impact
  Report, and propagate to dependent templates (plan, spec, tasks) in the same change.
- Versioning (semantic):
  - MAJOR — removing or redefining a principle in a backward-incompatible way.
  - MINOR — adding a principle or section, or materially expanding guidance.
  - PATCH — clarifications and wording fixes with no change in meaning.
- Compliance: every plan's Constitution Check and every review MUST confirm adherence;
  unjustified violations block merge.

**Version**: 1.0.0 | **Ratified**: 2026-10-29 | **Last Amended**: 2026-10-29
