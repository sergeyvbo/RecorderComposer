import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import ru from './ru.json';

export type Language = 'en' | 'ru';
export const LANGUAGES: readonly Language[] = ['en', 'ru'];

export function initI18n(language: Language) {
  if (!i18next.isInitialized) {
    void i18next.use(initReactI18next).init({
      resources: { en: { translation: en }, ru: { translation: ru } },
      lng: language,
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
      returnNull: false,
    });
  } else if (i18next.language !== language) {
    void i18next.changeLanguage(language);
  }
  return i18next;
}

/** ru → ru, everything else → en (FR-026). */
export function detectLanguage(languages: readonly string[]): Language {
  return languages[0]?.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

export { i18next };
