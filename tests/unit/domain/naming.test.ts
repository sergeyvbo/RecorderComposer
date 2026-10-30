import { describe, expect, it } from 'vitest';
import { formatNoteName } from '@/domain/naming';
import type { Key } from '@/domain/types';

const C: Key = { tonic: 'C', mode: 'major' };
const G: Key = { tonic: 'G', mode: 'major' };
const F: Key = { tonic: 'F', mode: 'major' };

describe('formatNoteName — contract examples', () => {
  it.each([
    [72, 'letter', 'scientific', C, 'C4'],
    [72, 'solfege', 'russian', C, 'до¹'],
    [98, 'letter', 'russian', C, 'D³'],
    [78, 'letter', 'scientific', G, 'F♯4'],
    [78, 'solfege', 'scientific', F, 'sol♭4'],
  ] as const)('%i %s/%s → %s', (pitch, style, octaveSystem, key, expected) => {
    expect(formatNoteName(pitch, { style, octaveSystem, key })).toBe(expected);
  });
});

describe('formatNoteName — syllables and octaves', () => {
  const scale = [72, 74, 76, 77, 79, 81, 83];
  it('uses do re mi fa sol la si (Latin) with the scientific system', () => {
    expect(scale.map((p) => formatNoteName(p, { style: 'solfege', octaveSystem: 'scientific', key: C })))
      .toEqual(['do4', 're4', 'mi4', 'fa4', 'sol4', 'la4', 'si4']);
  });

  it('uses до ре ми фа соль ля си with the Russian system', () => {
    expect(scale.map((p) => formatNoteName(p, { style: 'solfege', octaveSystem: 'russian', key: C })))
      .toEqual(['до¹', 'ре¹', 'ми¹', 'фа¹', 'соль¹', 'ля¹', 'си¹']);
  });

  it('numbers Russian octaves from written C4 = first octave', () => {
    expect(formatNoteName(84, { style: 'letter', octaveSystem: 'russian', key: C })).toBe('C²');
    expect(formatNoteName(96, { style: 'solfege', octaveSystem: 'russian', key: C })).toBe('до³');
  });

  it('returns an i18n key for the long form', () => {
    expect(
      formatNoteName(72, { style: 'solfege', octaveSystem: 'russian', key: C, form: 'long' }),
    ).toEqual({ i18nKey: 'note.octave.russian.1', params: { name: 'до' } });
    expect(
      formatNoteName(78, { style: 'letter', octaveSystem: 'scientific', key: G, form: 'long' }),
    ).toEqual({ i18nKey: 'note.octave.scientific', params: { name: 'F♯', octave: 4 } });
  });
});
