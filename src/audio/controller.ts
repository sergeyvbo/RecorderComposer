import { endTick, noteAt } from '@/domain/schedule';
import type { AppStore } from '@/state/store';
import type { Player } from './player';

export interface PlaybackController {
  play: () => Promise<void>;
  pause: () => void;
  toggle: () => void;
  seek: (tick: number) => void;
  toStart: () => void;
  /** Melody reached its end: stop and reset to the start (data-model.md playback states). */
  ended: () => void;
}

export function stopAtEnd(store: AppStore, player: Player) {
  player.pause();
  store.getState().actions.setPlayback({ status: 'stopped', positionTicks: 0, playingNoteId: null });
}

export function createPlaybackController(store: AppStore, player: Player): PlaybackController {
  const set = (patch: Parameters<ReturnType<AppStore['getState']>['actions']['setPlayback']>[0]) =>
    store.getState().actions.setPlayback(patch);

  const play = async () => {
    const { melody, playback } = store.getState();
    if (melody.notes.length === 0) return;
    const from = playback.positionTicks >= endTick(melody) ? 0 : playback.positionTicks;
    set({ status: 'playing', positionTicks: from, error: null });
    try {
      await player.play(melody, from);
    } catch {
      set({ status: 'stopped', error: 'unavailable' });
    }
  };

  const pause = () => {
    if (store.getState().playback.status !== 'playing') return;
    const pos = player.pause();
    set({ status: 'paused', positionTicks: pos });
  };

  const seek = (tick: number) => {
    const { melody, playback } = store.getState();
    const t = Math.max(0, tick);
    set({ positionTicks: t, playingNoteId: noteAt(melody, t) });
    if (playback.status === 'playing') void player.play(melody, t);
  };

  return {
    play,
    pause,
    toggle: () => (store.getState().playback.status === 'playing' ? pause() : void play()),
    seek,
    toStart: () => seek(0),
    ended: () => stopAtEnd(store, player),
  };
}
