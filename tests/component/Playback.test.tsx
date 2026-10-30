import { act, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { scheduleNotes, type Player, type VoiceTarget } from '@/audio/player';
import { createPlaybackController } from '@/audio/controller';
import { createPlayheadSync } from '@/audio/playheadSync';
import { toSchedule } from '@/domain/schedule';
import { PPQ, type Note } from '@/domain/types';
import { melodyWith } from '../unit/domain/helpers';
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

describe('Articulated playback (002 US3)', () => {
  const at60 = (notes: Note[]) => ({ ...melodyWith(notes), tempoBpm: 60 });
  const four = (extra: Pick<Note, 'mark' | 'slurNext'> = {}) =>
    at60(
      ['a', 'b', 'c', 'd'].map((id, i) => {
        const n: Note = { id, pitch: 72 + i, start: i * PPQ, duration: PPQ };
        if (extra.mark) n.mark = extra.mark;
        if (extra.slurNext && i < 3) n.slurNext = true;
        return n;
      }),
    );

  /** Runs every scheduled callback at its own time and records the voice calls. */
  function play(m: ReturnType<typeof four>) {
    const calls: string[] = [];
    const voice: VoiceTarget = {
      synth: {
        triggerAttack: (_hz, t, v) => calls.push(`attack@${t} v${v}`),
        triggerRelease: (t) => calls.push(`release@${t.toFixed(3)}`),
        setNote: (_hz, t) => calls.push(`setNote@${t}`),
      },
      breath: { triggerAttackRelease: (_d, t) => calls.push(`breath@${t}`) },
    };
    scheduleNotes({ schedule: (cb, at) => cb(at) }, voice, toSchedule(m));
    return calls;
  }

  it('plain notes attack, breathe and release 15 ms early, as before', () => {
    expect(play(four()).slice(0, 3)).toEqual(['attack@0 v0.85', 'breath@0', 'release@0.985']);
  });

  it('a slurred melody changes pitch with setNote and attacks only once', () => {
    const calls = play(four({ slurNext: true }));
    expect(calls.filter((c) => c.startsWith('attack'))).toEqual(['attack@0 v0.85']);
    expect(calls.filter((c) => c.startsWith('breath'))).toEqual(['breath@0']);
    expect(calls.filter((c) => c.startsWith('setNote'))).toEqual(['setNote@1', 'setNote@2', 'setNote@3']);
    expect(calls.filter((c) => c.startsWith('release'))).toEqual(['release@3.985']);
  });

  it('staccato releases at half length; tenuto attacks harder and hands over without a gap', () => {
    expect(play(four({ mark: 'staccato' })).filter((c) => c.startsWith('release'))).toEqual([
      'release@0.500',
      'release@1.500',
      'release@2.500',
      'release@3.500',
    ]);
    const tenuto = play(four({ mark: 'tenuto' }));
    expect(tenuto.filter((c) => c.startsWith('attack'))).toEqual(['attack@0 v1', 'attack@1 v1', 'attack@2 v1', 'attack@3 v1']);
    expect(tenuto.filter((c) => c.startsWith('release'))).toEqual(['release@4.000']);
  });

  it('the playing-note highlight follows written lengths for a staccato note', () => {
    const { store } = setup(<></>, { withAxis: false });
    act(() => store.getState().actions.openMelody(four({ mark: 'staccato' })));
    const frames: (() => void)[] = [];
    const player = { ...mockPlayer(), positionTicks: vi.fn(() => 0.75 * PPQ) };
    const sync = createPlayheadSync(store, player, { requestFrame: (cb) => frames.push(cb), cancelFrame: () => undefined });
    act(() => store.getState().actions.setPlayback({ status: 'playing' }));
    act(() => frames.shift()?.());
    // 75 % into a staccato quarter: silent, but still the written note.
    expect(store.getState().playback.playingNoteId).toBe('a');
    sync.dispose();
  });
});
