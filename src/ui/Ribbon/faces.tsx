import { GLYPH } from '../Sheet/glyphs';

/** Musical-symbol faces for the articulation commands (002), kept instead of generic icons. */
export function StaccatoFace() {
  return (
    <span className="artic-glyph" aria-hidden>
      {GLYPH.articStaccatoAbove}
    </span>
  );
}

export function TenutoFace() {
  return (
    <span className="artic-glyph" aria-hidden>
      {GLYPH.articTenutoAbove}
    </span>
  );
}

export function LegatoFace() {
  return (
    <svg width={20} height={12} viewBox="0 0 20 12" aria-hidden>
      <path d="M2,10 Q10,-1 18,10 Q10,2 2,10 Z" fill="currentColor" stroke="currentColor" strokeWidth={1} />
    </svg>
  );
}
