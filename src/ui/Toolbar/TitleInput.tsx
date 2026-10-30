import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setTitle } from '@/domain/commands';
import { MAX_TITLE } from '@/domain/types';
import { useApp } from '../storeContext';

/** Melody title (1–120 chars after trim); committed on Enter or blur, reverted if invalid. */
export function TitleInput() {
  const { t } = useTranslation();
  const title = useApp((s) => s.melody.title);
  const actions = useApp((s) => s.actions);
  const [draft, setDraft] = useState(title);
  useEffect(() => setDraft(title), [title]);
  const commit = () => {
    if (draft.trim() === title) return setDraft(title);
    if (!actions.dispatch((m) => setTitle(m, draft)).ok) setDraft(title);
  };
  return (
    <input
      type="text"
      aria-label={t('toolbar.title')}
      value={draft}
      maxLength={MAX_TITLE}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          setDraft(title);
          e.currentTarget.blur();
        }
      }}
      style={{ width: '14em', fontWeight: 600 }}
    />
  );
}
