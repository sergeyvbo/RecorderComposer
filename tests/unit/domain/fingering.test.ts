import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FINGERINGS, fingeringRow, getFingering } from '@/domain/fingering';
import { MAX_PITCH, MIN_PITCH } from '@/domain/types';
import { melodyWith, Q } from './helpers';

const en = JSON.parse(readFileSync('src/i18n/en.json', 'utf-8')) as Record<string, unknown>;
const has = (key: string) =>
  key.split('.').reduce<unknown>((node, k) => (node as Record<string, unknown> | undefined)?.[k], en) !== undefined;

describe('fingering table', () => {
  it('has exactly one entry for every pitch 72–98, each with a standard fingering', () => {
    expect(FINGERINGS).toHaveLength(MAX_PITCH - MIN_PITCH + 1);
    for (let p = MIN_PITCH; p <= MAX_PITCH; p++) {
      const e = getFingering(p);
      expect(e.pitch).toBe(p);
      expect(e.standard.holes).toHaveLength(7);
    }
  });

  it('uses only i18n label keys that exist', () => {
    for (const e of FINGERINGS) for (const a of e.alternates) expect(has(a.labelKey), a.labelKey).toBe(true);
  });

  it('throws outside the range', () => {
    expect(() => getFingering(71)).toThrow();
  });
});

describe('fingeringRow', () => {
  it('returns one item per note in start order', () => {
    const m = melodyWith([
      { pitch: 79, start: Q, duration: Q },
      { pitch: 72, start: 0, duration: Q },
    ]);
    expect(fingeringRow(m).map((r) => [r.noteId, r.startTick, r.entry.pitch])).toEqual([
      ['x2', 0, 72],
      ['x1', Q, 79],
    ]);
  });
});
