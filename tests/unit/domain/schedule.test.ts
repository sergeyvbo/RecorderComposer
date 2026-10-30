import { describe, expect, it } from 'vitest';
import { ARTICULATION_GAP_SEC, endTick, noteAt, secondsToTicks, ticksToSeconds, toSchedule } from '@/domain/schedule';
import type { Note } from '@/domain/types';
import { melodyWith, Q } from './helpers';

describe('schedule', () => {
  it('converts between ticks and seconds at the tempo', () => {
    expect(ticksToSeconds(480, 60)).toBe(1);
    expect(ticksToSeconds(480, 120)).toBe(0.5);
    expect(secondsToTicks(1, 60)).toBe(480);
    expect(secondsToTicks(ticksToSeconds(1234, 97), 97)).toBeCloseTo(1234);
  });

  it('rejects tempos outside 30–240', () => {
    expect(() => ticksToSeconds(480, 29)).toThrow();
    expect(() => ticksToSeconds(480, 241)).toThrow();
  });

  const m = { ...melodyWith([
    { id: 'a', pitch: 72, start: 0, duration: Q },
    { id: 'b', pitch: 74, start: Q, duration: Q },
    { id: 'c', pitch: 76, start: 3 * Q, duration: Q },
  ]), tempoBpm: 60 };

  it('lists notes with start and duration in seconds', () => {
    expect(toSchedule(m)).toMatchObject([
      { noteId: 'a', pitch: 72, startSec: 0, durationSec: 1 },
      { noteId: 'b', pitch: 74, startSec: 1, durationSec: 1 },
      { noteId: 'c', pitch: 76, startSec: 3, durationSec: 1 },
    ]);
  });

  it('drops notes that end before fromTick and trims a note in progress', () => {
    expect(toSchedule(m, 1.5 * Q)).toMatchObject([
      { noteId: 'b', pitch: 74, startSec: 0, durationSec: 0.5 },
      { noteId: 'c', pitch: 76, startSec: 1.5, durationSec: 1 },
    ]);
  });

  it('finds the sounding note and the end', () => {
    expect(noteAt(m, Q + 10)).toBe('b');
    expect(noteAt(m, 2 * Q + 10)).toBeNull();
    expect(endTick(m)).toBe(4 * Q);
  });
});

describe('toSchedule: articulation (002 FR-013, FR-014, research R7)', () => {
  const at60 = (notes: Note[]) => ({ ...melodyWith(notes), tempoBpm: 60 });
  /** Four quarter notes; `slurNext` is applied to all but the last. */
  const four = (extra: Pick<Note, 'mark' | 'slurNext'> = {}) =>
    at60(
      ['a', 'b', 'c', 'd'].map((id, i) => {
        const n: Note = { id, pitch: 72 + i, start: i * Q, duration: Q };
        if (extra.mark) n.mark = extra.mark;
        if (extra.slurNext && i < 3) n.slurNext = true;
        return n;
      }),
    );
  const GAP = ARTICULATION_GAP_SEC;

  it('the gap is 15 ms', () => {
    expect(GAP).toBe(0.015);
  });

  it('plain notes: written − 15 ms, tongued, not connected, velocity 0.85', () => {
    for (const n of toSchedule(four())) {
      expect(n.soundSec).toBeCloseTo(1 - GAP);
      expect(n).toMatchObject({ durationSec: 1, tongued: true, connected: false, velocity: 0.85 });
    }
  });

  it('staccato: max(50 %, 60 ms) capped at written − 15 ms; never zero for a thirty-second', () => {
    expect(toSchedule(four({ mark: 'staccato' }))[0]!.soundSec).toBeCloseTo(0.5);
    // A thirty-second at 240 BPM lasts 31.25 ms: the cap wins over the 60 ms minimum.
    const short = { ...at60([{ id: 'x', pitch: 72, start: 0, duration: 60, mark: 'staccato' }]), tempoBpm: 240 };
    const [x] = toSchedule(short);
    expect(x!.soundSec).toBeCloseTo(0.03125 - GAP);
    expect(x!.soundSec).toBeGreaterThan(0);
    // A thirty-second at 60 BPM (125 ms): 60 ms minimum beats 50 %.
    const mid = at60([{ id: 'y', pitch: 72, start: 0, duration: 60, mark: 'staccato' }]);
    expect(toSchedule(mid)[0]!.soundSec).toBeCloseTo(0.0625);
  });

  it('tenuto: full length, velocity 1.0', () => {
    expect(toSchedule(four({ mark: 'tenuto' }))[0]).toMatchObject({ soundSec: 1, velocity: 1, tongued: true });
  });

  it('slurred notes: the note before sounds to the end; the next is connected and not tongued', () => {
    const s = toSchedule(four({ slurNext: true }));
    expect(s.map((n) => n.soundSec)).toEqual([1, 1, 1, expect.closeTo(1 - GAP, 5)]);
    expect(s.map((n) => n.tongued)).toEqual([true, false, false, false]);
    expect(s.map((n) => n.connected)).toEqual([false, true, true, true]);
  });

  it('slurred after a rest or after a staccato note: not tongued, not connected', () => {
    const afterRest = at60([
      { id: 'a', pitch: 72, start: 0, duration: Q, slurNext: true },
      { id: 'b', pitch: 74, start: 2 * Q, duration: Q },
    ]);
    expect(toSchedule(afterRest)[1]).toMatchObject({ tongued: false, connected: false });
    const afterStaccato = at60([
      { id: 'a', pitch: 72, start: 0, duration: Q, slurNext: true, mark: 'staccato' },
      { id: 'b', pitch: 74, start: Q, duration: Q },
    ]);
    const [a, b] = toSchedule(afterStaccato);
    expect(a!.soundSec).toBeCloseTo(0.5);
    expect(b).toMatchObject({ tongued: false, connected: false });
  });

  it('starting inside a slurred-into note: tongued, not connected', () => {
    const s = toSchedule(four({ slurNext: true }), 1.5 * Q);
    expect(s[0]).toMatchObject({ noteId: 'b', tongued: true, connected: false, durationSec: 0.5 });
    expect(s[1]).toMatchObject({ noteId: 'c', tongued: false, connected: true });
  });

  it('written durations and noteAt ignore articulation (FR-014)', () => {
    for (const extra of [{ mark: 'staccato' as const }, { mark: 'tenuto' as const }, { slurNext: true as const }]) {
      const m2 = four(extra);
      expect(toSchedule(m2).map((n) => n.durationSec)).toEqual([1, 1, 1, 1]);
      expect(noteAt(m2, Q + 400)).toBe('b');
    }
  });
});
