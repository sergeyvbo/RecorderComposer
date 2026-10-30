import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { deriveSlurs, setLegato, setMark } from '@/domain/articulation';
import { addNote, deleteNotes, moveNotes, pasteNotes, resizeNote, type ClipboardNote } from '@/domain/commands';
import { checkInvariants } from '@/domain/invariants';
import { createEmptyMelody, SNAP_VALUES, type EditResult, type Melody } from '@/domain/types';

type Op =
  | { k: 'add'; pitch: number; start: number; duration: number; snap: number }
  | { k: 'move'; pick: number[]; dTicks: number; dPitch: number; snap: number }
  | { k: 'resize'; pick: number; edge: 'start' | 'end'; toTick: number; snap: number }
  | { k: 'delete'; pick: number[] }
  | { k: 'paste'; pick: number[]; at: number; snap: number }
  | { k: 'mark'; pick: number[]; mark: 'staccato' | 'tenuto' | null }
  | { k: 'legato'; pick: number[]; on: boolean };

const snap = fc.constantFrom(...SNAP_VALUES);
const tick = fc.integer({ min: 0, max: 8000 });
const pick = fc.array(fc.nat(30), { maxLength: 4 });
const op: fc.Arbitrary<Op> = fc.oneof(
  { arbitrary: fc.record({ k: fc.constant('add' as const), pitch: fc.integer({ min: 72, max: 98 }), start: tick, duration: fc.integer({ min: 60, max: 1500 }), snap }), weight: 5 },
  fc.record({ k: fc.constant('move' as const), pick, dTicks: fc.integer({ min: -3000, max: 3000 }), dPitch: fc.integer({ min: -5, max: 5 }), snap }),
  fc.record({ k: fc.constant('resize' as const), pick: fc.nat(30), edge: fc.constantFrom('start' as const, 'end' as const), toTick: tick, snap }),
  fc.record({ k: fc.constant('delete' as const), pick }),
  fc.record({ k: fc.constant('paste' as const), pick, at: tick, snap }),
  fc.record({ k: fc.constant('mark' as const), pick, mark: fc.constantFrom('staccato' as const, 'tenuto' as const, null) }),
  { arbitrary: fc.record({ k: fc.constant('legato' as const), pick: fc.array(fc.nat(30), { minLength: 1, maxLength: 4 }), on: fc.boolean() }), weight: 3 },
);

/** For each note in a slurred run of `m`, the run index and the note's position in start order. */
function runIndex(m: Melody) {
  const pos = new Map(m.notes.map((n, i) => [n.id, i]));
  const run = new Map<string, number>();
  deriveSlurs(m).forEach((s, r) => s.noteIds.forEach((id) => run.set(id, r)));
  return { pos, run };
}

/** contracts/domain-api.md § Invariants: every link after a step is justified by the step. */
function unjustifiedLinks(prev: Melody, next: Melody, fresh: ReadonlySet<string>, fromLegato: boolean): string[] {
  if (fromLegato) return [];
  const { pos, run } = runIndex(prev);
  const bad: string[] = [];
  next.notes.forEach((n, i) => {
    const s = next.notes[i + 1];
    if (!n.slurNext || !s) return;
    if (fresh.has(n.id) && fresh.has(s.id)) return;
    const sameRunLater = run.has(n.id) && run.get(n.id) === run.get(s.id) && (pos.get(s.id) ?? -1) > (pos.get(n.id) ?? Infinity);
    if (!sameRunLater) bad.push(`${n.id}→${s.id}`);
  });
  return bad;
}

function check(ops: Op[]) {
  let id = 0;
  const deps = { newId: () => `n${++id}` };
  let m = createEmptyMelody('2026-01-01T00:00:00.000Z', 'm');
  const ids = (p: number[]) => [...new Set(p.map((i) => m.notes[i % Math.max(1, m.notes.length)]?.id).filter((x): x is string => !!x))];
  for (const o of ops) {
    let r: EditResult | null = null;
    switch (o.k) {
      case 'add':
        r = addNote(m, { pitch: o.pitch, start: o.start, duration: o.duration, snap: o.snap as never }, deps);
        break;
      case 'move':
        r = moveNotes(m, ids(o.pick), { dTicks: o.dTicks, dPitch: o.dPitch, snap: o.snap as never });
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
        const clip: ClipboardNote[] = sel.map((n, i) => ({
          pitch: n.pitch,
          offset: n.start - first,
          duration: n.duration,
          ...(n.mark ? { mark: n.mark } : {}),
          ...(n.slurNext && i < sel.length - 1 ? { slurNext: true as const } : {}),
        }));
        r = pasteNotes(m, clip, o.at, o.snap as never, deps);
        break;
      }
      case 'mark':
        r = setMark(m, ids(o.pick), o.mark);
        break;
      case 'legato':
        r = setLegato(m, ids(o.pick), o.on);
        break;
    }
    if (!r?.ok) continue;
    expect(checkInvariants(r.melody)).toEqual([]);
    expect(unjustifiedLinks(m, r.melody, new Set(r.ids ?? []), o.k === 'legato')).toEqual([]);
    m = r.melody;
  }
}

describe('articulation under random edits (FR-012)', () => {
  it('every step keeps the invariants and only justified slur links', () => {
    fc.assert(
      fc.property(fc.array(op, { minLength: 10, maxLength: 60, size: 'max' }), check),
      { numRuns: 3000 },
    );
  });
});
