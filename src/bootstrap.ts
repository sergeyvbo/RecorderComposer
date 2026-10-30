import { i18next } from '@/i18n';
import { createAutosave } from '@/persistence/autosave';
import { openMelodyDb } from '@/persistence/db';
import { createLibrary, loadInitialMelody } from '@/persistence/library';
import { browserRescueStorage } from '@/persistence/rescue';
import { defaultDeps, type AppStore } from '@/state/store';

/**
 * Composition root (called from main.tsx): opens the database, loads the last melody, wires
 * auto-save (flush on hide/close) and returns the library service for the UI.
 */
export function bootstrap(store: AppStore) {
  const dbPromise = openMelodyDb();
  const rescue = browserRescueStorage();
  const ready = loadInitialMelody(store, dbPromise, rescue);
  let autosave: ReturnType<typeof createAutosave> | null = null;
  dbPromise.then(
    (db) => {
      autosave = createAutosave(store, db, { events: [document, window], rescue });
    },
    () => undefined, // storage status is set by loadInitialMelody
  );
  const library = createLibrary(
    store,
    dbPromise,
    defaultDeps,
    {
      untitled: () => i18next.t('melody.untitled'),
      copyOf: (title) => i18next.t('library.copyOf', { title }),
    },
    async () => {
      await autosave?.flush();
    },
  );
  return { library, ready };
}
