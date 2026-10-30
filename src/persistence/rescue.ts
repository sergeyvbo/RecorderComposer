import { parseMelodyFile, serialize } from '@/domain/serialization';
import type { Melody } from '@/domain/types';
import type { MelodyDb } from './db';

/**
 * Synchronous safety copy of the last unsaved melody (FR-019). An IndexedDB write started while the
 * page is unloading is not guaranteed to commit, so on hide/close the pending melody is also written
 * to localStorage; the next start moves it into the database if it is newer than the stored copy.
 */
export const RESCUE_KEY = 'rc.rescue';

export type RescueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function browserRescueStorage(): RescueStorage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

export function saveRescue(storage: RescueStorage, m: Melody) {
  try {
    storage.setItem(RESCUE_KEY, JSON.stringify(serialize(m)));
  } catch {
    // Quota or disabled storage: the regular IndexedDB write is still attempted.
  }
}

/** Removes the rescue copy if it is for `m` and no newer than it (i.e. `m` is now in the database). */
export function clearRescue(storage: RescueStorage, m: Melody) {
  try {
    const text = storage.getItem(RESCUE_KEY);
    if (text === null) return;
    const r = parseMelodyFile(JSON.parse(text));
    if (!r.ok || (r.melody.id === m.id && r.melody.updatedAt <= m.updatedAt)) storage.removeItem(RESCUE_KEY);
  } catch {
    storage.removeItem(RESCUE_KEY);
  }
}

/** Moves a newer rescue copy into the database; returns the recovered melody id, or null. */
export async function recoverRescue(db: MelodyDb, storage: RescueStorage): Promise<string | null> {
  let text: string | null;
  try {
    text = storage.getItem(RESCUE_KEY);
  } catch {
    return null;
  }
  if (text === null) return null;
  let parsed;
  try {
    parsed = parseMelodyFile(JSON.parse(text));
  } catch {
    parsed = null;
  }
  if (!parsed?.ok) {
    storage.removeItem(RESCUE_KEY);
    return null;
  }
  const rescued = parsed.melody;
  const stored = await db.get(rescued.id);
  const newer = !stored?.ok || stored.melody.updatedAt < rescued.updatedAt;
  if (newer) await db.put(serialize(rescued));
  storage.removeItem(RESCUE_KEY);
  return newer ? rescued.id : null;
}
