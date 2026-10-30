import { spell, type Letter } from './keys';
import type { Key } from './types';

export type NamingStyle = 'letter' | 'solfege';
export type OctaveSystem = 'russian' | 'scientific';

export interface NameOptions {
  style: NamingStyle;
  /** Follows the UI language (FR-025a): ru → russian, en → scientific. */
  octaveSystem: OctaveSystem;
  key: Key;
  form?: 'short' | 'long';
}

export interface LongName {
  i18nKey: string;
  params: Record<string, string | number>;
}

const LATIN_SOLFEGE: Record<Letter, string> = {
  C: 'do', D: 're', E: 'mi', F: 'fa', G: 'sol', A: 'la', B: 'si',
};
const RUSSIAN_SOLFEGE: Record<Letter, string> = {
  C: 'до', D: 'ре', E: 'ми', F: 'фа', G: 'соль', A: 'ля', B: 'си',
};
const SUPERSCRIPT = ['⁰', '¹', '²', '³', '⁴', '⁵'];
const ACCIDENTAL = { '-1': '♭', '0': '', '1': '♯' } as const;

/** Russian octave number: written C4 starts the first octave. */
export const russianOctave = (scientificOctave: number): number => scientificOctave - 3;

/** Pitch name without octave, e.g. "F♯", "sol♭", "до". */
export function pitchName(pitch: number, style: NamingStyle, octaveSystem: OctaveSystem, key: Key) {
  const s = spell(pitch, key);
  const base =
    style === 'letter'
      ? s.letter
      : (octaveSystem === 'russian' ? RUSSIAN_SOLFEGE : LATIN_SOLFEGE)[s.letter];
  return { name: base + ACCIDENTAL[String(s.accidental) as '-1' | '0' | '1'], octave: s.octave };
}

export function formatNoteName(pitch: number, opts: NameOptions & { form: 'long' }): LongName;
export function formatNoteName(pitch: number, opts: NameOptions & { form?: 'short' }): string;
export function formatNoteName(pitch: number, opts: NameOptions): string | LongName;
export function formatNoteName(pitch: number, opts: NameOptions): string | LongName {
  const { name, octave } = pitchName(pitch, opts.style, opts.octaveSystem, opts.key);
  if (opts.octaveSystem === 'russian') {
    const ro = russianOctave(octave);
    if (opts.form === 'long') return { i18nKey: `note.octave.russian.${ro}`, params: { name } };
    return name + (SUPERSCRIPT[ro] ?? String(ro));
  }
  if (opts.form === 'long') return { i18nKey: 'note.octave.scientific', params: { name, octave } };
  return `${name}${octave}`;
}
