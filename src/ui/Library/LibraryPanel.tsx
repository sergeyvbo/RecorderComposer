import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LibraryEntry } from '@/state/store';
import { useLibrary } from '../libraryContext';
import { usePlaybackController } from '../playbackContext';
import { useApp } from '../storeContext';

/**
 * Melody library dialog (US4): new, open, rename, duplicate, delete. Deletion is confirmed in-app
 * (FR-021); there are no unsaved-changes prompts because every change is auto-saved.
 */
export function LibraryPanel({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const library = useLibrary();
  const playback = usePlaybackController();
  const entries = useApp((s) => s.library);
  const currentId = useApp((s) => s.melody.id);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [confirming, setConfirming] = useState<LibraryEntry | null>(null);
  const date = (iso: string) => new Date(iso).toLocaleString(i18n.language);

  const open = async (id: string) => {
    playback.pause();
    await library.open(id);
    onClose();
  };

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={t('library.title')} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: 0 }}>{t('library.title')}</h2>
        <div>
          <button
            type="button"
            onClick={async () => {
              playback.pause();
              await library.newMelody();
              onClose();
            }}
          >
            {t('library.new')}
          </button>
        </div>
        {entries.length === 0 ? (
          <p className="hint">{t('library.empty')}</p>
        ) : (
          <ul className="library-list">
            {entries.map((e) => (
              <li key={e.id} aria-current={e.id === currentId}>
                {renaming === e.id ? (
                  <form
                    style={{ display: 'flex', gap: 6, flex: 1 }}
                    onSubmit={async (ev) => {
                      ev.preventDefault();
                      if (await library.rename(e.id, title)) setRenaming(null);
                    }}
                  >
                    <input aria-label={t('library.renamePrompt')} value={title} onChange={(ev) => setTitle(ev.target.value)} maxLength={120} autoFocus style={{ flex: 1 }} />
                    <button type="submit">{t('dialog.ok')}</button>
                    <button type="button" onClick={() => setRenaming(null)}>
                      {t('dialog.cancel')}
                    </button>
                  </form>
                ) : (
                  <>
                    <span style={{ flex: 1 }}>
                      {e.title}
                      <br />
                      <span className="hint">{t('library.updated', { date: date(e.updatedAt) })}</span>
                    </span>
                    <button type="button" onClick={() => void open(e.id)} disabled={e.id === currentId}>
                      {t('library.open')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRenaming(e.id);
                        setTitle(e.title);
                      }}
                    >
                      {t('library.rename')}
                    </button>
                    <button type="button" onClick={() => void library.duplicate(e.id)}>
                      {t('library.duplicate')}
                    </button>
                    <button type="button" onClick={() => setConfirming(e)}>
                      {t('library.delete')}
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        {confirming && (
          <div role="alertdialog" aria-label={t('library.delete')} className="banner">
            <span style={{ flex: 1 }}>{t('library.confirmDelete', { title: confirming.title })}</span>
            <button type="button" onClick={() => setConfirming(null)}>
              {t('dialog.cancel')}
            </button>
            <button
              type="button"
              onClick={async () => {
                if (confirming.id === currentId) playback.pause();
                await library.remove(confirming.id);
                setConfirming(null);
              }}
            >
              {t('library.delete')}
            </button>
          </div>
        )}
        <div className="dialog-actions">
          <button type="button" onClick={onClose}>
            {t('library.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
