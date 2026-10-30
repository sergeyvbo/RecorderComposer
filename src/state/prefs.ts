import type { NamingStyle, OctaveSystem } from '@/domain/naming';
import { PPQ, type SnapTicks } from '@/domain/types';

export type Language = 'en' | 'ru';
export type PanelId = 'timeline' | 'sheet' | 'fingering';
export const PANEL_IDS: readonly PanelId[] = ['timeline', 'sheet', 'fingering'];

export interface PanelPrefs {
  visible: boolean;
  /** Percentage of the workspace height. */
  size: number;
}

export interface Preferences {
  version: 1;
  language: Language;
  noteNaming: NamingStyle;
  panels: Record<PanelId, PanelPrefs>;
  snapTicks: SnapTicks;
  defaultNoteTicks: number;
  pxPerTick: number;
  lastMelodyId: string | null;
}

/** ~4 bars of 4/4 in a 1200 px viewport. */
export const DEFAULT_PX_PER_TICK = 1200 / (PPQ * 16);
export const MIN_PX_PER_TICK = 0.02;
export const MAX_PX_PER_TICK = 1;

export function defaultPreferences(language: Language): Preferences {
  return {
    version: 1,
    language,
    noteNaming: language === 'ru' ? 'solfege' : 'letter',
    panels: {
      timeline: { visible: true, size: 45 },
      sheet: { visible: true, size: 30 },
      fingering: { visible: true, size: 25 },
    },
    snapTicks: 120,
    defaultNoteTicks: PPQ,
    pxPerTick: DEFAULT_PX_PER_TICK,
    lastMelodyId: null,
  };
}

export const octaveSystemFor = (language: Language): OctaveSystem =>
  language === 'ru' ? 'russian' : 'scientific';
