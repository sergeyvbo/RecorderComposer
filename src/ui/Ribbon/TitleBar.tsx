import { useTranslation } from 'react-i18next';
import { useCommands } from '../commands/useCommands';
import { SaveStatus } from '../StorageBanner';
import { TitleInput } from '../Toolbar/TitleInput';
import { RibbonButton } from './RibbonButton';

const QUICK_ACCESS = ['undo', 'redo', 'playPause'] as const;

/** App name, editable title, quick-access strip and save status, always visible (003 FR-007). */
export function TitleBar() {
  const { t } = useTranslation();
  const commands = useCommands();
  return (
    <header className="titlebar">
      <span className="titlebar-app">{t('app.title')}</span>
      <TitleInput />
      <div className="quick-access" role="toolbar" aria-label={t('ribbon.quickAccess')}>
        {QUICK_ACCESS.map((id) => (
          <RibbonButton key={id} command={commands[id]} size="small" iconsOnly />
        ))}
      </div>
      <span className="titlebar-spacer" />
      <SaveStatus />
    </header>
  );
}
