import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

export const TOOLTIP_DELAY_MS = 500;

const focusVisible = (el: Element) => {
  try {
    return el.matches(':focus-visible');
  } catch {
    return true;
  }
};

/**
 * Hover (after a delay) or keyboard-focus tooltip for a ribbon control (003 research R6). It adds
 * a description via `aria-describedby`; the control's accessible name stays its label.
 */
export function useTooltip(anchor: RefObject<HTMLElement>) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const clear = () => clearTimeout(timer.current);
  useEffect(() => clear, []);
  const hide = () => {
    clear();
    setOpen(false);
  };
  const handlers = {
    onPointerEnter: () => {
      clear();
      timer.current = setTimeout(() => setOpen(true), TOOLTIP_DELAY_MS);
    },
    onPointerLeave: hide,
    onFocus: (e: { currentTarget: Element }) => {
      if (focusVisible(e.currentTarget)) setOpen(true);
    },
    onBlur: hide,
    onPointerDown: hide,
    onKeyDown: (e: { key: string }) => {
      if (e.key === 'Escape') hide();
    },
  };
  return { id, open, handlers, anchor };
}

export function Tooltip({ id, open, anchor, children }: { id: string; open: boolean; anchor: RefObject<HTMLElement>; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  useLayoutEffect(() => {
    if (!open || !anchor.current) return;
    const a = anchor.current.getBoundingClientRect();
    const w = ref.current?.offsetWidth ?? 0;
    const left = Math.max(4, Math.min(a.left + a.width / 2 - w / 2, window.innerWidth - w - 4));
    setPos({ left, top: a.bottom + 6 });
  }, [open, anchor]);
  if (!open) return null;
  return createPortal(
    <div ref={ref} id={id} role="tooltip" data-testid="ribbon-tooltip" className="ribbon-tooltip" style={pos}>
      {children}
    </div>,
    document.body,
  );
}
