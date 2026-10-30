import { act, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Player } from '@/audio/player';
import { createPlaybackController } from '@/audio/controller';
import { PPQ } from '@/domain/types';
import { PlaybackProvider } from '@/ui/playbackContext';
import { TimeRuler } from '@/ui/Layout/TimeRuler';
import { TransportControls } from '@/ui/Toolbar/TransportControls';
import { useShortcuts } from '@/ui/useShortcuts';
import { usePlaybackController } from '@/ui/playbackContext';
import { setup } from './renderApp';

function mockPlayer(): Player {
  return {
    play: vi.fn(async () => undefined),
    pause: vi.fn(() => 2 * PPQ),
    reschedule: vi.fn(),
    positionTicks: vi.fn(() => 0),
  };
}

function Shortcuts() {
  const c = usePlaybackController();
  useShortcuts({ onPlayPause: c.toggle, onHome: c.toStart });
  return null;
}

function renderWithPlayer() {
  const player = mockPlayer();
  let controller!: ReturnType<typeof createPlaybackController>;
  const utils = setup(
    <PlaybackProviderLazy player={player} onController={(c) => (controller = c)} />,
  );
  return { ...utils, player, controller: () => controller };
}

function PlaybackProviderLazy({ player, onController }: { player: Player; onController: (c: ReturnType<typeof createPlaybackController>) => void }) {
  return (
    <PlaybackProvider player={player} onController={onController}>
      <TransportControls />
      <TimeRuler />
      <Shortcuts />
    </PlaybackProvider>
  );
}

describe('Playback controls (US3 primary flow)', () => {
  it('is disabled for an empty melody', () => {
    setup(<PlaybackProviderLazy player={mockPlayer()} onController={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled();
  });

  it('toggles stopped → playing → paused → playing with the button and Space', async () => {
    const { store, player } = renderWithPlayer();
    act(() => {
      store.getState().actions.dispatch((m) => ({ ok: true, melody: { ...m, notes: [{ id: 'a', pitch: 72, start: 0, duration: 4 * PPQ }] } }));
    });
    expect(store.getState().playback.status).toBe('stopped');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Play' })));
    expect(store.getState().playback.status).toBe('playing');
    expect(player.play).toHaveBeenCalledWith(store.getState().melody, 0);
    await act(async () => fireEvent.keyDown(window, { key: ' ' }));
    expect(store.getState().playback).toMatchObject({ status: 'paused', positionTicks: 2 * PPQ });
    await act(async () => fireEvent.keyDown(window, { key: ' ' }));
    expect(store.getState().playback.status).toBe('playing');
    expect(player.play).toHaveBeenLastCalledWith(store.getState().melody, 2 * PPQ);
  });

  it('seeks when the ruler is clicked and resets to stopped at the end', async () => {
    const { store, controller } = renderWithPlayer();
    act(() => {
      store.getState().actions.dispatch((m) => ({ ok: true, melody: { ...m, notes: [{ id: 'a', pitch: 72, start: 0, duration: 4 * PPQ }] } }));
    });
    const ruler = screen.getByTestId('time-ruler');
    // default zoom: 0.15625 px/tick → x = 150 px ≈ tick 960
    await act(async () => fireEvent.click(ruler, { clientX: 150 }));
    expect(store.getState().playback.positionTicks).toBe(960);
    act(() => controller().ended());
    expect(store.getState().playback).toMatchObject({ status: 'stopped', positionTicks: 0 });
  });

  it('calls reschedule when the tempo changes while playing', async () => {
    const { store, player } = renderWithPlayer();
    act(() => {
      store.getState().actions.dispatch((m) => ({ ok: true, melody: { ...m, notes: [{ id: 'a', pitch: 72, start: 0, duration: 4 * PPQ }] } }));
    });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Play' })));
    const tempo = screen.getByRole('spinbutton', { name: 'Tempo' });
    act(() => {
      fireEvent.change(tempo, { target: { value: '72' } });
    });
    expect(store.getState().melody.tempoBpm).toBe(72);
    expect(player.reschedule).toHaveBeenCalledWith(store.getState().melody);
  });
});
