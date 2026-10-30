/** Ticks per quarter note. Thirty-second = 60, sixteenth = 120, quarter = 480. */
export const PPQ = 480;
/** Lowest playable pitch of the soprano recorder (C5, sounding). */
export const MIN_PITCH = 72;
/** Highest playable pitch of the soprano recorder (D7, sounding). */
export const MAX_PITCH = 98;
/** Finest grid step (a thirty-second note). */
export const GRID_MIN = 60;
/** Written pitch is one octave below sounding pitch. */
export const WRITTEN_OFFSET = -12;

export type SnapTicks = 480 | 240 | 120 | 60;
export const SNAP_VALUES: readonly SnapTicks[] = [480, 240, 120, 60];

export interface Note {
  id: string;
  /** MIDI number at sounding pitch, MIN_PITCH..MAX_PITCH. */
  pitch: number;
  /** Ticks from the start, multiple of GRID_MIN. */
  start: number;
  /** Ticks, ≥ GRID_MIN, multiple of GRID_MIN. */
  duration: number;
  /** Absent = plain note. Never stored as `null` or `'none'` (002 data-model.md). */
  mark?: NoteMark;
  /** Slurred into the next note in start order. Absent = not slurred; never stored as `false`. */
  slurNext?: true;
}

export type NoteMark = 'staccato' | 'tenuto';

export type TimeSignature =
  | { beats: 2; beatUnit: 4 }
  | { beats: 3; beatUnit: 4 }
  | { beats: 4; beatUnit: 4 }
  | { beats: 6; beatUnit: 8 };

export const TIME_SIGNATURES: readonly TimeSignature[] = [
  { beats: 2, beatUnit: 4 },
  { beats: 3, beatUnit: 4 },
  { beats: 4, beatUnit: 4 },
  { beats: 6, beatUnit: 8 },
];

export type Tonic = 'C' | 'G' | 'D' | 'A' | 'E' | 'B' | 'F#' | 'C#' | 'F' | 'Bb' | 'Eb' | 'Ab';
export type Mode = 'major' | 'minor';
export interface Key {
  tonic: Tonic;
  mode: Mode;
}

export interface Melody {
  id: string;
  /** 1–120 chars after trim. */
  title: string;
  /** Integer 30–240. */
  tempoBpm: number;
  timeSignature: TimeSignature;
  key: Key;
  /** Sorted by start; range, monophony and grid invariants hold (data-model.md). */
  notes: Note[];
  createdAt: string;
  updatedAt: string;
}

export const MIN_TEMPO = 30;
export const MAX_TEMPO = 240;
export const MAX_TITLE = 120;
export const DEFAULT_TITLE = 'Untitled';

export type AdjustReason = 'clampedToRange' | 'clampedToNeighbor' | 'shortenedToFit';
export type RejectReason = 'noRoom' | 'outOfRange' | 'emptySelection' | 'invalidArgs' | 'notConsecutive';

export interface MoveDelta {
  dTicks: number;
  dPitch: number;
}

export type EditResult =
  | {
      ok: true;
      melody: Melody;
      adjusted?: AdjustReason[];
      /** moveNotes: the delta actually applied (feeds the next `lastValid` during a drag). */
      applied?: MoveDelta;
      /** addNote / pasteNotes: ids of created notes. */
      ids?: string[];
    }
  | { ok: false; reason: RejectReason };

export function createEmptyMelody(now: string, id: string, title: string = DEFAULT_TITLE): Melody {
  const trimmed = title.trim().slice(0, MAX_TITLE);
  return {
    id,
    title: trimmed || DEFAULT_TITLE,
    tempoBpm: 100,
    timeSignature: { beats: 4, beatUnit: 4 },
    key: { tonic: 'C', mode: 'major' },
    notes: [],
    createdAt: now,
    updatedAt: now,
  };
}

export const noteEnd = (n: Note): number => n.start + n.duration;
