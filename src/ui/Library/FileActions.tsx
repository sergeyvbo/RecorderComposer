import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ParseError } from '@/domain/serialization';
import { safeFileName } from '@/persistence/library';
import { downloadBlob, downloadText, useLibrary } from '../libraryContext';
import { useApp, useAppStore } from '../storeContext';
import { usePlaybackController } from '../playbackContext';
import { LibraryPanel } from './LibraryPanel';

/** Library button, export to `<title>.rcm.json` and import with clear errors (FR-020). */
export function FileActions() {
  const { t } = useTranslation();
  const library = useLibrary();
  const playback = usePlaybackController();
  const [showLibrary, setShowLibrary] = useState(false);
  const [error, setError] = useState<ParseError | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const store = useAppStore();
  const empty = useApp((s) => s.melody.notes.length === 0);
  const exportMidi = async () => {
    const { toMidiBytes } = await import('@/domain/midi');
    const m = store.getState().melody;
    downloadBlob(`${safeFileName(m.title)}.mid`, new Blob([new Uint8Array(toMidiBytes(m))], { type: 'audio/midi' }));
  };

  return (
    <div className="toolbar-group">
      <button type="button" onClick={() => setShowLibrary(true)}>
        {t('toolbar.library')}
      </button>
      <button
        type="button"
        onClick={() => {
          const { filename, text } = library.exportCurrent();
          downloadText(filename, text);
        }}
      >
        {t('toolbar.exportFile')}
      </button>
      <button type="button" disabled={empty} title={empty ? t('export.emptyMidi') : undefined} onClick={() => void exportMidi()}>
        {t('toolbar.exportMidi')}
      </button>
      <button type="button" onClick={() => inputRef.current?.click()}>
        {t('toolbar.import')}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".rcm.json,.json,application/json"
        data-testid="import-input"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          playback.pause();
          setError(await library.importText(await file.text()));
        }}
      />
      {error && (
        <span className="hint" role="alert">
          {t(`import.${error}`)}{' '}
          <button type="button" onClick={() => setError(null)} aria-label={t('library.close')}>
            {t('dialog.ok')}
          </button>
        </span>
      )}
      {showLibrary && <LibraryPanel onClose={() => setShowLibrary(false)} />}
    </div>
  );
}
