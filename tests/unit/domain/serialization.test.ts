import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CURRENT_FORMAT_VERSION, parseMelodyFile, serialize } from '@/domain/serialization';
import { melodyWith, Q } from './helpers';

const valid = () => serialize({ ...melodyWith([{ id: 'a', pitch: 72, start: 0, duration: Q }]), id: '6f1c2a1e-6d0b-4f7e-9a51-2a3f0e0c9b11' });
type Doc = ReturnType<typeof valid>;
const mutate = (fn: (d: Doc) => void) => {
  const d = structuredClone(valid());
  fn(d);
  return parseMelodyFile(d);
};
const errorOf = (r: ReturnType<typeof parseMelodyFile>) => (r.ok ? 'ok' : r.error);

describe('parseMelodyFile', () => {
  it('accepts the example in contracts/melody-file.schema.json', () => {
    const schema = JSON.parse(readFileSync('specs/001-recorder-composer/contracts/melody-file.schema.json', 'utf-8')) as { examples: unknown[] };
    const r = parseMelodyFile(schema.examples[0]);
    expect(r.ok).toBe(true);
  });

  it('writes formatVersion 1', () => {
    expect(valid()).toMatchObject({ format: 'recorder-composer', formatVersion: 1 });
    expect(CURRENT_FORMAT_VERSION).toBe(1);
  });

  it('reports notJson, wrongFormat and newerVersion', () => {
    expect(errorOf(parseMelodyFile('{nope'))).toBe('notJson');
    expect(errorOf(parseMelodyFile({ hello: 1 }))).toBe('wrongFormat');
    expect(errorOf(mutate((d) => ((d as { format: string }).format = 'other')))).toBe('wrongFormat');
    expect(errorOf(mutate((d) => ((d as { formatVersion: number }).formatVersion = 2)))).toBe('newerVersion');
  });

  it.each([
    ['title longer than 120 chars', (d: Doc) => (d.melody.title = 'x'.repeat(121))],
    ['empty title', (d: Doc) => (d.melody.title = '')],
    ['tempo below 30', (d: Doc) => (d.melody.tempoBpm = 29)],
    ['tempo above 240', (d: Doc) => (d.melody.tempoBpm = 241)],
    ['pitch below 72', (d: Doc) => (d.melody.notes[0]!.pitch = 71)],
    ['pitch above 98', (d: Doc) => (d.melody.notes[0]!.pitch = 99)],
    ['start not a multiple of 60', (d: Doc) => (d.melody.notes[0]!.start = 30)],
    ['duration not a multiple of 60', (d: Doc) => (d.melody.notes[0]!.duration = 90)],
    ['duration below 60', (d: Doc) => (d.melody.notes[0]!.duration = 0)],
    ['more than 5000 notes', (d: Doc) => (d.melody.notes = Array.from({ length: 5001 }, (_, i) => ({ id: `n${i}`, pitch: 72, start: i * 60, duration: 60 })))],
    ['unsupported key', (d: Doc) => (d.melody.key = { tonic: 'F#', mode: 'major' })],
    ['unknown time signature', (d: Doc) => ((d.melody.timeSignature as unknown) = { beats: 5, beatUnit: 4 })],
    ['extra property', (d: Doc) => ((d.melody as unknown as Record<string, unknown>).extra = 1)],
    ['overlapping notes', (d: Doc) => d.melody.notes.push({ id: 'b', pitch: 74, start: 240, duration: Q })],
    ['duplicate note ids', (d: Doc) => d.melody.notes.push({ id: 'a', pitch: 74, start: Q, duration: Q })],
  ])('rejects %s as invalid', (_name, fn) => {
    expect(errorOf(mutate(fn as (d: Doc) => void))).toBe('invalid');
  });
});
