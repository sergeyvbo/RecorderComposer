import { useTranslation } from 'react-i18next';
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
  const { box, handlers } = useTimelineGestures(axis, ROW_HEIGHT);
  const height = PITCHES.length * ROW_HEIGHT;
  const margin = axis.width / axis.pxPerTick;
  const visible = melody.notes.filter(
    (n) => n.start + n.duration >= axis.visibleStart - margin && n.start <= axis.visibleEnd + margin,
  );
  const hoverPitch = melody.notes.find((n) => n.id === hoverId)?.pitch ?? null;

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
            />
          ))}
          <BoxSelect box={box} />
        </svg>
      </div>
    </div>
  );
}
