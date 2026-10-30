import { describe, expect, it } from 'vitest';
import { layoutNotation, type NotationEvent } from '@/domain/notation';
import type { Key, TimeSignature } from '@/domain/types';
import { E, melodyWith, Q, S } from './helpers';

const H = 2 * Q;
const W = 4 * Q;
const summary = (e: NotationEvent) =>
  `${e.kind}:${e.value}${e.dots ? '.' : ''}${e.tieToNext ? '~' : ''}`;
const bars = (m: ReturnType<typeof melodyWith>) => layoutNotation(m).bars.map((b) => b.events.map(summary));
const withMeta = (m: ReturnType<typeof melodyWith>, patch: { key?: Key; timeSignature?: TimeSignature }) => ({
  ...m,
  ...patch,
});

describe('layoutNotation — values, rests, ties', () => {
  it('maps lengths to note values and single dots', () => {
    const m = melodyWith([
      { pitch: 72, start: 0, duration: W },
      { pitch: 72, start: W, duration: H },
      { pitch: 72, start: W + H, duration: Q },
      { pitch: 72, start: W + H + Q, duration: E },
      { pitch: 72, start: W + H + Q + E, duration: S },
      { pitch: 72, start: W + H + Q + E + S, duration: 60 },
      { pitch: 72, start: W + H + Q + E + S + 60, duration: 60 },
      { pitch: 72, start: 2 * W, duration: Q + E },
      { pitch: 72, start: 2 * W + Q + E, duration: E },
      { pitch: 72, start: 2 * W + H, duration: H },
    ]);
    expect(bars(m)).toEqual([
      ['note:1'],
      ['note:2', 'note:4', 'note:8', 'note:16', 'note:32', 'note:32'],
      ['note:4.', 'note:8', 'note:2'],
    ]);
  });

  it('splits a note across a bar line into tied notes', () => {
    const m = melodyWith([{ pitch: 72, start: 3 * Q, duration: H }]);
    expect(bars(m)).toEqual([
      ['rest:2.', 'note:4~'],
      ['note:4', 'rest:2.'],
    ]);
    const evs = layoutNotation(m).bars.flatMap((b) => b.events).filter((e) => e.kind === 'note');
    expect(evs.every((e) => e.noteId === 'x1')).toBe(true);
  });

  it('decomposes 5 sixteenths into tied values aligned to beats', () => {
    const m = melodyWith([{ pitch: 72, start: 0, duration: 5 * S }]);
    expect(bars(m)[0]).toEqual(['note:4~', 'note:16', 'rest:8.', 'rest:2']);
  });

  it('fills gaps with rests and uses a whole-bar rest for an empty bar', () => {
    const m = melodyWith([
      { pitch: 72, start: Q, duration: Q },
      { pitch: 72, start: 2 * W, duration: W },
    ]);
    expect(bars(m)).toEqual([['rest:4', 'note:4', 'rest:2'], ['rest:1'], ['note:1']]);
    expect(layoutNotation(m).bars[1]!.events[0]!.wholeBar).toBe(true);
  });

  it('produces no bars for an empty melody', () => {
    expect(layoutNotation(melodyWith([])).bars).toEqual([]);
  });
});

describe('layoutNotation — pitch and accidentals', () => {
  it('writes one octave below sounding pitch with staff steps from E4 (bottom line)', () => {
    const m = melodyWith([
      { pitch: 72, start: 0, duration: Q },
      { pitch: 76, start: Q, duration: Q },
      { pitch: 89, start: 2 * Q, duration: Q },
      { pitch: 98, start: 3 * Q, duration: Q },
    ]);
    const evs = layoutNotation(m).bars[0]!.events;
    expect(evs.map((e) => e.writtenPitch)).toEqual([60, 64, 77, 86]);
    expect(evs.map((e) => e.staffStep)).toEqual([-2, 0, 8, 13]);
  });

  it('applies key signature and per-bar accidental memory', () => {
    const m = withMeta(
      melodyWith([
        { pitch: 78, start: 0, duration: Q }, // F♯ — in key, no sign
        { pitch: 77, start: Q, duration: Q }, // F natural — natural sign
        { pitch: 77, start: H, duration: Q }, // F natural again — no sign
        { pitch: 78, start: 3 * Q, duration: Q }, // F♯ after natural — sharp sign
        { pitch: 77, start: W, duration: Q }, // new bar: natural sign again
      ]),
      { key: { tonic: 'G', mode: 'major' } },
    );
    const evs = layoutNotation(m).bars.flatMap((b) => b.events).filter((e) => e.kind === 'note');
    expect(evs.map((e) => e.accidental)).toEqual([null, 0, null, 1, 0]);
  });

  it('shows chromatic accidentals in C major', () => {
    const m = melodyWith([
      { pitch: 73, start: 0, duration: Q },
      { pitch: 73, start: Q, duration: Q },
    ]);
    expect(layoutNotation(m).bars[0]!.events.slice(0, 2).map((e) => e.accidental)).toEqual([1, null]);
  });

  it('does not repeat the accidental on a tied continuation', () => {
    const m = melodyWith([{ pitch: 73, start: 3 * Q, duration: H }]);
    const notes = layoutNotation(m).bars.flatMap((b) => b.events).filter((e) => e.kind === 'note');
    expect(notes.map((e) => e.accidental)).toEqual([1, null]);
  });
});

describe('layoutNotation — beaming', () => {
  it('beams eighths within a beat in 4/4', () => {
    const m = melodyWith([0, 1, 2, 3].map((i) => ({ pitch: 72, start: i * E, duration: E })));
    const evs = layoutNotation(m).bars[0]!.events.filter((e) => e.kind === 'note');
    expect(evs[0]!.beamGroup).not.toBeNull();
    expect(evs[0]!.beamGroup).toBe(evs[1]!.beamGroup);
    expect(evs[2]!.beamGroup).toBe(evs[3]!.beamGroup);
    expect(evs[1]!.beamGroup).not.toBe(evs[2]!.beamGroup);
  });

  it('beams in dotted-quarter groups in 6/8', () => {
    const m = withMeta(
      melodyWith([0, 1, 2, 3, 4, 5].map((i) => ({ pitch: 72, start: i * E, duration: E }))),
      { timeSignature: { beats: 6, beatUnit: 8 } },
    );
    const g = layoutNotation(m).bars[0]!.events.map((e) => e.beamGroup);
    expect(new Set(g.slice(0, 3)).size).toBe(1);
    expect(new Set(g.slice(3, 6)).size).toBe(1);
    expect(g[0]).not.toBe(g[3]);
  });

  it('leaves a lone eighth unbeamed and carries noteId/startTick', () => {
    const m = melodyWith([{ pitch: 72, start: 0, duration: E }]);
    const first = layoutNotation(m).bars[0]!.events[0]!;
    expect(first).toMatchObject({ beamGroup: null, noteId: 'x1', startTick: 0 });
  });
});

describe('layoutNotation — articulation marks (002 FR-008)', () => {
  it('copies the mark onto the note event', () => {
    const m = melodyWith([
      { id: 'a', pitch: 72, start: 0, duration: Q, mark: 'staccato' },
      { id: 'b', pitch: 74, start: Q, duration: Q, mark: 'tenuto' },
      { id: 'c', pitch: 76, start: 2 * Q, duration: Q },
    ]);
    const notes = layoutNotation(m).bars[0]!.events.filter((e) => e.kind === 'note');
    expect(notes.map((e) => e.mark)).toEqual(['staccato', 'tenuto', undefined]);
    expect('mark' in notes[2]!).toBe(false);
  });

  it('puts the mark on the first tied piece only', () => {
    // A half note starting on beat 2 of 4/4 is written as two tied quarters… and across a bar line.
    const m = melodyWith([{ id: 'a', pitch: 72, start: 3 * Q, duration: H, mark: 'tenuto' }]);
    const pieces = layoutNotation(m).bars.flatMap((b) => b.events).filter((e) => e.kind === 'note');
    expect(pieces).toHaveLength(2);
    expect(pieces.map((e) => e.mark)).toEqual(['tenuto', undefined]);
  });

  it('never puts a mark on a rest', () => {
    const m = melodyWith([{ id: 'a', pitch: 72, start: Q, duration: Q, mark: 'staccato' }]);
    const rests = layoutNotation(m).bars[0]!.events.filter((e) => e.kind === 'rest');
    expect(rests.every((e) => e.mark === undefined)).toBe(true);
  });
});

describe('layoutNotation — slurs (002 FR-003, FR-008)', () => {
  it('lists each slurred run as { fromNoteId, toNoteId }', () => {
    const m = melodyWith([
      { id: 'a', pitch: 72, start: 0, duration: Q, slurNext: true },
      { id: 'b', pitch: 74, start: Q, duration: Q, slurNext: true },
      { id: 'c', pitch: 76, start: 2 * Q, duration: Q },
      { id: 'd', pitch: 77, start: 3 * Q, duration: Q, slurNext: true },
      { id: 'e', pitch: 79, start: 5 * Q, duration: Q },
    ]);
    expect(layoutNotation(m).slurs).toEqual([
      { fromNoteId: 'a', toNoteId: 'c' },
      { fromNoteId: 'd', toNoteId: 'e' },
    ]);
  });

  it('has no slurs without links', () => {
    expect(layoutNotation(melodyWith([{ pitch: 72, start: 0, duration: Q }])).slurs).toEqual([]);
  });
});
