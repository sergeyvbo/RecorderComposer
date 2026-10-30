export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export function BoxSelect({ box }: { box: Box | null }) {
  if (!box) return null;
  return (
    <rect
      x={Math.min(box.x0, box.x1)}
      y={Math.min(box.y0, box.y1)}
      width={Math.abs(box.x1 - box.x0)}
      height={Math.abs(box.y1 - box.y0)}
      fill="var(--select)"
      fillOpacity={0.12}
      stroke="var(--select)"
      strokeDasharray="4 3"
      pointerEvents="none"
    />
  );
}
