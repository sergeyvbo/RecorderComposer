import type { NoteValue } from '@/domain/notation';
import type { NoteMark } from '@/domain/types';

/** SMuFL code points (Bravura). One staff space = 0.25 em. */
export const GLYPH = {
  gClef8va: '',
  noteheadWhole: '',
  noteheadHalf: '',
  noteheadBlack: '',
  accidentalFlat: '',
  accidentalNatural: '',
  accidentalSharp: '',
  augmentationDot: '',
  restWhole: '',
  restHalf: '',
  restQuarter: '',
  rest8th: '',
  rest16th: '',
  rest32nd: '',
  articStaccatoAbove: '',
  articStaccatoBelow: '',
  articTenutoAbove: '',
  articTenutoBelow: '',
} as const;

export const FLAG_UP: Partial<Record<NoteValue, string>> = { 8: '', 16: '', 32: '' };
export const FLAG_DOWN: Partial<Record<NoteValue, string>> = { 8: '', 16: '', 32: '' };

export const REST: Record<NoteValue, string> = {
  1: GLYPH.restWhole,
  2: GLYPH.restHalf,
  4: GLYPH.restQuarter,
  8: GLYPH.rest8th,
  16: GLYPH.rest16th,
  32: GLYPH.rest32nd,
};

export const notehead = (v: NoteValue) =>
  v === 1 ? GLYPH.noteheadWhole : v === 2 ? GLYPH.noteheadHalf : GLYPH.noteheadBlack;

export const accidentalGlyph = (a: -1 | 0 | 1) =>
  a === 1 ? GLYPH.accidentalSharp : a === -1 ? GLYPH.accidentalFlat : GLYPH.accidentalNatural;

/** Articulation mark glyph; `above` places it above the notehead (stem down). */
export const articGlyph = (mark: NoteMark, above: boolean) =>
  mark === 'staccato'
    ? above
      ? GLYPH.articStaccatoAbove
      : GLYPH.articStaccatoBelow
    : above
      ? GLYPH.articTenutoAbove
      : GLYPH.articTenutoBelow;

export const timeSigDigits = (n: number) =>
  [...String(n)].map((d) => String.fromCodePoint(0xe080 + Number(d))).join('');

/** Bravura metrics in staff spaces. */
export const METRICS = {
  noteheadBlackWidth: 1.18,
  noteheadWholeWidth: 1.69,
  stemLength: 3.5,
  stemThickness: 0.12,
  beamThickness: 0.5,
  beamSpacing: 0.75,
  ledgerExtension: 0.4,
  staffLineThickness: 0.13,
  clefWidth: 2.7,
  accidentalWidth: 1.0,
} as const;

/** Staff steps of key-signature accidentals on the treble staff (E4 = 0). */
export const SHARP_STEPS = [8, 5, 9, 6, 3, 7, 4];
export const FLAT_STEPS = [4, 7, 3, 6, 2, 5, 1];
