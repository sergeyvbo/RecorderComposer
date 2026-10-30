/**
 * One fixed color per pitch class (index 0 = C … 11 = B), FR-008. Mid-saturation hues that read on
 * light and dark backgrounds; adjacent semitones differ in hue and lightness. Note rectangles also
 * carry a text label when wide enough, so color is never the only cue.
 */
export const PITCH_CLASS_COLORS: readonly string[] = [
  '#e5484d', // C
  '#a8323a', // C♯
  '#f76b15', // D
  '#b5520f', // D♯
  '#e2b007', // E
  '#46a758', // F
  '#2b7a3b', // F♯
  '#12a594', // G
  '#0b6e66', // G♯
  '#3e63dd', // A
  '#2a3f99', // A♯
  '#8e4ec6', // B
];

export const pitchColor = (pitch: number): string =>
  PITCH_CLASS_COLORS[((pitch % 12) + 12) % 12] as string;

/** Black or white label text, whichever contrasts better with the pitch color (WCAG luminance). */
export function labelColor(background: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(background.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return (lum + 0.05) / 0.05 > 1.05 / (lum + 0.05) ? '#111111' : '#ffffff';
}
