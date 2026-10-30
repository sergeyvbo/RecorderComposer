import { secondsToTicks } from '@/domain/schedule';

/**
 * Tick that is audible now. The transport clock runs ahead of the speakers by the scheduling
 * look-ahead plus the output latency, so both are subtracted (research.md R5, SC-003).
 */
export function audiblePositionTicks(args: {
  transportSeconds: number;
  lookAhead: number;
  outputLatency: number;
  originTick: number;
  bpm: number;
}): number {
  const audible = Math.max(0, args.transportSeconds - args.lookAhead - args.outputLatency);
  return args.originTick + secondsToTicks(audible, args.bpm);
}
