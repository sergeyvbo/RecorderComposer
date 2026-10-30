import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setTempo } from '@/domain/commands';
import { serialize } from '@/domain/serialization';
import { createEmptyMelody } from '@/domain/types';
import { createAutosave } from '@/persistence/autosave';
import { openMelodyDb, type MelodyDb } from '@/persistence/db';
import { recoverRescue, RESCUE_KEY, type RescueStorage } from '@/persistence/rescue';
import { defaultPreferences } from '@/state/prefs';
import { createAppStore } from '@/state/store';

function memoryStorage(): RescueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const ID = '00000000-0000-4000-8000-000000000001';
const melodyAt = (updatedAt: string, tempoBpm: number) => ({ ...createEmptyMelody(updatedAt, ID), tempoBpm });

describe('rescue copy on page close (FR-019)', () => {
  let db: MelodyDb;
  beforeEach(async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    db = await openMelodyDb(`rescue-${Math.random()}`);
  });
  afterEach(() => vi.useRealTimers());

  it('writes the pending melody synchronously on pagehide, and clears it once saved', async () => {
    const store = createAppStore(defaultPreferences('en'), { now: () => '2026-01-01T00:00:00.000Z', newId: () => ID });
    const events = new EventTarget();
    const rescue = memoryStorage();
    const autosave = createAutosave(store, db, { events, isHidden: () => true, rescue });
    store.getState().actions.dispatch((m) => setTempo(m, 70));

    events.dispatchEvent(new Event('pagehide'));
    // Synchronous: present before any await, i.e. even if the page unloads now.
    expect(JSON.parse(rescue.data.get(RESCUE_KEY)!).melody.tempoBpm).toBe(70);

    await autosave.idle();
    expect(rescue.data.has(RESCUE_KEY)).toBe(false);
    autosave.dispose();
  });

  it('recovers a rescue copy newer than the stored melody (or missing from it)', async () => {
    const rescue = memoryStorage();
    await db.put(serialize(melodyAt('2026-01-01T00:00:00.000Z', 60)));
    rescue.setItem(RESCUE_KEY, JSON.stringify(serialize(melodyAt('2026-01-01T00:00:05.000Z', 90))));

    expect(await recoverRescue(db, rescue)).toBe(ID);
    const saved = await db.get(ID);
    expect(saved?.ok && saved.melody.tempoBpm).toBe(90);
    expect(rescue.data.has(RESCUE_KEY)).toBe(false);
  });

  it('ignores a stale or unreadable rescue copy', async () => {
    const rescue = memoryStorage();
    await db.put(serialize(melodyAt('2026-01-01T00:00:09.000Z', 60)));
    rescue.setItem(RESCUE_KEY, JSON.stringify(serialize(melodyAt('2026-01-01T00:00:05.000Z', 90))));
    expect(await recoverRescue(db, rescue)).toBeNull();
    const saved = await db.get(ID);
    expect(saved?.ok && saved.melody.tempoBpm).toBe(60);

    rescue.setItem(RESCUE_KEY, '{not json');
    expect(await recoverRescue(db, rescue)).toBeNull();
    expect(rescue.data.has(RESCUE_KEY)).toBe(false);
  });
});
