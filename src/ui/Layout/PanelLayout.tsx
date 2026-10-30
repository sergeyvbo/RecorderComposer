import { Fragment, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { PANEL_IDS, type PanelId } from '@/state/prefs';
import { useApp, useAppStore } from '../storeContext';

/** Vertical, resizable, toggleable panels (FR-014); sizes and visibility persist via prefs. */
export function PanelLayout({ panels }: { panels: Record<PanelId, ReactNode> }) {
  const { t } = useTranslation();
  const store = useAppStore();
  const prefs = useApp((s) => s.prefs.panels);
  const visible = PANEL_IDS.filter((id) => prefs[id].visible);
  const total = visible.reduce((sum, id) => sum + prefs[id].size, 0) || 1;

  return (
    <PanelGroup
      direction="vertical"
      // Remount when the set of visible panels changes so sizes are re-applied.
      key={visible.join('+')}
      onLayout={(sizes) => {
        store.setState((s) => {
          const next = { ...s.prefs.panels };
          visible.forEach((id, i) => {
            const size = sizes[i];
            if (size !== undefined) next[id] = { ...next[id], size };
          });
          return { prefs: { ...s.prefs, panels: next } };
        });
      }}
    >
      {visible.map((id, i) => (
        <Fragment key={id}>
          {i > 0 && <PanelResizeHandle className="panel-resize" />}
          <Panel
            id={id}
            order={PANEL_IDS.indexOf(id)}
            defaultSize={(prefs[id].size / total) * 100}
            minSize={8}
          >
            <section className="panel" aria-label={t(`panel.${id}`)} data-testid={`panel-${id}`}>
              {panels[id]}
            </section>
          </Panel>
        </Fragment>
      ))}
    </PanelGroup>
  );
}
