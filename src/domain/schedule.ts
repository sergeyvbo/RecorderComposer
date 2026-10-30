import { MAX_TEMPO, MIN_TEMPO, PPQ, noteEnd, type Melody, type Note } from './types';

export interface ScheduledNote {
  noteId: string;
  pitch: number;
  /** Seconds after the playback start position. */
  startSec: number;
  /** Written length: drives the playhead and highlight (FR-014). */
  durationSec: number;
  /** Sounding length, ≤ durationSec (FR-013, research R7). */
  soundSec: number;
  /** False when reached by a slur: no breath chiff. */
  tongued: boolean;
  /** Slurred from the previous note, which sounds right up to this start: change pitch, no re-attack. */
  connected: boolean;
  velocity: number;
}

/** Silence after a plain note so repeated pitches re-articulate. */
export const ARTICULATION_GAP_SEC = 0.015;
const STACCATO_MIN_SEC = 0.06;
const VELOCITY = { plain: 0.85, tenuto: 1 } as const;

function checkTempo(bpm: number) {
  if (bpm < MIN_TEMPO || bpm > MAX_TEMPO) throw new Error(`tempo ${bpm} outside ${MIN_TEMPO}–${MAX_TEMPO}`);
}

export function ticksToSeconds(ticks: number, bpm: number): number {
  checkTempo(bpm);
  return (ticks / PPQ) * (60 / bpm);
}

export function secondsToTicks(sec: number, bpm: number): number {
  checkTempo(bpm);
  return (sec * bpm * PPQ) / 60;
}

/** Sounding length of a note of written length `written` seconds (research R7). */
function soundingSec(n: Note, written: number, slursOn: boolean): number {
  if (n.mark === 'staccato') return Math.min(written - ARTICULATION_GAP_SEC, Math.max(0.5 * written, STACCATO_MIN_SEC));
  if (n.mark === 'tenuto' || slursOn) return written;
  return written - ARTICULATION_GAP_SEC;
}

/**
 * Notes to play from `fromTick`: ended notes dropped, a note in progress trimmed, each with its
 * sounding length, tonguing and legato connection (FR-013). Written values are unchanged (FR-014).
 */
export function toSchedule(m: Melody, fromTick = 0): ScheduledNote[] {
  const out: ScheduledNote[] = [];
  m.notes.forEach((n, i) => {
    if (noteEnd(n) <= fromTick) return;
    const start = Math.max(n.start, fromTick);
    const startSec = ticksToSeconds(start - fromTick, m.tempoBpm);
    const durationSec = ticksToSeconds(noteEnd(n) - start, m.tempoBpm);
    const prev = out.at(-1);
    // Playback starting inside a slurred-into note tongues it (data-model § Playback schedule).
    const slurredInto = !!prev && !!m.notes[i - 1]?.slurNext;
    out.push({
      noteId: n.id,
      pitch: n.pitch,
      startSec,
      durationSec,
      soundSec: soundingSec(n, durationSec, !!n.slurNext && i < m.notes.length - 1),
      tongued: !slurredInto,
      connected: slurredInto && Math.abs(prev.startSec + prev.soundSec - startSec) < 1e-9,
      velocity: n.mark === 'tenuto' ? VELOCITY.tenuto : VELOCITY.plain,
    });
  });
  return out;
}

/** Id of the note sounding at `tick`, or null in a gap. */
export function noteAt(m: Melody, tick: number): string | null {
  return m.notes.find((n) => tick >= n.start && tick < noteEnd(n))?.id ?? null;
}

export const endTick = (m: Melody): number => m.notes.reduce((e, n) => Math.max(e, noteEnd(n)), 0);

/** Equal-tempered frequency of a MIDI pitch (A4 = 440 Hz). */
export const pitchToHz = (pitch: number): number => 440 * 2 ** ((pitch - 69) / 12);
