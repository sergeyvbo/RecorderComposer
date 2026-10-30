import { useTranslation } from 'react-i18next';
import { slurPieces } from '@/domain/printLayout';
import { selectNotation } from '@/state/selectors';
import { GUTTER, useTimeAxis } from '../Layout/SharedTimeAxis';
import { useApp } from '../storeContext';
import { StaffLines, StaffNotes, StaffPrelude, staffHeight, staffTop, type StaffGeometry } from './StaffRenderer';

const SP = 8;

/** Sheet music on the shared time axis (FR-010, FR-013a): x = tickToX(startTick). */
export function SheetPanel() {
  const { t } = useTranslation();
  const axis = useTimeAxis();
  const model = useApp(selectNotation);
  const selected = useApp((s) => s.selection.ids);
  const hoverId = useApp((s) => s.selection.hoverId);
  const playingId = useApp((s) => s.playback.playingNoteId);
  const actions = useApp((s) => s.actions);
  const g: StaffGeometry = { sp: SP, top: staffTop(SP) };
  const height = staffHeight(SP);
  const margin = axis.width / axis.pxPerTick / 2;
  const bars = model.bars.filter((b) => b.endTick >= axis.visibleStart - margin && b.startTick <= axis.visibleEnd + margin);
  const slurs = slurPieces(model, bars[0]?.startTick ?? 0, bars.at(-1)?.endTick ?? 0);

  const noteIdAt = (target: EventTarget | null) =>
    (target as Element | null)?.closest('[data-note-id]')?.getAttribute('data-note-id') ?? null;

  return (
    <div className="sheet" style={{ height: '100%', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
      <svg width={GUTTER} height={height} style={{ flex: 'none' }} aria-hidden="true">
        <StaffLines g={g} x1={0} x2={GUTTER} />
        <StaffPrelude g={g} x={2} keySignature={model.keySignature} timeSignature={model.timeSignature} showTime />
      </svg>
      <svg
        width={axis.width}
        height={height}
        role="img"
        aria-label={t('panel.sheet')}
        data-testid="sheet"
        style={{ flex: 'none' }}
        onClick={(e) => {
          const id = noteIdAt(e.target);
          if (id) actions.select([id], e.ctrlKey || e.metaKey ? 'toggle' : e.shiftKey ? 'add' : 'replace');
        }}
        onPointerMove={(e) => actions.setHover(noteIdAt(e.target))}
        onPointerLeave={() => actions.setHover(null)}
      >
        <StaffLines g={g} x1={0} x2={axis.width} />
        <StaffNotes
          g={g}
          bars={bars}
          xOf={axis.tickToX}
          barLines={bars.map((b) => b.endTick)}
          selectedIds={selected}
          hoverId={hoverId}
          playingId={playingId}
          slurs={slurs}
        />
      </svg>
    </div>
  );
}
