import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { initI18n, LANGUAGES } from '@/i18n';
import type { NamingStyle } from '@/domain/naming';
import { useApp } from '../storeContext';

/** Keeps i18next, <html lang> and the document title in step with the language preference. */
export function useLanguageSync() {
  const language = useApp((s) => s.prefs.language);
  const { t } = useTranslation();
  useEffect(() => {
    initI18n(language);
    document.documentElement.lang = language;
  }, [language]);
  useEffect(() => {
    document.title = t('app.title');
  }, [t, language]);
}

/** RU/EN interface language (FR-024, FR-026); the octave system follows it (FR-025a). */
export function LanguageSwitch() {
  const { t } = useTranslation();
  const language = useApp((s) => s.prefs.language);
  const actions = useApp((s) => s.actions);
  return (
    <select
      aria-label={t('toolbar.language')}
      value={language}
      onChange={(e) => actions.setPrefs({ language: e.target.value as (typeof LANGUAGES)[number] })}
    >
      {LANGUAGES.map((l) => (
        <option key={l} value={l}>
          {t(`lang.${l}`)}
        </option>
      ))}
    </select>
  );
}

/** Solfège or letter note names, independent of the interface language (FR-025). */
export function NamingSwitch() {
  const { t } = useTranslation();
  const naming = useApp((s) => s.prefs.noteNaming);
  const actions = useApp((s) => s.actions);
  return (
    <select
      aria-label={t('toolbar.naming')}
      value={naming}
      onChange={(e) => actions.setPrefs({ noteNaming: e.target.value as NamingStyle })}
    >
      <option value="letter">{t('naming.letter')}</option>
      <option value="solfege">{t('naming.solfege')}</option>
    </select>
  );
}
