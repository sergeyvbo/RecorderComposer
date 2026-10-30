import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { selectFingeringRow } from '@/state/selectors';
import { selectMelody } from '@/state/store';
import { GUTTER, useTimeAxis } from '../Layout/SharedTimeAxis';
import { useApp } from '../storeContext';
import { useNoteName } from '../useNoteName';
import { AlternatesTooltip, type TooltipState } from './AlternatesTooltip';
import { DIAGRAM_H, DIAGRAM_W, FingeringDiagram } from './FingeringDiagram';

type Highlight = 'playing' | 'selected' | 'hover' | null;

function highlightOf(id: string, playingId: string | null, selected: ReadonlySet<string>, hoverId: string | null): Highlight {
  if (playingId === id) return 'playing';
  if (selected.has(id)) return 'selected';
  return hoverId === id ? 'hover' : null;
}

const MIN_SCALE = 0.6;
const GAP = 2;

/**
 * One diagram under each note at tickToX(startTick) (FR-011, FR-013a). When neighbours would
 * overlap at the current zoom, diagrams shrink to MIN_SCALE, then collapse to markers that show the
 * diagram on hover (spec edge case: diagrams never overlap).
 */
export function FingeringPanel() {
  const { t } = useTranslation();
  const axis = useTimeAxis();
  const row = useApp(selectFingeringRow);
  const melody = useApp(selectMelody);
  const selected = useApp((s) => s.selection.ids);
  const hoverId = useApp((s) => s.selection.hoverId);
  const playingId = useApp((s) => s.playback.playingNoteId);
  const actions = useApp((s) => s.actions);
  const { short } = useNoteName();
  const [tip, setTip] = useState<TooltipState | null>(null);

  const xs = row.map((r) => axis.tickToX(r.startTick));
  const minGap = xs.reduce((m, x, i) => (i === 0 ? m : Math.min(m, x - (xs[i - 1] as number))), Infinity);
  const scale = Math.min(1, Math.max(MIN_SCALE, (minGap - GAP) / DIAGRAM_W));
  const compact = minGap - GAP < DIAGRAM_W * MIN_SCALE;
  const pitchOf = new Map(melody.notes.map((n) => [n.id, n.pitch]));

  return (
    <div className="fingering" style={{ height: '100%', position: 'relative', overflow: 'hidden' }} onPointerLeave={() => setTip(null)}>
      <div className="hint" style={{ position: 'absolute', left: 6, top: 8, width: GUTTER - 10 }}>
        {t('panel.fingering')}
      </div>
      <div style={{ position: 'absolute', left: GUTTER, top: 4, width: axis.width, bottom: 0 }}>
        {row.map((r, i) => {
          const x = xs[i] as number;
          if (x < -DIAGRAM_W || x > axis.width + DIAGRAM_W) return null;
          const pitch = pitchOf.get(r.noteId) ?? r.entry.pitch;
          const name = short(pitch);
          const highlight = highlightOf(r.noteId, playingId, selected, hoverId);
          const showTip = (e: React.PointerEvent) =>
            setTip({ entry: r.entry, noteName: name, x: e.clientX, y: e.clientY, includeStandard: compact });
          return (
            <button
              key={r.noteId}
              type="button"
              data-testid="fingering"
              data-note-id={r.noteId}
              className="fingering-item"
              aria-label={t('fingering.diagram', { note: name })}
              aria-pressed={selected.has(r.noteId)}
              style={{ position: 'absolute', left: x, top: 0, padding: 0, border: 'none', background: 'none', minHeight: 0 }}
              onClick={(e) => actions.select([r.noteId], e.ctrlKey || e.metaKey ? 'toggle' : e.shiftKey ? 'add' : 'replace')}
              onPointerEnter={(e) => {
                actions.setHover(r.noteId);
                showTip(e);
              }}
              onPointerLeave={() => {
                actions.setHover(null);
                setTip(null);
              }}
              onFocus={() => actions.setHover(r.noteId)}
              onBlur={() => actions.setHover(null)}
            >
              {compact ? (
                <span
                  style={{
                    display: 'block',
                    width: 6,
                    height: 6,
                    marginTop: DIAGRAM_H / 2,
                    borderRadius: 3,
                    background: highlight ? 'var(--select)' : 'var(--fg)',
                  }}
                />
              ) : (
                <FingeringDiagram fingering={r.entry.standard} scale={scale} highlight={highlight} label={name} />
              )}
            </button>
          );
        })}
      </div>
      <AlternatesTooltip tip={tip} />
    </div>
  );
}
