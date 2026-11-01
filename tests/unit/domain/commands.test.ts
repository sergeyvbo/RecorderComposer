import { describe, expect, it } from 'vitest';
import {
  addNote,
  deleteNotes,
  duplicateNotes,
  moveNotes,
  pasteInsertionTick,
  pasteNotes,
  resizeNote,
  setTimeSignature,
  setTitle,
  setTempo,
  transpose,
} from '@/domain/commands';
import { defaultPreferences } from '@/state/prefs';
import { createAppStore } from '@/state/store';
import type { EditResult, Melody } from '@/domain/types';
import { checkInvariants } from '@/domain/invariants';
import { E, idGen, melodyWith, Q, S } from './helpers';

function ok(r: EditResult): Extract<EditResult, { ok: true }> {
  if (!r.ok) throw new Error(`expected ok, got ${r.reason}`);
  return r;
}
const byId = (m: Melody, id: string) => m.notes.find((n) => n.id === id)!;

describe('addNote', () => {
  it('adds at the snapped start with the given length', () => {
    const r = ok(addNote(melodyWith([]), { pitch: 72, start: 130, duration: Q, snap: S }, { newId: idGen() }));
    expect(r.melody.notes).toEqual([{ id: 'n1', pitch: 72, start: 120, duration: Q }]);
  });

  it('clamps pitch into the range', () => {
    const r = ok(addNote(melodyWith([]), { pitch: 110, start: 0, duration: Q, snap: S }, { newId: idGen() }));
    expect(r.melody.notes[0]!.pitch).toBe(98);
    expect(r.adjusted).toContain('clampedToRange');
  });

  it('shortens to fit a free gap before the next note', () => {
    const m = melodyWith([{ id: 'a', pitch: 74, start: Q, duration: Q }]);
    const r = ok(addNote(m, { pitch: 72, start: 240, duration: Q, snap: S }, { newId: idGen() }));
    expect(byId(r.melody, 'n1')).toMatchObject({ start: 240, duration: 240 });
    expect(r.adjusted).toContain('shortenedToFit');
    expect(byId(r.melody, 'a')).toEqual({ id: 'a', pitch: 74, start: Q, duration: Q });
  });

  it('refuses when the slot is occupied', () => {
    const m = melodyWith([{ id: 'a', pitch: 74, start: 0, duration: Q }]);
    expect(addNote(m, { pitch: 72, start: 120, duration: Q, snap: S }, { newId: idGen() })).toEqual({
      ok: false,
      reason: 'noRoom',
    });
  });

  it('refuses when the free gap is shorter than one grid step', () => {
    const m = melodyWith([
      { id: 'a', pitch: 74, start: 0, duration: 420 },
      { id: 'b', pitch: 74, start: Q, duration: Q },
    ]);
    expect(addNote(m, { pitch: 72, start: 420, duration: Q, snap: S }, { newId: idGen() })).toMatchObject({
      ok: false,
      reason: 'noRoom',
    });
  });
});

describe('duplicateNotes (Ctrl/Cmd-drag copy)', () => {
  const m = melodyWith([
    { id: 'a', pitch: 72, start: 0, duration: Q, mark: 'staccato', slurNext: true },
    { id: 'b', pitch: 76, start: Q, duration: Q },
    { id: 'c', pitch: 79, start: 4 * Q, duration: Q },
  ]);

  it('places copies in free space and keeps the originals, marks and the slur between copies', () => {
    const r = ok(duplicateNotes(m, ['a', 'b'], { dTicks: 2 * Q, dPitch: 2, snap: S }, { newId: idGen('k') }));
    expect(r.ids).toEqual(['k1', 'k2']);
    expect(r.melody.notes).toEqual([
      ...m.notes.slice(0, 2),
      { id: 'k1', pitch: 74, start: 2 * Q, duration: Q, mark: 'staccato', slurNext: true },
      { id: 'k2', pitch: 78, start: 3 * Q, duration: Q },
      m.notes[2],
    ]);
  });

  it('does not copy a slur onto a note that is not copied', () => {
    const r = ok(duplicateNotes(m, ['a'], { dTicks: 2 * Q, dPitch: 0, snap: S }, { newId: idGen('k') }));
    expect(byId(r.melody, 'k1')).toEqual({ id: 'k1', pitch: 72, start: 2 * Q, duration: Q, mark: 'staccato' });
    expect(byId(r.melody, 'a').slurNext).toBe(true);
  });

  it('a single copy is shortened to the free gap; on another note it stays at the last valid place', () => {
    const short = ok(duplicateNotes(m, ['b'], { dTicks: 2.5 * Q, dPitch: 0, snap: S }, { newId: idGen('k') }));
    expect(byId(short.melody, 'k1')).toMatchObject({ start: 3.5 * Q, duration: Q / 2 });
    const kept = ok(
      duplicateNotes(m, ['a'], { dTicks: 4 * Q, dPitch: 0, snap: S, lastValid: { dTicks: 2 * Q, dPitch: 0 } }, { newId: idGen('k') }),
    );
    expect(byId(kept.melody, 'k1').start).toBe(2 * Q);
  });

  it('refuses with noRoom when there is nowhere to put the copies', () => {
    expect(duplicateNotes(m, ['a'], { dTicks: S, dPitch: 0, snap: S }, { newId: idGen() })).toEqual({ ok: false, reason: 'noRoom' });
    expect(duplicateNotes(m, ['a', 'b', 'c'], { dTicks: Q, dPitch: 0, snap: S }, { newId: idGen() })).toEqual({ ok: false, reason: 'noRoom' });
    expect(duplicateNotes(m, [], { dTicks: Q, dPitch: 0, snap: S }, { newId: idGen() })).toEqual({ ok: false, reason: 'emptySelection' });
  });
});

describe('moveNotes (FR-006 clamp semantics)', () => {
  const m = melodyWith([
    { id: 'a', pitch: 72, start: 0, duration: Q },
    { id: 'b', pitch: 76, start: Q, duration: Q },
    { id: 'c', pitch: 79, start: 4 * Q, duration: Q },
  ]);

  it('moves into a free gap, even beyond a neighbour', () => {
    const r = ok(moveNotes(m, ['a'], { dTicks: 2 * Q, dPitch: 0, snap: S }));
    expect(byId(r.melody, 'a').start).toBe(2 * Q);
    expect(r.melody.notes.map((n) => n.id)).toEqual(['b', 'a', 'c']);
  });

  it('shortens a target that starts in a free gap but overlaps the next note', () => {
    const r = ok(moveNotes(m, ['b'], { dTicks: 2.5 * Q, dPitch: 0, snap: S }));
    expect(byId(r.melody, 'b')).toMatchObject({ start: 3.5 * Q, duration: Q / 2 });
    expect(r.adjusted).toContain('shortenedToFit');
  });

  it('stays at the last valid position when the target starts inside another note', () => {
    const r = ok(
      moveNotes(m, ['a'], { dTicks: Q + S, dPitch: 0, snap: S, lastValid: { dTicks: 0, dPitch: 0 } }),
    );
    expect(byId(r.melody, 'a').start).toBe(0);
    expect(r.adjusted).toContain('clampedToNeighbor');
  });

  it('touching notes are allowed', () => {
    const r = ok(moveNotes(m, ['c'], { dTicks: -2 * Q, dPitch: 0, snap: S }));
    expect(byId(r.melody, 'c').start).toBe(2 * Q);
    expect(byId(r.melody, 'b').start + byId(r.melody, 'b').duration).toBe(2 * Q);
  });

  it('moves a multi-selection as a unit and never shortens it', () => {
    const fits = ok(moveNotes(m, ['a', 'b'], { dTicks: 2 * Q, dPitch: 0, snap: S }));
    expect([byId(fits.melody, 'a').start, byId(fits.melody, 'b').start]).toEqual([2 * Q, 3 * Q]);
    const r = ok(moveNotes(m, ['a', 'b'], { dTicks: 2.5 * Q, dPitch: 0, snap: S, lastValid: { dTicks: 0, dPitch: 0 } }));
    // b would overlap c (4Q) → whole selection stays, unshortened.
    expect(byId(r.melody, 'a').start).toBe(0);
    expect(byId(r.melody, 'b')).toMatchObject({ start: Q, duration: Q });
    expect(r.adjusted).toContain('clampedToNeighbor');
  });

  it('clamps the pitch delta so every selected note stays in range', () => {
    const r = ok(moveNotes(m, ['a', 'c'], { dTicks: 0, dPitch: 30, snap: S }));
    expect(byId(r.melody, 'c').pitch).toBe(98);
    expect(byId(r.melody, 'a').pitch).toBe(72 + 19);
    expect(r.adjusted).toContain('clampedToRange');
  });

  it('never changes unselected notes', () => {
    const r = ok(moveNotes(m, ['b'], { dTicks: 2.5 * Q, dPitch: 3, snap: S }));
    expect(byId(r.melody, 'a')).toEqual(byId(m, 'a'));
    expect(byId(r.melody, 'c')).toEqual(byId(m, 'c'));
  });

  it('does not move before time 0', () => {
    const r = ok(moveNotes(m, ['a'], { dTicks: -Q, dPitch: 0, snap: S }));
    expect(byId(r.melody, 'a').start).toBe(0);
  });

  it('reports emptySelection', () => {
    expect(moveNotes(m, [], { dTicks: Q, dPitch: 0, snap: S })).toEqual({ ok: false, reason: 'emptySelection' });
  });
});

describe('resizeNote', () => {
  const m = melodyWith([
    { id: 'a', pitch: 72, start: 0, duration: Q },
    { id: 'b', pitch: 76, start: 2 * Q, duration: Q },
  ]);

  it('stretches the end in grid steps and stops where the neighbour begins', () => {
    expect(byId(ok(resizeNote(m, 'a', { edge: 'end', toTick: 1.5 * Q + 10, snap: S })).melody, 'a').duration).toBe(1.5 * Q);
    const r = ok(resizeNote(m, 'a', { edge: 'end', toTick: 3 * Q, snap: S }));
    expect(byId(r.melody, 'a').duration).toBe(2 * Q);
    expect(r.adjusted).toContain('clampedToNeighbor');
  });

  it('never becomes shorter than one grid step', () => {
    expect(byId(ok(resizeNote(m, 'a', { edge: 'end', toTick: 0, snap: S })).melody, 'a').duration).toBe(S);
  });

  it('moves the start edge and stops at the previous note end', () => {
    const r = ok(resizeNote(m, 'b', { edge: 'start', toTick: 0, snap: S }));
    expect(byId(r.melody, 'b')).toMatchObject({ start: Q, duration: 2 * Q });
    expect(r.adjusted).toContain('clampedToNeighbor');
  });
});

describe('deleteNotes / pasteNotes', () => {
  const m = melodyWith([
    { id: 'a', pitch: 72, start: 0, duration: Q },
    { id: 'b', pitch: 76, start: Q, duration: Q },
  ]);

  it('deletes selected notes', () => {
    expect(ok(deleteNotes(m, ['a'])).melody.notes.map((n) => n.id)).toEqual(['b']);
    expect(deleteNotes(m, [])).toEqual({ ok: false, reason: 'emptySelection' });
  });

});

describe('pasteNotes inserts and shifts later notes right', () => {
  // C D [rest] E: a rest of one quarter between D and E.
  const m = melodyWith([
    { id: 'c', pitch: 72, start: 0, duration: Q },
    { id: 'd', pitch: 74, start: Q, duration: Q, slurNext: true },
    { id: 'e', pitch: 76, start: 3 * Q, duration: Q },
  ]);
  // Two eighths with an eighth rest between them: span 3 eighths.
  const clip = [
    { pitch: 79, offset: 0, duration: E },
    { pitch: 81, offset: 2 * E, duration: E },
  ];
  const paste = (at: number) => ok(pasteNotes(m, clip, at, { newId: idGen('p') }));
  const layout = (r: { melody: Melody }) => r.melody.notes.map((n) => [n.id, n.start]);

  it('at the start: everything moves right by the pasted span', () => {
    const r = paste(0);
    expect(layout(r)).toEqual([['p1', 0], ['p2', 2 * E], ['c', 3 * E], ['d', 3 * E + Q], ['e', 3 * E + 3 * Q]]);
    expect(r.ids).toEqual(['p1', 'p2']);
  });

  it('between two notes: only the later notes move, and the rest after the paste is kept', () => {
    expect(layout(paste(2 * Q))).toEqual([['c', 0], ['d', Q], ['p1', 2 * Q], ['p2', 2 * Q + 2 * E], ['e', 3 * Q + 3 * E]]);
  });

  it('after the last note: appends, nothing moves', () => {
    expect(layout(paste(4 * Q))).toEqual([['c', 0], ['d', Q], ['e', 3 * Q], ['p1', 4 * Q], ['p2', 4 * Q + 2 * E]]);
  });

  it('a position inside a note moves to its nearest edge', () => {
    expect(layout(paste(Q + E / 2))[1]).toEqual(['p1', Q]);
    expect(layout(paste(2 * Q - E / 2))[2]).toEqual(['p1', 2 * Q]);
  });

  it('keeps marks and slurs between pasted notes; a slur across the insertion point is dropped', () => {
    const marked = [
      { pitch: 79, offset: 0, duration: Q, mark: 'tenuto' as const, slurNext: true as const },
      { pitch: 81, offset: Q, duration: Q },
    ];
    const r = ok(pasteNotes(m, marked, 2 * Q, { newId: idGen('p') }));
    expect(byId(r.melody, 'p1')).toMatchObject({ mark: 'tenuto', slurNext: true });
    // d was slurred into e; with notes pasted between them the slur no longer applies.
    expect('slurNext' in byId(r.melody, 'd')).toBe(false);
    expect(checkInvariants(r.melody)).toEqual([]);
  });

  it('an empty clipboard is refused', () => {
    expect(pasteNotes(m, [], 0, { newId: idGen() })).toEqual({ ok: false, reason: 'emptySelection' });
  });
});

describe('pasteInsertionTick', () => {
  const m = melodyWith([
    { id: 'c', pitch: 72, start: 0, duration: Q },
    { id: 'd', pitch: 74, start: Q, duration: Q },
    { id: 'e', pitch: 76, start: 3 * Q, duration: Q },
  ]);
  it('pastes right after the last selected note', () => {
    expect(pasteInsertionTick(m, new Set(['c', 'd']), 0, S)).toBe(2 * Q);
    expect(pasteInsertionTick(m, new Set(['e', 'c']), 0, S)).toBe(4 * Q);
  });
  it('uses the playhead, snapped down to the grid, when nothing is selected', () => {
    expect(pasteInsertionTick(m, new Set(), 0, S)).toBe(0);
    expect(pasteInsertionTick(m, new Set(), 5 * Q + 50, S)).toBe(5 * Q);
  });
});

describe('the store pastes after the selection', () => {
  it('copy then paste duplicates the selection right after it, selected', () => {
    const store = createAppStore(
      defaultPreferences('en'),
      { now: () => '2026-01-01T00:00:00.000Z', newId: idGen('s') },
      melodyWith([
        { id: 'c', pitch: 72, start: 0, duration: Q },
        { id: 'd', pitch: 74, start: Q, duration: Q },
      ]),
    );
    const { actions } = store.getState();
    actions.select(['c']);
    actions.copy();
    actions.paste(0);
    const notes = store.getState().melody.notes;
    expect(notes.map((n) => [n.pitch, n.start])).toEqual([[72, 0], [72, Q], [74, 2 * Q]]);
    expect([...store.getState().selection.ids]).toEqual([notes[1]?.id]);
    // Pasting again chains after the new copy.
    actions.paste(0);
    expect(store.getState().melody.notes.map((n) => n.start)).toEqual([0, Q, 2 * Q, 3 * Q]);
  });
});

describe('setters', () => {
  const m = melodyWith([]);
  it('validates tempo, time signature and title', () => {
    expect(ok(setTempo(m, 60)).melody.tempoBpm).toBe(60);
    expect(setTempo(m, 29)).toEqual({ ok: false, reason: 'invalidArgs' });
    expect(setTempo(m, 100.5)).toEqual({ ok: false, reason: 'invalidArgs' });
    expect(ok(setTimeSignature(m, { beats: 6, beatUnit: 8 })).melody.timeSignature).toEqual({ beats: 6, beatUnit: 8 });
    expect(setTimeSignature(m, { beats: 5, beatUnit: 4 } as never)).toEqual({ ok: false, reason: 'invalidArgs' });
    expect(ok(setTitle(m, '  Twinkle  ')).melody.title).toBe('Twinkle');
    expect(setTitle(m, '   ')).toEqual({ ok: false, reason: 'invalidArgs' });
    expect(setTitle(m, 'x'.repeat(121))).toEqual({ ok: false, reason: 'invalidArgs' });
  });
});

describe('editing keeps articulation (002 FR-011)', () => {
  const marked = () =>
    melodyWith([
      { id: 'a', pitch: 72, start: 0, duration: Q, mark: 'staccato' },
      { id: 'b', pitch: 76, start: 2 * Q, duration: Q, mark: 'tenuto' },
    ]);

  it('moveNotes, resizeNote and transpose keep the mark', () => {
    expect(byId(ok(moveNotes(marked(), ['a'], { dTicks: Q, dPitch: 1, snap: S })).melody, 'a').mark).toBe('staccato');
    expect(byId(ok(resizeNote(marked(), 'b', { edge: 'end', toTick: 4 * Q, snap: S })).melody, 'b').mark).toBe('tenuto');
    expect(ok(transpose(marked(), 2)).melody.notes.map((n) => n.mark)).toEqual(['staccato', 'tenuto']);
  });

  it('pasteNotes creates notes with the copied mark', () => {
    const clip = [
      { pitch: 72, offset: 0, duration: Q, mark: 'tenuto' as const },
      { pitch: 74, offset: Q, duration: Q },
    ];
    const r = ok(pasteNotes(marked(), clip, 8 * Q, { newId: idGen('p') }));
    expect(byId(r.melody, 'p1').mark).toBe('tenuto');
    expect('mark' in byId(r.melody, 'p2')).toBe(false);
  });

  it("the store's copy and cut put the mark on the clipboard", () => {
    const store = createAppStore(defaultPreferences('en'), { now: () => '2026-01-01T00:00:00.000Z', newId: idGen('s') }, marked());
    const { actions } = store.getState();
    actions.select(['a', 'b']);
    actions.copy();
    expect(store.getState().clipboard).toEqual([
      { pitch: 72, offset: 0, duration: Q, mark: 'staccato' },
      { pitch: 76, offset: 2 * Q, duration: Q, mark: 'tenuto' },
    ]);
    store.setState({ clipboard: [] });
    actions.cut();
    expect(store.getState().clipboard.map((c) => c.mark)).toEqual(['staccato', 'tenuto']);
    expect(store.getState().melody.notes).toEqual([]);
  });
});
