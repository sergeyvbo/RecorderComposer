/**
 * Generates test fixtures (T080, T098): `node --experimental-strip-types scripts/make-fixtures.ts`.
 * Output is deterministic so fixtures can be regenerated and diffed.
 */
import { writeFileSync, mkdirSync } from 'node:fs';

const PPQ = 480;
const iso = '2026-10-29T10:00:00.000Z';

function file(id: string, title: string, notes: { pitch: number; start: number; duration: number }[]) {
  return {
    format: 'recorder-composer',
    formatVersion: 1,
    melody: {
      id,
      title,
      tempoBpm: 100,
      timeSignature: { beats: 4, beatUnit: 4 },
      key: { tonic: 'C', mode: 'major' },
      notes: notes.map((n, i) => ({ id: `n${i + 1}`, ...n })),
      createdAt: iso,
      updatedAt: iso,
    },
  };
}

// Deterministic pseudo-random walk inside C5–D7.
function walk(count: number, lengths: number[], seed = 7) {
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const scale = [72, 74, 76, 77, 79, 81, 83, 84, 86, 88, 89, 91, 93, 95, 96, 98];
  let idx = 4;
  let t = 0;
  return Array.from({ length: count }, () => {
    idx = Math.min(scale.length - 1, Math.max(0, idx + Math.floor(rnd() * 5) - 2));
    const duration = lengths[Math.floor(rnd() * lengths.length)]!;
    const note = { pitch: scale[idx]!, start: t, duration };
    t += duration;
    return note;
  });
}

function barsOf(bars: number) {
  const notes: { pitch: number; start: number; duration: number }[] = [];
  const pattern = [PPQ, PPQ / 2, PPQ / 2, PPQ, PPQ];
  let t = 0;
  let i = 0;
  while (t < bars * 4 * PPQ) {
    const duration = pattern[i % pattern.length]!;
    notes.push({ pitch: [72, 74, 76, 77, 79, 81, 83, 84][i % 8]!, start: t, duration });
    t += duration;
    i++;
  }
  return notes;
}

mkdirSync('tests/fixtures', { recursive: true });
const twinkle = [72, 72, 79, 79, 81, 81, 79, 77, 77, 76, 76, 74, 74, 72].map((pitch, i) => ({
  pitch,
  start: i * PPQ + (i >= 7 ? PPQ : 0),
  duration: i === 6 || i === 13 ? 2 * PPQ : PPQ,
}));
writeFileSync('tests/fixtures/twinkle.rcm.json', JSON.stringify(file('11111111-1111-4111-8111-111111111111', 'Twinkle', twinkle), null, 2));
writeFileSync('tests/fixtures/print-32-bars.rcm.json', JSON.stringify(file('22222222-2222-4222-8222-222222222222', 'Thirty-two bars', barsOf(32)), null, 2));
writeFileSync('tests/fixtures/long-500.rcm.json', JSON.stringify(file('33333333-3333-4333-8333-333333333333', 'Long 500', walk(500, [120, 240, 240, 480, 480, 720, 960])), null, 2));
console.log('fixtures written');
