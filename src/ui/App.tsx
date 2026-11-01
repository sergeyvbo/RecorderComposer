import { useTranslation } from 'react-i18next';
import { RibbonDialogsProvider } from './commands/dialogs';
import { FingeringPanel } from './Fingering/FingeringPanel';
import { PanelLayout } from './Layout/PanelLayout';
import { Playhead } from './Layout/Playhead';
import { SharedTimeAxis } from './Layout/SharedTimeAxis';
import { TimeRuler } from './Layout/TimeRuler';
import { usePlaybackController } from './playbackContext';
import { Ribbon } from './Ribbon/Ribbon';
import { TitleBar } from './Ribbon/TitleBar';
import { SheetPanel } from './Sheet/SheetPanel';
import { StorageBanner } from './StorageBanner';
import { useApp } from './storeContext';
import { TimelinePanel } from './Timeline/TimelinePanel';
import { EditHint } from './Toolbar/EditHint';
import { useLanguageSync } from './Toolbar/LanguageSwitch';
import { useShortcuts } from './useShortcuts';

/** Refusal messages and the audio warning, at the top of the workspace below the ribbon (003 FR-014). */
function Toasts() {
  const { t } = useTranslation();
  const audioError = useApp((s) => s.playback.error);
  return (
    <div className="edit-toast">
      <EditHint />
      {audioError && (
        <span className="hint" role="alert">
          {t('audio.unavailable')}
        </span>
      )}
    </div>
  );
}

export function App() {
  const playback = usePlaybackController();
  useLanguageSync();
  useShortcuts({ onPlayPause: playback.toggle, onHome: playback.toStart });
  return (
    <RibbonDialogsProvider>
      <div className="app">
        <TitleBar />
        <Ribbon />
        <StorageBanner />
        <main className="workspace">
          <Toasts />
          <SharedTimeAxis>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
              <TimeRuler />
              <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                <PanelLayout
                  panels={{ timeline: <TimelinePanel />, sheet: <SheetPanel />, fingering: <FingeringPanel /> }}
                />
              </div>
              <Playhead />
            </div>
          </SharedTimeAxis>
        </main>
      </div>
    </RibbonDialogsProvider>
  );
}
