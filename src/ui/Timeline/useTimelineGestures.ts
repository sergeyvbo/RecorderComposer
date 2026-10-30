import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { addNote, deleteNotes, moveNotes, resizeNote } from '@/domain/commands';
import { MAX_PITCH, MIN_PITCH, type Melody, type MoveDelta } from '@/domain/types';
import { defaultDeps } from '@/state/store';
import type { TimeAxis } from '../Layout/SharedTimeAxis';
import { useAppStore } from '../storeContext';
import type { Box } from './BoxSelect';

type Drag =
  | { kind: 'empty'; x0: number; y0: number; additive: boolean }
  | { kind: 'box'; x0: number; y0: number; additive: boolean }
  | {
      kind: 'move';
      x0: number;
      y0: number;
      ids: string[];
      /** Last delta the command accepted; passed to the next preview and to the commit. */
      lastValid: MoveDelta;
      moved: boolean;
    }
  | { kind: 'resize'; id: string; edge: 'start' | 'end'; moved: boolean; toTick: number };

const DRAG_THRESHOLD = 4;

/**
 * Pointer gestures for the timeline (contracts/ui-contract.md). Drags are previewed on a draft
 * (no history) and committed with one command on pointer-up: one drag = one undo step.
 */
export function useTimelineGestures(axis: TimeAxis, rowHeight: number, deps = defaultDeps) {
  const store = useAppStore();
  const drag = useRef<Drag | null>(null);
  /** Last pointer position seen during the current drag (grid coordinates). */
  const last = useRef({ x: 0, y: 0 });
  const [box, setBox] = useState<Box | null>(null);

  const local = (e: ReactPointerEvent<SVGSVGElement> | React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const pitchAt = (y: number) => Math.min(MAX_PITCH, Math.max(MIN_PITCH, MAX_PITCH - Math.floor(y / rowHeight)));
  const state = () => store.getState();

  const moveDelta = (d: { x0: number; y0: number }, x: number, y: number): MoveDelta => ({
    dTicks: (x - d.x0) / axis.pxPerTick,
    dPitch: -Math.round((y - d.y0) / rowHeight),
  });
  const moveCmd = (ids: string[], args: MoveDelta, lastValid: MoveDelta) => (m: Melody) =>
    moveNotes(m, ids, { ...args, snap: state().prefs.snapTicks, lastValid });
  const resizeCmd = (id: string, edge: 'start' | 'end', toTick: number) => (m: Melody) =>
    resizeNote(m, id, { edge, toTick, snap: state().prefs.snapTicks });

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    // No text selection or native drag while dragging over the page; keep keyboard focus in the
    // timeline, which the default action would otherwise have given it.
    e.preventDefault();
    e.currentTarget.closest<HTMLElement>('[tabindex]')?.focus({ preventScroll: true });
    if (drag.current) abandon();
    const { x, y } = local(e);
    last.current = { x, y };
    const target = (e.target as Element).closest('[data-note-id]');
    const { actions, selection } = state();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (!target) {
      const additive = e.shiftKey || e.ctrlKey || e.metaKey;
      drag.current = { kind: 'empty', x0: x, y0: y, additive };
      return;
    }
    const id = target.getAttribute('data-note-id') as string;
    const handle = (e.target as Element).getAttribute('data-handle') as 'start' | 'end' | null;
    if (e.ctrlKey || e.metaKey) {
      actions.select([id], 'toggle');
      drag.current = null;
      return;
    }
    if (e.shiftKey) actions.select([id], 'add');
    else if (!selection.ids.has(id)) actions.select([id]);
    if (handle) {
      drag.current = { kind: 'resize', id, edge: handle, moved: false, toTick: 0 };
      return;
    }
    drag.current = {
      kind: 'move',
      x0: x,
      y0: y,
      ids: [...state().selection.ids],
      lastValid: { dTicks: 0, dPitch: 0 },
      moved: false,
    };
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (drag.current && e.pointerType === 'mouse' && e.buttons === 0) abandon();
    const d = drag.current;
    const { x, y } = local(e);
    if (d) last.current = { x, y };
    if (!d) {
      const target = (e.target as Element).closest('[data-note-id]');
      state().actions.setHover(target?.getAttribute('data-note-id') ?? null);
      return;
    }
    const { actions } = state();
    if (d.kind === 'empty') {
      if (Math.hypot(x - d.x0, y - d.y0) < DRAG_THRESHOLD) return;
      drag.current = { kind: 'box', x0: d.x0, y0: d.y0, additive: d.additive };
      setBox({ x0: d.x0, y0: d.y0, x1: x, y1: y });
      return;
    }
    if (d.kind === 'box') {
      setBox({ x0: d.x0, y0: d.y0, x1: x, y1: y });
      return;
    }
    if (d.kind === 'move') {
      if (!d.moved && Math.hypot(x - d.x0, y - d.y0) < DRAG_THRESHOLD) return;
      d.moved = true;
      const r = actions.preview(moveCmd(d.ids, moveDelta(d, x, y), d.lastValid));
      if (r.ok && r.applied) d.lastValid = r.applied;
      return;
    }
    d.moved = true;
    d.toTick = axis.xToTick(x);
    actions.preview(resizeCmd(d.id, d.edge, d.toTick));
  };

  const onPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    const { x, y } = local(e);
    finish(x, y);
  };

  /**
   * The release was never delivered (e.g. the button went up outside the window), detected by the
   * next press or a buttonless mouse move: keep a move or resize where it was last shown, and drop
   * an unfinished click or box selection. (Not `lostpointercapture`: WebKit can deliver the previous
   * gesture's one after the next press.)
   */
  const abandon = () => {
    const d = drag.current;
    if (d?.kind === 'move' || d?.kind === 'resize') return finish(last.current.x, last.current.y);
    drag.current = null;
    setBox(null);
  };

  const finish = (x: number, y: number) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const { actions, prefs, melody } = state();
    if (d.kind === 'empty') {
      if (!d.additive) actions.clearSelection();
      const r = actions.dispatch((m) =>
        addNote(m, { pitch: pitchAt(y), start: axis.xToTick(x), duration: prefs.defaultNoteTicks, snap: prefs.snapTicks }, deps),
      );
      if (r.ok && r.ids) actions.select(r.ids, d.additive ? 'add' : 'replace');
      return;
    }
    if (d.kind === 'box') {
      setBox(null);
      const t0 = axis.xToTick(Math.min(d.x0, x));
      const t1 = axis.xToTick(Math.max(d.x0, x));
      const pHigh = pitchAt(Math.min(d.y0, y));
      const pLow = pitchAt(Math.max(d.y0, y));
      const ids = melody.notes
        .filter((n) => n.start < t1 && n.start + n.duration > t0 && n.pitch <= pHigh && n.pitch >= pLow)
        .map((n) => n.id);
      actions.select(ids, d.additive ? 'add' : 'replace');
      return;
    }
    if (d.kind === 'move') {
      // Recomputed at the release point rather than reusing the last preview's delta.
      if (d.moved) actions.dispatch(moveCmd(d.ids, moveDelta(d, x, y), d.lastValid));
      actions.endPreview();
      return;
    }
    if (d.moved) actions.dispatch(resizeCmd(d.id, d.edge, d.toTick));
    actions.endPreview();
  };

  const onDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const target = (e.target as Element).closest('[data-note-id]');
    const id = target?.getAttribute('data-note-id');
    if (id) state().actions.dispatch((m) => deleteNotes(m, [id]));
  };

  const onPointerLeave = () => {
    if (!drag.current) state().actions.setHover(null);
  };

  return { box, handlers: { onPointerDown, onPointerMove, onPointerUp, onDoubleClick, onPointerLeave } };
}
