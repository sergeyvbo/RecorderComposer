import { useTranslation } from 'react-i18next';
import { downloadText, useLibrary } from './libraryContext';
import { useApp } from './storeContext';

/** Persistent warning when changes cannot be saved (spec edge case), with an export shortcut. */
export function StorageBanner() {
  const { t } = useTranslation();
  const status = useApp((s) => s.storage.status);
  const library = useLibrary();
  if (status !== 'unavailable' && status !== 'quota') return null;
  return (
    <div className="banner" role="alert">
      <span style={{ flex: 1 }}>{t(`storage.${status}`)}</span>
      <button
        type="button"
        onClick={() => {
          const { filename, text } = library.exportCurrent();
          downloadText(filename, text);
        }}
      >
        {t('storage.exportNow')}
      </button>
    </div>
  );
}

export function SaveStatus() {
  const { t } = useTranslation();
  const status = useApp((s) => s.storage.status);
  if (status === 'unavailable' || status === 'quota') return null;
  return (
    <span className="hint" aria-live="polite">
      {status === 'saving' ? t('storage.saving') : t('storage.saved')}
    </span>
  );
}
