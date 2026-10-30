import fc from 'fast-check';
import { ALLOWED_KEYS } from '@/domain/keys';
import { TIME_SIGNATURES, type Melody, type Note } from '@/domain/types';

const grid = (min: number, max: number) => fc.integer({ min, max }).map((n) => n * 60);

/** Valid notes: sorted, non-overlapping, on the 60-tick grid, in range. */
export const notesArb: fc.Arbitrary<Note[]> = fc
  .array(fc.record({ gap: grid(0, 16), duration: grid(1, 32), pitch: fc.integer({ min: 72, max: 98 }) }), { maxLength: 60 })
  .map((items) => {
    let t = 0;
    return items.map((it, i) => {
      const start = t + it.gap;
      t = start + it.duration;
      return { id: `n${i}`, pitch: it.pitch, start, duration: it.duration };
    });
  });

const isoDate = fc
  .integer({ min: Date.UTC(2020, 0, 1), max: Date.UTC(2035, 0, 1) })
  .map((ms) => new Date(ms).toISOString());

export const melodyArb: fc.Arbitrary<Melody> = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 120 }).filter((s) => s.trim().length > 0 && s.trim() === s),
  tempoBpm: fc.integer({ min: 30, max: 240 }),
  timeSignature: fc.constantFrom(...TIME_SIGNATURES),
  key: fc.constantFrom(...ALLOWED_KEYS.map((k) => k.key)),
  notes: notesArb,
  createdAt: isoDate,
  updatedAt: isoDate,
});
