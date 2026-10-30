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
const examplesOf = (path: string) => (JSON.parse(readFileSync(path, 'utf-8')) as { examples: unknown[] }).examples;
const errorOf = (r: ReturnType<typeof parseMelodyFile>) => (r.ok ? 'ok' : r.error);

describe('parseMelodyFile', () => {
  it('accepts the example in contracts/melody-file.schema.json unchanged (v2)', () => {
    const example = examplesOf('specs/002-note-articulations/contracts/melody-file.schema.json')[0] as Doc;
    expect(parseMelodyFile(example)).toEqual({ ok: true, melody: example.melody });
  });

  it('migrates the 001 v1 example', () => {
    const r = parseMelodyFile(examplesOf('specs/001-recorder-composer/contracts/melody-file.schema.json')[0]);
    expect(r).toMatchObject({ ok: true, migratedFrom: 1 });
  });

  it('writes formatVersion 2', () => {
    expect(valid()).toMatchObject({ format: 'recorder-composer', formatVersion: 2 });
    expect(CURRENT_FORMAT_VERSION).toBe(2);
  });

  it('parses marks and slur links unchanged', () => {
    const d = valid();
    d.melody.notes = [
      { id: 'a', pitch: 72, start: 0, duration: Q, mark: 'staccato', slurNext: true },
      { id: 'b', pitch: 74, start: Q, duration: Q, mark: 'tenuto' },
    ];
    expect(parseMelodyFile(d)).toEqual({ ok: true, melody: d.melody });
  });

  it.each(['twinkle', 'long-500', 'print-32-bars'])('migrates the v1 fixture %s to plain notes', (name) => {
    const r = parseMelodyFile(readFileSync(`tests/fixtures/${name}.rcm.json`, 'utf-8'));
    expect(r).toMatchObject({ ok: true, migratedFrom: 1 });
    if (!r.ok) return;
    expect(r.melody.notes.some((n) => 'mark' in n || 'slurNext' in n)).toBe(false);
  });

  it('reports notJson, wrongFormat and newerVersion', () => {
    expect(errorOf(parseMelodyFile('{nope'))).toBe('notJson');
    expect(errorOf(parseMelodyFile({ hello: 1 }))).toBe('wrongFormat');
    expect(errorOf(mutate((d) => ((d as { format: string }).format = 'other')))).toBe('wrongFormat');
    expect(errorOf(mutate((d) => ((d as { formatVersion: number }).formatVersion = 3)))).toBe('newerVersion');
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
    ['unknown mark', (d: Doc) => ((d.melody.notes[0] as unknown as Record<string, unknown>).mark = 'accent')],
    ['mark null', (d: Doc) => ((d.melody.notes[0] as unknown as Record<string, unknown>).mark = null)],
    ['slurNext false', (d: Doc) => ((d.melody.notes[0] as unknown as Record<string, unknown>).slurNext = false)],
    ['slurNext on the last note', (d: Doc) => (d.melody.notes[0]!.slurNext = true)],
  ])('rejects %s as invalid', (_name, fn) => {
    expect(errorOf(mutate(fn as (d: Doc) => void))).toBe('invalid');
  });
});
