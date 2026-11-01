import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { addNote, deleteNotes, duplicateNotes, moveNotes, pasteInsertionTick, pasteNotes, resizeNote } from '@/domain/commands';
import { checkInvariants } from '@/domain/invariants';
import { createEmptyMelody, SNAP_VALUES, type Melody } from '@/domain/types';

type Op =
  | { k: 'add'; pitch: number; start: number; duration: number; snap: number }
  | { k: 'move' | 'copy'; pick: number[]; dTicks: number; dPitch: number; snap: number; useLast: boolean }
  | { k: 'resize'; pick: number; edge: 'start' | 'end'; toTick: number; snap: number }
  | { k: 'delete'; pick: number[] }
  | { k: 'paste'; pick: number[]; at: number; snap: number };

const snap = fc.constantFrom(...SNAP_VALUES);
const tick = fc.integer({ min: -2000, max: 12000 });
const op: fc.Arbitrary<Op> = fc.oneof(
  { arbitrary: fc.record({ k: fc.constant('add' as const), pitch: fc.integer({ min: 50, max: 120 }), start: tick, duration: fc.integer({ min: -100, max: 4000 }), snap }), weight: 6 },
  fc.record({ k: fc.constantFrom('move' as const, 'copy' as const), pick: fc.array(fc.nat(30), { maxLength: 4 }), dTicks: fc.integer({ min: -5000, max: 5000 }), dPitch: fc.integer({ min: -40, max: 40 }), snap, useLast: fc.boolean() }),
  fc.record({ k: fc.constant('resize' as const), pick: fc.nat(30), edge: fc.constantFrom('start' as const, 'end' as const), toTick: tick, snap }),
  fc.record({ k: fc.constant('delete' as const), pick: fc.array(fc.nat(30), { maxLength: 3 }) }),
  fc.record({ k: fc.constant('paste' as const), pick: fc.array(fc.nat(30), { maxLength: 3 }), at: tick, snap }),
);

function run(ops: Op[]): Melody {
  let id = 0;
  const deps = { newId: () => `n${++id}` };
  let m = createEmptyMelody('2026-01-01T00:00:00.000Z', 'm');
  const ids = (pick: number[]) => [...new Set(pick.map((i) => m.notes[i % Math.max(1, m.notes.length)]?.id).filter((x): x is string => !!x))];
  for (const o of ops) {
    let r;
    switch (o.k) {
      case 'add':
        r = addNote(m, { pitch: o.pitch, start: o.start, duration: o.duration, snap: o.snap as never }, deps);
        break;
      case 'move':
        r = moveNotes(m, ids(o.pick), { dTicks: o.dTicks, dPitch: o.dPitch, snap: o.snap as never, ...(o.useLast ? { lastValid: { dTicks: 0, dPitch: 0 } } : {}) });
        break;
      case 'copy':
        r = duplicateNotes(m, ids(o.pick), { dTicks: o.dTicks, dPitch: o.dPitch, snap: o.snap as never, ...(o.useLast ? { lastValid: { dTicks: 0, dPitch: 0 } } : {}) }, deps);
        break;
      case 'resize': {
        const target = ids([o.pick])[0];
        r = target ? resizeNote(m, target, { edge: o.edge, toTick: o.toTick, snap: o.snap as never }) : null;
        break;
      }
      case 'delete':
        r = deleteNotes(m, ids(o.pick));
        break;
      case 'paste': {
        const sel = m.notes.filter((n) => ids(o.pick).includes(n.id));
        const first = sel[0]?.start ?? 0;
        const clip = sel.map((n) => ({ pitch: n.pitch, offset: n.start - first, duration: n.duration }));
        r = pasteNotes(m, clip, pasteInsertionTick(m, new Set(ids(o.pick)), o.at, o.snap as never), deps);
        break;
      }
    }
    if (r?.ok) m = r.melody;
  }
  return m;
}

describe('editing invariants (SC-005)', () => {
  it('random command sequences never break range, monophony or grid rules', () => {
    fc.assert(
      fc.property(fc.array(op, { minLength: 10, maxLength: 60, size: 'max' }), (ops) => {
        expect(checkInvariants(run(ops))).toEqual([]);
      }),
      { numRuns: 10_000 },
    );
  });
});
