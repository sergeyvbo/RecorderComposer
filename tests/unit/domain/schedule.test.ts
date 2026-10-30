import { describe, expect, it } from 'vitest';
import { endTick, noteAt, secondsToTicks, ticksToSeconds, toSchedule } from '@/domain/schedule';
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
    expect(toSchedule(m)).toEqual([
      { noteId: 'a', pitch: 72, startSec: 0, durationSec: 1 },
      { noteId: 'b', pitch: 74, startSec: 1, durationSec: 1 },
      { noteId: 'c', pitch: 76, startSec: 3, durationSec: 1 },
    ]);
  });

  it('drops notes that end before fromTick and trims a note in progress', () => {
    expect(toSchedule(m, 1.5 * Q)).toEqual([
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
