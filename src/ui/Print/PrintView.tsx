import { useTranslation } from 'react-i18next';
import { getFingering } from '@/domain/fingering';
import { layoutPrintSystems } from '@/domain/printLayout';
import { notationOf } from '@/state/selectors';
import { DIAGRAM_H, DIAGRAM_W, FingeringDiagram } from '../Fingering/FingeringDiagram';
import { StaffLines, StaffNotes, StaffPrelude, staffHeight, staffTop, stepY, type StaffGeometry } from '../Sheet/StaffRenderer';
import { useApp } from '../storeContext';
import { useKeyName } from '../useKeyName';
import { useNoteName } from '../useNoteName';
import './print.css';

/** Printable content width: A4 and Letter minus 15 mm margins (≈ 180 mm). */
export const PRINT_WIDTH = 680;
const SP = 7;
const DIAGRAM_SCALE = 0.5;

export type PrintMode = 'sheet' | 'sheetWithFingering';

/** Wrapped, page-based sheet music for printing (FR-023), optionally with a fingering row. */
export function PrintView({ mode }: { mode: PrintMode }) {
  const { t } = useTranslation();
  const melody = useApp((s) => s.melody);
  const { short } = useNoteName();
  const keyName = useKeyName();
  const model = notationOf(melody);
  const { systems } = layoutPrintSystems(model, PRINT_WIDTH, { sp: SP });
  const g: StaffGeometry = { sp: SP, top: staffTop(SP) };
  const withFingering = mode === 'sheetWithFingering';
  const diagramH = DIAGRAM_H * DIAGRAM_SCALE;
  const height = staffHeight(SP) + (withFingering ? diagramH + 8 : 0);
  const pitchOf = new Map(melody.notes.map((n) => [n.id, n.pitch]));

  return (
    <div className="print-root" data-testid="print-view" data-mode={mode}>
      <header className="print-header">
        <h1>{melody.title}</h1>
        <p>
          {keyName(melody.key)} · {t('print.tempo', { bpm: melody.tempoBpm })}
        </p>
      </header>
      {systems.map((sys, i) => {
        const xOf = (tick: number) => sys.eventX.get(tick) ?? sys.barStartX[0] ?? 0;
        return (
          <svg key={i} className="print-system" data-testid="print-system" width={PRINT_WIDTH} height={height} viewBox={`0 0 ${PRINT_WIDTH} ${height}`}>
            <StaffLines g={g} x1={0} x2={sys.width} />
            <StaffPrelude g={g} x={0} keySignature={model.keySignature} timeSignature={model.timeSignature} showTime={sys.showTime} />
            {sys.barEndX.map((x, b) => (
              <line key={b} x1={x} x2={x} y1={g.top} y2={stepY(g, 0)} stroke="var(--print-fg, #000)" strokeWidth={0.16 * SP} />
            ))}
            <StaffNotes
              g={g}
              bars={sys.bars}
              xOf={xOf}
              barLines={[]}
              slurs={sys.slurs}
              barSpanX={(bar) => {
                const k = sys.bars.indexOf(bar);
                return [sys.barStartX[k] ?? 0, sys.barEndX[k] ?? 0];
              }}
            />
            {withFingering &&
              sys.bars.flatMap((bar) =>
                bar.events
                  .filter((e) => e.kind === 'note' && !e.tieFromPrev && e.noteId)
                  .map((e) => {
                    const pitch = pitchOf.get(e.noteId as string) as number;
                    return (
                      <g
                        key={`${e.noteId}`}
                        data-testid="print-fingering"
                        transform={`translate(${xOf(e.startTick) - (DIAGRAM_W * DIAGRAM_SCALE) / 2 + SP * 0.9}, ${staffHeight(SP) + 2})`}
                      >
                        <FingeringDiagram fingering={getFingering(pitch).standard} scale={DIAGRAM_SCALE} label={short(pitch)} />
                      </g>
                    );
                  }),
              )}
          </svg>
        );
      })}
    </div>
  );
}
