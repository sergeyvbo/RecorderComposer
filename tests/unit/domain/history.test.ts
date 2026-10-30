import { describe, expect, it } from 'vitest';
import { apply, canRedo, canUndo, createHistory, redo, undo } from '@/domain/history';
import { createEmptyMelody, type Melody } from '@/domain/types';

const base = createEmptyMelody('2026-01-01T00:00:00.000Z', 'm');
const withTempo = (bpm: number): Melody => ({ ...base, tempoBpm: bpm });

describe('history', () => {
  it('applies, undoes and redoes exact states', () => {
    let h = createHistory(base);
    h = apply(h, { ok: true, melody: withTempo(60) });
    h = apply(h, { ok: true, melody: withTempo(70) });
    expect(h.present.tempoBpm).toBe(70);
    h = undo(h);
    expect(h.present).toEqual(withTempo(60));
    h = undo(h);
    expect(h.present).toBe(base);
    expect(canUndo(h)).toBe(false);
    h = redo(h);
    expect(h.present.tempoBpm).toBe(60);
    expect(canRedo(h)).toBe(true);
  });

  it('ignores rejected results', () => {
    const h = createHistory(base);
    expect(apply(h, { ok: false, reason: 'noRoom' })).toBe(h);
  });

  it('clears redo after a new edit', () => {
    let h = apply(createHistory(base), { ok: true, melody: withTempo(60) });
    h = undo(h);
    h = apply(h, { ok: true, melody: withTempo(80) });
    expect(canRedo(h)).toBe(false);
  });

  it('drops the oldest entries beyond the cap', () => {
    let h = createHistory(base, 200);
    for (let i = 0; i < 250; i++) h = apply(h, { ok: true, melody: withTempo(30 + (i % 200)) });
    expect(h.past).toHaveLength(200);
    let undos = 0;
    while (canUndo(h)) {
      h = undo(h);
      undos++;
    }
    expect(undos).toBe(200);
  });
});
