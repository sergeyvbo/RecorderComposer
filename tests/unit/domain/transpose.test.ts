import { describe, expect, it } from 'vitest';
import { previewTranspose, semitonesBetween, setKey, transpose } from '@/domain/commands';
import type { Key } from '@/domain/types';
import { melodyWith, Q } from './helpers';

const C: Key = { tonic: 'C', mode: 'major' };
const G: Key = { tonic: 'G', mode: 'major' };
const m = melodyWith([
  { id: 'a', pitch: 72, start: 0, duration: Q },
  { id: 'b', pitch: 79, start: Q, duration: Q },
  { id: 'c', pitch: 96, start: 2 * Q, duration: Q },
]);

describe('setKey (FR-027)', () => {
  it('changes key and spelling only — pitches never move', () => {
    const r = setKey(m, { tonic: 'F', mode: 'major' });
    expect(r.ok && r.melody.key).toEqual({ tonic: 'F', mode: 'major' });
    expect(r.ok && r.melody.notes).toEqual(m.notes);
  });

  it('rejects keys with more than four sharps or flats', () => {
    expect(setKey(m, { tonic: 'B', mode: 'major' })).toEqual({ ok: false, reason: 'invalidArgs' });
  });
});

describe('previewTranspose / transpose (FR-028)', () => {
  it('lists notes that would leave the range and which octave alternatives work', () => {
    expect(previewTranspose(m, 3)).toEqual({ ok: false, outOfRange: ['c'], octaveUpOk: false, octaveDownOk: false });
    expect(previewTranspose(m, -2)).toEqual({ ok: false, outOfRange: ['a'], octaveUpOk: false, octaveDownOk: false });
    expect(previewTranspose(m, -2, ['a', 'b'])).toEqual({ ok: false, outOfRange: ['a'], octaveUpOk: true, octaveDownOk: false });
    expect(previewTranspose(m, 2)).toEqual({ ok: true, outOfRange: [], octaveUpOk: false, octaveDownOk: false });
  });

  it('rejects with outOfRange and never drops or moves notes silently', () => {
    expect(transpose(m, 3)).toEqual({ ok: false, reason: 'outOfRange' });
  });

  it('moves every affected note by the same interval and sets the target key', () => {
    const r = transpose(m, 2, undefined, { tonic: 'D', mode: 'major' });
    expect(r.ok && r.melody.notes.map((n) => n.pitch)).toEqual([74, 81, 98]);
    expect(r.ok && r.melody.key).toEqual({ tonic: 'D', mode: 'major' });
  });

  it('transposes only the selection when ids are given', () => {
    const r = transpose(m, -2, ['b', 'c']);
    expect(r.ok && r.melody.notes.map((n) => n.pitch)).toEqual([72, 77, 94]);
    expect(previewTranspose(m, -1, ['b']).ok).toBe(true);
  });

  it('computes the nearest interval between key tonics', () => {
    expect(semitonesBetween(C, G)).toBe(-5);
    expect(semitonesBetween(C, { tonic: 'F', mode: 'major' })).toBe(5);
    expect(semitonesBetween(G, C)).toBe(5);
    expect(semitonesBetween(C, { tonic: 'A', mode: 'minor' })).toBe(-3);
  });
});
