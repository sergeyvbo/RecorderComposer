import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { fitLevels, type FitGroup, type GroupState } from '@/ui/Ribbon/fit';

const g = (id: string, full: number, iconsOnly: number, folded: number, hasSmall = true): FitGroup => ({
  id,
  widths: { full, iconsOnly, folded },
  hasSmall,
});
// a: first group (never folds); b: no small items (cannot lose labels).
const groups = [g('a', 200, 150, 40), g('b', 100, 100, 40, false), g('c', 120, 60, 40), g('d', 150, 80, 40)];
const states = (available: number) => Object.values(fitLevels(groups, available));
const RANK: Record<GroupState, number> = { full: 0, iconsOnly: 1, folded: 2 };

describe('fitLevels (003 FR-013, research R7)', () => {
  it('keeps every group full when there is room', () => {
    expect(states(570)).toEqual(['full', 'full', 'full', 'full']);
  });

  it('drops labels right to left first, skipping groups without small items', () => {
    expect(states(569)).toEqual(['full', 'full', 'full', 'iconsOnly']);
    expect(states(499)).toEqual(['full', 'full', 'iconsOnly', 'iconsOnly']);
    expect(states(439)).toEqual(['iconsOnly', 'full', 'iconsOnly', 'iconsOnly']);
  });

  it('then folds groups right to left, never the first', () => {
    expect(states(389)).toEqual(['iconsOnly', 'full', 'iconsOnly', 'folded']);
    expect(states(349)).toEqual(['iconsOnly', 'full', 'folded', 'folded']);
    expect(states(329)).toEqual(['iconsOnly', 'folded', 'folded', 'folded']);
    expect(states(10)).toEqual(['iconsOnly', 'folded', 'folded', 'folded']);
  });

  it('a wider ribbon never makes any group more compact (property)', () => {
    const group = fc.record({
      full: fc.integer({ min: 20, max: 300 }),
      shrink: fc.integer({ min: 0, max: 200 }),
      folded: fc.integer({ min: 10, max: 400 }),
      hasSmall: fc.boolean(),
    });
    fc.assert(
      fc.property(fc.array(group, { minLength: 1, maxLength: 6 }), fc.nat(1500), fc.nat(1500), (raw, w1, w2) => {
        const gs = raw.map((r, i) =>
          g(`g${i}`, r.full, r.hasSmall ? Math.max(10, r.full - r.shrink) : r.full, r.folded, r.hasSmall),
        );
        const [narrow, wide] = w1 < w2 ? [w1, w2] : [w2, w1];
        const a = fitLevels(gs, narrow);
        const b = fitLevels(gs, wide);
        return gs.every((x) => RANK[b[x.id] as GroupState] <= RANK[a[x.id] as GroupState]);
      }),
    );
  });
});
