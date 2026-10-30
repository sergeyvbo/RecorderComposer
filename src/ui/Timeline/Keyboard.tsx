import { MAX_PITCH, MIN_PITCH } from '@/domain/types';
import { useNoteName } from '../useNoteName';
import { GUTTER } from '../Layout/SharedTimeAxis';

export const PITCHES: readonly number[] = Array.from(
  { length: MAX_PITCH - MIN_PITCH + 1 },
  (_, i) => MAX_PITCH - i,
);
export const isBlackKey = (pitch: number) => [1, 3, 6, 8, 10].includes(pitch % 12);

/** Vertical keyboard, D7 (top) → C5 (bottom), labels at written pitch (FR-001, FR-025a). */
export function Keyboard({ rowHeight, highlight }: { rowHeight: number; highlight: number | null }) {
  const { short, long } = useNoteName();
  return (
    <svg width={GUTTER} height={PITCHES.length * rowHeight} className="keyboard" aria-hidden="false" role="list">
      {PITCHES.map((p, i) => {
        const black = isBlackKey(p);
        const y = i * rowHeight;
        return (
          <g key={p} role="listitem" aria-label={long(p)}>
            <rect
              x={0}
              y={y}
              width={GUTTER}
              height={rowHeight}
              fill={p === highlight ? 'var(--hover)' : 'var(--key-white)'}
              stroke="var(--line)"
            />
            {black && <rect x={0} y={y + 2} width={GUTTER * 0.55} height={rowHeight - 4} fill="var(--key-black)" rx={2} />}
            <text
              x={GUTTER - 4}
              y={y + rowHeight / 2}
              dominantBaseline="central"
              textAnchor="end"
              fontSize={Math.min(11, rowHeight - 6)}
              fill="var(--fg)"
            >
              {short(p)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
