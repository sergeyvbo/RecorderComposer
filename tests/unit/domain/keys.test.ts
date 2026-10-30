import { describe, expect, it } from 'vitest';
import { ALLOWED_KEYS, keySignature, spell, ticksPerBar, ticksPerBeat } from '@/domain/keys';
import type { Key } from '@/domain/types';

const major = (tonic: Key['tonic']): Key => ({ tonic, mode: 'major' });
const minor = (tonic: Key['tonic']): Key => ({ tonic, mode: 'minor' });

describe('keySignature', () => {
  it.each([
    [major('C'), 0],
    [major('G'), 1],
    [major('D'), 2],
    [major('A'), 3],
    [major('E'), 4],
    [major('F'), -1],
    [major('Bb'), -2],
    [major('Eb'), -3],
    [major('Ab'), -4],
    [minor('A'), 0],
    [minor('E'), 1],
    [minor('B'), 2],
    [minor('F#'), 3],
    [minor('C#'), 4],
    [minor('D'), -1],
    [minor('G'), -2],
    [minor('C'), -3],
    [minor('F'), -4],
  ])('%o has %i fifths', (key, fifths) => {
    expect(keySignature(key).fifths).toBe(fifths);
  });

  it('lists accidentals in standard order', () => {
    expect(keySignature(major('D')).accidentals).toEqual([
      { letter: 'F', accidental: 1 },
      { letter: 'C', accidental: 1 },
    ]);
    expect(keySignature(major('Eb')).accidentals).toEqual([
      { letter: 'B', accidental: -1 },
      { letter: 'E', accidental: -1 },
      { letter: 'A', accidental: -1 },
    ]);
  });

  it('allows exactly 18 keys (up to four sharps or flats)', () => {
    expect(ALLOWED_KEYS).toHaveLength(18);
    expect(() => keySignature(major('F#'))).toThrow();
  });
});

describe('spell', () => {
  it('spells in-key notes from the key signature', () => {
    expect(spell(78, major('G'))).toEqual({ letter: 'F', accidental: 1, octave: 4 });
    expect(spell(82, major('F'))).toEqual({ letter: 'B', accidental: -1, octave: 4 });
    expect(spell(72, major('C'))).toEqual({ letter: 'C', accidental: 0, octave: 4 });
    expect(spell(98, major('C'))).toEqual({ letter: 'D', accidental: 0, octave: 6 });
  });

  it('spells chromatic notes with sharps in sharp keys and C major / A minor', () => {
    expect(spell(78, major('C'))).toEqual({ letter: 'F', accidental: 1, octave: 4 });
    expect(spell(82, minor('A'))).toEqual({ letter: 'A', accidental: 1, octave: 4 });
    expect(spell(75, major('D'))).toEqual({ letter: 'D', accidental: 1, octave: 4 });
  });

  it('spells chromatic notes with flats in flat keys', () => {
    expect(spell(78, major('F'))).toEqual({ letter: 'G', accidental: -1, octave: 4 });
    expect(spell(73, minor('D'))).toEqual({ letter: 'D', accidental: -1, octave: 4 });
  });

  it('uses naturals of altered letters when outside the key', () => {
    // F natural in E major: written F4 (pitch 77 sounding)
    expect(spell(77, major('E'))).toEqual({ letter: 'F', accidental: 0, octave: 4 });
  });
});

describe('meter helpers', () => {
  it('computes ticks per beat and bar', () => {
    expect(ticksPerBeat({ beats: 4, beatUnit: 4 })).toBe(480);
    expect(ticksPerBar({ beats: 4, beatUnit: 4 })).toBe(1920);
    expect(ticksPerBar({ beats: 3, beatUnit: 4 })).toBe(1440);
    expect(ticksPerBeat({ beats: 6, beatUnit: 8 })).toBe(240);
    expect(ticksPerBar({ beats: 6, beatUnit: 8 })).toBe(1440);
  });
});
