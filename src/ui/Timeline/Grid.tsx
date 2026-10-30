import { memo } from 'react';
import { ticksPerBar, ticksPerBeat } from '@/domain/keys';
import type { TimeSignature } from '@/domain/types';
import { useTimeAxis } from '../Layout/SharedTimeAxis';
import { isBlackKey, PITCHES } from './Keyboard';

/** Row shading plus snap, beat and bar lines for the visible range (FR-009). */
export const Grid = memo(function Grid({
  rowHeight,
  timeSignature,
  snap,
}: {
  rowHeight: number;
  timeSignature: TimeSignature;
  snap: number;
}) {
  const axis = useTimeAxis();
  const height = PITCHES.length * rowHeight;
  const beat = ticksPerBeat(timeSignature);
  const bar = ticksPerBar(timeSignature);
  const step = snap * axis.pxPerTick >= 6 ? snap : beat * axis.pxPerTick >= 6 ? beat : bar;
  const first = Math.floor(axis.visibleStart / step) * step;
  const lines = [];
  for (let t = first; t <= axis.visibleEnd; t += step) {
    const kind = t % bar === 0 ? 'bar' : t % beat === 0 ? 'beat' : 'sub';
    const x = axis.tickToX(t);
    lines.push(
      <line
        key={t}
        x1={x}
        x2={x}
        y1={0}
        y2={height}
        stroke={kind === 'bar' ? 'var(--bar)' : kind === 'beat' ? 'var(--line-strong)' : 'var(--line)'}
        strokeWidth={kind === 'bar' ? 1.5 : 1}
      />,
    );
  }
  return (
    <g className="grid" pointerEvents="none">
      {PITCHES.map((p, i) => (
        <rect
          key={p}
          x={0}
          y={i * rowHeight}
          width={axis.width}
          height={rowHeight}
          fill={isBlackKey(p) ? 'var(--line)' : 'transparent'}
          opacity={0.35}
        />
      ))}
      {lines}
    </g>
  );
});
