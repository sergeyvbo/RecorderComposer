import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { setKey, setTempo, setTimeSignature } from '@/domain/commands';
import { MAX_TEMPO, MIN_TEMPO, SNAP_VALUES, TIME_SIGNATURES, type SnapTicks } from '@/domain/types';
import { useApp } from '../storeContext';
import { KeySelectInput } from '../Toolbar/KeySelect';
import { LanguageSwitch, NamingSwitch } from '../Toolbar/LanguageSwitch';
import { FIELD_ICON } from './icons';
import type { FieldId } from './layout';

/** Tempo 30–240 BPM (FR-017); the number commits as soon as it is valid. */
function TempoInput() {
  const { t } = useTranslation();
  const tempo = useApp((s) => s.melody.tempoBpm);
  const actions = useApp((s) => s.actions);
  const [draft, setDraft] = useState(String(tempo));
  useEffect(() => setDraft(String(tempo)), [tempo]);
  const commit = (value: string) => {
    setDraft(value);
    const n = Number(value);
    if (Number.isInteger(n) && n >= MIN_TEMPO && n <= MAX_TEMPO && n !== tempo) actions.dispatch((m) => setTempo(m, n));
  };
  return (
    <span className="rf-inline">
      <input
        type="number"
        aria-label={t('toolbar.tempo')}
        min={MIN_TEMPO}
        max={MAX_TEMPO}
        step={1}
        value={draft}
        style={{ width: '4.2em' }}
        onChange={(e) => commit(e.target.value)}
        onBlur={() => setDraft(String(tempo))}
      />
      <span className="rf-unit">{t('toolbar.bpm')}</span>
    </span>
  );
}

function KeyInput() {
  const { t } = useTranslation();
  const key = useApp((s) => s.melody.key);
  const actions = useApp((s) => s.actions);
  return <KeySelectInput label={t('toolbar.key')} value={key} onChange={(k) => actions.dispatch((m) => setKey(m, k))} />;
}

function TimeSignatureInput() {
  const { t } = useTranslation();
  const ts = useApp((s) => s.melody.timeSignature);
  const actions = useApp((s) => s.actions);
  const value = (x: { beats: number; beatUnit: number }) => `${x.beats}/${x.beatUnit}`;
  return (
    <select
      aria-label={t('toolbar.timeSignature')}
      value={value(ts)}
      onChange={(e) => {
        const next = TIME_SIGNATURES.find((x) => value(x) === e.target.value);
        if (next) actions.dispatch((m) => setTimeSignature(m, next));
      }}
    >
      {TIME_SIGNATURES.map((x) => (
        <option key={value(x)} value={value(x)}>
          {value(x)}
        </option>
      ))}
    </select>
  );
}

function SnapInput() {
  const { t } = useTranslation();
  const snap = useApp((s) => s.prefs.snapTicks);
  const actions = useApp((s) => s.actions);
  return (
    <select aria-label={t('toolbar.snap')} value={snap} onChange={(e) => actions.setPrefs({ snapTicks: Number(e.target.value) as SnapTicks })}>
      {SNAP_VALUES.map((v) => (
        <option key={v} value={v}>
          {t(`snap.${v}`)}
        </option>
      ))}
    </select>
  );
}

const FIELD: Record<FieldId, { labelKey: string; control: () => ReactNode }> = {
  tempo: { labelKey: 'toolbar.tempo', control: () => <TempoInput /> },
  key: { labelKey: 'toolbar.key', control: () => <KeyInput /> },
  timeSignature: { labelKey: 'toolbar.timeSignature', control: () => <TimeSignatureInput /> },
  snap: { labelKey: 'toolbar.snap', control: () => <SnapInput /> },
  language: { labelKey: 'toolbar.language', control: () => <LanguageSwitch /> },
  noteNaming: { labelKey: 'toolbar.naming', control: () => <NamingSwitch /> },
};

/** A value control in the ribbon: icon and label above the existing input (003 research R10). */
export function RibbonField({ id, compact = false }: { id: FieldId; compact?: boolean }) {
  const { t } = useTranslation();
  const Icon = FIELD_ICON[id];
  return (
    <div className="ribbon-field" data-field={id}>
      <span className="rf-label" aria-hidden>
        <span className="rb-icon">
          <Icon />
        </span>
        {!compact && t(FIELD[id].labelKey)}
      </span>
      {FIELD[id].control()}
    </div>
  );
}
