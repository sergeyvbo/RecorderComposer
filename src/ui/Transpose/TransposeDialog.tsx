import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { previewTranspose, semitonesBetween, transpose } from '@/domain/commands';
import type { Key } from '@/domain/types';
import { useApp } from '../storeContext';
import { KeySelectInput } from '../Toolbar/KeySelect';
import { useNoteName } from '../useNoteName';

/**
 * Transpose the melody or the selection to a key or by semitones (FR-028). A live preview lists
 * notes that would leave the range and offers the octave-shifted alternative; nothing is ever
 * dropped or moved silently.
 */
export function TransposeDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const melody = useApp((s) => s.melody);
  const selection = useApp((s) => s.selection.ids);
  const actions = useApp((s) => s.actions);
  const { short } = useNoteName();
  const [mode, setMode] = useState<'byKey' | 'bySemitones'>('byKey');
  const [target, setTarget] = useState<Key>(melody.key);
  const [semis, setSemis] = useState(0);
  const [scope, setScope] = useState<'all' | 'selection'>(selection.size ? 'selection' : 'all');
  const ids = scope === 'selection' ? [...selection] : undefined;
  const delta = mode === 'byKey' ? semitonesBetween(melody.key, target) : semis;
  const preview = previewTranspose(melody, delta, ids);
  const names = preview.outOfRange
    .map((id) => melody.notes.find((n) => n.id === id))
    .filter((n) => n !== undefined)
    .map((n) => short(n.pitch))
    .join(', ');

  const apply = (d: number) => {
    const keyChange = mode === 'byKey' && scope === 'all' ? target : undefined;
    if (actions.dispatch((m) => transpose(m, d, ids, keyChange)).ok) onClose();
  };

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={t('transpose.title')} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: 0 }}>{t('transpose.title')}</h2>
        <fieldset style={{ display: 'flex', gap: 12, border: 'none', padding: 0 }}>
          <label>
            <input type="radio" name="tmode" checked={mode === 'byKey'} onChange={() => setMode('byKey')} /> {t('transpose.byKey')}
          </label>
          <label>
            <input type="radio" name="tmode" checked={mode === 'bySemitones'} onChange={() => setMode('bySemitones')} />{' '}
            {t('transpose.bySemitones')}
          </label>
        </fieldset>
        {mode === 'byKey' ? (
          <KeySelectInput label={t('transpose.byKey')} value={target} onChange={setTarget} />
        ) : (
          <label>
            {t('transpose.semitones')}{' '}
            <input
              type="number"
              aria-label={t('transpose.semitones')}
              min={-24}
              max={24}
              value={semis}
              onChange={(e) => setSemis(Math.trunc(Number(e.target.value) || 0))}
              style={{ width: '5em' }}
            />
          </label>
        )}
        <fieldset style={{ display: 'flex', gap: 12, border: 'none', padding: 0 }}>
          <label>
            <input type="radio" name="tscope" checked={scope === 'all'} onChange={() => setScope('all')} /> {t('transpose.scopeAll')}
          </label>
          <label>
            <input type="radio" name="tscope" checked={scope === 'selection'} disabled={selection.size === 0} onChange={() => setScope('selection')} />{' '}
            {t('transpose.scopeSelection')}
          </label>
        </fieldset>
        <p role="status" className="hint" style={{ margin: 0 }}>
          {preview.ok ? t('transpose.ok') : t('transpose.outOfRange', { count: preview.outOfRange.length, notes: names })}
        </p>
        <div className="dialog-actions" style={{ flexWrap: 'wrap' }}>
          {preview.octaveUpOk && (
            <button type="button" onClick={() => apply(delta + 12)}>
              {t('transpose.octaveUp')}
            </button>
          )}
          {preview.octaveDownOk && (
            <button type="button" onClick={() => apply(delta - 12)}>
              {t('transpose.octaveDown')}
            </button>
          )}
          <button type="button" onClick={onClose}>
            {t('transpose.cancel')}
          </button>
          <button type="button" disabled={!preview.ok} onClick={() => apply(delta)}>
            {t('transpose.apply')}
          </button>
        </div>
      </div>
    </div>
  );
}
