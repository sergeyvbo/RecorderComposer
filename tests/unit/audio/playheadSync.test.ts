import { describe, expect, it } from 'vitest';
import { audiblePositionTicks } from '@/audio/clock';
import type { Player } from '@/audio/player';
import { createPlayheadSync } from '@/audio/playheadSync';
import { ticksToSeconds } from '@/domain/schedule';
import { createEmptyMelody, PPQ, type Melody } from '@/domain/types';
import { defaultPreferences } from '@/state/prefs';
import { createAppStore } from '@/state/store';

const BPM = 60;
const LOOK_AHEAD = 0.1;
const OUTPUT_LATENCY = 0.04;

function melody(): Melody {
  const m = createEmptyMelody('2026-01-01T00:00:00.000Z', 'm');
  return {
    ...m,
    tempoBpm: BPM,
    notes: [0, 1, 2, 3].map((i) => ({ id: `n${i}`, pitch: 72 + i, start: i * PPQ, duration: PPQ })),
  };
}

/** Fake player driven by a fake "transport" clock that runs ahead of the audible output. */
function fakePlayer(audible: { now: number }): Player & { reschedules: Melody[] } {
  const reschedules: Melody[] = [];
  return {
    reschedules,
    play: async () => undefined,
    pause: () => 0,
    reschedule: (m) => void reschedules.push(m),
    positionTicks: () =>
      audiblePositionTicks({
        transportSeconds: audible.now + LOOK_AHEAD + OUTPUT_LATENCY,
        lookAhead: LOOK_AHEAD,
        outputLatency: OUTPUT_LATENCY,
        originTick: 0,
        bpm: BPM,
      }),
  };
}

function setup() {
  const store = createAppStore(defaultPreferences('en'), { now: () => 'now', newId: () => 'id' }, melody());
  const audible = { now: 0 };
  const player = fakePlayer(audible);
  let frame: (() => void) | null = null;
  const sync = createPlayheadSync(store, player, {
    requestFrame: (cb) => {
      frame = cb;
      return 1;
    },
    cancelFrame: () => {
      frame = null;
    },
  });
  store.getState().actions.setPlayback({ status: 'playing' });
  sync.start();
  const step = (sec: number) => {
    audible.now += sec;
    frame?.();
  };
  return { store, sync, player, step };
}

describe('playhead sync (SC-003)', () => {
  it('reports the audible position within 50 ms every frame', () => {
    const { store, step } = setup();
    for (let i = 0; i < 200; i++) {
      step(1 / 60);
      const reported = store.getState().playback.positionTicks;
      const reportedSec = ticksToSeconds(reported, BPM);
      expect(Math.abs(reportedSec - (i + 1) / 60)).toBeLessThan(0.05);
    }
  });

  it('switches playingNoteId within 50 ms of each note start', () => {
    const { store, step } = setup();
    const switches: { id: string | null; at: number }[] = [];
    let t = 0;
    let last: string | null = null;
    while (t < 3.9) {
      step(1 / 60);
      t += 1 / 60;
      const id = store.getState().playback.playingNoteId;
      if (id !== last) switches.push({ id, at: t });
      last = id;
    }
    expect(switches.map((s) => s.id)).toEqual(['n0', 'n1', 'n2', 'n3']);
    switches.forEach((s, i) => expect(Math.abs(s.at - i)).toBeLessThan(0.05));
  });

  it('stops at the end of the melody and resets the position', () => {
    const { store, step } = setup();
    for (let i = 0; i < 4.2 * 60; i++) step(1 / 60);
    expect(store.getState().playback).toMatchObject({ status: 'stopped', positionTicks: 0, playingNoteId: null });
  });

  it('reschedules when the melody changes while playing', () => {
    const { store, player } = setup();
    store.getState().actions.dispatch((m) => ({ ok: true, melody: { ...m, tempoBpm: 90 } }));
    expect(player.reschedules).toHaveLength(1);
    expect(player.reschedules[0]!.tempoBpm).toBe(90);
  });
});
