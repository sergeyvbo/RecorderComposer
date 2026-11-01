import { act, fireEvent, screen, within } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n } from '@/i18n';
import { Ribbon } from '@/ui/Ribbon/Ribbon';
import { TitleBar } from '@/ui/Ribbon/TitleBar';
import { TimelinePanel } from '@/ui/Timeline/TimelinePanel';
import { useShortcuts } from '@/ui/useShortcuts';
import { usePlaybackController } from '@/ui/playbackContext';
import { SharedTimeAxis } from '@/ui/Layout/SharedTimeAxis';
import { melodyWith, Q } from '../unit/domain/helpers';
import { setupRibbon } from './renderApp';

beforeAll(() => {
  // jsdom has no object URLs; downloads only need a string.
  URL.createObjectURL = () => 'blob:test';
  URL.revokeObjectURL = () => undefined;
  HTMLAnchorElement.prototype.click = () => undefined;
});

function Shortcuts() {
  const c = usePlaybackController();
  useShortcuts({ onPlayPause: c.toggle, onHome: c.toStart });
  return null;
}

function renderRibbon() {
  const utils = setupRibbon(
    <>
      <TitleBar />
      <Ribbon />
      <SharedTimeAxis>
        <TimelinePanel />
      </SharedTimeAxis>
      <Shortcuts />
    </>,
  );
  const notes = ['a', 'b', 'c'].map((id, i) => ({ id, pitch: 80 + i, start: i * Q, duration: Q }));
  act(() => utils.store.getState().actions.openMelody(melodyWith(notes)));
  return utils;
}

const tab = (name: string) => screen.getByRole('tab', { name });
const panel = () => screen.getByRole('tabpanel');
const groupsOf = () => within(panel()).getAllByRole('group').map((g) => g.getAttribute('aria-label'));

describe('Ribbon tabs and groups (003 US1)', () => {
  it('opens on Home with its four named groups', () => {
    renderRibbon();
    expect(tab('Home')).toHaveAttribute('aria-selected', 'true');
    expect(groupsOf()).toEqual(['Clipboard', 'History', 'Playback', 'Articulation']);
  });

  it('switching tabs shows that tab only and remembers it', () => {
    const { store } = renderRibbon();
    fireEvent.click(tab('File'));
    expect(groupsOf()).toEqual(['Melodies', 'Export', 'Print']);
    expect(document.getElementById('ribbon-panel-home')).not.toBeVisible();
    expect(store.getState().prefs.ribbon.tab).toBe('file');
    fireEvent.click(tab('View'));
    expect(groupsOf()).toEqual(['Panels', 'Zoom', 'Grid', 'Language']);
    expect(within(panel()).getByRole('button', { name: 'Sheet music' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('enables Paste after Copy and inserts after the selection', () => {
    const { store } = renderRibbon();
    const paste = within(panel()).getByRole('button', { name: 'Paste' });
    expect(paste).toBeDisabled();
    expect(within(panel()).getByRole('button', { name: 'Copy' })).toBeDisabled();
    act(() => store.getState().actions.select(['a']));
    fireEvent.click(within(panel()).getByRole('button', { name: 'Copy' }));
    expect(paste).toBeEnabled();
    fireEvent.click(paste);
    expect(store.getState().melody.notes.map((n) => [n.pitch, n.start])).toEqual([
      [80, 0],
      [80, Q],
      [81, 2 * Q],
      [82, 3 * Q],
    ]);
  });

  it('shows Russian tab and group names in the Russian interface', () => {
    renderRibbon();
    act(() => void initI18n('ru'));
    expect(screen.getByRole('tab', { name: 'Главная' })).toBeInTheDocument();
    expect(groupsOf()).toEqual(['Буфер обмена', 'История', 'Воспроизведение', 'Артикуляция']);
    act(() => void initI18n('en'));
  });
});

describe('Title bar and quick access (003 US2)', () => {
  it('keeps Undo, Redo and Play reachable from any tab, in step with the Home tab', () => {
    const { store } = renderRibbon();
    const quick = screen.getByRole('toolbar', { name: 'Quick access' });
    expect(within(quick).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['Undo', 'Redo', 'Play']);
    expect(within(quick).getByRole('button', { name: 'Undo' })).toBeDisabled();
    fireEvent.click(tab('File'));
    act(() => store.getState().actions.select(['a']));
    fireEvent.keyDown(window, { key: 'Delete' });
    fireEvent.click(within(quick).getByRole('button', { name: 'Undo' }));
    expect(store.getState().melody.notes).toHaveLength(3);
    act(() => store.getState().actions.setPlayback({ status: 'playing' }));
    expect(within(quick).getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    fireEvent.click(tab('Home'));
    expect(within(panel()).getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });

  it('renames the melody from the title bar and shows the save status', () => {
    const { store } = renderRibbon();
    const title = screen.getByRole('textbox', { name: 'Melody title' });
    fireEvent.change(title, { target: { value: 'Morning' } });
    fireEvent.blur(title);
    expect(store.getState().melody.title).toBe('Morning');
    expect(screen.getByRole('banner')).toHaveTextContent('All changes saved');
  });
});

describe('Ribbon keyboard (003 US5, FR-009)', () => {
  it('arrows, Home and End move between tabs and select them, with roving tabindex', () => {
    renderRibbon();
    tab('Home').focus();
    fireEvent.keyDown(tab('Home'), { key: 'ArrowRight' });
    fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowRight' });
    expect(tab('File')).toHaveFocus();
    expect(tab('File')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByRole('tab').map((t) => t.tabIndex)).toEqual([-1, -1, 0, -1]);
    fireEvent.keyDown(tab('File'), { key: 'End' });
    expect(tab('View')).toHaveFocus();
    fireEvent.keyDown(tab('View'), { key: 'ArrowRight' });
    expect(tab('Home')).toHaveFocus();
    fireEvent.keyDown(tab('Home'), { key: 'ArrowLeft' });
    expect(tab('View')).toHaveFocus();
    fireEvent.keyDown(tab('View'), { key: 'Home' });
    expect(tab('Home')).toHaveAttribute('aria-selected', 'true');
    expect(panel()).toHaveAttribute('aria-labelledby', tab('Home').id);
    expect(tab('Home')).toHaveAttribute('aria-controls', panel().id);
  });

  it('Space activates a focused ribbon control, never Play; elsewhere it plays', () => {
    const { store, player } = renderRibbon();
    act(() => store.getState().actions.select(['a', 'b']));
    const copy = within(panel()).getByRole('button', { name: 'Copy' });
    copy.focus();
    fireEvent.keyDown(copy, { key: ' ', code: 'Space' });
    expect(player.play).not.toHaveBeenCalled();
    tab('Home').focus();
    fireEvent.keyDown(tab('Home'), { key: ' ', code: 'Space' });
    expect(player.play).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole('spinbutton', { name: 'Tempo' }), { key: ' ', code: 'Space' });
    expect(player.play).not.toHaveBeenCalled();
    // Ctrl+Z still undoes from a ribbon button.
    fireEvent.click(within(panel()).getByRole('button', { name: 'Delete' }));
    copy.focus();
    fireEvent.keyDown(copy, { key: 'z', ctrlKey: true });
    expect(store.getState().melody.notes).toHaveLength(3);
    // Focus on the timeline: Space plays.
    const timeline = document.querySelector<HTMLElement>('.timeline');
    timeline?.focus();
    fireEvent.keyDown(timeline as HTMLElement, { key: ' ', code: 'Space' });
    expect(player.play).toHaveBeenCalled();
  });
});

describe('Collapsed ribbon (003 US4, FR-011)', () => {
  it('double-clicking the selected tab collapses; a clicked tab opens as a popup', () => {
    const { store, library } = renderRibbon();
    fireEvent.doubleClick(tab('Home'));
    expect(store.getState().prefs.ribbon.collapsed).toBe(true);
    expect(screen.queryByRole('tabpanel')).toBeNull();
    expect(screen.getByRole('toolbar', { name: 'Quick access' })).toBeInTheDocument();

    fireEvent.click(tab('File'));
    fireEvent.click(within(panel()).getByRole('button', { name: 'Export file' }));
    expect(library.exportCurrent).toHaveBeenCalled();
    expect(screen.queryByRole('tabpanel')).toBeNull();

    fireEvent.click(tab('Home'));
    fireEvent.change(within(panel()).getByRole('spinbutton', { name: 'Tempo' }), { target: { value: '90' } });
    expect(store.getState().melody.tempoBpm).toBe(90);
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    fireEvent.keyDown(panel(), { key: 'Escape' });
    expect(screen.queryByRole('tabpanel')).toBeNull();
    expect(tab('Home')).toHaveFocus();

    fireEvent.click(tab('View'));
    fireEvent.pointerDown(screen.getByTestId('timeline-grid'));
    expect(screen.queryByRole('tabpanel')).toBeNull();
  });

  it('the collapse button pins the ribbon open again', () => {
    const { store } = renderRibbon();
    const collapse = screen.getByRole('button', { name: 'Collapse the ribbon' });
    expect(collapse).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(collapse);
    const pin = screen.getByRole('button', { name: 'Pin the ribbon' });
    expect(pin).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(pin);
    expect(store.getState().prefs.ribbon.collapsed).toBe(false);
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
  });
});
