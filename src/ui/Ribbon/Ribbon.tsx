import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { RIBBON_TABS, type RibbonTabId } from '@/state/prefs';
import { useCommands, type CommandDescriptor } from '../commands/useCommands';
import { useApp } from '../storeContext';
import { RIBBON_LAYOUT } from './layout';
import { RibbonButton } from './RibbonButton';
import { RibbonGroup } from './RibbonGroup';
import { GROUP_STATES, useRibbonFit } from './useRibbonFit';

const tabId = (id: RibbonTabId) => `ribbon-tab-${id}`;
const panelId = (id: RibbonTabId) => `ribbon-panel-${id}`;

/**
 * Office-style ribbon (003): a tab row and the selected tab's groups. All panels stay mounted and
 * inactive ones are `hidden` (research R4). Collapsed, only the tab row shows and a clicked tab opens
 * its panel as a popup over the workspace (FR-011).
 */
export function Ribbon() {
  const { t } = useTranslation();
  const commands = useCommands();
  const actions = useApp((s) => s.actions);
  const ribbon = useApp((s) => s.prefs.ribbon);
  const [popupOpen, setPopupOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const measure = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Partial<Record<RibbonTabId, HTMLButtonElement | null>>>({});
  const selected = ribbon.tab;
  const collapsed = ribbon.collapsed;
  const selectedTab = RIBBON_LAYOUT.find((tab) => tab.id === selected) ?? (RIBBON_LAYOUT[0] as (typeof RIBBON_LAYOUT)[number]);
  const fit = useRibbonFit(root, measure, selectedTab.groups);

  const setRibbon = (patch: Partial<typeof ribbon>) => actions.setPrefs({ ribbon: { ...ribbon, ...patch } });
  const closePopup = (focusTab = false) => {
    setPopupOpen(false);
    if (focusTab) tabRefs.current[selected]?.focus();
  };

  useEffect(() => {
    if (!collapsed) setPopupOpen(false);
  }, [collapsed]);
  useEffect(() => {
    if (!popupOpen) return;
    // Capture phase: closes before a timeline drag or click starts, without blocking it.
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setPopupOpen(false);
    };
    document.addEventListener('pointerdown', outside, true);
    return () => document.removeEventListener('pointerdown', outside, true);
  }, [popupOpen]);
  useEffect(() => {
    const el = measure.current;
    if (el) el.setAttribute('inert', '');
  }, []);

  const run = (c: CommandDescriptor) => {
    c.run();
    if (collapsed) closePopup();
  };
  const select = (id: RibbonTabId) => {
    setRibbon({ tab: id });
    tabRefs.current[id]?.focus();
  };
  const onTabClick = (id: RibbonTabId) => {
    if (!collapsed) return setRibbon({ tab: id });
    if (id === selected && popupOpen) return closePopup();
    setRibbon({ tab: id });
    setPopupOpen(true);
  };
  const onTabKey = (e: KeyboardEvent) => {
    const i = RIBBON_TABS.indexOf(selected);
    const n = RIBBON_TABS.length;
    const next =
      e.key === 'ArrowRight' ? RIBBON_TABS[(i + 1) % n]
      : e.key === 'ArrowLeft' ? RIBBON_TABS[(i - 1 + n) % n]
      : e.key === 'Home' ? RIBBON_TABS[0]
      : e.key === 'End' ? RIBBON_TABS[n - 1]
      : undefined;
    if (!next) return;
    e.preventDefault();
    select(next);
  };

  const bodyHidden = collapsed && !popupOpen;
  return (
    <div
      ref={root}
      className="ribbon"
      data-collapsed={collapsed || undefined}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && popupOpen) closePopup(true);
      }}
    >
      <div className="ribbon-tabs">
        <div role="tablist" aria-label={t('ribbon.label')} onKeyDown={onTabKey}>
          {RIBBON_LAYOUT.map((tab) => (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              type="button"
              role="tab"
              id={tabId(tab.id)}
              aria-selected={tab.id === selected}
              aria-controls={panelId(tab.id)}
              tabIndex={tab.id === selected ? 0 : -1}
              className="ribbon-tab"
              onClick={() => onTabClick(tab.id)}
              onDoubleClick={() => {
                if (tab.id === selected) setRibbon({ collapsed: !collapsed });
              }}
            >
              {t(`ribbon.tab.${tab.id}`)}
            </button>
          ))}
        </div>
        <RibbonButton command={commands.collapseRibbon} size="small" iconsOnly />
      </div>
      <div className={`ribbon-body${collapsed ? ' ribbon-popup' : ''}`} hidden={bodyHidden}>
        {RIBBON_LAYOUT.map((tab) => (
          <div
            key={tab.id}
            role="tabpanel"
            id={panelId(tab.id)}
            aria-labelledby={tabId(tab.id)}
            className="ribbon-panel"
            hidden={tab.id !== selected}
          >
            {tab.groups.map((g) => (
              <RibbonGroup key={g.id} group={g} state={tab.id === selected ? (fit[g.id] ?? 'full') : 'full'} commands={commands} onRun={run} />
            ))}
          </div>
        ))}
      </div>
      {/* Off-screen copy of every group in every state, for fitting (research R7). */}
      <div ref={measure} className="ribbon-measure" aria-hidden>
        {RIBBON_LAYOUT.flatMap((tab) =>
          tab.groups.flatMap((g) =>
            GROUP_STATES.map((s) => (
              <div key={`${g.id}-${s}`} data-m-group={g.id} data-m-state={s} className="ribbon-measure-item">
                <RibbonGroup group={g} state={s} commands={commands} onRun={() => undefined} />
              </div>
            )),
          ),
        )}
      </div>
    </div>
  );
}
