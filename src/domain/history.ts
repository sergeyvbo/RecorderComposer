import type { EditResult, Melody } from './types';

/** Snapshot undo/redo (R2). Melodies are immutable, so snapshots share structure. */
export interface History {
  past: Melody[];
  present: Melody;
  future: Melody[];
  cap: number;
}

export function createHistory(initial: Melody, cap = 200): History {
  return { past: [], present: initial, future: [], cap };
}

export function apply(h: History, result: EditResult): History {
  if (!result.ok || result.melody === h.present) return h;
  const past = [...h.past, h.present];
  if (past.length > h.cap) past.splice(0, past.length - h.cap);
  return { ...h, past, present: result.melody, future: [] };
}

export const canUndo = (h: History): boolean => h.past.length > 0;
export const canRedo = (h: History): boolean => h.future.length > 0;

export function undo(h: History): History {
  const prev = h.past.at(-1);
  if (!prev) return h;
  return { ...h, past: h.past.slice(0, -1), present: prev, future: [h.present, ...h.future] };
}

export function redo(h: History): History {
  const next = h.future[0];
  if (!next) return h;
  return { ...h, past: [...h.past, h.present], present: next, future: h.future.slice(1) };
}

/** Replace the present without recording (e.g. updatedAt bookkeeping, opening a melody). */
export const replacePresent = (h: History, melody: Melody): History => ({ ...h, present: melody });
