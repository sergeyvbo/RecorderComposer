import { memo } from 'react';
import { labelColor, pitchColor } from '@/domain/colors';
import { MAX_PITCH, type Note } from '@/domain/types';

export const HANDLE = 6;

/** A note as a colored rectangle with left/right resize handles. */
export const NoteRect = memo(function NoteRect({
  note,
  x,
  width,
  rowHeight,
  selected,
  hovered,
  playing,
  label,
}: {
  note: Note;
  x: number;
  width: number;
  rowHeight: number;
  selected: boolean;
  hovered: boolean;
  playing: boolean;
  label: string;
}) {
  const y = (MAX_PITCH - note.pitch) * rowHeight + 1;
  const h = rowHeight - 2;
  const w = Math.max(2, width - 1);
  const handle = Math.min(HANDLE, w / 3);
  return (
    <g data-note-id={note.id} data-testid="note" data-playing={playing} aria-label={label} aria-selected={selected} role="option">
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={3}
        fill={pitchColor(note.pitch)}
        stroke={selected ? 'var(--select)' : playing ? 'var(--playhead)' : hovered ? 'var(--hover)' : 'rgb(0 0 0 / 35%)'}
        strokeWidth={selected || playing || hovered ? 2.5 : 1}
        style={{ cursor: 'grab' }}
      />
      {w > 30 && (
        <text
          x={x + 5}
          y={y + h / 2}
          dominantBaseline="central"
          fontSize={Math.min(11, h - 4)}
          fill={labelColor(pitchColor(note.pitch))}
          pointerEvents="none"
        >
          {label}
        </text>
      )}
      <rect data-handle="start" x={x} y={y} width={handle} height={h} fill="transparent" style={{ cursor: 'ew-resize' }} />
      <rect data-handle="end" x={x + w - handle} y={y} width={handle} height={h} fill="transparent" style={{ cursor: 'ew-resize' }} />
    </g>
  );
});
