import { openDB } from 'idb';
import { parseMelodyFile, type MelodyFileV1, type ParseResult } from '@/domain/serialization';
import type { LibraryEntry } from '@/state/store';

export const DB_NAME = 'recorder-composer';
const STORE = 'melodies';

/** IndexedDB store of serialized melody documents keyed by melody id (R6). */
export interface MelodyDb {
  list: () => Promise<LibraryEntry[]>;
  get: (id: string) => Promise<ParseResult | null>;
  put: (doc: MelodyFileV1) => Promise<void>;
  delete: (id: string) => Promise<void>;
}

export async function openMelodyDb(name = DB_NAME): Promise<MelodyDb> {
  const db = await openDB(name, 1, {
    upgrade(d) {
      d.createObjectStore(STORE, { keyPath: 'melody.id' });
    },
  });
  return {
    list: async () => {
      const docs = (await db.getAll(STORE)) as MelodyFileV1[];
      return docs
        .map((d) => ({ id: d.melody.id, title: d.melody.title, updatedAt: d.melody.updatedAt }))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    get: async (id) => {
      const doc: unknown = await db.get(STORE, id);
      return doc === undefined ? null : parseMelodyFile(doc);
    },
    put: async (doc) => {
      await db.put(STORE, doc);
    },
    delete: async (id) => {
      await db.delete(STORE, id);
    },
  };
}
