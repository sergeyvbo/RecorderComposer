import { serialize } from '@/domain/serialization';
import type { Melody } from '@/domain/types';
import type { AppStore } from '@/state/store';
import type { MelodyDb } from './db';
import { clearRescue, saveRescue, type RescueStorage } from './rescue';

export interface AutosaveOptions {
  debounceMs?: number;
  /** Where `visibilitychange` / `pagehide` are listened for (document + window in the app). */
  events?: EventTarget | EventTarget[];
  isHidden?: () => boolean;
  /** Synchronous copy written on hide/close, in case the async write does not commit. */
  rescue?: RescueStorage | undefined;
}

export const storageErrorStatus = (e: unknown): 'quota' | 'unavailable' =>
  e instanceof Error && (e.name === 'QuotaExceededError' || /quota/i.test(e.message)) ? 'quota' : 'unavailable';

/**
 * Persists every committed melody change within the debounce (≤ 1 s, FR-019) and immediately when
 * the page is hidden or closed. Write failures set a persistent storage status (edge case).
 */
export function createAutosave(store: AppStore, db: MelodyDb, opts: AutosaveOptions = {}) {
  const debounceMs = opts.debounceMs ?? 500;
  const targets = opts.events === undefined ? [] : Array.isArray(opts.events) ? opts.events : [opts.events];
  const isHidden = opts.isHidden ?? (() => typeof document !== 'undefined' && document.visibilityState === 'hidden');
  let pending: Melody | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let writing: Promise<void> = Promise.resolve();

  const write = (m: Melody) => {
    const { actions } = store.getState();
    actions.setStorageStatus('saving');
    writing = writing
      .then(() => db.put(serialize(m)))
      .then(() => {
        const s = store.getState();
        s.actions.setStorageStatus('ok');
        if (opts.rescue) clearRescue(opts.rescue, m);
        s.actions.upsertLibraryEntry({ id: m.id, title: m.title, updatedAt: m.updatedAt });
        if (s.prefs.lastMelodyId !== m.id) s.actions.setPrefs({ lastMelodyId: m.id });
      })
      .catch((e: unknown) => store.getState().actions.setStorageStatus(storageErrorStatus(e)));
    return writing;
  };

  const flush = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    const m = pending;
    pending = null;
    return m ? write(m) : writing;
  };

  const unsubscribe = store.subscribe((s, prev) => {
    // Only committed changes; opening a melody is not an edit.
    if (s.melody === prev.melody || s.history === prev.history || s.melody.id !== prev.melody.id) return;
    if (s.history.present !== s.melody) return;
    pending = s.melody;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void flush(), debounceMs);
  });

  const flushNow = () => {
    if (pending && opts.rescue) saveRescue(opts.rescue, pending);
    void flush();
  };
  const onHide = () => {
    if (isHidden()) flushNow();
  };
  const onPageHide = flushNow;
  for (const t of targets) {
    t.addEventListener('visibilitychange', onHide);
    t.addEventListener('pagehide', onPageHide);
  }

  return {
    flush,
    /** Resolves when no write is in flight (tests). */
    idle: () => writing,
    dispose: () => {
      unsubscribe();
      for (const t of targets) {
        t.removeEventListener('visibilitychange', onHide);
        t.removeEventListener('pagehide', onPageHide);
      }
      if (timer) clearTimeout(timer);
    },
  };
}
