import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../storeContext';

const SHOWN: readonly string[] = ['clampedToNeighbor', 'shortenedToFit', 'noRoom', 'clampedToRange'];

/** Transient explanation of why an edit was clamped or refused (US1 scenario 4). */
export function EditHint() {
  const { t } = useTranslation();
  const lastEdit = useApp((s) => s.lastEdit);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const code = lastEdit.reason ?? lastEdit.adjusted.find((a) => SHOWN.includes(a)) ?? null;
    if (!code || !SHOWN.includes(code)) return;
    setMessage(t(`edit.${code}`));
    const timer = setTimeout(() => setMessage(null), 2500);
    return () => clearTimeout(timer);
  }, [lastEdit, t]);

  return (
    <span className="hint" role="status" aria-live="polite">
      {message}
    </span>
  );
}
