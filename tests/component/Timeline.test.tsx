import { act, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DEFAULT_PX_PER_TICK } from '@/state/prefs';
import { ROW_HEIGHT, TimelinePanel } from '@/ui/Timeline/TimelinePanel';
import { useShortcuts } from '@/ui/useShortcuts';
import { melodyWith } from '../unit/domain/helpers';
import { setup } from './renderApp';

function Shortcuts() {
  useShortcuts();
  return null;
}

describe('Timeline (US1 primary flow)', () => {
  it('adds a note on click, deletes it with Delete and restores it with Ctrl+Z', () => {
    const { store } = setup(
      <>
        <TimelinePanel />
        <Shortcuts />
      </>,
    );
    const grid = screen.getByTestId('timeline-grid');
    // x = 100 px → tick 640 → snapped down to 600 (1/16 grid); first row = D7 (98).
    const x = 100;
    fireEvent.pointerDown(grid, { clientX: x, clientY: ROW_HEIGHT / 2, button: 0 });
    fireEvent.pointerUp(grid, { clientX: x, clientY: ROW_HEIGHT / 2, button: 0 });

    const expected = { pitch: 98, start: Math.floor(x / DEFAULT_PX_PER_TICK / 120) * 120, duration: 480 };
    expect(store.getState().melody.notes).toEqual([{ id: expect.any(String), ...expected }]);
    expect(screen.getAllByTestId('note')).toHaveLength(1);

    fireEvent.keyDown(window, { key: 'Delete' });
    expect(store.getState().melody.notes).toEqual([]);

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(store.getState().melody.notes).toEqual([{ id: expect.any(String), ...expected }]);
  });

  it('finishes a drag whose release was lost at the last shown position (one undo step)', () => {
    const { store } = setup(<TimelinePanel />);
    const grid = screen.getByTestId('timeline-grid');
    const rowY = (p: number) => (98 - p) * ROW_HEIGHT + ROW_HEIGHT / 2;
    fireEvent.pointerDown(grid, { clientX: 5, clientY: rowY(80), button: 0, pointerType: 'mouse' });
    fireEvent.pointerUp(grid, { clientX: 5, clientY: rowY(80), button: 0, pointerType: 'mouse' });
    const pastBefore = store.getState().history.past.length;

    const note = screen.getByTestId('note');
    fireEvent.pointerDown(note, { clientX: 20, clientY: rowY(80), button: 0, buttons: 1, pointerType: 'mouse' });
    fireEvent.pointerMove(grid, { clientX: 20, clientY: rowY(83), buttons: 1, pointerType: 'mouse' });
    // No pointerup: the next move arrives with no button held.
    fireEvent.pointerMove(grid, { clientX: 400, clientY: rowY(90), buttons: 0, pointerType: 'mouse' });

    expect(store.getState().melody.notes.map((n) => n.pitch)).toEqual([83]);
    expect(store.getState().draft).toBeNull();
    expect(store.getState().history.past.length).toBe(pastBefore + 1);
  });
});

describe('Timeline articulation (002 FR-009, FR-019)', () => {
  it('shows marks, joins slurred notes with an arc and names both in the accessible label', () => {
    const { store } = setup(<TimelinePanel />);
    act(() =>
      store.getState().actions.openMelody(
        melodyWith([
          { id: 'a', pitch: 79, start: 0, duration: 480, mark: 'staccato', slurNext: true },
          { id: 'b', pitch: 81, start: 480, duration: 480, mark: 'tenuto' },
          { id: 'c', pitch: 83, start: 960, duration: 480 },
        ]),
      ),
    );
    expect(screen.getAllByTestId('timeline-mark').map((el) => el.getAttribute('data-mark'))).toEqual(['staccato', 'tenuto']);
    expect(screen.getAllByTestId('slur-arc')).toHaveLength(1);
    const labels = screen.getAllByTestId('note').map((el) => el.getAttribute('aria-label'));
    expect(labels[0]).toMatch(/, staccato, slurred to next$/);
    expect(labels[1]).toMatch(/, tenuto$/);
    expect(labels[2]).not.toMatch(/,/);
  });
});
