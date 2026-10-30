import { reconcileSlurs } from './articulation';
import { isAllowedKey } from './keys';
import { done, fail } from './result';
import {
  GRID_MIN,
  MAX_PITCH,
  MAX_TEMPO,
  MAX_TITLE,
  MIN_PITCH,
  MIN_TEMPO,
  TIME_SIGNATURES,
  noteEnd,
  type AdjustReason,
  type EditResult,
  type Key,
  type Melody,
  type MoveDelta,
  type Note,
  type NoteMark,
  type SnapTicks,
  type TimeSignature,
} from './types';

export interface CommandDeps {
  newId: () => string;
}

export interface ClipboardNote {
  pitch: number;
  /** Ticks after the first copied note's start. */
  offset: number;
  duration: number;
  mark?: NoteMark;
  /** Slurred into the next copied note (only between notes consecutive in the melody). */
  slurNext?: true;
}

/**
 * Note-changing commands end here: slurs are reconciled against the melody before the edit
 * (FR-012). `fresh` are the ids the command created.
 */
const keepSlurs = (prev: Melody, r: EditResult, fresh: readonly string[] = []): EditResult =>
  r.ok ? { ...r, melody: reconcileSlurs(prev, r.melody, fresh) } : r;

const sortNotes = (notes: Note[]): Note[] => [...notes].sort((a, b) => a.start - b.start);
const withNotes = (m: Melody, notes: Note[]): Melody => ({ ...m, notes: sortNotes(notes) });
const clampPitch = (p: number) => Math.min(MAX_PITCH, Math.max(MIN_PITCH, Math.round(p)));
const roundTo = (t: number, step: number) => Math.round(t / step) * step;
const floorTo = (t: number, step: number) => Math.floor(t / step) * step;

const overlaps = (start: number, end: number, n: Note) => start < noteEnd(n) && n.start < end;

/** The free gap [start, end) containing tick `t`, or null when `t` lies inside a note. */
function freeGapAt(others: Note[], t: number): { start: number; end: number } | null {
  let start = 0;
  for (const n of others) {
    if (t >= n.start && t < noteEnd(n)) return null;
    if (noteEnd(n) <= t) start = Math.max(start, noteEnd(n));
    else if (n.start > t) return { start, end: n.start };
  }
  return { start, end: Infinity };
}

const fitsFree = (others: Note[], start: number, end: number) =>
  start >= 0 && !others.some((n) => overlaps(start, end, n));

/**
 * Place a note starting at `start`: full length if free, shortened to the free gap if at least
 * one grid step is available, otherwise null (FR-006).
 */
function placeInGap(others: Note[], start: number, duration: number, step: number) {
  const gap = freeGapAt(others, start);
  if (!gap) return null;
  const available = gap.end - start;
  if (available >= duration) return { start, duration, shortened: false };
  if (available >= Math.min(step, duration)) return { start, duration: available, shortened: true };
  return null;
}

export function addNote(
  m: Melody,
  args: { pitch: number; start: number; duration: number; snap: SnapTicks },
  deps: CommandDeps,
): EditResult {
  const r = insertNote(m, args, deps);
  return keepSlurs(m, r, r.ok ? r.ids : []);
}

function insertNote(
  m: Melody,
  args: { pitch: number; start: number; duration: number; snap: SnapTicks },
  deps: CommandDeps,
): EditResult {
  const adjusted: AdjustReason[] = [];
  const pitch = clampPitch(args.pitch);
  if (pitch !== Math.round(args.pitch)) adjusted.push('clampedToRange');
  const start = Math.max(0, floorTo(args.start, args.snap));
  const duration = Math.max(args.snap, roundTo(args.duration, args.snap));
  const placed = placeInGap(m.notes, start, duration, args.snap);
  if (!placed) return fail('noRoom');
  if (placed.shortened) adjusted.push('shortenedToFit');
  const id = deps.newId();
  return done(withNotes(m, [...m.notes, { id, pitch, start: placed.start, duration: placed.duration }]), adjusted, {
    ids: [id],
  });
}

export function moveNotes(
  m: Melody,
  ids: readonly string[],
  args: MoveDelta & { snap: SnapTicks; lastValid?: MoveDelta },
): EditResult {
  return keepSlurs(m, shiftNotes(m, ids, args));
}

function shiftNotes(
  m: Melody,
  ids: readonly string[],
  args: MoveDelta & { snap: SnapTicks; lastValid?: MoveDelta },
): EditResult {
  const idSet = new Set(ids);
  const selected = m.notes.filter((n) => idSet.has(n.id));
  if (selected.length === 0) return fail('emptySelection');
  const others = m.notes.filter((n) => !idSet.has(n.id));
  const adjusted: AdjustReason[] = [];

  // Pitch: clamp the delta so every selected note stays in range (monophony is time-only).
  const minP = Math.min(...selected.map((n) => n.pitch));
  const maxP = Math.max(...selected.map((n) => n.pitch));
  const wantP = Math.round(args.dPitch);
  const dPitch = Math.min(MAX_PITCH - maxP, Math.max(MIN_PITCH - minP, wantP));
  if (dPitch !== wantP) adjusted.push('clampedToRange');

  // Time: snap the anchor (first selected note) to the grid; never before 0.
  const first = selected[0] as Note;
  const minStart = Math.min(...selected.map((n) => n.start));
  let dTicks = roundTo(first.start + args.dTicks, args.snap) - first.start;
  dTicks = Math.max(-minStart, dTicks);

  const shifted = (d: number) => selected.map((n) => ({ ...n, start: n.start + d, pitch: n.pitch + dPitch }));
  const allFit = (d: number) => shifted(d).every((n) => fitsFree(others, n.start, noteEnd(n)));

  if (allFit(dTicks)) {
    return done(withNotes(m, [...others, ...shifted(dTicks)]), adjusted, { applied: { dTicks, dPitch } });
  }
  if (selected.length === 1) {
    const placed = placeInGap(others, first.start + dTicks, first.duration, args.snap);
    if (placed) {
      adjusted.push('shortenedToFit');
      const moved = { ...first, pitch: first.pitch + dPitch, start: placed.start, duration: placed.duration };
      return done(withNotes(m, [...others, moved]), adjusted, { applied: { dTicks, dPitch } });
    }
  }
  // Target starts inside another note (or a group does not fit): stay at the last valid position.
  adjusted.push('clampedToNeighbor');
  const fallback = args.lastValid && allFit(args.lastValid.dTicks) ? args.lastValid.dTicks : 0;
  if (!allFit(fallback)) {
    return done(m, adjusted, { applied: { dTicks: 0, dPitch: 0 } });
  }
  return done(withNotes(m, [...others, ...shifted(fallback)]), adjusted, { applied: { dTicks: fallback, dPitch } });
}

export function resizeNote(
  m: Melody,
  id: string,
  args: { edge: 'start' | 'end'; toTick: number; snap: SnapTicks },
): EditResult {
  return keepSlurs(m, stretchNote(m, id, args));
}

function stretchNote(
  m: Melody,
  id: string,
  args: { edge: 'start' | 'end'; toTick: number; snap: SnapTicks },
): EditResult {
  const note = m.notes.find((n) => n.id === id);
  if (!note) return fail('emptySelection');
  const others = m.notes.filter((n) => n.id !== id);
  const adjusted: AdjustReason[] = [];
  const target = roundTo(args.toTick, args.snap);
  if (args.edge === 'end') {
    const nextStart = Math.min(Infinity, ...others.filter((n) => n.start >= noteEnd(note)).map((n) => n.start));
    const minEnd = note.start + Math.min(args.snap, nextStart - note.start);
    let end = Math.max(minEnd, target);
    if (end > nextStart) {
      end = nextStart;
      adjusted.push('clampedToNeighbor');
    }
    return done(withNotes(m, [...others, { ...note, duration: Math.max(GRID_MIN, end - note.start) }]), adjusted);
  }
  const end = noteEnd(note);
  const prevEnd = Math.max(0, ...others.filter((n) => noteEnd(n) <= note.start).map(noteEnd));
  const maxStart = end - Math.min(args.snap, end - prevEnd);
  let start = Math.min(maxStart, target);
  if (start < prevEnd) {
    start = prevEnd;
    if (prevEnd > 0 || target < 0) adjusted.push('clampedToNeighbor');
  }
  start = Math.max(0, start);
  return done(withNotes(m, [...others, { ...note, start, duration: Math.max(GRID_MIN, end - start) }]), adjusted);
}

export function deleteNotes(m: Melody, ids: readonly string[]): EditResult {
  const idSet = new Set(ids);
  const notes = m.notes.filter((n) => !idSet.has(n.id));
  if (notes.length === m.notes.length) return fail('emptySelection');
  return keepSlurs(m, done({ ...m, notes }, []));
}

export function pasteNotes(
  m: Melody,
  clipboard: readonly ClipboardNote[],
  atTick: number,
  snap: SnapTicks,
  deps: CommandDeps,
): EditResult {
  if (clipboard.length === 0) return fail('emptySelection');
  const base = Math.max(0, floorTo(atTick, snap));
  let current = m;
  const adjusted: AdjustReason[] = [];
  const ids: string[] = [];
  for (const c of clipboard) {
    const r = insertNote(current, { pitch: c.pitch, start: base + c.offset, duration: c.duration, snap: GRID_MIN as SnapTicks }, deps);
    if (!r.ok) return fail('noRoom');
    const articulation = { ...(c.mark ? { mark: c.mark } : {}), ...(c.slurNext ? { slurNext: c.slurNext } : {}) };
    current = { ...r.melody, notes: r.melody.notes.map((n) => (r.ids?.includes(n.id) ? { ...n, ...articulation } : n)) };
    adjusted.push(...(r.adjusted ?? []));
    ids.push(...(r.ids ?? []));
  }
  return keepSlurs(m, done(current, adjusted, { ids }), ids);
}

export function setTempo(m: Melody, bpm: number): EditResult {
  if (!Number.isInteger(bpm) || bpm < MIN_TEMPO || bpm > MAX_TEMPO) return fail('invalidArgs');
  return done({ ...m, tempoBpm: bpm }, []);
}

export function setTimeSignature(m: Melody, ts: TimeSignature): EditResult {
  const known = TIME_SIGNATURES.find((x) => x.beats === ts.beats && x.beatUnit === ts.beatUnit);
  if (!known) return fail('invalidArgs');
  return done({ ...m, timeSignature: known }, []);
}

export function setTitle(m: Melody, title: string): EditResult {
  const t = title.trim();
  if (t.length < 1 || t.length > MAX_TITLE) return fail('invalidArgs');
  return done({ ...m, title: t }, []);
}

/** Changes key signature and spelling only; pitches never move (FR-027). */
export function setKey(m: Melody, key: Key): EditResult {
  if (!isAllowedKey(key)) return fail('invalidArgs');
  return done({ ...m, key: { tonic: key.tonic, mode: key.mode } }, []);
}

export { freeGapAt };

const TONIC_PC: Record<string, number> = { C: 0, 'C#': 1, D: 2, Eb: 3, E: 4, F: 5, 'F#': 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };

/** Nearest interval (−6…+6 semitones, ties upward) from one key's tonic to another's. */
export function semitonesBetween(from: Key, to: Key): number {
  const d = (((TONIC_PC[to.tonic] ?? 0) - (TONIC_PC[from.tonic] ?? 0)) % 12 + 12) % 12;
  return d > 6 ? d - 12 : d;
}

export interface TransposePreview {
  ok: boolean;
  /** Ids of affected notes that would leave the range. */
  outOfRange: string[];
  octaveUpOk: boolean;
  octaveDownOk: boolean;
}

const affected = (m: Melody, ids?: readonly string[]) => {
  const set = ids ? new Set(ids) : null;
  return m.notes.filter((n) => !set || set.has(n.id));
};
const inRange = (p: number) => p >= MIN_PITCH && p <= MAX_PITCH;

/** Which notes a transposition would push out of range, and whether an octave shift fixes it. */
export function previewTranspose(m: Melody, semitones: number, ids?: readonly string[]): TransposePreview {
  const notes = affected(m, ids);
  const outOfRange = notes.filter((n) => !inRange(n.pitch + semitones)).map((n) => n.id);
  const ok = outOfRange.length === 0;
  const allFit = (d: number) => notes.every((n) => inRange(n.pitch + d));
  return { ok, outOfRange, octaveUpOk: !ok && allFit(semitones + 12), octaveDownOk: !ok && allFit(semitones - 12) };
}

/** Shift affected notes by `semitones`; refuses (never drops or moves notes) if any would leave the range. */
export function transpose(m: Melody, semitones: number, ids?: readonly string[], targetKey?: Key): EditResult {
  if (!Number.isInteger(semitones)) return fail('invalidArgs');
  if (targetKey && !isAllowedKey(targetKey)) return fail('invalidArgs');
  if (!previewTranspose(m, semitones, ids).ok) return fail('outOfRange');
  const set = ids ? new Set(ids) : null;
  const notes = m.notes.map((n) => (!set || set.has(n.id) ? { ...n, pitch: n.pitch + semitones } : n));
  return done({ ...m, notes, ...(targetKey ? { key: { tonic: targetKey.tonic, mode: targetKey.mode } } : {}) }, []);
}
