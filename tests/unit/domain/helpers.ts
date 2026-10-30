import { createEmptyMelody, type Melody, type Note } from '@/domain/types';

export function idGen(prefix = 'n') {
  let i = 0;
  return () => `${prefix}${++i}`;
}

export function melodyWith(notes: Omit<Note, 'id'>[] | Note[]): Melody {
  const m = createEmptyMelody('2026-01-01T00:00:00.000Z', 'm1');
  return {
    ...m,
    notes: notes
      .map((n, i) => ({ id: 'id' in n ? n.id : `x${i + 1}`, ...n }))
      .sort((a, b) => a.start - b.start),
  };
}

export const Q = 480;
export const E = 240;
export const S = 120;
