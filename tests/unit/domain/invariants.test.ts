import { describe, expect, it } from 'vitest';
import { checkInvariants } from '@/domain/invariants';
import { melodyWith, Q } from './helpers';

describe('checkInvariants: articulation (002 data-model invariant 6)', () => {
  it('reports slurNext on the last note', () => {
    const m = melodyWith([
      { id: 'a', pitch: 72, start: 0, duration: Q },
      { id: 'b', pitch: 74, start: Q, duration: Q, slurNext: true },
    ]);
    expect(checkInvariants(m)).toEqual(['note b: slurNext on last note']);
  });

  it('accepts slurNext on any other note and mark on any note', () => {
    const m = melodyWith([
      { id: 'a', pitch: 72, start: 0, duration: Q, slurNext: true, mark: 'staccato' },
      { id: 'b', pitch: 74, start: Q, duration: Q, slurNext: true },
      { id: 'c', pitch: 76, start: 3 * Q, duration: Q, mark: 'tenuto' },
    ]);
    expect(checkInvariants(m)).toEqual([]);
  });
});
