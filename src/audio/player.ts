import type * as ToneNS from 'tone';
import { pitchToHz, toSchedule } from '@/domain/schedule';
import type { Melody } from '@/domain/types';
import { audiblePositionTicks } from './clock';

/** Audio adapter used by the playback controller; mocked in tests. */
export interface Player {
  /** Start playing `m` from `fromTick`. Rejects when audio cannot start. */
  play: (m: Melody, fromTick: number) => Promise<void>;
  /** Stop sound; returns the audible position in ticks. */
  pause: () => number;
  /** Replace the scheduled notes (edit or tempo change while playing), keeping the position. */
  reschedule: (m: Melody) => void;
  /** Audible position in ticks while playing. */
  positionTicks: () => number;
}

type Tone = typeof ToneNS;

interface Voice {
  synth: ToneNS.Synth;
  breath: ToneNS.NoiseSynth;
  dispose: () => void;
}

/** Soft, breathy, flute-like voice without a percussive attack (FR-015, R5). */
function createVoice(Tone: Tone): Voice {
  const out = new Tone.Gain(0.6).toDestination();
  const filter = new Tone.Filter({ type: 'lowpass', frequency: 3500, Q: 0.5 }).connect(out);
  const vibrato = new Tone.Vibrato({ frequency: 5, depth: 0.06 }).connect(filter);
  const synth = new Tone.Synth({
    oscillator: { type: 'fattriangle', count: 2, spread: 6 },
    envelope: { attack: 0.03, decay: 0.08, sustain: 0.85, release: 0.07 },
  }).connect(vibrato);
  const breathFilter = new Tone.Filter({ type: 'bandpass', frequency: 2500, Q: 1.2 }).connect(out);
  const breath = new Tone.NoiseSynth({
    noise: { type: 'pink' },
    envelope: { attack: 0.01, decay: 0.12, sustain: 0.05, release: 0.05 },
    volume: -24,
  }).connect(breathFilter);
  return {
    synth,
    breath,
    dispose: () => [synth, breath, vibrato, filter, breathFilter, out].forEach((n) => n.dispose()),
  };
}

export function createTonePlayer(): Player {
  let Tone: Tone | null = null;
  let voice: Voice | null = null;
  let originTick = 0;
  let bpm = 100;
  let playing = false;

  const transportSeconds = () => (Tone ? Tone.getTransport().seconds : 0);
  const outputLatency = () => {
    const raw = Tone?.getContext().rawContext as AudioContext | undefined;
    return (raw && 'outputLatency' in raw ? raw.outputLatency : 0) || 0;
  };
  const position = () =>
    playing && Tone
      ? audiblePositionTicks({
          transportSeconds: transportSeconds(),
          lookAhead: Tone.getContext().lookAhead,
          outputLatency: outputLatency(),
          originTick,
          bpm,
        })
      : originTick;

  const schedule = (m: Melody, fromTick: number) => {
    if (!Tone || !voice) return;
    const transport = Tone.getTransport();
    const v = voice;
    transport.stop();
    transport.cancel(0);
    v.synth.triggerRelease();
    originTick = fromTick;
    bpm = m.tempoBpm;
    for (const n of toSchedule(m, fromTick)) {
      // Leave a tiny gap between notes so repeated pitches re-articulate.
      const dur = Math.max(0.03, n.durationSec - 0.015);
      transport.schedule((time) => {
        v.synth.triggerAttackRelease(pitchToHz(n.pitch), dur, time);
        v.breath.triggerAttackRelease(0.08, time);
      }, n.startSec);
    }
    transport.start('+0.02', 0);
    playing = true;
  };

  return {
    play: async (m, fromTick) => {
      // Without Web Audio Tone.js starts a context that never advances: report it instead.
      if (!('AudioContext' in globalThis) && !('webkitAudioContext' in globalThis)) {
        throw new Error('Web Audio is not available');
      }
      if (!Tone) Tone = await import('tone');
      await Tone.start();
      if (Tone.getContext().state !== 'running') throw new Error('audio context not running');
      if (!voice) voice = createVoice(Tone);
      schedule(m, fromTick);
    },
    pause: () => {
      const pos = position();
      if (Tone) {
        const transport = Tone.getTransport();
        transport.stop();
        transport.cancel(0);
      }
      voice?.synth.triggerRelease();
      playing = false;
      originTick = pos;
      return pos;
    },
    reschedule: (m) => {
      if (playing) schedule(m, position());
    },
    positionTicks: position,
  };
}
