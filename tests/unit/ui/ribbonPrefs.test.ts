import { afterEach, describe, expect, it } from 'vitest';
import { loadPreferences, PREFS_KEY } from '@/persistence/preferences';

const store = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  length: 0,
} as Storage;

const stored = (prefs: object) => localStorage.setItem(PREFS_KEY, JSON.stringify({ version: 1, ...prefs }));

describe('ribbon preferences (003 FR-012)', () => {
  afterEach(() => store.clear());

  it('defaults to the pinned Home tab when nothing is stored', () => {
    expect(loadPreferences('en').ribbon).toEqual({ tab: 'home', collapsed: false });
    stored({ language: 'en' });
    expect(loadPreferences('en')).toMatchObject({ version: 1, ribbon: { tab: 'home', collapsed: false } });
  });

  it('keeps valid stored values', () => {
    stored({ ribbon: { tab: 'view', collapsed: true } });
    expect(loadPreferences('en').ribbon).toEqual({ tab: 'view', collapsed: true });
  });

  it('falls back field by field', () => {
    stored({ ribbon: { tab: 'backstage', collapsed: true } });
    expect(loadPreferences('en').ribbon).toEqual({ tab: 'home', collapsed: true });
    stored({ ribbon: { tab: 'file', collapsed: 'yes' } });
    expect(loadPreferences('en').ribbon).toEqual({ tab: 'file', collapsed: false });
    stored({ ribbon: 'broken' });
    expect(loadPreferences('en').ribbon).toEqual({ tab: 'home', collapsed: false });
  });
});
