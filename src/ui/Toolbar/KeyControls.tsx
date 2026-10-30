import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TransposeDialog } from '../Transpose/TransposeDialog';
import { KeySelect } from './KeySelect';

/** Key selection plus the Transpose dialog (US7). */
export function KeyControls() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <div className="toolbar-group">
      <KeySelect />
      <button type="button" onClick={() => setOpen(true)}>
        {t('toolbar.transpose')}
      </button>
      {open && <TransposeDialog onClose={() => setOpen(false)} />}
    </div>
  );
}
