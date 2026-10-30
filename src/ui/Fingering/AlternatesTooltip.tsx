import { useTranslation } from 'react-i18next';
import type { FingeringEntry } from '@/domain/fingering';
import { FingeringDiagram } from './FingeringDiagram';

export interface TooltipState {
  entry: FingeringEntry;
  noteName: string;
  x: number;
  y: number;
  /** Show the standard fingering too (compact markers at low zoom). */
  includeStandard: boolean;
}

/** Hover/tap hint with alternate fingerings (FR-011a). Informational only. */
export function AlternatesTooltip({ tip }: { tip: TooltipState | null }) {
  const { t } = useTranslation();
  if (!tip) return null;
  const { entry } = tip;
  if (!tip.includeStandard && entry.alternates.length === 0) return null;
  return (
    <div className="tooltip" role="tooltip" style={{ left: tip.x + 12, top: Math.max(8, tip.y - 140) }}>
      {tip.includeStandard && (
        <figure style={{ margin: 0, textAlign: 'center' }}>
          <FingeringDiagram fingering={entry.standard} label={t('fingering.diagram', { note: tip.noteName })} />
          <figcaption className="hint">{tip.noteName}</figcaption>
        </figure>
      )}
      {entry.alternates.length > 0 && (
        <div>
          <div className="hint">{t('fingering.alternates')}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {entry.alternates.map((a, i) => (
              <figure key={i} style={{ margin: 0, textAlign: 'center' }}>
                <FingeringDiagram fingering={a.fingering} label={`${tip.noteName}: ${t(a.labelKey)}`} />
                <figcaption className="hint">{t(a.labelKey)}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
