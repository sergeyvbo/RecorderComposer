import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setTempo } from '@/domain/commands';
import { MAX_TEMPO, MIN_TEMPO } from '@/domain/types';
import { usePlaybackController } from '../playbackContext';
import { useApp } from '../storeContext';
import { SYMBOL } from '../symbols';

/** Play/Pause, back to start and tempo 30–240 BPM (FR-015, FR-017). */
export function TransportControls() {
  const { t } = useTranslation();
  const controller = usePlaybackController();
  const status = useApp((s) => s.playback.status);
  const error = useApp((s) => s.playback.error);
  const tempo = useApp((s) => s.melody.tempoBpm);
  const empty = useApp((s) => s.melody.notes.length === 0);
  const actions = useApp((s) => s.actions);
  const [draft, setDraft] = useState(String(tempo));
  useEffect(() => setDraft(String(tempo)), [tempo]);

  const commitTempo = (value: string) => {
    setDraft(value);
    const n = Number(value);
    if (Number.isInteger(n) && n >= MIN_TEMPO && n <= MAX_TEMPO && n !== tempo) {
      actions.dispatch((m) => setTempo(m, n));
    }
  };
  const playing = status === 'playing';
  const playLabel = playing ? t('toolbar.pause') : t('toolbar.play');

  return (
    <div className="toolbar-group">
      <button
        type="button"
        onClick={controller.toggle}
        disabled={empty && !playing}
        aria-label={playLabel}
        title={empty ? t('playback.empty') : playLabel}
      >
        {playing ? SYMBOL.pause : SYMBOL.play}
      </button>
      <button type="button" onClick={controller.toStart} aria-label={t('toolbar.toStart')} title={t('toolbar.toStart')}>
        {SYMBOL.toStart}
      </button>
      <label>
        {t('toolbar.tempo')}{' '}
        <input
          type="number"
          aria-label={t('toolbar.tempo')}
          min={MIN_TEMPO}
          max={MAX_TEMPO}
          step={1}
          value={draft}
          style={{ width: '4.5em' }}
          onChange={(e) => commitTempo(e.target.value)}
          onBlur={() => setDraft(String(tempo))}
        />
      </label>
      <input
        type="range"
        aria-label={t('toolbar.tempo')}
        min={MIN_TEMPO}
        max={MAX_TEMPO}
        value={tempo}
        onChange={(e) => commitTempo(e.target.value)}
        style={{ width: 90 }}
      />
      <span className="hint">{t('toolbar.bpm')}</span>
      {error && (
        <span className="hint" role="alert">
          {t('audio.unavailable')}
        </span>
      )}
    </div>
  );
}
