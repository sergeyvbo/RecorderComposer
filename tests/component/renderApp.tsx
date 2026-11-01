import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { vi } from 'vitest';
import type { Player } from '@/audio/player';
import type { LibraryService } from '@/persistence/library';
import { initI18n } from '@/i18n';
import { defaultPreferences } from '@/state/prefs';
import { createAppStore } from '@/state/store';
import { SharedTimeAxis } from '@/ui/Layout/SharedTimeAxis';
import { StoreProvider } from '@/ui/storeContext';
import { RibbonDialogsProvider } from '@/ui/commands/dialogs';
import { LibraryProvider } from '@/ui/libraryContext';
import { PlaybackProvider } from '@/ui/playbackContext';

export function setup(ui: ReactNode, opts: { withAxis?: boolean } = {}) {
  const i18n = initI18n('en');
  let id = 0;
  const store = createAppStore(defaultPreferences('en'), {
    now: () => '2026-01-01T00:00:00.000Z',
    newId: () => `t${++id}`,
  });
  const content = opts.withAxis === false ? ui : <SharedTimeAxis>{ui}</SharedTimeAxis>;
  const utils = render(
    <I18nextProvider i18n={i18n}>
      <StoreProvider store={store}>{content}</StoreProvider>
    </I18nextProvider>,
  );
  return { store, ...utils };
}

export function mockPlayer(): Player {
  return {
    play: vi.fn(async () => undefined),
    pause: vi.fn(() => 0),
    reschedule: vi.fn(),
    positionTicks: vi.fn(() => 0),
  };
}

export function fakeLibrary(): LibraryService {
  return {
    newMelody: vi.fn(async () => undefined),
    open: vi.fn(async () => undefined),
    rename: vi.fn(async () => true),
    duplicate: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
    importText: vi.fn(async () => null),
    exportCurrent: vi.fn(() => ({ filename: 'm.rcm.json', text: '{}' })),
  };
}

/** Like `setup`, plus the playback, library and ribbon-dialog providers the ribbon needs. */
export function setupRibbon(ui: ReactNode, opts: { player?: Player; library?: LibraryService } = {}) {
  const player = opts.player ?? mockPlayer();
  const library = opts.library ?? fakeLibrary();
  const utils = setup(
    <LibraryProvider library={library}>
      <PlaybackProvider player={player}>
        <RibbonDialogsProvider>{ui}</RibbonDialogsProvider>
      </PlaybackProvider>
    </LibraryProvider>,
    { withAxis: false },
  );
  return { ...utils, player, library };
}
