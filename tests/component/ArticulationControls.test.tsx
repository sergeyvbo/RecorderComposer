import { act, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ArticulationControls } from '@/ui/Toolbar/ArticulationControls';
import { EditHint } from '@/ui/Toolbar/EditHint';
import { TitleInput } from '@/ui/Toolbar/TitleInput';
import { useShortcuts } from '@/ui/useShortcuts';
import { melodyWith, Q } from '../unit/domain/helpers';
import { setup } from './renderApp';

function Shortcuts() {
  useShortcuts();
  return null;
}

function renderControls() {
  const utils = setup(
    <>
      <TitleInput />
      <ArticulationControls />
      <EditHint />
      <Shortcuts />
    </>,
    { withAxis: false },
  );
  const notes = ['a', 'b', 'c', 'd'].map((id, i) => ({ id, pitch: 72 + i, start: i * Q, duration: Q }));
  act(() => utils.store.getState().actions.openMelody(melodyWith(notes)));
  const select = (...ids: string[]) => act(() => utils.store.getState().actions.select(ids));
  const marks = () => utils.store.getState().melody.notes.map((n) => n.mark ?? '-');
  return { ...utils, select, marks };
}

const staccato = () => screen.getByRole('button', { name: 'Staccato (S)' });
const tenuto = () => screen.getByRole('button', { name: 'Tenuto (T)' });

describe('ArticulationControls: staccato and tenuto (US1)', () => {
  it('disables the mark buttons with no selection', () => {
    renderControls();
    expect(staccato()).toBeDisabled();
    expect(tenuto()).toBeDisabled();
    expect(screen.getByRole('group', { name: 'Articulation' })).toBeInTheDocument();
  });

  it('shows aria-pressed true, mixed or false for the selection', () => {
    const { select } = renderControls();
    select('a', 'b');
    expect(staccato()).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(staccato());
    expect(staccato()).toHaveAttribute('aria-pressed', 'true');
    expect(tenuto()).toHaveAttribute('aria-pressed', 'false');
    select('a', 'b', 'c');
    expect(staccato()).toHaveAttribute('aria-pressed', 'mixed');
  });

  it('clicking sets the mark on all selected notes and clicking again clears it', () => {
    const { select, marks } = renderControls();
    select('a', 'b', 'c');
    fireEvent.click(tenuto());
    expect(marks()).toEqual(['tenuto', 'tenuto', 'tenuto', '-']);
    fireEvent.click(tenuto());
    expect(marks()).toEqual(['-', '-', '-', '-']);
  });

  it('S and T toggle the mark; a mixed selection becomes all staccato first', () => {
    const { select, marks } = renderControls();
    select('a');
    fireEvent.keyDown(window, { key: 's' });
    expect(marks()).toEqual(['staccato', '-', '-', '-']);
    select('a', 'b');
    fireEvent.keyDown(window, { key: 's' });
    expect(marks()).toEqual(['staccato', 'staccato', '-', '-']);
    fireEvent.keyDown(window, { key: 'S', shiftKey: true });
    expect(marks()).toEqual(['-', '-', '-', '-']);
    select('c');
    fireEvent.keyDown(window, { key: 't' });
    expect(marks()).toEqual(['-', '-', 'tenuto', '-']);
  });

  it('does not fire with Ctrl, Cmd or Alt held', () => {
    const { select, marks } = renderControls();
    select('a');
    fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    fireEvent.keyDown(window, { key: 't', metaKey: true });
    fireEvent.keyDown(window, { key: 's', altKey: true });
    expect(marks()).toEqual(['-', '-', '-', '-']);
  });

  it('a multi-note change is one undo step', () => {
    const { select, marks, store } = renderControls();
    select('a', 'b', 'c', 'd');
    fireEvent.click(staccato());
    expect(marks()).toEqual(['staccato', 'staccato', 'staccato', 'staccato']);
    act(() => store.getState().actions.undo());
    expect(marks()).toEqual(['-', '-', '-', '-']);
    act(() => store.getState().actions.redo());
    expect(marks()).toEqual(['staccato', 'staccato', 'staccato', 'staccato']);
  });

  it('ignores S while typing in the title input', () => {
    const { select, marks } = renderControls();
    select('a');
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Melody title' }), { key: 's' });
    expect(marks()).toEqual(['-', '-', '-', '-']);
  });

  it('S with nothing selected says "Nothing selected"', () => {
    renderControls();
    fireEvent.keyDown(window, { key: 's' });
    expect(screen.getByRole('status')).toHaveTextContent('Nothing selected');
  });
});

const legato = () => screen.getByRole('button', { name: 'Legato (L, Shift+L to remove)' });

describe('ArticulationControls: legato (US2)', () => {
  const links = (store: ReturnType<typeof renderControls>['store']) =>
    store.getState().melody.notes.filter((n) => n.slurNext).map((n) => n.id);

  it('applies and removes legato; aria-pressed follows the selection', () => {
    const { select, store } = renderControls();
    select('a', 'b', 'c');
    expect(legato()).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(legato());
    expect(links(store)).toEqual(['a', 'b']);
    expect(legato()).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(legato());
    expect(links(store)).toEqual([]);
    expect(legato()).toHaveAttribute('aria-pressed', 'false');
  });

  it('is disabled with no selection and for the last note alone, where it also shows pressed', () => {
    const { select } = renderControls();
    expect(legato()).toBeDisabled();
    select('d');
    expect(legato()).toBeDisabled();
    expect(legato()).toHaveAttribute('aria-pressed', 'true');
  });

  it('L applies and Shift+L removes, each one undo step', () => {
    const { select, store } = renderControls();
    select('b', 'c', 'd');
    fireEvent.keyDown(window, { key: 'l' });
    expect(links(store)).toEqual(['b', 'c']);
    select('c');
    fireEvent.keyDown(window, { key: 'L', shiftKey: true });
    expect(links(store)).toEqual([]);
    act(() => store.getState().actions.undo());
    expect(links(store)).toEqual(['b', 'c']);
    act(() => store.getState().actions.undo());
    expect(links(store)).toEqual([]);
  });

  it('a selection with gaps changes nothing and explains why', () => {
    const { select, store } = renderControls();
    select('a', 'c');
    fireEvent.keyDown(window, { key: 'l' });
    expect(links(store)).toEqual([]);
    expect(screen.getByRole('status')).toHaveTextContent('Legato needs consecutive notes: the selection has gaps');
  });
});
