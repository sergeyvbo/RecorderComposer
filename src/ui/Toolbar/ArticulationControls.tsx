import { useTranslation } from 'react-i18next';
import { articulationState, setLegato, setMark, toggledMark } from '@/domain/articulation';
import type { NoteMark } from '@/domain/types';
import { GLYPH } from '../Sheet/glyphs';
import { useApp } from '../storeContext';

const MARK_FACE: Record<NoteMark, string> = { staccato: GLYPH.articStaccatoAbove, tenuto: GLYPH.articTenutoAbove };
const MARKS: readonly NoteMark[] = ['staccato', 'tenuto'];

/** Staccato, tenuto and legato toggles for the selection (002 FR-004–FR-007; contracts/ui-contract.md). */
export function ArticulationControls() {
  const { t } = useTranslation();
  const actions = useApp((s) => s.actions);
  const melody = useApp((s) => s.melody);
  const selection = useApp((s) => s.selection.ids);
  const ids = [...selection];
  const state = articulationState(melody, ids);

  const markButton = (mark: NoteMark) => {
    const pressed = state.mark === mark ? true : state.mark === 'mixed' && hasMark(mark) ? 'mixed' : false;
    return (
      <button
        key={mark}
        type="button"
        className="toggle artic-button"
        aria-pressed={pressed}
        disabled={state.mark === null}
        aria-label={t(`articulation.${mark}`)}
        title={t(`articulation.${mark}`)}
        onClick={() => actions.dispatch((m) => setMark(m, ids, toggledMark(state, mark)))}
      >
        <span className="artic-glyph" aria-hidden>
          {MARK_FACE[mark]}
        </span>
      </button>
    );
  };
  const hasMark = (mark: NoteMark) => melody.notes.some((n) => selection.has(n.id) && n.mark === mark);

  return (
    <div className="toolbar-group" role="group" aria-label={t('articulation.group')}>
      {MARKS.map(markButton)}
      <button
        type="button"
        className="toggle artic-button"
        aria-pressed={state.legatoApplied}
        disabled={!state.canApplyLegato && !state.canRemoveLegato}
        aria-label={t('articulation.legato')}
        title={t('articulation.legato')}
        onClick={() => actions.dispatch((m) => setLegato(m, ids, !state.legatoApplied))}
      >
        <svg width={20} height={12} viewBox="0 0 20 12" aria-hidden>
          <path d="M2,10 Q10,-1 18,10 Q10,2 2,10 Z" fill="currentColor" stroke="currentColor" strokeWidth={1} />
        </svg>
      </button>
    </div>
  );
}
