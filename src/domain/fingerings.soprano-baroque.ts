/**
 * Soprano recorder, baroque (English) fingering — one entry per sounding pitch 72 (C5) … 98 (D7).
 *
 * SOURCE (the only allowed reference, research.md R9):
 *   Yamaha, "Musical instrument guide — Soprano recorder (Baroque) fingering chart"
 *   https://www.yamaha.com/en/musical_instrument_guide/common/images/recorder/fingering_baroque.pdf
 *
 * VERIFICATION: every standard fingering and every alternate below was checked against that chart
 *   (T045, 2026-10-29). Alternates are exactly the three the chart marks "Alternate fingering"
 *   (B5, C♯6, B6); the chart gives them no further label, hence `fingering.alt.alternative`.
 *
 * Notation in this file: T = thumb hole, 1–3 left hand, 4–7 right hand (6 and 7 are double holes).
 *   '●' closed, '○' open, '◐' half (thumb: pinched — "¼" on the chart; double hole: only the larger
 *   of the pair covered).
 */
import type { Fingering, FingeringEntry, HoleState, LabeledFingering } from './fingering';

const st = (c: string): HoleState => (c === '●' ? 'closed' : c === '◐' ? 'half' : 'open');
const dbl = (c: string) =>
  c === '●' ? { left: 'closed' as const, right: 'closed' as const }
  : c === '◐' ? { left: 'closed' as const, right: 'open' as const }
  : { left: 'open' as const, right: 'open' as const };

/** `T 1 2 3 4 5 6 7` as an 8-character string, e.g. '●●●●●●●●'. */
function parse(pitch: number, code: string): Fingering {
  const c = [...code];
  if (c.length !== 8) throw new Error(`bad fingering code for ${pitch}`);
  const [t, h1, h2, h3, h4, h5, h6, h7] = c as [string, string, string, string, string, string, string, string];
  return { thumb: st(t), holes: [st(h1), st(h2), st(h3), st(h4), st(h5), dbl(h6), dbl(h7)] };
}

function f(pitch: number, code: string, ...alternates: string[]): FingeringEntry {
  return {
    pitch,
    standard: parse(pitch, code),
    alternates: alternates.map(
      (a): LabeledFingering => ({ fingering: parse(pitch, a), labelKey: 'fingering.alt.alternative' }),
    ),
  };
}

export const SOPRANO_BAROQUE: readonly FingeringEntry[] = [
  //       T1234567
  f(72, '●●●●●●●●'), // C5
  f(73, '●●●●●●●◐'), // C♯5 / D♭5
  f(74, '●●●●●●●○'), // D5
  f(75, '●●●●●●◐○'), // D♯5 / E♭5
  f(76, '●●●●●●○○'), // E5
  f(77, '●●●●●○●●'), // F5
  f(78, '●●●●○●●○'), // F♯5 / G♭5
  f(79, '●●●●○○○○'), // G5
  f(80, '●●●○●●◐○'), // G♯5 / A♭5
  f(81, '●●●○○○○○'), // A5
  f(82, '●●○●●○○○'), // A♯5 / B♭5
  f(83, '●●○○○○○○', '●○●●○○○○'), // B5
  f(84, '●○●○○○○○'), // C6
  f(85, '○●●○○○○○', '●○○○○○○○'), // C♯6 / D♭6
  f(86, '○○●○○○○○'), // D6
  f(87, '○○●●●●●○'), // D♯6 / E♭6
  f(88, '◐●●●●●○○'), // E6
  f(89, '◐●●●●○●○'), // F6
  f(90, '◐●●●○●○○'), // F♯6 / G♭6
  f(91, '◐●●●○○○○'), // G6
  f(92, '◐●●○●○○○'), // G♯6 / A♭6
  f(93, '◐●●○○○○○'), // A6
  f(94, '◐●●○●●●○'), // A♯6 / B♭6
  f(95, '◐●●○●●○○', '◐●○○○●●◐'), // B6
  f(96, '◐●○○●●○○'), // C7
  f(97, '◐●○●●●○◐'), // C♯7 / D♭7
  f(98, '◐●○●●○●○'), // D7
];
