import { useTranslation } from 'react-i18next';
import { PANEL_IDS } from '@/state/prefs';
import { useApp } from '../storeContext';

/** Show/hide each panel (FR-014); at least one panel stays visible. */
export function PanelToggles() {
  const { t } = useTranslation();
  const panels = useApp((s) => s.prefs.panels);
  const actions = useApp((s) => s.actions);
  const visibleCount = PANEL_IDS.filter((id) => panels[id].visible).length;
  return (
    <div className="toolbar-group" role="group" aria-label={t('panel.group')}>
      {PANEL_IDS.map((id) => {
        const on = panels[id].visible;
        return (
          <button
            key={id}
            type="button"
            className="toggle"
            aria-pressed={on}
            disabled={on && visibleCount === 1}
            onClick={() => actions.setPrefs({ panels: { ...panels, [id]: { ...panels[id], visible: !on } } })}
          >
            {t(`panel.${id}`)}
          </button>
        );
      })}
    </div>
  );
}
