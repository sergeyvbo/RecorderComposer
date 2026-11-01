import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Ribbon } from '@/ui/Ribbon/Ribbon';
import { RIBBON_LAYOUT } from '@/ui/Ribbon/layout';
import { TOOLTIP_DELAY_MS } from '@/ui/Ribbon/Tooltip';
import { melodyWith, Q } from '../unit/domain/helpers';
import { setupRibbon } from './renderApp';

const panel = () => screen.getByRole('tabpanel');
const button = (name: string) => within(panel()).getByRole('button', { name });
const tooltip = () => screen.queryByRole('tooltip');

function renderWithNotes() {
  const utils = setupRibbon(<Ribbon />);
  act(() => utils.store.getState().actions.openMelody(melodyWith([{ id: 'a', pitch: 80, start: 0, duration: Q }])));
  return utils;
}

describe('Ribbon tooltips (003 US3, FR-008)', () => {
  afterEach(() => vi.useRealTimers());

  it('opens at once on keyboard focus with name and shortcut, without changing the name', () => {
    const { store } = renderWithNotes();
    act(() => store.getState().actions.select(['a']));
    const del = button('Delete');
    act(() => del.focus());
    expect(tooltip()).toHaveTextContent('Delete (Delete)');
    expect(del).toHaveAttribute('aria-describedby', tooltip()?.id);
    expect(del).toHaveAccessibleName('Delete');
    fireEvent.keyDown(del, { key: 'Escape' });
    expect(tooltip()).toBeNull();
  });

  it('opens after the hover delay and closes on leave', () => {
    vi.useFakeTimers();
    renderWithNotes();
    const wrap = button('Paste').parentElement as HTMLElement;
    fireEvent.pointerEnter(wrap);
    expect(tooltip()).toBeNull();
    act(() => void vi.advanceTimersByTime(TOOLTIP_DELAY_MS));
    expect(tooltip()).toHaveTextContent('Paste (Ctrl+V)');
    expect(tooltip()).toHaveTextContent('Nothing has been copied yet');
    fireEvent.pointerLeave(wrap);
    expect(tooltip()).toBeNull();
  });

  it('explains disabled commands, including play for an empty melody or without audio', () => {
    vi.useFakeTimers();
    const { store } = setupRibbon(<Ribbon />);
    const hover = (name: string) => {
      fireEvent.pointerEnter(button(name).parentElement as HTMLElement);
      act(() => void vi.advanceTimersByTime(TOOLTIP_DELAY_MS));
      const text = tooltip()?.textContent;
      fireEvent.pointerLeave(button(name).parentElement as HTMLElement);
      return text;
    };
    expect(hover('Copy')).toContain('Select notes first');
    expect(hover('Play')).toContain('Add notes to play the melody');
    act(() => store.getState().actions.openMelody(melodyWith([{ id: 'a', pitch: 80, start: 0, duration: Q }])));
    act(() => store.getState().actions.setPlayback({ error: 'unavailable' }));
    expect(hover('Play')).toContain('Sound could not be started in this browser');
  });

  it('every command in the layout has an icon or a musical-symbol face', () => {
    renderWithNotes();
    for (const tab of RIBBON_LAYOUT) {
      fireEvent.click(screen.getByRole('tab', { name: new RegExp(`^${tab.id}$`, 'i') }));
      for (const btn of within(panel()).getAllByRole('button')) {
        const face = btn.querySelector('.rb-icon svg, .rb-icon .artic-glyph');
        expect(face, btn.getAttribute('aria-label') ?? '').not.toBeNull();
      }
    }
  });
});
