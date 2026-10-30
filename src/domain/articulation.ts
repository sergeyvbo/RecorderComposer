import { done, fail } from './result';
import type { EditResult, Melody, Note, NoteMark, RejectReason } from './types';

/* Optional fields are omitted, never stored as null/false (data-model.md § Note). */
function withMark(n: Note, mark: NoteMark | null): Note {
  const copy = { ...n };
  if (mark) copy.mark = mark;
  else delete copy.mark;
  return copy;
}

function withSlurNext(n: Note, on: boolean): Note {
  const copy = { ...n };
  if (on) copy.slurNext = true;
  else delete copy.slurNext;
  return copy;
}

/** Set (or with `null` clear) the staccato/tenuto mark on the listed notes (FR-001, FR-004). */
export function setMark(m: Melody, ids: readonly string[], mark: NoteMark | null): EditResult {
  const idSet = new Set(ids);
  if (!m.notes.some((n) => idSet.has(n.id))) return fail('emptySelection');
  let changed = false;
  const notes = m.notes.map((n) => {
    if (!idSet.has(n.id) || (n.mark ?? null) === mark) return n;
    changed = true;
    return withMark(n, mark);
  });
  if (!changed) return fail('invalidArgs');
  return done({ ...m, notes }, []);
}

/**
 * Indices (in start order) whose `slurNext` setLegato would set to `on`, or why it refuses
 * (data-model.md § State transitions). An empty list means nothing would change.
 */
function legatoTargets(m: Melody, ids: readonly string[], on: boolean): number[] | RejectReason {
  const idSet = new Set(ids);
  const picked: number[] = [];
  m.notes.forEach((n, i) => idSet.has(n.id) && picked.push(i));
  const first = picked[0];
  if (first === undefined) return 'emptySelection';
  if (!on) return first > 0 ? [first - 1, ...picked] : picked;
  if (picked.length === 1) return first < m.notes.length - 1 ? picked : 'invalidArgs';
  // Rests between selected notes are fine; an unselected note between them is a gap.
  if (picked.some((idx, k) => k > 0 && idx !== (picked[k - 1] as number) + 1)) return 'notConsecutive';
  return picked.slice(0, -1);
}

const changing = (m: Melody, targets: readonly number[], on: boolean) =>
  targets.filter((i) => !!m.notes[i]?.slurNext !== on);

/** Apply (`on`) or remove legato on the listed notes, as one undo step (FR-005). */
export function setLegato(m: Melody, ids: readonly string[], on: boolean): EditResult {
  const targets = legatoTargets(m, ids, on);
  if (typeof targets === 'string') return fail(targets);
  const change = new Set(changing(m, targets, on));
  if (change.size === 0) return fail('invalidArgs');
  return done({ ...m, notes: m.notes.map((n, i) => (change.has(i) ? withSlurNext(n, on) : n)) }, []);
}

export interface Slur {
  fromNoteId: string;
  toNoteId: string;
  /** Every note of the run in start order, including the end note. */
  noteIds: string[];
}

/** Maximal runs of `slurNext` links plus the note that ends each run (FR-003). */
export function deriveSlurs(m: Melody): Slur[] {
  const slurs: Slur[] = [];
  let run: string[] = [];
  for (const n of m.notes) {
    if (run.length > 0 || n.slurNext) run.push(n.id);
    if (!n.slurNext && run.length > 0) {
      slurs.push({ fromNoteId: run[0] as string, toNoteId: n.id, noteIds: run });
      run = [];
    }
  }
  return slurs;
}

export interface ArticulationState {
  /** null = empty selection. */
  mark: NoteMark | 'none' | 'mixed' | null;
  /** Applying legato would change nothing (the Legato toggle shows pressed). */
  legatoApplied: boolean;
  /** False for an empty selection or the melody's last note alone; true for a selection with gaps. */
  canApplyLegato: boolean;
  /** Removing legato would clear at least one link. */
  canRemoveLegato: boolean;
}

/** Toolbar state of the selection (FR-007). */
export function articulationState(m: Melody, ids: readonly string[]): ArticulationState {
  const idSet = new Set(ids);
  const selected = m.notes.filter((n) => idSet.has(n.id));
  if (selected.length === 0) return { mark: null, legatoApplied: false, canApplyLegato: false, canRemoveLegato: false };
  const marks = new Set(selected.map((n) => n.mark ?? 'none'));
  const apply = legatoTargets(m, ids, true);
  const remove = legatoTargets(m, ids, false);
  return {
    mark: marks.size === 1 ? ([...marks][0] as NoteMark | 'none') : 'mixed',
    legatoApplied: apply === 'invalidArgs' || (typeof apply !== 'string' && changing(m, apply, true).length === 0),
    canApplyLegato: apply !== 'invalidArgs',
    canRemoveLegato: typeof remove !== 'string' && changing(m, remove, false).length > 0,
  };
}

/** Toggle target for a mark button or key: clear when every selected note already has it. */
export const toggledMark = (state: ArticulationState, mark: NoteMark): NoteMark | null =>
  state.mark === mark ? null : mark;

/**
 * Keep slurs well-formed after an edit (FR-012, data-model.md § Slur reconciliation). A note keeps
 * its link only if its new successor was later in the same run of `prev`, or — for fresh (just
 * added or pasted) notes — if the successor is fresh too. The last note never keeps a link. O(n).
 */
export function reconcileSlurs(prev: Melody, next: Melody, freshIds: readonly string[] = []): Melody {
  if (!next.notes.some((n) => n.slurNext)) return next;
  const fresh = new Set(freshIds);
  const position = new Map(prev.notes.map((n, i) => [n.id, i]));
  const runOf = new Map<string, number>();
  deriveSlurs(prev).forEach((s, r) => s.noteIds.forEach((id) => runOf.set(id, r)));

  let changed = false;
  const notes = next.notes.map((n, i) => {
    if (!n.slurNext) return n;
    const s = next.notes[i + 1];
    const keep =
      s !== undefined &&
      (fresh.has(n.id)
        ? fresh.has(s.id)
        : !fresh.has(s.id) &&
          runOf.has(n.id) &&
          runOf.get(n.id) === runOf.get(s.id) &&
          (position.get(s.id) as number) > (position.get(n.id) as number));
    if (keep) return n;
    changed = true;
    return withSlurNext(n, false);
  });
  return changed ? { ...next, notes } : next;
}
