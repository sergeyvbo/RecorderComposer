import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Key } from '@/domain/types';
import { useApp } from './storeContext';

const RU = { C: 'до', D: 'ре', E: 'ми', F: 'фа', G: 'соль', A: 'ля', B: 'си' } as const;
const LATIN = { C: 'do', D: 're', E: 'mi', F: 'fa', G: 'sol', A: 'la', B: 'si' } as const;

/** Key names in the current language and naming style, e.g. "F♯ minor", "фа-диез минор". */
export function useKeyName() {
  const { t } = useTranslation();
  const language = useApp((s) => s.prefs.language);
  const style = useApp((s) => s.prefs.noteNaming);
  return useCallback(
    (key: Key) => {
      const letter = key.tonic[0] as keyof typeof RU;
      const acc = key.tonic.slice(1);
      let tonic: string;
      if (style === 'letter') tonic = letter + (acc === '#' ? '♯' : acc === 'b' ? '♭' : '');
      else if (language === 'ru') tonic = RU[letter] + (acc === '#' ? '-диез' : acc === 'b' ? '-бемоль' : '');
      else tonic = LATIN[letter] + (acc === '#' ? '♯' : acc === 'b' ? '♭' : '');
      return t(`key.${key.mode}`, { tonic });
    },
    [t, language, style],
  );
}
