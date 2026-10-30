import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { PrintView, type PrintMode } from '../Print/PrintView';
import { useApp } from '../storeContext';

/** "Print sheet music" / "Print with fingerings": mounts the print view, then opens the print dialog. */
export function PrintMenu() {
  const { t } = useTranslation();
  const empty = useApp((s) => s.melody.notes.length === 0);
  const [mode, setMode] = useState<PrintMode | null>(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!printing) return;
    const id = requestAnimationFrame(() => {
      window.print();
      setPrinting(false);
    });
    return () => cancelAnimationFrame(id);
  }, [printing]);

  const start = (m: PrintMode) => {
    setMode(m);
    setPrinting(true);
  };
  const title = empty ? t('print.empty') : undefined;

  return (
    <div className="toolbar-group">
      <button type="button" disabled={empty} title={title} onClick={() => start('sheet')}>
        {t('toolbar.printSheet')}
      </button>
      <button type="button" disabled={empty} title={title} onClick={() => start('sheetWithFingering')}>
        {t('toolbar.printWithFingering')}
      </button>
      {mode && createPortal(<PrintView mode={mode} />, document.body)}
    </div>
  );
}
