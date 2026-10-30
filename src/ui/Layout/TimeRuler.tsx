import { useTranslation } from 'react-i18next';
import { ticksPerBar, ticksPerBeat } from '@/domain/keys';
import { usePlaybackController } from '../playbackContext';
import { useApp } from '../storeContext';
import { GUTTER, useTimeAxis } from './SharedTimeAxis';

export const RULER_HEIGHT = 20;

/** Bar/beat numbers above the panels; clicking moves the playback position (FR-016). */
export function TimeRuler() {
  const { t } = useTranslation();
  const axis = useTimeAxis();
  const ts = useApp((s) => s.melody.timeSignature);
  const snap = useApp((s) => s.prefs.snapTicks);
  const controller = usePlaybackController();
  const bar = ticksPerBar(ts);
  const beat = ticksPerBeat(ts);
  const marks = [];
  for (let tick = Math.floor(axis.visibleStart / beat) * beat; tick <= axis.visibleEnd; tick += beat) {
    const x = axis.tickToX(tick);
    const isBar = tick % bar === 0;
    marks.push(
      <g key={tick}>
        <line x1={x} x2={x} y1={isBar ? 4 : 13} y2={RULER_HEIGHT} stroke={isBar ? 'var(--bar)' : 'var(--line-strong)'} />
        {isBar && (
          <text x={x + 3} y={12} fontSize={10} fill="var(--muted)">
            {tick / bar + 1}
          </text>
        )}
      </g>,
    );
  }
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', background: 'var(--panel)' }}>
      <div style={{ width: GUTTER, flex: 'none' }} />
      <svg
        data-testid="time-ruler"
        width={axis.width}
        height={RULER_HEIGHT}
        role="slider"
        aria-label={t('playback.ruler')}
        aria-valuemin={0}
        aria-valuemax={Math.round(axis.totalTicks)}
        aria-valuenow={0}
        style={{ cursor: 'pointer', flex: 'none' }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const tick = axis.xToTick(e.clientX - rect.left);
          controller.seek(Math.round(tick / snap) * snap);
        }}
      >
        {marks}
      </svg>
    </div>
  );
}
