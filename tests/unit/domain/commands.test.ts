import { describe, expect, it } from 'vitest';
import {
  addNote,
  deleteNotes,
  moveNotes,
  pasteNotes,
  resizeNote,
  setTimeSignature,
  setTitle,
  setTempo,
} from '@/domain/commands';
import type { EditResult, Melody } from '@/domain/types';
import { idGen, melodyWith, Q, S } from './helpers';

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

  it('pastes relative to the target tick and returns the new ids', () => {
    const clip = [
      { pitch: 72, offset: 0, duration: Q },
      { pitch: 74, offset: Q, duration: Q },
    ];
    const r = ok(pasteNotes(m, clip, 4 * Q, S, { newId: idGen('p') }));
    expect(r.melody.notes.slice(2)).toEqual([
      { id: 'p1', pitch: 72, start: 4 * Q, duration: Q },
      { id: 'p2', pitch: 74, start: 5 * Q, duration: Q },
    ]);
    expect(r.ids).toEqual(['p1', 'p2']);
  });

  it('rejects a paste that lands on occupied time', () => {
    expect(pasteNotes(m, [{ pitch: 72, offset: 0, duration: Q }], S, S, { newId: idGen() })).toMatchObject({
      ok: false,
      reason: 'noRoom',
    });
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
