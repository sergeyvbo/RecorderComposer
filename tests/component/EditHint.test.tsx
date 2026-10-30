import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RejectReason } from '@/domain/types';
import { EditHint } from '@/ui/Toolbar/EditHint';
import { useShortcuts } from '@/ui/useShortcuts';
import { setup } from './renderApp';

function Shortcuts() {
  useShortcuts();
  return null;
}

const renderHint = () =>
  setup(
    <>
      <EditHint />
      <Shortcuts />
    </>,
    { withAxis: false },
  );

const hint = () => screen.getByRole('status');

describe('EditHint: every refused command shows a message (FR-020)', () => {
  afterEach(() => vi.useRealTimers());

  const reasons: [RejectReason, string][] = [
    ['noRoom', 'No free space here'],
    ['outOfRange', 'Outside the recorder range'],
    ['emptySelection', 'Nothing selected'],
    ['invalidArgs', 'This change is not possible'],
    ['notConsecutive', 'Legato needs consecutive notes: the selection has gaps'],
  ];

  it.each(reasons)('shows the %s refusal', (reason, text) => {
    const { store } = renderHint();
    act(() => void store.getState().actions.dispatch(() => ({ ok: false, reason })));
    expect(hint()).toHaveTextContent(text);
  });

  it('clears after about 2.5 s and shows the same refusal again when repeated', () => {
    vi.useFakeTimers();
    const { store } = renderHint();
    const refuse = () => act(() => void store.getState().actions.dispatch(() => ({ ok: false, reason: 'noRoom' })));
    refuse();
    expect(hint()).toHaveTextContent('No free space here');
    act(() => void vi.advanceTimersByTime(2600));
    expect(hint()).toHaveTextContent('');
    refuse();
    expect(hint()).toHaveTextContent('No free space here');
  });

  it.each([
    ['Delete', {}],
    ['Backspace', {}],
    ['ArrowUp', {}],
    ['ArrowLeft', {}],
    ['c', { ctrlKey: true }],
    ['x', { ctrlKey: true }],
  ])('%s with nothing selected says "Nothing selected"', (key, mods) => {
    renderHint();
    fireEvent.keyDown(window, { key, ...mods });
    expect(hint()).toHaveTextContent('Nothing selected');
  });

  it('paste with an empty clipboard says so', () => {
    renderHint();
    fireEvent.keyDown(window, { key: 'v', ctrlKey: true });
    expect(hint()).toHaveTextContent('The clipboard is empty');
  });

  it('copying nothing keeps the previous clipboard', () => {
    const { store } = renderHint();
    act(() => store.setState({ clipboard: [{ pitch: 72, offset: 0, duration: 480 }] }));
    fireEvent.keyDown(window, { key: 'c', ctrlKey: true });
    expect(store.getState().clipboard).toHaveLength(1);
  });

  it('undo and redo with an empty history say so', () => {
    renderHint();
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(hint()).toHaveTextContent('Nothing to undo');
    fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
    expect(hint()).toHaveTextContent('Nothing to redo');
  });
});
