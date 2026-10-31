import { useTranslation } from 'react-i18next';
import { MAX_PITCH, type Note } from '@/domain/types';
import { selectMelody } from '@/state/store';
import { GUTTER, useTimeAxis } from '../Layout/SharedTimeAxis';
import { useApp } from '../storeContext';
import { useNoteName } from '../useNoteName';
import { BoxSelect } from './BoxSelect';
import { Grid } from './Grid';
import { Keyboard, PITCHES } from './Keyboard';
import { NoteRect } from './NoteRect';
import { useTimelineGestures } from './useTimelineGestures';

export const ROW_HEIGHT = 18;

/** Timeline panel: keyboard + grid + notes on the shared time axis (US1). */
export function TimelinePanel() {
  const { t } = useTranslation();
  const axis = useTimeAxis();
  const melody = useApp(selectMelody);
  const selected = useApp((s) => s.selection.ids);
  const hoverId = useApp((s) => s.selection.hoverId);
  const playingId = useApp((s) => s.playback.playingNoteId);
  const snap = useApp((s) => s.prefs.snapTicks);
  const { short } = useNoteName();
  const { box, moving, handlers } = useTimelineGestures(axis, ROW_HEIGHT);
  const height = PITCHES.length * ROW_HEIGHT;
  const margin = axis.width / axis.pxPerTick;
  const visible = melody.notes.filter(
    (n) => n.start + n.duration >= axis.visibleStart - margin && n.start <= axis.visibleEnd + margin,
  );
  const hoverPitch = melody.notes.find((n) => n.id === hoverId)?.pitch ?? null;
  // Slurred pairs with at least one note in view, joined from top centre to top centre (FR-009).
  const visibleIds = new Set(visible.map((n) => n.id));
  const slurPairs = melody.notes.flatMap((n, i) => {
    const next = melody.notes[i + 1];
    return n.slurNext && next && (visibleIds.has(n.id) || visibleIds.has(next.id)) ? [[n, next] as const] : [];
  });
  const topCentre = (n: Note) => [axis.tickToX(n.start + n.duration / 2), (MAX_PITCH - n.pitch) * ROW_HEIGHT] as const;
  const articulationLabel = (n: Note) =>
    [n.mark && t(`articulation.a11y.${n.mark}`), n.slurNext && t('articulation.a11y.slurred')].filter(Boolean).join(', ') ||
    undefined;

  return (
    <div
      className="timeline"
      tabIndex={0}
      aria-label={t('panel.timeline')}
      style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden' }}
    >
      <div style={{ display: 'flex', width: GUTTER + axis.width }}>
        <div style={{ position: 'sticky', left: 0, zIndex: 1 }}>
          <Keyboard rowHeight={ROW_HEIGHT} highlight={hoverPitch} />
        </div>
        <svg
          data-testid="timeline-grid"
          width={axis.width}
          height={height}
          role="listbox"
          aria-multiselectable="true"
          aria-label={t('panel.timeline')}
          className={moving ? 'timeline-moving' : undefined}
          style={{ display: 'block', touchAction: 'none', userSelect: 'none' }}
          {...handlers}
        >
          <rect x={0} y={0} width={axis.width} height={height} fill="transparent" />
          <Grid rowHeight={ROW_HEIGHT} timeSignature={melody.timeSignature} snap={snap} />
          {visible.map((n) => (
            <NoteRect
              key={n.id}
              note={n}
              x={axis.tickToX(n.start)}
              width={n.duration * axis.pxPerTick}
              rowHeight={ROW_HEIGHT}
              selected={selected.has(n.id)}
              hovered={hoverId === n.id}
              playing={playingId === n.id}
              label={short(n.pitch)}
              description={articulationLabel(n)}
            />
          ))}
          {slurPairs.map(([a, b]) => {
            const [x1, y1] = topCentre(a);
            const [x2, y2] = topCentre(b);
            const lift = Math.min(24, 6 + (x2 - x1) * 0.15);
            return (
              <path
                key={`slur-${a.id}`}
                data-testid="slur-arc"
                d={`M${x1},${y1} Q${(x1 + x2) / 2},${Math.min(y1, y2) - lift} ${x2},${y2}`}
                fill="none"
                stroke="var(--fg)"
                strokeWidth={1.5}
                strokeLinecap="round"
                aria-hidden
                pointerEvents="none"
              />
            );
          })}
          <BoxSelect box={box} />
        </svg>
      </div>
    </div>
  );
}
