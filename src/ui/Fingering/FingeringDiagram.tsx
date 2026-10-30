import { memo } from 'react';
import type { Fingering, HoleState } from '@/domain/fingering';

export const DIAGRAM_W = 24;
export const DIAGRAM_H = 112;

function Hole({ cx, cy, r, state, stroke }: { cx: number; cy: number; r: number; state: HoleState; stroke: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={state === 'closed' ? 'var(--hole-closed)' : 'var(--hole-open)'} stroke={stroke} strokeWidth={1.2} />
      {state === 'half' && <path d={`M${cx},${cy - r} A${r},${r} 0 0 0 ${cx},${cy + r} Z`} fill="var(--hole-closed)" />}
    </g>
  );
}

/**
 * Recorder diagram, top to bottom: thumb hole (offset left, behind), holes 1–3 (left hand),
 * holes 4–5 and double holes 6–7 (right hand). Half-covered holes are half filled.
 */
export const FingeringDiagram = memo(function FingeringDiagram({
  fingering,
  scale = 1,
  highlight,
  label,
}: {
  fingering: Fingering;
  scale?: number;
  highlight?: 'selected' | 'hover' | 'playing' | null;
  label: string;
}) {
  const stroke = highlight === 'playing' ? 'var(--playhead)' : highlight === 'selected' ? 'var(--select)' : highlight === 'hover' ? 'var(--hover)' : 'var(--fg)';
  const [h1, h2, h3, h4, h5, h6, h7] = fingering.holes;
  const ys = [24, 36, 48, 64, 76];
  return (
    <svg width={DIAGRAM_W * scale} height={DIAGRAM_H * scale} viewBox={`0 0 ${DIAGRAM_W} ${DIAGRAM_H}`} role="img" aria-label={label}>
      {highlight && <rect x={0.5} y={0.5} width={DIAGRAM_W - 1} height={DIAGRAM_H - 1} rx={4} fill="none" stroke={stroke} strokeWidth={1.5} />}
      <Hole cx={7} cy={10} r={4.2} state={fingering.thumb} stroke={stroke} />
      {[h1, h2, h3, h4, h5].map((h, i) => (
        <Hole key={i} cx={14} cy={ys[i] as number} r={4.6} state={h} stroke={stroke} />
      ))}
      {[h6, h7].map((d, i) => (
        <g key={i}>
          <Hole cx={11} cy={90 + i * 13} r={3} state={d.left} stroke={stroke} />
          <Hole cx={18.5} cy={90 + i * 13} r={2.4} state={d.right} stroke={stroke} />
        </g>
      ))}
      <line x1={3} x2={21} y1={56} y2={56} stroke="var(--line-strong)" strokeWidth={0.8} />
    </svg>
  );
});
