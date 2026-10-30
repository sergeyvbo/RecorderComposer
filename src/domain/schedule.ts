import { MAX_TEMPO, MIN_TEMPO, PPQ, noteEnd, type Melody } from './types';

export interface ScheduledNote {
  noteId: string;
  pitch: number;
  /** Seconds after the playback start position. */
  startSec: number;
  durationSec: number;
}

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

/** Notes to play from `fromTick`: ended notes dropped, a note in progress trimmed. */
export function toSchedule(m: Melody, fromTick = 0): ScheduledNote[] {
  return m.notes
    .filter((n) => noteEnd(n) > fromTick)
    .map((n) => {
      const start = Math.max(n.start, fromTick);
      return {
        noteId: n.id,
        pitch: n.pitch,
        startSec: ticksToSeconds(start - fromTick, m.tempoBpm),
        durationSec: ticksToSeconds(noteEnd(n) - start, m.tempoBpm),
      };
    });
}

/** Id of the note sounding at `tick`, or null in a gap. */
export function noteAt(m: Melody, tick: number): string | null {
  return m.notes.find((n) => tick >= n.start && tick < noteEnd(n))?.id ?? null;
}

export const endTick = (m: Melody): number => m.notes.reduce((e, n) => Math.max(e, noteEnd(n)), 0);

/** Equal-tempered frequency of a MIDI pitch (A4 = 440 Hz). */
export const pitchToHz = (pitch: number): number => 440 * 2 ** ((pitch - 69) / 12);
