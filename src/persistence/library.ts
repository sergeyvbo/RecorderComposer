import { setTitle } from '@/domain/commands';
import { parseMelodyFile, serialize, type ParseError } from '@/domain/serialization';
import { createEmptyMelody, type Melody } from '@/domain/types';
import type { AppStore, StoreDeps } from '@/state/store';
import { storageErrorStatus } from './autosave';
import type { MelodyDb } from './db';
import { recoverRescue, type RescueStorage } from './rescue';

export interface LibraryTexts {
  untitled: () => string;
  copyOf: (title: string) => string;
}

export interface LibraryService {
  newMelody: () => Promise<void>;
  open: (id: string) => Promise<void>;
  rename: (id: string, title: string) => Promise<boolean>;
  duplicate: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Returns null on success, otherwise the error; the current melody is untouched on error. */
  importText: (text: string) => Promise<ParseError | null>;
  exportCurrent: () => { filename: string; text: string };
}

export const safeFileName = (title: string) => title.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'melody';

/** Melody library operations over the auto-save database (US4, FR-019–FR-021). */
export function createLibrary(
  store: AppStore,
  dbPromise: Promise<MelodyDb>,
  deps: StoreDeps,
  texts: LibraryTexts,
  flush: () => Promise<void>,
): LibraryService {
  const s = () => store.getState();
  const withDb = async <T>(fn: (db: MelodyDb) => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await fn(await dbPromise);
    } catch (e) {
      s().actions.setStorageStatus(storageErrorStatus(e));
      return fallback;
    }
  };
  const save = (m: Melody) =>
    withDb(async (db) => {
      await db.put(serialize(m));
      s().actions.upsertLibraryEntry({ id: m.id, title: m.title, updatedAt: m.updatedAt });
    }, undefined);
  const load = async (id: string): Promise<Melody | null> => {
    if (s().melody.id === id) return s().melody;
    const r = await withDb((db) => db.get(id), null);
    return r?.ok ? r.melody : null;
  };
  const show = (m: Melody) => {
    s().actions.openMelody(m);
    s().actions.setPrefs({ lastMelodyId: m.id });
  };

  return {
    newMelody: async () => {
      await flush();
      show(createEmptyMelody(deps.now(), deps.newId(), texts.untitled()));
    },
    open: async (id) => {
      await flush();
      const m = await load(id);
      if (m) show(m);
    },
    rename: async (id, title) => {
      if (s().melody.id === id) return s().actions.dispatch((m) => setTitle(m, title)).ok;
      const m = await load(id);
      if (!m) return false;
      const r = setTitle(m, title);
      if (!r.ok) return false;
      await save({ ...r.melody, updatedAt: deps.now() });
      return true;
    },
    duplicate: async (id) => {
      await flush();
      const m = await load(id);
      if (!m) return;
      const now = deps.now();
      const title = texts.copyOf(m.title).slice(0, 120);
      await save({ ...m, id: deps.newId(), title, createdAt: now, updatedAt: now });
    },
    remove: async (id) => {
      await withDb((db) => db.delete(id), undefined);
      s().actions.removeLibraryEntry(id);
      if (s().melody.id !== id) return;
      const next = s().library[0];
      const m = next ? await load(next.id) : null;
      show(m ?? createEmptyMelody(deps.now(), deps.newId(), texts.untitled()));
    },
    importText: async (text) => {
      const r = parseMelodyFile(text);
      if (!r.ok) return r.error;
      await flush();
      const now = deps.now();
      const m = { ...r.melody, id: deps.newId(), createdAt: now, updatedAt: now };
      show(m);
      await save(m);
      return null;
    },
    exportCurrent: () => {
      const m = s().melody;
      return { filename: `${safeFileName(m.title)}.rcm.json`, text: JSON.stringify(serialize(m), null, 2) };
    },
  };
}

/** Startup (T075): library list, then last opened melody, else most recent, else a new one. */
export async function loadInitialMelody(
  store: AppStore,
  dbPromise: Promise<MelodyDb>,
  rescue?: RescueStorage,
) {
  const { actions, prefs } = store.getState();
  try {
    const db = await dbPromise;
    const recovered = rescue ? await recoverRescue(db, rescue) : null;
    const entries = await db.list();
    actions.setLibrary(entries);
    const lastId = recovered ?? prefs.lastMelodyId;
    const pick = entries.find((e) => e.id === lastId) ?? entries[0];
    if (!pick) return;
    const r = await db.get(pick.id);
    if (r?.ok) actions.openMelody(r.melody);
  } catch (e) {
    actions.setStorageStatus(storageErrorStatus(e));
  }
}
