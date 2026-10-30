import { SOPRANO_BAROQUE } from './fingerings.soprano-baroque';
import type { Melody } from './types';

export type HoleState = 'open' | 'closed' | 'half';

export interface DoubleHole {
  left: HoleState;
  right: HoleState;
}

/** Thumb plus holes 1–5 (single) and 6–7 (double), top to bottom. */
export interface Fingering {
  thumb: HoleState;
  holes: [HoleState, HoleState, HoleState, HoleState, HoleState, DoubleHole, DoubleHole];
}

export interface LabeledFingering {
  fingering: Fingering;
  /** i18n key, e.g. `fingering.alt.trill` (Principle IV). */
  labelKey: string;
}

export interface FingeringEntry {
  pitch: number;
  standard: Fingering;
  /** Display-only hints (FR-011a); only those listed on the reference chart. */
  alternates: LabeledFingering[];
}

export const FINGERINGS: readonly FingeringEntry[] = SOPRANO_BAROQUE;

export function getFingering(pitch: number): FingeringEntry {
  const entry = FINGERINGS.find((e) => e.pitch === pitch);
  if (!entry) throw new Error(`No fingering for pitch ${pitch}`);
  return entry;
}

export interface FingeringRowItem {
  noteId: string;
  startTick: number;
  entry: FingeringEntry;
}

export function fingeringRow(m: Melody): FingeringRowItem[] {
  return [...m.notes]
    .sort((a, b) => a.start - b.start)
    .map((n) => ({ noteId: n.id, startTick: n.start, entry: getFingering(n.pitch) }));
}
