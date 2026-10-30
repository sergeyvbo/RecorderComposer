import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setTempo } from '@/domain/commands';
import { createAutosave } from '@/persistence/autosave';
import { openMelodyDb, type MelodyDb } from '@/persistence/db';
import { defaultPreferences } from '@/state/prefs';
import { createAppStore } from '@/state/store';

let n = 0;
function setup(db: MelodyDb) {
  const store = createAppStore(defaultPreferences('en'), { now: () => '2026-01-01T00:00:00.000Z', newId: () => `00000000-0000-4000-8000-00000000000${++n % 10}` });
  const events = new EventTarget();
  const autosave = createAutosave(store, db, { debounceMs: 500, events, isHidden: () => true });
  return { store, autosave, events };
}

const edit = (store: ReturnType<typeof setup>['store'], bpm: number) =>
  store.getState().actions.dispatch((m) => setTempo(m, bpm));

describe('autosave (FR-019)', () => {
  let db: MelodyDb;
  beforeEach(async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    db = await openMelodyDb(`test-${Math.random()}`);
  });
  afterEach(() => vi.useRealTimers());

  it('writes within the 500 ms debounce after a change', async () => {
    const { store, autosave } = setup(db);
    edit(store, 60);
    expect(await db.list()).toEqual([]);
    await vi.advanceTimersByTimeAsync(500);
    await autosave.idle();
    const saved = await db.get(store.getState().melody.id);
    expect(saved?.ok && saved.melody.tempoBpm).toBe(60);
    expect(store.getState().storage.status).toBe('ok');
    expect(store.getState().prefs.lastMelodyId).toBe(store.getState().melody.id);
    expect(store.getState().library.map((e) => e.id)).toEqual([store.getState().melody.id]);
    autosave.dispose();
  });

  it('flushes immediately when the page is hidden or closed', async () => {
    const { store, autosave, events } = setup(db);
    edit(store, 70);
    events.dispatchEvent(new Event('pagehide'));
    await autosave.idle();
    const saved = await db.get(store.getState().melody.id);
    expect(saved?.ok && saved.melody.tempoBpm).toBe(70);
    edit(store, 80);
    events.dispatchEvent(new Event('visibilitychange'));
    await autosave.idle();
    const again = await db.get(store.getState().melody.id);
    expect(again?.ok && again.melody.tempoBpm).toBe(80);
    autosave.dispose();
  });

  it('reports quota and unavailable storage errors', async () => {
    const failing = (name: string): MelodyDb => ({
      ...db,
      put: () => Promise.reject(Object.assign(new Error(name), { name })),
    });
    for (const [name, status] of [['QuotaExceededError', 'quota'], ['InvalidStateError', 'unavailable']] as const) {
      const { store, autosave } = setup(failing(name));
      edit(store, 90);
      await vi.advanceTimersByTimeAsync(500);
      await autosave.idle();
      expect(store.getState().storage.status).toBe(status);
      autosave.dispose();
    }
  });
});
