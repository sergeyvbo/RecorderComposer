import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fingeringRow } from '@/domain/fingering';
import { layoutNotation } from '@/domain/notation';
import { layoutPrintSystems } from '@/domain/printLayout';
import { parseMelodyFile } from '@/domain/serialization';

const load = (name: string) => parseMelodyFile(readFileSync(`tests/fixtures/${name}.rcm.json`, 'utf-8'));

describe('fixtures', () => {
  it.each(['twinkle', 'print-32-bars', 'long-500'])('%s is a valid melody file', (name) => {
    expect(load(name).ok).toBe(true);
  });

  it('derives notation and fingerings for 500 notes well within the 100 ms edit budget (SC-002)', () => {
    const r = load('long-500');
    if (!r.ok) throw new Error('fixture invalid');
    expect(r.melody.notes).toHaveLength(500);
    const t0 = performance.now();
    for (let i = 0; i < 10; i++) {
      const m = { ...r.melody, notes: [...r.melody.notes] };
      layoutNotation(m);
      fingeringRow(m);
    }
    const perEdit = (performance.now() - t0) / 10;
    expect(perEdit).toBeLessThan(30);
  });

  it('lays out 32 bars for print', () => {
    const r = load('print-32-bars');
    if (!r.ok) throw new Error('fixture invalid');
    const { systems } = layoutPrintSystems(layoutNotation(r.melody), 680);
    expect(systems.flatMap((s) => s.bars)).toHaveLength(32);
  });
});
