import { describe, expect, it } from 'vitest';
import { labelColor, PITCH_CLASS_COLORS } from '@/domain/colors';
import { createEmptyMelody } from '@/domain/types';

describe('createEmptyMelody', () => {
  it('uses the documented defaults', () => {
    const now = '2026-10-29T10:00:00.000Z';
    const m = createEmptyMelody(now, 'id-1');
    expect(m).toMatchObject({
      id: 'id-1',
      tempoBpm: 100,
      timeSignature: { beats: 4, beatUnit: 4 },
      key: { tonic: 'C', mode: 'major' },
      notes: [],
      createdAt: now,
      updatedAt: now,
    });
    const len = m.title.trim().length;
    expect(len).toBeGreaterThanOrEqual(1);
    expect(len).toBeLessThanOrEqual(120);
  });
});

describe('pitch-class colors (FR-008)', () => {
  it('has exactly 12 unique colors', () => {
    expect(PITCH_CLASS_COLORS).toHaveLength(12);
    expect(new Set(PITCH_CLASS_COLORS.map((c) => c.toLowerCase())).size).toBe(12);
  });
});

describe('label contrast (T101)', () => {
  const contrast = (a: string, b: string) => {
    const lum = (hex: string) => {
      const [r, g, bl] = [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      }) as [number, number, number];
      return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
    };
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
    return (hi + 0.05) / (lo + 0.05);
  };
  it.each([...PITCH_CLASS_COLORS])('note label on %s has contrast ≥ 4.5:1', (c) => {
    expect(contrast(c, labelColor(c))).toBeGreaterThanOrEqual(4.5);
  });
});
