import { SNAP_VALUES } from '@/domain/types';
import {
  defaultPreferences,
  MAX_PX_PER_TICK,
  MIN_PX_PER_TICK,
  PANEL_IDS,
  type Language,
  type Preferences,
} from '@/state/prefs';

export const PREFS_KEY = 'rc.prefs';

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** Reads preferences, falling back to defaults field by field (never throws). */
export function loadPreferences(browserLanguage: Language): Preferences {
  const defaults = defaultPreferences(browserLanguage);
  let raw: unknown = null;
  try {
    const text = storage()?.getItem(PREFS_KEY);
    raw = text ? JSON.parse(text) : null;
  } catch {
    raw = null;
  }
  if (!raw || typeof raw !== 'object' || (raw as { version?: unknown }).version !== 1) {
    return defaults;
  }
  const r = raw as Partial<Preferences>;
  const language = r.language === 'ru' || r.language === 'en' ? r.language : defaults.language;
  const base = language === defaults.language ? defaults : defaultPreferences(language);
  const panels = { ...base.panels };
  for (const id of PANEL_IDS) {
    const p = r.panels?.[id];
    if (p && typeof p.visible === 'boolean' && typeof p.size === 'number' && p.size > 0) {
      panels[id] = { visible: p.visible, size: p.size };
    }
  }
  return {
    version: 1,
    language,
    noteNaming: r.noteNaming === 'letter' || r.noteNaming === 'solfege' ? r.noteNaming : base.noteNaming,
    panels,
    snapTicks: SNAP_VALUES.includes(r.snapTicks as never) ? (r.snapTicks as Preferences['snapTicks']) : base.snapTicks,
    defaultNoteTicks:
      typeof r.defaultNoteTicks === 'number' && r.defaultNoteTicks >= 60 && r.defaultNoteTicks % 60 === 0
        ? r.defaultNoteTicks
        : base.defaultNoteTicks,
    pxPerTick:
      typeof r.pxPerTick === 'number' && r.pxPerTick >= MIN_PX_PER_TICK && r.pxPerTick <= MAX_PX_PER_TICK
        ? r.pxPerTick
        : base.pxPerTick,
    lastMelodyId: typeof r.lastMelodyId === 'string' ? r.lastMelodyId : null,
  };
}

export function savePreferences(prefs: Preferences): void {
  try {
    storage()?.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Storage unavailable: preferences are a convenience, ignore.
  }
}
