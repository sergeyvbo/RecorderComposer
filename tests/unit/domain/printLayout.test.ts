import { describe, expect, it } from 'vitest';
import { layoutNotation } from '@/domain/notation';
import { layoutPrintSystems } from '@/domain/printLayout';
import { E, melodyWith, Q } from './helpers';

const W = 4 * Q;
const bars = (count: number, noteLen = Q) =>
  melodyWith(
    Array.from({ length: (count * W) / noteLen }, (_, i) => ({ pitch: 72 + (i % 12), start: i * noteLen, duration: noteLen })),
  );

describe('layoutPrintSystems', () => {
  const page = 680;

  it('puts whole bars only in each system and keeps every bar exactly once', () => {
    const layout = layoutPrintSystems(layoutNotation(bars(12, E)), page);
    const indices = layout.systems.flatMap((s) => s.bars.map((b) => b.index));
    expect(indices).toEqual([...Array(12).keys()]);
    expect(layout.systems.length).toBeGreaterThan(1);
  });

  it('never makes a system wider than the page', () => {
    for (const len of [60, 120, E, Q, 2 * Q]) {
      for (const s of layoutPrintSystems(layoutNotation(bars(9, len)), page).systems) {
        expect(s.width).toBeLessThanOrEqual(page + 0.001);
        for (const x of s.eventX.values()) expect(x).toBeLessThanOrEqual(page);
      }
    }
  });

  it('starts every system with clef and key, and only the first with the time signature', () => {
    const { systems } = layoutPrintSystems(layoutNotation(bars(12, E)), page);
    expect(systems[0]!.showTime).toBe(true);
    expect(systems.slice(1).every((s) => !s.showTime)).toBe(true);
    for (const s of systems) {
      expect(s.preludeWidth).toBeGreaterThan(0);
      expect(s.barStartX[0]).toBeGreaterThanOrEqual(s.preludeWidth);
    }
  });

  it('spaces events by note value: longer values get more room', () => {
    const m = melodyWith([
      { pitch: 72, start: 0, duration: 2 * Q },
      { pitch: 74, start: 2 * Q, duration: E },
      { pitch: 76, start: 2 * Q + E, duration: E },
      { pitch: 77, start: 3 * Q, duration: Q },
    ]);
    const s = layoutPrintSystems(layoutNotation(m), page, { justify: false }).systems[0]!;
    const x = (t: number) => s.eventX.get(t)!;
    const half = x(2 * Q) - x(0);
    const eighth = x(2 * Q + E) - x(2 * Q);
    expect(half).toBeGreaterThan(eighth);
  });

  it('returns no systems for an empty melody', () => {
    expect(layoutPrintSystems(layoutNotation(melodyWith([])), page).systems).toEqual([]);
  });
});

describe('layoutPrintSystems — slur pieces per system (002 FR-008)', () => {
  const page = 680;

  it('keeps a slur inside one system whole and splits one that crosses a break', () => {
    const base = bars(12, E);
    const first = layoutPrintSystems(layoutNotation(base), page).systems;
    expect(first.length).toBeGreaterThan(1);
    const noteIdsOf = (s: (typeof first)[number]) =>
      s.bars.flatMap((b) => b.events.filter((e) => e.kind === 'note').map((e) => e.noteId as string));
    const sys0 = noteIdsOf(first[0]!);
    const sys1 = noteIdsOf(first[1]!);
    const lastOf0 = sys0.at(-1)!;
    const inside = sys0[0]!;
    const notes = base.notes.map((n) => (n.id === lastOf0 || n.id === inside ? { ...n, slurNext: true as const } : n));
    const { systems } = layoutPrintSystems(layoutNotation({ ...base, notes }), page);
    expect(systems[0]!.slurs).toEqual([
      { fromNoteId: inside, toNoteId: sys0[1] },
      { fromNoteId: lastOf0, toNoteId: null },
    ]);
    expect(systems[1]!.slurs).toEqual([{ fromNoteId: null, toNoteId: sys1[0] }]);
    expect(systems.slice(2).every((s) => s.slurs.length === 0)).toBe(true);
  });
});
