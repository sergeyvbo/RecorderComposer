import { deriveSlurs } from './articulation';
import { keyAccidental, keySignature, spell, ticksPerBar, ticksPerBeat, type Accidental, type KeySignature, type Letter } from './keys';
import { WRITTEN_OFFSET, type Melody, type Note, type NoteMark, type TimeSignature } from './types';

/** Note value as the denominator: 1 = whole, 2 = half, … 32 = thirty-second. */
export type NoteValue = 1 | 2 | 4 | 8 | 16 | 32;

export interface NotationEvent {
  kind: 'note' | 'rest';
  noteId?: string;
  startTick: number;
  durationTicks: number;
  value: NoteValue;
  dots: 0 | 1;
  /** Note continues (tied) into the next note event. */
  tieToNext: boolean;
  /** This piece continues a tie from the previous piece. */
  tieFromPrev: boolean;
  writtenPitch?: number;
  /** Diatonic steps above the bottom staff line (E4 = 0, middle C = −2). */
  staffStep?: number;
  /** Displayed accidental: null = none, 0 = natural sign. */
  accidental: Accidental | null;
  /** Shared id for beamed notes; null = not beamed. */
  beamGroup: number | null;
  /** Rest filling an entire empty bar (drawn as a centred whole rest). */
  wholeBar?: boolean;
  /** Staccato/tenuto, on the first piece of a tied note only. */
  mark?: NoteMark;
}

export interface NotationBar {
  index: number;
  startTick: number;
  endTick: number;
  events: NotationEvent[];
}

/** A slur from the first piece of one note to the last piece of another (FR-008). */
export interface NotationSlur {
  fromNoteId: string;
  toNoteId: string;
}

export interface NotationModel {
  bars: NotationBar[];
  keySignature: KeySignature;
  timeSignature: TimeSignature;
  slurs: NotationSlur[];
}

const VALUES: readonly { ticks: number; value: NoteValue; dots: 0 | 1 }[] = [
  { ticks: 1920, value: 1, dots: 0 },
  { ticks: 1440, value: 2, dots: 1 },
  { ticks: 960, value: 2, dots: 0 },
  { ticks: 720, value: 4, dots: 1 },
  { ticks: 480, value: 4, dots: 0 },
  { ticks: 360, value: 8, dots: 1 },
  { ticks: 240, value: 8, dots: 0 },
  { ticks: 180, value: 16, dots: 1 },
  { ticks: 120, value: 16, dots: 0 },
  { ticks: 60, value: 32, dots: 0 },
];

const LETTER_INDEX: Record<Letter, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
const BOTTOM_LINE = 4 * 7 + LETTER_INDEX.E;

/**
 * Split a span [offset, offset + length) inside a bar into representable values: values of a beat
 * or longer start on a beat; shorter values stay inside one beat.
 */
export function decompose(offset: number, length: number, beat: number, barTicks: number) {
  const out: { offset: number; ticks: number; value: NoteValue; dots: 0 | 1 }[] = [];
  let p = offset;
  let r = length;
  while (r > 0) {
    const pick = VALUES.find((v) => {
      if (v.ticks > r || p + v.ticks > barTicks) return false;
      if (v.ticks >= beat) return p % beat === 0;
      return Math.floor(p / beat) === Math.floor((p + v.ticks - 1) / beat);
    });
    if (!pick) throw new Error(`cannot represent ${r} ticks at ${p}`);
    out.push({ offset: p, ticks: pick.ticks, value: pick.value, dots: pick.dots });
    p += pick.ticks;
    r -= pick.ticks;
  }
  return out;
}

/** Beaming group length: the beat, or a dotted quarter in 6/8. */
const beamSpan = (ts: TimeSignature) => ticksPerBeat(ts) * (ts.beatUnit === 8 ? 3 : 1);

export function layoutNotation(m: Melody): NotationModel {
  const ts = m.timeSignature;
  const barTicks = ticksPerBar(ts);
  const beat = ts.beatUnit === 8 ? ticksPerBeat(ts) * 3 : ticksPerBeat(ts);
  const lastEnd = m.notes.reduce((e, n) => Math.max(e, n.start + n.duration), 0);
  const barCount = Math.ceil(lastEnd / barTicks);
  const bars: NotationBar[] = [];
  let beamId = 0;

  for (let b = 0; b < barCount; b++) {
    const barStart = b * barTicks;
    const barEnd = barStart + barTicks;
    const inBar = m.notes.filter((n) => n.start < barEnd && n.start + n.duration > barStart);
    const events: NotationEvent[] = [];
    // Accidental memory per written letter+octave, reset each bar.
    const memory = new Map<string, Accidental>();

    if (inBar.length === 0) {
      events.push({
        kind: 'rest', startTick: barStart, durationTicks: barTicks, value: 1, dots: 0,
        tieToNext: false, tieFromPrev: false, accidental: null, beamGroup: null, wholeBar: true,
      });
      bars.push({ index: b, startTick: barStart, endTick: barEnd, events });
      continue;
    }

    const pushRest = (from: number, to: number) => {
      for (const piece of decompose(from - barStart, to - from, beat, barTicks)) {
        events.push({
          kind: 'rest', startTick: barStart + piece.offset, durationTicks: piece.ticks, value: piece.value,
          dots: piece.dots, tieToNext: false, tieFromPrev: false, accidental: null, beamGroup: null,
        });
      }
    };

    const pushNote = (n: Note) => {
      const from = Math.max(n.start, barStart);
      const to = Math.min(n.start + n.duration, barEnd);
      const pieces = decompose(from - barStart, to - from, beat, barTicks);
      const s = spell(n.pitch, m.key);
      const memKey = `${s.letter}${s.octave}`;
      const staffStep = s.octave * 7 + LETTER_INDEX[s.letter] - BOTTOM_LINE;
      pieces.forEach((piece) => {
        const tick = barStart + piece.offset;
        const continuation = tick > n.start;
        let accidental: Accidental | null = null;
        if (!continuation) {
          const current = memory.get(memKey) ?? keyAccidental(m.key, s.letter);
          if (current !== s.accidental) accidental = s.accidental;
          memory.set(memKey, s.accidental);
        }
        events.push({
          kind: 'note', noteId: n.id, startTick: tick, durationTicks: piece.ticks, value: piece.value,
          dots: piece.dots, tieToNext: tick + piece.ticks < n.start + n.duration, tieFromPrev: continuation,
          writtenPitch: n.pitch + WRITTEN_OFFSET, staffStep, accidental, beamGroup: null,
          ...(n.mark && !continuation ? { mark: n.mark } : {}),
        });
      });
    };

    let cursor = barStart;
    for (const n of inBar) {
      const from = Math.max(n.start, barStart);
      if (from > cursor) pushRest(cursor, from);
      pushNote(n);
      cursor = Math.min(n.start + n.duration, barEnd);
    }
    if (cursor < barEnd) pushRest(cursor, barEnd);

    // Beams: consecutive eighth-or-shorter notes within one beaming span.
    const span = beamSpan(ts);
    let run: NotationEvent[] = [];
    const flush = () => {
      if (run.length > 1) {
        beamId++;
        for (const e of run) e.beamGroup = beamId;
      }
      run = [];
    };
    for (const e of events) {
      const beamable = e.kind === 'note' && e.value >= 8;
      const group = Math.floor((e.startTick - barStart) / span);
      const prev = run.at(-1);
      if (!beamable) {
        flush();
        continue;
      }
      if (prev && Math.floor((prev.startTick - barStart) / span) !== group) flush();
      run.push(e);
    }
    flush();
    bars.push({ index: b, startTick: barStart, endTick: barEnd, events });
  }

  const slurs = deriveSlurs(m).map(({ fromNoteId, toNoteId }) => ({ fromNoteId, toNoteId }));
  return { bars, keySignature: keySignature(m.key), timeSignature: ts, slurs };
}
