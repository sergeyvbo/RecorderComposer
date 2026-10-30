import { memo, type ReactNode } from 'react';
import type { KeySignature } from '@/domain/keys';
import type { NotationBar, NotationEvent } from '@/domain/notation';
import { preludeSpaces } from '@/domain/printLayout';
import type { TimeSignature } from '@/domain/types';
import {
  accidentalGlyph,
  FLAG_DOWN,
  FLAG_UP,
  FLAT_STEPS,
  GLYPH,
  METRICS,
  notehead,
  REST,
  SHARP_STEPS,
  timeSigDigits,
} from './glyphs';

export interface StaffGeometry {
  /** Staff space in px. */
  sp: number;
  /** y of the top staff line. */
  top: number;
}

/** y of a staff step (E4 bottom line = 0, each step half a space). */
export const stepY = (g: StaffGeometry, step: number) => g.top + 4 * g.sp - (step * g.sp) / 2;

/** Height needed for the treble staff over the C4–D6 written range plus stems and beams. */
export const staffHeight = (sp: number) => 15 * sp;
export const staffTop = (sp: number) => 6 * sp;

const font = (sp: number) => ({ fontFamily: 'Bravura', fontSize: 4 * sp });

export function StaffLines({ g, x1, x2 }: { g: StaffGeometry; x1: number; x2: number }) {
  return (
    <g stroke="var(--fg)" strokeWidth={METRICS.staffLineThickness * g.sp}>
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1={x1} x2={x2} y1={g.top + i * g.sp} y2={g.top + i * g.sp} />
      ))}
    </g>
  );
}

/** Clef (treble with 8 above: soprano recorder sounds an octave higher), key and time signature. */
export function StaffPrelude({
  g,
  x,
  keySignature,
  timeSignature,
  showTime,
}: {
  g: StaffGeometry;
  x: number;
  keySignature: KeySignature;
  timeSignature: TimeSignature | null;
  showTime: boolean;
}) {
  const steps = keySignature.fifths >= 0 ? SHARP_STEPS : FLAT_STEPS;
  const glyph = keySignature.fifths >= 0 ? GLYPH.accidentalSharp : GLYPH.accidentalFlat;
  const count = Math.abs(keySignature.fifths);
  const keyX = x + (METRICS.clefWidth + 0.6) * g.sp;
  const timeX = keyX + count * 0.95 * g.sp + 0.4 * g.sp;
  return (
    <g fill="var(--fg)" style={font(g.sp)} pointerEvents="none">
      <text x={x + 0.2 * g.sp} y={stepY(g, 2)}>
        {GLYPH.gClef8va}
      </text>
      {steps.slice(0, count).map((s, i) => (
        <text key={i} x={keyX + i * 0.95 * g.sp} y={stepY(g, s)}>
          {glyph}
        </text>
      ))}
      {showTime && timeSignature && (
        <>
          <text x={timeX} y={stepY(g, 6)}>
            {timeSigDigits(timeSignature.beats)}
          </text>
          <text x={timeX} y={stepY(g, 2)}>
            {timeSigDigits(timeSignature.beatUnit)}
          </text>
        </>
      )}
    </g>
  );
}

/** Width of the prelude in px for a key with `fifths` and optional time signature. */
export const preludeWidth = (sp: number, fifths: number, withTime: boolean) => preludeSpaces(fifths, withTime) * sp;

interface Placed {
  e: NotationEvent;
  x: number;
  y: number;
  up: boolean;
  headW: number;
}

export interface StaffNotesProps {
  g: StaffGeometry;
  bars: readonly NotationBar[];
  /** x of a tick inside this staff (notehead left edge is xOf(startTick) + pad). */
  xOf: (tick: number) => number;
  /** Ticks at which to draw bar lines (bar ends). */
  barLines: readonly number[];
  selectedIds?: ReadonlySet<string>;
  hoverId?: string | null;
  playingId?: string | null;
  /** Centre whole-bar rests between these x positions per bar index. */
  barSpanX?: (bar: NotationBar) => [number, number];
}

const NOTE_PAD = 0.3;

/** Draws notes, rests, accidentals, dots, ledger lines, stems, flags, beams, ties and bar lines. */
export const StaffNotes = memo(function StaffNotes({
  g,
  bars,
  xOf,
  barLines,
  selectedIds,
  hoverId,
  playingId,
  barSpanX,
}: StaffNotesProps) {
  const sp = g.sp;
  const events = bars.flatMap((b) => b.events);
  const notes = events.filter((e) => e.kind === 'note');

  // Stem direction: per beam group by average step, otherwise per note (middle line = step 4).
  const groupDir = new Map<number, boolean>();
  for (const e of notes) {
    if (e.beamGroup === null || groupDir.has(e.beamGroup)) continue;
    const members = notes.filter((n) => n.beamGroup === e.beamGroup);
    const avg = members.reduce((s, n) => s + (n.staffStep ?? 4), 0) / members.length;
    groupDir.set(e.beamGroup, avg < 4);
  }
  const placed: Placed[] = notes.map((e) => {
    const step = e.staffStep ?? 4;
    return {
      e,
      x: xOf(e.startTick) + NOTE_PAD * sp,
      y: stepY(g, step),
      up: e.beamGroup !== null ? (groupDir.get(e.beamGroup) as boolean) : step < 4,
      headW: (e.value === 1 ? METRICS.noteheadWholeWidth : METRICS.noteheadBlackWidth) * sp,
    };
  });

  const color = (id: string | undefined) =>
    id && playingId === id ? 'var(--playhead)' : id && selectedIds?.has(id) ? 'var(--select)' : id && hoverId === id ? 'var(--hover)' : 'var(--fg)';

  const stemX = (p: Placed) => (p.up ? p.x + p.headW - (METRICS.stemThickness * sp) / 2 : p.x + (METRICS.stemThickness * sp) / 2);
  const beamLevels = (v: number) => (v >= 32 ? 3 : v >= 16 ? 2 : v >= 8 ? 1 : 0);

  // Beam geometry: flat beam at the extreme notehead ± stem length.
  const beamY = new Map<number, number>();
  for (const [group, up] of groupDir) {
    const ys = placed.filter((p) => p.e.beamGroup === group).map((p) => p.y);
    beamY.set(group, up ? Math.min(...ys) - METRICS.stemLength * sp : Math.max(...ys) + METRICS.stemLength * sp);
  }

  const out: ReactNode[] = [];

  // Bar lines.
  for (const t of barLines) {
    const x = xOf(t);
    out.push(<line key={`bar${t}`} x1={x} x2={x} y1={g.top} y2={g.top + 4 * sp} stroke="var(--fg)" strokeWidth={0.16 * sp} />);
  }

  // Rests.
  bars.forEach((bar) =>
    bar.events.forEach((e, i) => {
      if (e.kind !== 'rest') return;
      let x = xOf(e.startTick) + NOTE_PAD * sp;
      if (e.wholeBar) {
        const [a, b] = barSpanX ? barSpanX(bar) : [xOf(bar.startTick), xOf(bar.endTick)];
        x = (a + b) / 2 - 0.6 * sp;
      }
      const step = e.value === 1 ? 6 : 4;
      out.push(
        <text key={`r${bar.index}-${i}`} x={x} y={stepY(g, step)} style={font(sp)} fill="var(--muted)" pointerEvents="none">
          {REST[e.value]}
          {e.dots ? GLYPH.augmentationDot : ''}
        </text>,
      );
    }),
  );

  placed.forEach((p, i) => {
    const { e } = p;
    const step = e.staffStep ?? 4;
    const fill = color(e.noteId);
    const key = `n${e.noteId}-${e.startTick}`;
    const parts: ReactNode[] = [];
    // Ledger lines.
    for (let s = -2; s >= step; s -= 2) {
      const y = stepY(g, s);
      parts.push(<line key={`l${s}`} x1={p.x - METRICS.ledgerExtension * sp} x2={p.x + p.headW + METRICS.ledgerExtension * sp} y1={y} y2={y} stroke="var(--fg)" strokeWidth={0.16 * sp} />);
    }
    for (let s = 10; s <= step; s += 2) {
      const y = stepY(g, s);
      parts.push(<line key={`l${s}`} x1={p.x - METRICS.ledgerExtension * sp} x2={p.x + p.headW + METRICS.ledgerExtension * sp} y1={y} y2={y} stroke="var(--fg)" strokeWidth={0.16 * sp} />);
    }
    if (e.accidental !== null) {
      parts.push(
        <text key="acc" x={p.x - (METRICS.accidentalWidth + 0.2) * sp} y={p.y} style={font(sp)} fill={fill}>
          {accidentalGlyph(e.accidental)}
        </text>,
      );
    }
    parts.push(
      <text key="head" x={p.x} y={p.y} style={font(sp)} fill={fill}>
        {notehead(e.value)}
      </text>,
    );
    if (e.dots) {
      const dotY = step % 2 === 0 ? stepY(g, step + 1) : p.y;
      parts.push(
        <text key="dot" x={p.x + p.headW + 0.3 * sp} y={dotY} style={font(sp)} fill={fill}>
          {GLYPH.augmentationDot}
        </text>,
      );
    }
    if (e.value >= 2) {
      const sx = stemX(p);
      const end = e.beamGroup !== null ? (beamY.get(e.beamGroup) as number) : p.up ? p.y - METRICS.stemLength * sp : p.y + METRICS.stemLength * sp;
      parts.push(<line key="stem" x1={sx} x2={sx} y1={p.y} y2={end} stroke={fill} strokeWidth={METRICS.stemThickness * sp} />);
      if (e.beamGroup === null && e.value >= 8) {
        const flag = (p.up ? FLAG_UP : FLAG_DOWN)[e.value];
        parts.push(
          <text key="flag" x={sx - (METRICS.stemThickness * sp) / 2} y={end} style={font(sp)} fill={fill}>
            {flag}
          </text>,
        );
      }
    }
    // Beams to the next note of the same group.
    const next = placed[i + 1];
    if (e.beamGroup !== null && next && next.e.beamGroup === e.beamGroup) {
      const y0 = beamY.get(e.beamGroup) as number;
      const levels = Math.min(beamLevels(e.value), beamLevels(next.e.value));
      for (let l = 0; l < levels; l++) {
        const dy = (p.up ? 1 : -1) * l * METRICS.beamSpacing * sp;
        const h = METRICS.beamThickness * sp;
        const yTop = p.up ? y0 + dy : y0 + dy - h;
        parts.push(<rect key={`b${l}`} x={stemX(p)} y={yTop} width={stemX(next) - stemX(p)} height={h} fill={fill} />);
      }
      // Stub for extra levels of this note when the next has fewer.
      for (let l = levels; l < beamLevels(e.value); l++) {
        const dy = (p.up ? 1 : -1) * l * METRICS.beamSpacing * sp;
        const h = METRICS.beamThickness * sp;
        parts.push(<rect key={`s${l}`} x={stemX(p)} y={p.up ? y0 + dy : y0 + dy - h} width={sp} height={h} fill={fill} />);
      }
    }
    // Ties to the next piece of the same note.
    if (e.tieToNext) {
      const to = placed.slice(i + 1).find((q) => q.e.noteId === e.noteId);
      if (to) {
        const x1 = p.x + p.headW;
        const x2 = to.x;
        const dir = p.up ? 1 : -1;
        const y = p.y + dir * 0.7 * sp;
        const c = dir * Math.min(1.2 * sp, (x2 - x1) * 0.25);
        parts.push(<path key="tie" d={`M${x1},${y} Q${(x1 + x2) / 2},${y + c} ${x2},${y}`} fill="none" stroke={fill} strokeWidth={0.18 * sp} />);
      }
    }
    out.push(
      <g key={key} data-note-id={e.noteId} data-testid="staff-note" style={{ cursor: 'pointer' }}>
        {/* Larger invisible hit area for selection/hover (FR-013). */}
        <rect x={p.x - 0.3 * sp} y={p.y - sp} width={p.headW + 0.6 * sp} height={2 * sp} fill="transparent" />
        {parts}
      </g>,
    );
  });

  return <g className="staff-notes">{out}</g>;
});
