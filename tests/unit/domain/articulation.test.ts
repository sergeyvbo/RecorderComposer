import { describe, expect, it } from 'vitest';
import { articulationState, deriveSlurs, reconcileSlurs, setLegato, setMark } from '@/domain/articulation';
import type { EditResult, Melody } from '@/domain/types';
import { melodyWith, Q } from './helpers';

function ok(r: EditResult): Melody {
  if (!r.ok) throw new Error(`expected ok, got ${r.reason}`);
  return r.melody;
}
const reasonOf = (r: EditResult) => (r.ok ? 'ok' : r.reason);

/** Four quarter notes a, b, c, d. */
const four = (patch: Partial<Record<'a' | 'b' | 'c' | 'd', object>> = {}) =>
  melodyWith(
    (['a', 'b', 'c', 'd'] as const).map((id, i) => ({ id, pitch: 72 + i, start: i * Q, duration: Q, ...patch[id] })),
  );

describe('setMark (FR-001, FR-004)', () => {
  it('sets the mark on every listed note and leaves the others alone', () => {
    const m = ok(setMark(four(), ['a', 'c'], 'staccato'));
    expect(m.notes.map((n) => n.mark)).toEqual(['staccato', undefined, 'staccato', undefined]);
    expect(m.notes[1]).toEqual(four().notes[1]);
  });

  it('replaces staccato with tenuto (one mark per note)', () => {
    const m = ok(setMark(four({ a: { mark: 'staccato' } }), ['a'], 'tenuto'));
    expect(m.notes[0]!.mark).toBe('tenuto');
  });

  it('null deletes the key instead of storing null', () => {
    const m = ok(setMark(four({ a: { mark: 'staccato' }, b: { mark: 'tenuto' } }), ['a', 'b'], null));
    expect('mark' in m.notes[0]!).toBe(false);
    expect('mark' in m.notes[1]!).toBe(false);
  });

  it('never touches slurNext', () => {
    const m = ok(setMark(four({ a: { slurNext: true } }), ['a', 'b'], 'tenuto'));
    expect(m.notes[0]!.slurNext).toBe(true);
    expect('slurNext' in m.notes[1]!).toBe(false);
  });

  it('fails with emptySelection when no listed note exists', () => {
    expect(reasonOf(setMark(four(), [], 'staccato'))).toBe('emptySelection');
    expect(reasonOf(setMark(four(), ['zz'], 'staccato'))).toBe('emptySelection');
  });

  it('fails with invalidArgs when nothing changes', () => {
    expect(reasonOf(setMark(four({ a: { mark: 'staccato' } }), ['a'], 'staccato'))).toBe('invalidArgs');
    expect(reasonOf(setMark(four(), ['a'], null))).toBe('invalidArgs');
  });
});

describe('articulationState.mark (FR-007)', () => {
  const m = four({ a: { mark: 'staccato' }, b: { mark: 'staccato' }, c: { mark: 'tenuto' } });
  it.each([
    [[], null],
    [['a', 'b'], 'staccato'],
    [['c'], 'tenuto'],
    [['d'], 'none'],
    [['a', 'c'], 'mixed'],
    [['a', 'd'], 'mixed'],
  ] as const)('%j → %s', (ids, expected) => {
    expect(articulationState(m, ids).mark).toBe(expected);
  });
});

/** Notes 1…count, quarter notes back to back; ids are '1', '2', … */
const row = (count: number, linked: number[] = [], extra: Record<string, object> = {}) =>
  melodyWith(
    Array.from({ length: count }, (_, i) => {
      const id = String(i + 1);
      return {
        id,
        pitch: 72 + i,
        start: i * Q,
        duration: Q,
        ...(linked.includes(i + 1) ? { slurNext: true as const } : {}),
        ...extra[id],
      };
    }),
  );
const links = (m: Melody) => m.notes.filter((n) => n.slurNext).map((n) => n.id);

describe('setLegato (FR-005)', () => {
  it('with 3 selected notes the first 2 get slurNext', () => {
    expect(links(ok(setLegato(row(5), ['2', '3', '4'], true)))).toEqual(['2', '3']);
  });

  it('with 1 note, that note slurs to the next', () => {
    expect(links(ok(setLegato(row(5), ['3'], true)))).toEqual(['3']);
  });

  it('the last note alone fails with invalidArgs', () => {
    expect(reasonOf(setLegato(row(5), ['5'], true))).toBe('invalidArgs');
  });

  it('a selection with gaps fails with notConsecutive', () => {
    expect(reasonOf(setLegato(row(5), ['1', '3'], true))).toBe('notConsecutive');
  });

  it('a rest between selected notes is not a gap', () => {
    const m = melodyWith([
      { id: 'a', pitch: 72, start: 0, duration: Q },
      { id: 'b', pitch: 74, start: 3 * Q, duration: Q },
    ]);
    expect(links(ok(setLegato(m, ['a', 'b'], true)))).toEqual(['a']);
  });

  it('2–4 then 4–6 gives one chain from 2 to 6', () => {
    const m = ok(setLegato(ok(setLegato(row(7), ['2', '3', '4'], true)), ['4', '5', '6'], true));
    expect(links(m)).toEqual(['2', '3', '4', '5']);
    expect(deriveSlurs(m)).toEqual([{ fromNoteId: '2', toNoteId: '6', noteIds: ['2', '3', '4', '5', '6'] }]);
  });

  it('removing on note 3 of a 2–5 run clears 2→3 and 3→4 and leaves 4→5', () => {
    expect(links(ok(setLegato(row(6, [2, 3, 4]), ['3'], false)))).toEqual(['4']);
  });

  it('fails with emptySelection or invalidArgs when there is nothing to do', () => {
    expect(reasonOf(setLegato(row(3), [], true))).toBe('emptySelection');
    expect(reasonOf(setLegato(row(3), ['zz'], false))).toBe('emptySelection');
    expect(reasonOf(setLegato(row(3, [1]), ['1', '2'], true))).toBe('invalidArgs');
    expect(reasonOf(setLegato(row(3), ['2'], false))).toBe('invalidArgs');
  });

  it('never touches mark', () => {
    const m = ok(setLegato(row(3, [], { '1': { mark: 'staccato' } }), ['1', '2'], true));
    expect(m.notes.map((n) => n.mark)).toEqual(['staccato', undefined, undefined]);
  });
});

describe('deriveSlurs and legato state (FR-003, FR-007)', () => {
  it('lists runs in start order including the end note', () => {
    expect(deriveSlurs(row(7, [1, 2, 5]))).toEqual([
      { fromNoteId: '1', toNoteId: '3', noteIds: ['1', '2', '3'] },
      { fromNoteId: '5', toNoteId: '6', noteIds: ['5', '6'] },
    ]);
  });

  it('allows a rest between notes of a run', () => {
    const m = melodyWith([
      { id: 'a', pitch: 72, start: 0, duration: Q, slurNext: true },
      { id: 'b', pitch: 74, start: 3 * Q, duration: Q },
    ]);
    expect(deriveSlurs(m)).toEqual([{ fromNoteId: 'a', toNoteId: 'b', noteIds: ['a', 'b'] }]);
  });

  it('no links, no slurs', () => {
    expect(deriveSlurs(row(4))).toEqual([]);
  });

  it('legatoApplied, canApplyLegato and canRemoveLegato', () => {
    const m = row(5, [2, 3]);
    expect(articulationState(m, [])).toMatchObject({ legatoApplied: false, canApplyLegato: false, canRemoveLegato: false });
    expect(articulationState(m, ['2', '3', '4'])).toMatchObject({ legatoApplied: true, canApplyLegato: true, canRemoveLegato: true });
    expect(articulationState(m, ['1', '2'])).toMatchObject({ legatoApplied: false, canApplyLegato: true, canRemoveLegato: true });
    expect(articulationState(m, ['4'])).toMatchObject({ legatoApplied: false, canApplyLegato: true, canRemoveLegato: true });
    // A selection with gaps can be attempted, so the refusal can be reported.
    expect(articulationState(m, ['1', '5'])).toMatchObject({ legatoApplied: false, canApplyLegato: true });
    // The last note alone: nothing to apply; removable only when a slur leads into it.
    expect(articulationState(m, ['5'])).toMatchObject({ legatoApplied: true, canApplyLegato: false, canRemoveLegato: false });
    expect(articulationState(row(5, [4]), ['5'])).toMatchObject({ canApplyLegato: false, canRemoveLegato: true });
  });
});

describe('reconcileSlurs (FR-012, data-model § Slur reconciliation)', () => {
  const del = (m: Melody, id: string) => ({ ...m, notes: m.notes.filter((n) => n.id !== id) });
  const moveTo = (m: Melody, id: string, start: number) => ({
    ...m,
    notes: m.notes.map((n) => (n.id === id ? { ...n, start } : n)).sort((a, b) => a.start - b.start),
  });

  it('deleting a middle note closes the run up', () => {
    const prev = row(5, [1, 2, 3]);
    expect(links(reconcileSlurs(prev, del(prev, '2')))).toEqual(['1', '3']);
  });

  it('deleting the last note of a run ends the run at the previous note', () => {
    const prev = row(5, [1, 2, 3]);
    expect(links(reconcileSlurs(prev, del(prev, '4')))).toEqual(['1', '2']);
  });

  it('a run left with one note disappears', () => {
    const prev = row(4, [1]);
    expect(links(reconcileSlurs(prev, del(prev, '2')))).toEqual([]);
  });

  it('dragging a note out of the run clears its link; the run continues around the gap', () => {
    const prev = row(5, [1, 2]);
    const next = reconcileSlurs(prev, moveTo(prev, '2', 10 * Q));
    expect(links(next)).toEqual(['1']);
    expect(deriveSlurs(next)).toEqual([{ fromNoteId: '1', toNoteId: '3', noteIds: ['1', '3'] }]);
  });

  it('adding or pasting a note between slurred notes splits the run', () => {
    const prev = melodyWith([
      { id: 'a', pitch: 72, start: 0, duration: Q, slurNext: true },
      { id: 'b', pitch: 74, start: 2 * Q, duration: Q, slurNext: true },
      { id: 'c', pitch: 76, start: 3 * Q, duration: Q },
    ]);
    const next = { ...prev, notes: [prev.notes[0]!, { id: 'x', pitch: 80, start: Q, duration: Q }, ...prev.notes.slice(1)] };
    expect(links(reconcileSlurs(prev, next, ['x']))).toEqual(['b']);
  });

  it('a pasted slurred pair stays slurred; a pasted link to an existing note does not', () => {
    const prev = melodyWith([{ id: 'e', pitch: 76, start: 6 * Q, duration: Q }]);
    const next = {
      ...prev,
      notes: [
        { id: 'p1', pitch: 72, start: 4 * Q, duration: Q, slurNext: true as const },
        { id: 'p2', pitch: 74, start: 5 * Q, duration: Q, slurNext: true as const },
        ...prev.notes,
      ],
    };
    expect(links(reconcileSlurs(prev, next, ['p1', 'p2']))).toEqual(['p1']);
  });

  it('moving a whole run or transposing changes nothing', () => {
    const prev = row(4, [1, 2]);
    const moved = { ...prev, notes: prev.notes.map((n) => ({ ...n, start: n.start + 8 * Q, pitch: n.pitch + 2 })) };
    expect(reconcileSlurs(prev, moved)).toEqual(moved);
  });

  it('the last note never keeps slurNext', () => {
    const prev = row(3, [1, 2]);
    expect(links(reconcileSlurs(prev, del(prev, '3')))).toEqual(['1']);
  });
});
