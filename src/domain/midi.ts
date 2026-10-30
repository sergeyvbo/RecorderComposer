import { Midi } from '@tonejs/midi';
import { keyFifths } from './keys';
import { PPQ, type Melody } from './types';

/** GM program 74 "Recorder" (0-based 73). */
const RECORDER_PROGRAM = 73;

/**
 * @tonejs/midi 2.0 encodes the key-signature meta event with an offset index (C major → 14), so the
 * event is rewritten here with the standard signed sharps/flats count and mode byte.
 */
function patchKeySignature(bytes: Uint8Array, fifths: number, minor: boolean): Uint8Array {
  for (let i = 0; i + 4 < bytes.length; i++) {
    if (bytes[i] === 0xff && bytes[i + 1] === 0x59 && bytes[i + 2] === 0x02) {
      bytes[i + 3] = fifths & 0xff;
      bytes[i + 4] = minor ? 1 : 0;
      break;
    }
  }
  return bytes;
}

/** Standard MIDI file with tempo, meter, key and one recorder track (US8, R13). */
export function toMidiBytes(m: Melody): Uint8Array {
  const midi = new Midi();
  midi.header.setTempo(m.tempoBpm);
  midi.header.timeSignatures.push({ ticks: 0, timeSignature: [m.timeSignature.beats, m.timeSignature.beatUnit] });
  midi.header.keySignatures.push({ ticks: 0, key: 'C', scale: m.key.mode });
  midi.header.name = m.title;
  midi.header.update();
  const track = midi.addTrack();
  track.name = m.title;
  track.instrument.number = RECORDER_PROGRAM;
  for (const n of m.notes) track.addNote({ midi: n.pitch, ticks: n.start, durationTicks: n.duration, velocity: 0.8 });
  if (midi.header.ppq !== PPQ) throw new Error(`unexpected PPQ ${midi.header.ppq}`);
  return patchKeySignature(midi.toArray(), keyFifths(m.key), m.key.mode === 'minor');
}
