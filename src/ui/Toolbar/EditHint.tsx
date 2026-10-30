import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../storeContext';

/** Adjustments (the edit still succeeded) worth explaining; refusals are always explained. */
const SHOWN_ADJUSTMENTS: readonly string[] = ['clampedToNeighbor', 'shortenedToFit', 'clampedToRange'];

/** Transient explanation of why an edit was clamped or refused (US1 scenario 4, 002 FR-020). */
export function EditHint() {
  const { t } = useTranslation();
  const lastEdit = useApp((s) => s.lastEdit);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const code = lastEdit.reason ?? lastEdit.adjusted.find((a) => SHOWN_ADJUSTMENTS.includes(a)) ?? null;
    if (!code) return;
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
