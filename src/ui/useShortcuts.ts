import { useEffect } from 'react';
import { articulationState, setLegato, setMark, toggledMark } from '@/domain/articulation';
import { deleteNotes, moveNotes } from '@/domain/commands';
import { useAppStore } from './storeContext';

export interface ShortcutHandlers {
  onPlayPause?: () => void;
  onHome?: () => void;
}

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

/** Keyboard shortcuts from contracts/ui-contract.md. */
export function useShortcuts(handlers: ShortcutHandlers = {}) {
  const store = useAppStore();
  const { onPlayPause, onHome } = handlers;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.defaultPrevented) return;
      const { actions, selection, prefs, melody, playback } = store.getState();
      const mod = e.ctrlKey || e.metaKey;
      const ids = [...selection.ids];
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const handled = () => e.preventDefault();

      if (mod && key === 'z' && !e.shiftKey) return handled(), actions.undo();
      if ((mod && key === 'z' && e.shiftKey) || (mod && key === 'y')) return handled(), actions.redo();
      if (mod && key === 'a') return handled(), actions.select(melody.notes.map((n) => n.id));
      if (mod && key === 'c') return handled(), actions.copy();
      if (mod && key === 'x') return handled(), actions.cut();
      if (mod && key === 'v') return handled(), actions.paste(playback.positionTicks);
      if ((key === ' ' || e.code === 'Space') && onPlayPause) return handled(), onPlayPause();
      if (key === 'Home' && onHome) return handled(), onHome();
      if (key === 'Escape') return actions.clearSelection();
      const plain = !mod && !e.altKey;
      const mark = plain ? ({ s: 'staccato', t: 'tenuto' } as const)[key] : undefined;
      if (mark) {
        handled();
        if (ids.length === 0) return actions.notify('emptySelection');
        const next = toggledMark(articulationState(melody, ids), mark);
        return actions.dispatch((m) => setMark(m, ids, next));
      }
      if (plain && key === 'l') {
        handled();
        if (ids.length === 0) return actions.notify('emptySelection');
        return actions.dispatch((m) => setLegato(m, ids, !e.shiftKey));
      }
      const arrows: Record<string, [number, number]> = {
        ArrowUp: [0, e.shiftKey ? 12 : 1],
        ArrowDown: [0, e.shiftKey ? -12 : -1],
        ArrowLeft: [-prefs.snapTicks, 0],
        ArrowRight: [prefs.snapTicks, 0],
      };
      const delta = arrows[key];
      const actsOnSelection = key === 'Delete' || key === 'Backspace' || delta !== undefined;
      if (!actsOnSelection) return;
      // Refusals are always reported (FR-020), including an editing key with nothing selected.
      if (ids.length === 0) return handled(), actions.notify('emptySelection');
      if (key === 'Delete' || key === 'Backspace') return handled(), actions.dispatch((m) => deleteNotes(m, ids));
      if (delta) {
        handled();
        actions.dispatch((m) =>
          moveNotes(m, ids, { dTicks: delta[0], dPitch: delta[1], snap: prefs.snapTicks, lastValid: { dTicks: 0, dPitch: 0 } }),
        );
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [store, onPlayPause, onHome]);
}
