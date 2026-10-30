import { FingeringPanel } from './Fingering/FingeringPanel';
import { PanelLayout } from './Layout/PanelLayout';
import { Playhead } from './Layout/Playhead';
import { SharedTimeAxis } from './Layout/SharedTimeAxis';
import { TimeRuler } from './Layout/TimeRuler';
import { usePlaybackController } from './playbackContext';
import { SheetPanel } from './Sheet/SheetPanel';
import { TimelinePanel } from './Timeline/TimelinePanel';
import { FileActions } from './Library/FileActions';
import { SaveStatus, StorageBanner } from './StorageBanner';
import { EditControls } from './Toolbar/EditControls';
import { EditHint } from './Toolbar/EditHint';
import { KeyControls } from './Toolbar/KeyControls';
import { LanguageSwitch, NamingSwitch, useLanguageSync } from './Toolbar/LanguageSwitch';
import { PanelToggles } from './Toolbar/PanelToggles';
import { PrintMenu } from './Toolbar/PrintMenu';
import { TitleInput } from './Toolbar/TitleInput';
import { TransportControls } from './Toolbar/TransportControls';
import { useShortcuts } from './useShortcuts';

export function App() {
  const playback = usePlaybackController();
  useLanguageSync();
  useShortcuts({ onPlayPause: playback.toggle, onHome: playback.toStart });
  return (
    <div className="app">
      <header className="toolbar">
        <div className="toolbar-group">
          <TitleInput />
        </div>
        <TransportControls />
        <EditControls />
        <KeyControls />
        <FileActions />
        <PrintMenu />
        <PanelToggles />
        <div className="toolbar-group">
          <LanguageSwitch />
          <NamingSwitch />
        </div>
        <EditHint />
      </header>
      <StorageBanner />
      <main className="workspace">
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
      <footer className="statusbar">
        <SaveStatus />
      </footer>
    </div>
  );
}
