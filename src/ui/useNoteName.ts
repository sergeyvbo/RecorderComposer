import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { formatNoteName } from '@/domain/naming';
import { octaveSystemFor } from '@/state/prefs';
import { selectMelody } from '@/state/store';
import { useApp } from './storeContext';

/** Note names for display: naming style from prefs, octave system from UI language (FR-025a). */
export function useNoteName() {
  const { t } = useTranslation();
  const style = useApp((s) => s.prefs.noteNaming);
  const language = useApp((s) => s.prefs.language);
  const key = useApp((s) => selectMelody(s).key);
  const octaveSystem = octaveSystemFor(language);
  const short = useCallback(
    (pitch: number) => formatNoteName(pitch, { style, octaveSystem, key }),
    [style, octaveSystem, key],
  );
  const long = useCallback(
    (pitch: number) => {
      const r = formatNoteName(pitch, { style, octaveSystem, key, form: 'long' });
      return t(r.i18nKey, r.params);
    },
    [style, octaveSystem, key, t],
  );
  return { short, long };
}
