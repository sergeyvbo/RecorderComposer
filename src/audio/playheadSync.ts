import { endTick, noteAt } from '@/domain/schedule';
import type { AppStore } from '@/state/store';
import { stopAtEnd } from './controller';
import type { Player } from './player';

export interface FrameScheduler {
  requestFrame: (cb: () => void) => number;
  cancelFrame: (id: number) => void;
}

export const browserFrames: FrameScheduler = {
  requestFrame: (cb) =>
    typeof requestAnimationFrame === 'function' ? requestAnimationFrame(cb) : (setTimeout(cb, 16) as unknown as number),
  cancelFrame: (id) => (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame(id) : clearTimeout(id)),
};

/**
 * Each animation frame, writes the audible position and the sounding note into the shared
 * playback slice (Principle I). While playing, committed melody changes (edits, tempo) are
 * rescheduled from the current position (spec edge case "editing during playback").
 */
export function createPlayheadSync(store: AppStore, player: Player, frames: FrameScheduler = browserFrames) {
  let frameId: number | null = null;

  const frame = () => {
    frameId = null;
    const { melody, playback, actions } = store.getState();
    if (playback.status !== 'playing') return;
    const pos = player.positionTicks();
    if (pos >= endTick(melody)) {
      stopAtEnd(store, player);
      return;
    }
    const playingNoteId = noteAt(melody, pos);
    actions.setPlayback({ positionTicks: pos, playingNoteId });
    frameId = frames.requestFrame(frame);
  };

  const start = () => {
    if (frameId === null) frameId = frames.requestFrame(frame);
  };
  const stop = () => {
    if (frameId !== null) frames.cancelFrame(frameId);
    frameId = null;
  };

  const unsubscribe = store.subscribe((s, prev) => {
    if (s.playback.status === 'playing' && s.melody !== prev.melody) player.reschedule(s.melody);
    if (s.playback.status !== prev.playback.status) {
      if (s.playback.status === 'playing') start();
      else stop();
    }
  });

  return {
    start,
    stop,
    dispose: () => {
      stop();
      unsubscribe();
    },
  };
}
