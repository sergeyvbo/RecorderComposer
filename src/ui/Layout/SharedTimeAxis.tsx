import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ticksPerBar } from '@/domain/keys';
import { MAX_PX_PER_TICK, MIN_PX_PER_TICK } from '@/state/prefs';
import { useApp, useAppStore } from '../storeContext';

/** Width of the fixed left column (keyboard, clef, labels) shared by all panels. */
export const GUTTER = 76;

export interface TimeAxis {
  pxPerTick: number;
  scrollTick: number;
  /** Width in px of the time area (right of the gutter). */
  width: number;
  /** x within the time area (0 = left edge of the time area). */
  tickToX: (tick: number) => number;
  xToTick: (x: number) => number;
  visibleStart: number;
  visibleEnd: number;
  totalTicks: number;
}

const AxisContext = createContext<TimeAxis | null>(null);

export function useTimeAxis(): TimeAxis {
  const axis = useContext(AxisContext);
  if (!axis) throw new Error('SharedTimeAxis missing');
  return axis;
}

export function clampZoom(px: number): number {
  return Math.min(MAX_PX_PER_TICK, Math.max(MIN_PX_PER_TICK, px));
}

/**
 * One horizontal scale for all panels (FR-013a): provides tickToX/xToTick, a single horizontal
 * scrollbar, Ctrl/Cmd+wheel zoom around the pointer and Shift+wheel / trackpad horizontal scroll.
 */
export function SharedTimeAxis({ children }: { children: ReactNode }) {
  const store = useAppStore();
  const pxPerTick = useApp((s) => s.view.pxPerTick);
  const scrollTick = useApp((s) => s.view.scrollTick);
  const melodyEnd = useApp((s) => s.melody.notes.at(-1)?.start ?? 0);
  const lastEnd = useApp((s) => {
    const n = s.melody.notes.at(-1);
    return n ? n.start + n.duration : 0;
  });
  const bar = useApp((s) => ticksPerBar(s.melody.timeSignature));
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [rootWidth, setRootWidth] = useState(1200);
  const width = Math.max(100, rootWidth - GUTTER);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setRootWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const visibleTicks = width / pxPerTick;
  const totalTicks = Math.max(bar * 16, Math.ceil((Math.max(lastEnd, melodyEnd) + bar * 4) / bar) * bar, scrollTick + visibleTicks);

  // Keep the native scrollbar in sync with scrollTick.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && Math.abs(el.scrollLeft - scrollTick * pxPerTick) > 1) el.scrollLeft = scrollTick * pxPerTick;
  }, [scrollTick, pxPerTick]);

  // Wheel: Ctrl/Cmd zooms around the pointer; Shift or horizontal delta scrolls in time.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const { view } = store.getState();
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - GUTTER;
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const anchor = view.scrollTick + Math.max(0, x) / view.pxPerTick;
        const next = clampZoom(view.pxPerTick * Math.exp(-e.deltaY * 0.0015));
        const scroll = Math.max(0, anchor - Math.max(0, x) / next);
        store.setState({ view: { pxPerTick: next, scrollTick: scroll } });
        store.setState((s) => ({ prefs: { ...s.prefs, pxPerTick: next } }));
        return;
      }
      const dx = e.shiftKey ? e.deltaY : e.deltaX;
      if (dx !== 0 && Math.abs(dx) >= Math.abs(e.shiftKey ? 0 : e.deltaY)) {
        e.preventDefault();
        store.setState({
          view: { ...view, scrollTick: Math.max(0, view.scrollTick + dx / view.pxPerTick) },
        });
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [store]);

  const axis = useMemo<TimeAxis>(
    () => ({
      pxPerTick,
      scrollTick,
      width,
      tickToX: (t) => (t - scrollTick) * pxPerTick,
      xToTick: (x) => x / pxPerTick + scrollTick,
      visibleStart: scrollTick,
      visibleEnd: scrollTick + width / pxPerTick,
      totalTicks,
    }),
    [pxPerTick, scrollTick, width, totalTicks],
  );

  return (
    <AxisContext.Provider value={axis}>
      <div ref={rootRef} className="time-axis" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>{children}</div>
        <div
          ref={scrollRef}
          className="time-scrollbar"
          style={{ marginLeft: GUTTER, overflowX: 'auto', overflowY: 'hidden', height: 14 }}
          onScroll={(e) => {
            const left = e.currentTarget.scrollLeft;
            const { view } = store.getState();
            if (Math.abs(left - view.scrollTick * view.pxPerTick) > 1) {
              store.setState({ view: { ...view, scrollTick: left / view.pxPerTick } });
            }
          }}
        >
          <div style={{ width: totalTicks * pxPerTick, height: 1 }} />
        </div>
      </div>
    </AxisContext.Provider>
  );
}
