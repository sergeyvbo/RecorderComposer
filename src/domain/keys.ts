import { PPQ, WRITTEN_OFFSET, type Key, type TimeSignature, type Tonic } from './types';

export type Letter = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
export type Accidental = -1 | 0 | 1;

export interface Spelling {
  letter: Letter;
  accidental: Accidental;
  /** Scientific octave at written pitch (C4 = written middle C). */
  octave: number;
}

export interface KeySignature {
  fifths: number;
  accidentals: { letter: Letter; accidental: Accidental }[];
}

interface KeyInfo {
  key: Key;
  fifths: number;
}

/** All keys with up to four sharps or flats (FR-027). */
export const ALLOWED_KEYS: readonly KeyInfo[] = [
  { key: { tonic: 'C', mode: 'major' }, fifths: 0 },
  { key: { tonic: 'G', mode: 'major' }, fifths: 1 },
  { key: { tonic: 'D', mode: 'major' }, fifths: 2 },
  { key: { tonic: 'A', mode: 'major' }, fifths: 3 },
  { key: { tonic: 'E', mode: 'major' }, fifths: 4 },
  { key: { tonic: 'F', mode: 'major' }, fifths: -1 },
  { key: { tonic: 'Bb', mode: 'major' }, fifths: -2 },
  { key: { tonic: 'Eb', mode: 'major' }, fifths: -3 },
  { key: { tonic: 'Ab', mode: 'major' }, fifths: -4 },
  { key: { tonic: 'A', mode: 'minor' }, fifths: 0 },
  { key: { tonic: 'E', mode: 'minor' }, fifths: 1 },
  { key: { tonic: 'B', mode: 'minor' }, fifths: 2 },
  { key: { tonic: 'F#', mode: 'minor' }, fifths: 3 },
  { key: { tonic: 'C#', mode: 'minor' }, fifths: 4 },
  { key: { tonic: 'D', mode: 'minor' }, fifths: -1 },
  { key: { tonic: 'G', mode: 'minor' }, fifths: -2 },
  { key: { tonic: 'C', mode: 'minor' }, fifths: -3 },
  { key: { tonic: 'F', mode: 'minor' }, fifths: -4 },
];

const SHARP_ORDER: Letter[] = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_ORDER: Letter[] = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
const NATURAL_PC: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

const SHARP_SPELLING: [Letter, Accidental][] = [
  ['C', 0], ['C', 1], ['D', 0], ['D', 1], ['E', 0], ['F', 0],
  ['F', 1], ['G', 0], ['G', 1], ['A', 0], ['A', 1], ['B', 0],
];
const FLAT_SPELLING: [Letter, Accidental][] = [
  ['C', 0], ['D', -1], ['D', 0], ['E', -1], ['E', 0], ['F', 0],
  ['G', -1], ['G', 0], ['A', -1], ['A', 0], ['B', -1], ['B', 0],
];

export const sameKey = (a: Key, b: Key): boolean => a.tonic === b.tonic && a.mode === b.mode;

export function isAllowedKey(key: Key): boolean {
  return ALLOWED_KEYS.some((k) => sameKey(k.key, key));
}

export function keyFifths(key: Key): number {
  const info = ALLOWED_KEYS.find((k) => sameKey(k.key, key));
  if (!info) throw new Error(`Unsupported key ${key.tonic} ${key.mode}`);
  return info.fifths;
}

export function keySignature(key: Key): KeySignature {
  const fifths = keyFifths(key);
  const accidentals =
    fifths >= 0
      ? SHARP_ORDER.slice(0, fifths).map((letter) => ({ letter, accidental: 1 as Accidental }))
      : FLAT_ORDER.slice(0, -fifths).map((letter) => ({ letter, accidental: -1 as Accidental }));
  return { fifths, accidentals };
}

/** Accidental the key signature applies to a letter. */
export function keyAccidental(key: Key, letter: Letter): Accidental {
  return keySignature(key).accidentals.find((a) => a.letter === letter)?.accidental ?? 0;
}

/** Spell a sounding pitch at written pitch in the given key (R8). */
export function spell(pitch: number, key: Key): Spelling {
  const written = pitch + WRITTEN_OFFSET;
  const pc = ((written % 12) + 12) % 12;
  const octave = Math.floor(written / 12) - 1;
  const sig = keySignature(key);
  // In-key: a letter whose key-altered pitch class equals pc.
  for (const letter of Object.keys(NATURAL_PC) as Letter[]) {
    const acc = sig.accidentals.find((a) => a.letter === letter)?.accidental ?? 0;
    if ((NATURAL_PC[letter] + acc + 12) % 12 === pc) return { letter, accidental: acc, octave };
  }
  const table = sig.fifths >= 0 ? SHARP_SPELLING : FLAT_SPELLING;
  const [letter, accidental] = table[pc] as [Letter, Accidental];
  return { letter, accidental, octave };
}

export function ticksPerBeat(ts: TimeSignature): number {
  return (PPQ * 4) / ts.beatUnit;
}

export function ticksPerBar(ts: TimeSignature): number {
  return ticksPerBeat(ts) * ts.beats;
}

export const tonicLabel = (t: Tonic): string => t.replace('#', '♯').replace('b', '♭');
