import { memo } from 'react';
import { labelColor, pitchColor } from '@/domain/colors';
import { MAX_PITCH, type Note } from '@/domain/types';

export const HANDLE = 6;
/** Width of the visible length grip on a note's right end; it is also the end handle's hit area. */
export const GRIP = 8;

/**
 * A note as a colored rectangle with left/right resize handles, plus a staccato dot or tenuto bar
 * near its right end (002 FR-009). The right handle is drawn as a grip so the length is easy to
 * adjust. `description` (translated articulation) extends the accessible name.
 */
export const NoteRect = memo(function NoteRect({
  note,
  x,
  width,
  rowHeight,
  selected,
  hovered,
  playing,
  label,
  description,
}: {
  note: Note;
  x: number;
  width: number;
  rowHeight: number;
  selected: boolean;
  hovered: boolean;
  playing: boolean;
  label: string;
  description?: string | undefined;
}) {
  const y = (MAX_PITCH - note.pitch) * rowHeight + 1;
  const h = rowHeight - 2;
  const w = Math.max(2, width - 1);
  const handle = Math.min(HANDLE, w / 4);
  const grip = Math.min(GRIP, w / 3);
  const ink = labelColor(pitchColor(note.pitch));
  const markX = x + w - grip - 5;
  const r = Math.min(3, grip);
  const gx = x + w - grip;
  const gripPath = `M${gx},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${y + r}V${y + h - r}A${r},${r} 0 0 1 ${x + w - r},${y + h}H${gx}Z`;
  return (
    <g
      data-note-id={note.id}
      data-testid="note"
      data-playing={playing}
      aria-label={description ? `${label}, ${description}` : label}
      aria-selected={selected}
      role="option"
    >
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
          fill={ink}
          pointerEvents="none"
        >
          {label}
        </text>
      )}
      {note.mark === 'staccato' && (
        <circle data-testid="timeline-mark" data-mark="staccato" cx={markX} cy={y + h / 2} r={2.2} fill={ink} aria-hidden pointerEvents="none" />
      )}
      {note.mark === 'tenuto' && (
        <rect
          data-testid="timeline-mark"
          data-mark="tenuto"
          x={markX - 4}
          y={y + h / 2 - 1}
          width={8}
          height={2}
          fill={ink}
          aria-hidden
          pointerEvents="none"
        />
      )}
      <path
        data-testid="note-grip"
        d={gripPath}
        fill={selected || hovered ? 'rgb(0 0 0 / 32%)' : 'rgb(0 0 0 / 16%)'}
        aria-hidden
        pointerEvents="none"
      />
      {grip >= 6 && h >= 8 && (
        <path
          d={`M${gx + grip / 2 - 1.5},${y + h / 2 - 3}v6M${gx + grip / 2 + 1.5},${y + h / 2 - 3}v6`}
          stroke={ink}
          strokeOpacity={0.7}
          strokeWidth={1}
          aria-hidden
          pointerEvents="none"
        />
      )}
      <rect data-handle="start" x={x} y={y} width={handle} height={h} fill="transparent" style={{ cursor: 'ew-resize' }} />
      <rect data-handle="end" x={gx} y={y} width={grip} height={h} fill="transparent" style={{ cursor: 'ew-resize' }} />
    </g>
  );
});
