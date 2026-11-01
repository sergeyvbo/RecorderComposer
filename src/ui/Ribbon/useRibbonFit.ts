import { useEffect, useState, type RefObject } from 'react';
import { fitLevels, type GroupState } from './fit';
import type { RibbonGroupDef } from './layout';

type Widths = Record<string, Record<GroupState, number>>;
export const GROUP_STATES: readonly GroupState[] = ['full', 'iconsOnly', 'folded'];
/** Gap between groups plus the separator line, in px (matches .ribbon-panel gap in global.css). */
const GROUP_GAP = 9;

/**
 * Fits the selected tab's groups to the ribbon width (003 research R7). Every group's width in each
 * state is read from an off-screen copy (`[data-m-group][data-m-state]` inside `measure`), so
 * language or label changes re-measure on their own; `root` gives the available width.
 */
export function useRibbonFit(
  root: RefObject<HTMLElement>,
  measure: RefObject<HTMLElement>,
  groups: readonly RibbonGroupDef[],
): Record<string, GroupState> {
  const [available, setAvailable] = useState(Infinity);
  const [widths, setWidths] = useState<Widths>({});

  useEffect(() => {
    const el = root.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const style = getComputedStyle(el);
      setAvailable(el.clientWidth - parseFloat(style.paddingLeft || '0') - parseFloat(style.paddingRight || '0'));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [root]);

  useEffect(() => {
    const el = measure.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const read = () => {
      const next: Widths = {};
      el.querySelectorAll<HTMLElement>('[data-m-group]').forEach((item) => {
        const id = item.dataset.mGroup as string;
        const state = item.dataset.mState as GroupState;
        next[id] = { ...(next[id] ?? { full: 0, iconsOnly: 0, folded: 0 }), [state]: item.offsetWidth + GROUP_GAP };
      });
      setWidths(next);
    };
    const ro = new ResizeObserver(read);
    el.querySelectorAll('[data-m-group]').forEach((item) => ro.observe(item));
    read();
    return () => ro.disconnect();
  }, [measure]);

  const known = groups.every((g) => widths[g.id]);
  if (!known || available === Infinity) return Object.fromEntries(groups.map((g) => [g.id, 'full' as GroupState]));
  return fitLevels(
    groups.map((g) => ({
      id: g.id,
      widths: widths[g.id] as Record<GroupState, number>,
      hasSmall: g.items.some((i) => 'command' in i ? i.size === 'small' : true),
    })),
    available,
  );
}
