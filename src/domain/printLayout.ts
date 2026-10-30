import type { NotationBar, NotationModel } from './notation';

export interface PrintSystem {
  bars: NotationBar[];
  /** Only the first system repeats the time signature (clef + key appear on every system). */
  showTime: boolean;
  /** Width reserved at the start of the system for clef, key and (first) time signature. */
  preludeWidth: number;
  /** x of each event start tick within this system. */
  eventX: Map<number, number>;
  barStartX: number[];
  barEndX: number[];
  width: number;
}

export interface PrintLayoutOptions {
  /** Staff space in px. */
  sp?: number;
  /** Stretch all but the last system to the page width. */
  justify?: boolean;
}

export interface PrintLayout {
  systems: PrintSystem[];
  sp: number;
}

/** Clef + key (+ time) width in staff spaces; shared with the renderer. */
export const preludeSpaces = (fifths: number, withTime: boolean) =>
  2.7 + 0.6 + Math.abs(fifths) * 0.95 + (withTime ? 2.4 : 0.6);

/** Horizontal room for an event, growing logarithmically with its length (spacing by note value). */
export const eventSpaces = (ticks: number) => 1.6 + 1.15 * Math.log2(ticks / 60);
const BAR_PAD = 1.2;

/** Wrap whole bars into systems no wider than `pageWidth` (US5, research R4/R12). */
export function layoutPrintSystems(model: NotationModel, pageWidth: number, opts: PrintLayoutOptions = {}): PrintLayout {
  const sp = opts.sp ?? 7;
  const justify = opts.justify ?? true;
  const fifths = model.keySignature.fifths;
  const barWidth = (b: NotationBar) =>
    b.events[0]?.wholeBar ? 8 * sp : (BAR_PAD + b.events.reduce((w, e) => w + eventSpaces(e.durationTicks), 0)) * sp;

  // Greedy line breaking on whole bars.
  const groups: NotationBar[][] = [];
  let current: NotationBar[] = [];
  let used = 0;
  for (const bar of model.bars) {
    const prelude = preludeSpaces(fifths, groups.length === 0) * sp;
    const w = barWidth(bar);
    if (current.length > 0 && prelude + used + w > pageWidth) {
      groups.push(current);
      current = [];
      used = 0;
    }
    current.push(bar);
    used += w;
  }
  if (current.length) groups.push(current);

  const systems = groups.map((bars, i) => {
    const showTime = i === 0;
    const preludeWidth = preludeSpaces(fifths, showTime) * sp;
    const natural = bars.reduce((w, b) => w + barWidth(b), 0);
    const room = pageWidth - preludeWidth;
    const isLast = i === groups.length - 1;
    // Compress a too-wide system; stretch full systems when justifying.
    const scale = natural > room || (justify && !isLast) ? room / natural : 1;
    const eventX = new Map<number, number>();
    const barStartX: number[] = [];
    const barEndX: number[] = [];
    let x = preludeWidth;
    for (const b of bars) {
      barStartX.push(x);
      let ex = x + 0.6 * sp * scale;
      if (b.events[0]?.wholeBar) eventX.set(b.startTick, x + (barWidth(b) * scale) / 2);
      else
        for (const e of b.events) {
          eventX.set(e.startTick, ex);
          ex += eventSpaces(e.durationTicks) * sp * scale;
        }
      x += barWidth(b) * scale;
      barEndX.push(x);
    }
    return { bars, showTime, preludeWidth, eventX, barStartX, barEndX, width: x };
  });
  return { systems, sp };
}
