import { Midi } from '@tonejs/midi';
import { describe, expect, it } from 'vitest';
import { toMidiBytes } from '@/domain/midi';
import { melodyWith, Q } from './helpers';

describe('toMidiBytes (US8)', () => {
  it('round-trips pitches, ticks, tempo, meter and key through a standard MIDI file', () => {
    const m = {
      ...melodyWith([
        { pitch: 72, start: 0, duration: Q },
        { pitch: 79, start: Q, duration: Q / 2 },
        { pitch: 98, start: 3 * Q, duration: 2 * Q },
      ]),
      tempoBpm: 84,
      timeSignature: { beats: 3, beatUnit: 4 } as const,
      key: { tonic: 'Bb', mode: 'major' } as const,
    };
    const midi = new Midi(toMidiBytes(m));
    expect(midi.header.ppq).toBe(480);
    expect(midi.tracks).toHaveLength(1);
    const track = midi.tracks[0]!;
    expect(track.instrument.number).toBe(73); // GM program 74 (Recorder), 0-based
    expect(midi.header.tempos[0]!.bpm).toBeCloseTo(84, 3);
    expect(midi.header.timeSignatures[0]!.timeSignature).toEqual([3, 4]);
    expect(midi.header.keySignatures[0]).toMatchObject({ key: 'Bb', scale: 'major' });
    expect(track.notes.map((n) => [n.midi, n.ticks, n.durationTicks])).toEqual([
      [72, 0, Q],
      [79, Q, Q / 2],
      [98, 3 * Q, 2 * Q],
    ]);
  });

  it('writes the standard key-signature bytes (signed fifths, mode)', () => {
    const keySig = (key: { tonic: 'C' | 'D'; mode: 'major' | 'minor' }) => {
      const bytes = [...toMidiBytes({ ...melodyWith([{ pitch: 72, start: 0, duration: Q }]), key })];
      const i = bytes.findIndex((b, j) => b === 0xff && bytes[j + 1] === 0x59);
      return bytes.slice(i + 2, i + 5);
    };
    expect(keySig({ tonic: 'C', mode: 'major' })).toEqual([2, 0x00, 0]);
    expect(keySig({ tonic: 'D', mode: 'minor' })).toEqual([2, 0xff, 1]);
  });

  it('writes staccato at half length (at least 30 ticks); tenuto, slurred and plain at full length (002 FR-018)', () => {
    const m = melodyWith([
      { id: 'a', pitch: 72, start: 0, duration: Q, mark: 'staccato' },
      { id: 'b', pitch: 74, start: Q, duration: 60, mark: 'staccato' },
      { id: 'c', pitch: 76, start: 2 * Q, duration: Q, mark: 'tenuto', slurNext: true },
      { id: 'd', pitch: 77, start: 3 * Q, duration: Q },
    ]);
    const notes = new Midi(toMidiBytes(m)).tracks[0]!.notes;
    expect(notes.map((n) => n.durationTicks)).toEqual([240, 30, Q, Q]);
    expect(new Set(notes.map((n) => n.velocity)).size).toBe(1);
  });
});
