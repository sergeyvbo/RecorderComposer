import { describe, expect, it } from 'vitest';
import { FINGERINGS, type Fingering } from '@/domain/fingering';
import { formatNoteName } from '@/domain/naming';

const code = (f: Fingering) => {
  const s = (h: string) => (h === 'closed' ? '●' : h === 'half' ? '◐' : '○');
  return [
    s(f.thumb),
    ...f.holes.map((h) => (typeof h === 'string' ? s(h) : s(h.left) + s(h.right))),
  ].join(' ');
};

// Locks the reviewed table (SC-004): any change shows up as a snapshot diff to review.
describe('fingering table snapshot', () => {
  it('matches the reviewed chart', () => {
    const table = FINGERINGS.map((e) => {
      const name = formatNoteName(e.pitch, { style: 'letter', octaveSystem: 'scientific', key: { tonic: 'C', mode: 'major' } });
      return `${String(e.pitch)} ${name.padEnd(4)} ${code(e.standard)}${e.alternates.map((a) => ` | ${a.labelKey}: ${code(a.fingering)}`).join('')}`;
    });
    expect(table).toMatchSnapshot();
  });
});
