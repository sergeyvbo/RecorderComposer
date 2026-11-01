import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { ParseError } from '@/domain/serialization';
import { LibraryPanel } from '../Library/LibraryPanel';
import { useLibrary } from '../libraryContext';
import { usePlaybackController } from '../playbackContext';
import { PrintView, type PrintMode } from '../Print/PrintView';
import { TransposeDialog } from '../Transpose/TransposeDialog';

export interface RibbonDialogs {
  openLibrary: () => void;
  openTranspose: () => void;
  pickImportFile: () => void;
  print: (mode: PrintMode) => void;
}

const DialogsContext = createContext<RibbonDialogs | null>(null);

/**
 * Dialogs, the import file picker and the print view, rendered once at the document body
 * (003 research R4): they stay open when the ribbon switches tabs or its popup closes.
 */
export function RibbonDialogsProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const library = useLibrary();
  const playback = usePlaybackController();
  const [dialog, setDialog] = useState<'library' | 'transpose' | null>(null);
  const [printMode, setPrintMode] = useState<PrintMode | null>(null);
  const [printing, setPrinting] = useState(false);
  const [importError, setImportError] = useState<ParseError | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!printing) return;
    const id = requestAnimationFrame(() => {
      window.print();
      setPrinting(false);
    });
    return () => cancelAnimationFrame(id);
  }, [printing]);

  useEffect(() => {
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      setDialog(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog]);

  const api = useMemo<RibbonDialogs>(
    () => ({
      openLibrary: () => setDialog('library'),
      openTranspose: () => setDialog('transpose'),
      pickImportFile: () => inputRef.current?.click(),
      print: (mode) => {
        setPrintMode(mode);
        setPrinting(true);
      },
    }),
    [],
  );
  const close = () => setDialog(null);

  return (
    <DialogsContext.Provider value={api}>
      {children}
      {createPortal(
        <>
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
              setImportError(await library.importText(await file.text()));
            }}
          />
          {importError && (
            <div className="banner floating-alert" role="alert">
              <span>{t(`import.${importError}`)}</span>
              <button type="button" onClick={() => setImportError(null)} aria-label={t('library.close')}>
                {t('dialog.ok')}
              </button>
            </div>
          )}
          {dialog === 'library' && <LibraryPanel onClose={close} />}
          {dialog === 'transpose' && <TransposeDialog onClose={close} />}
          {printMode && <PrintView mode={printMode} />}
        </>,
        document.body,
      )}
    </DialogsContext.Provider>
  );
}

export function useRibbonDialogs(): RibbonDialogs {
  const d = useContext(DialogsContext);
  if (!d) throw new Error('RibbonDialogsProvider missing');
  return d;
}
