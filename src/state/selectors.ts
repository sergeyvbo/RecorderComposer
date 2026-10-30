import { fingeringRow, type FingeringRowItem } from '@/domain/fingering';
import { layoutNotation, type NotationModel } from '@/domain/notation';
import type { Melody } from '@/domain/types';
import { selectMelody, type AppState } from './store';

/** Memoize a derived view on melody object identity (melodies are immutable). */
function memoByMelody<T>(fn: (m: Melody) => T): (m: Melody) => T {
  const cache = new WeakMap<Melody, T>();
  return (m) => {
    let v = cache.get(m);
    if (v === undefined) {
      v = fn(m);
      cache.set(m, v);
    }
    return v;
  };
}

export const notationOf = memoByMelody(layoutNotation);
export const fingeringRowOf = memoByMelody(fingeringRow);

export const selectNotation = (s: AppState): NotationModel => notationOf(selectMelody(s));
export const selectFingeringRow = (s: AppState): FingeringRowItem[] => fingeringRowOf(selectMelody(s));
