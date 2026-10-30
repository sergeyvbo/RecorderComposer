import type { AdjustReason, EditResult, Melody } from './types';

/** Result helpers shared by all domain commands. */
export const fail = (reason: Extract<EditResult, { ok: false }>['reason']): EditResult => ({ ok: false, reason });

export function done(melody: Melody, adjusted: AdjustReason[], extra: Partial<Extract<EditResult, { ok: true }>> = {}): EditResult {
  const unique = [...new Set(adjusted)];
  return { ok: true, melody, ...(unique.length ? { adjusted: unique } : {}), ...extra };
}
