import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createTonePlayer } from '@/audio/player';
import { bootstrap } from '@/bootstrap';
import { createEmptyMelody } from '@/domain/types';
import { detectLanguage, initI18n } from '@/i18n';
import { loadPreferences, savePreferences } from '@/persistence/preferences';
import { createAppStore, defaultDeps } from '@/state/store';
import { App } from '@/ui/App';
import { LibraryProvider } from '@/ui/libraryContext';
import { PlaybackProvider } from '@/ui/playbackContext';
import { StoreProvider } from '@/ui/storeContext';
import '@/ui/styles/global.css';

const prefs = loadPreferences(detectLanguage(navigator.languages ?? [navigator.language]));
const i18n = initI18n(prefs.language);
document.documentElement.lang = prefs.language;

const store = createAppStore(
  prefs,
  defaultDeps,
  createEmptyMelody(defaultDeps.now(), defaultDeps.newId(), i18n.t('melody.untitled')),
);
const { library } = bootstrap(store);
const player = createTonePlayer();
store.subscribe((s, prev) => {
  if (s.prefs !== prev.prefs) savePreferences(s.prefs);
});

const root = document.getElementById('root');
if (!root) throw new Error('#root missing');
createRoot(root).render(
  <StrictMode>
    <StoreProvider store={store}>
      <LibraryProvider library={library}>
        <PlaybackProvider player={player}>
          <App />
        </PlaybackProvider>
      </LibraryProvider>
    </StoreProvider>
  </StrictMode>,
);
