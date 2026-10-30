import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { parseMelodyFile, serialize } from '@/domain/serialization';
import { melodyArb } from './arbitraries';

describe('serialization round-trip (SC-006)', () => {
  it('parse(serialize(m)) returns m for any valid melody, also through JSON text', () => {
    fc.assert(
      fc.property(melodyArb, (m) => {
        expect(parseMelodyFile(serialize(m))).toEqual({ ok: true, melody: m });
        expect(parseMelodyFile(JSON.stringify(serialize(m)))).toEqual({ ok: true, melody: m });
      }),
      { numRuns: 1000 },
    );
  });
});
