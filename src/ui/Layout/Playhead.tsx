import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GUTTER, useTimeAxis } from './SharedTimeAxis';
import { useApp } from '../storeContext';

/**
 * The single playback line across all visible panels (FR-013a, FR-016), drawn in its own overlay
 * so note layers do not re-render each frame. Auto-scrolls to keep the line visible while playing.
 */
export function Playhead() {
  const { t } = useTranslation();
  const axis = useTimeAxis();
  const position = useApp((s) => s.playback.positionTicks);
  const status = useApp((s) => s.playback.status);
  const actions = useApp((s) => s.actions);
  const x = axis.tickToX(position);

  useEffect(() => {
    if (status !== 'playing') return;
    const visible = axis.width / axis.pxPerTick;
    if (x > axis.width * 0.9 || x < 0) actions.setView({ scrollTick: Math.max(0, position - visible * 0.1) });
  }, [x, status, axis.width, axis.pxPerTick, position, actions]);

  if (x < 0 || x > axis.width) return null;
  return (
    <div
      data-testid="playhead"
      aria-hidden="true"
      title={t('playback.position')}
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: GUTTER + x - 1,
        width: 2,
        background: 'var(--playhead)',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    />
  );
}
