import { useTranslation } from 'react-i18next';
import { setTimeSignature } from '@/domain/commands';
import { SNAP_VALUES, TIME_SIGNATURES, type SnapTicks } from '@/domain/types';
import { selectCanRedo, selectCanUndo } from '@/state/store';
import { clampZoom } from '../Layout/SharedTimeAxis';
import { useApp, useAppStore } from '../storeContext';
import { SYMBOL } from '../symbols';

/** Snap, time signature, undo/redo and zoom (FR-003, FR-007, FR-009). */
export function EditControls() {
  const { t } = useTranslation();
  const store = useAppStore();
  const actions = useApp((s) => s.actions);
  const snap = useApp((s) => s.prefs.snapTicks);
  const ts = useApp((s) => s.melody.timeSignature);
  const canUndo = useApp(selectCanUndo);
  const canRedo = useApp(selectCanRedo);
  const zoom = (factor: number) => {
    const px = clampZoom(store.getState().view.pxPerTick * factor);
    actions.setView({ pxPerTick: px });
    actions.setPrefs({ pxPerTick: px });
  };

  return (
    <div className="toolbar-group">
      <button type="button" onClick={actions.undo} disabled={!canUndo} aria-label={t('toolbar.undo')} title={t('toolbar.undo')}>
        {SYMBOL.undo}
      </button>
      <button type="button" onClick={actions.redo} disabled={!canRedo} aria-label={t('toolbar.redo')} title={t('toolbar.redo')}>
        {SYMBOL.redo}
      </button>
      <label>
        {t('toolbar.snap')}{' '}
        <select
          value={snap}
          onChange={(e) => actions.setPrefs({ snapTicks: Number(e.target.value) as SnapTicks })}
        >
          {SNAP_VALUES.map((v) => (
            <option key={v} value={v}>
              {t(`snap.${v}`)}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t('toolbar.timeSignature')}{' '}
        <select
          value={`${ts.beats}/${ts.beatUnit}`}
          onChange={(e) => {
            const next = TIME_SIGNATURES.find((x) => `${x.beats}/${x.beatUnit}` === e.target.value);
            if (next) actions.dispatch((m) => setTimeSignature(m, next));
          }}
        >
          {TIME_SIGNATURES.map((x) => (
            <option key={`${x.beats}/${x.beatUnit}`} value={`${x.beats}/${x.beatUnit}`}>
              {`${x.beats}/${x.beatUnit}`}
            </option>
          ))}
        </select>
      </label>
      <button type="button" onClick={() => zoom(1 / 1.25)} aria-label={t('toolbar.zoomOut')} title={t('toolbar.zoomOut')}>
        {SYMBOL.zoomOut}
      </button>
      <button type="button" onClick={() => zoom(1.25)} aria-label={t('toolbar.zoomIn')} title={t('toolbar.zoomIn')}>
        {SYMBOL.zoomIn}
      </button>
    </div>
  );
}
