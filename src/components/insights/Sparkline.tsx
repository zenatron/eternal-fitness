/**
 * A trend line with no axes, sized for a list row.
 *
 * Values are plotted on a real time axis (x = position in `values`, gaps kept
 * as nulls and bridged), scaled to their own min and max with a little
 * headroom so a flat line sits in the middle instead of on the floor. The last
 * point gets a dot: in a row the question is "where am I now", and the dot
 * answers it before the line is read.
 */
export function Sparkline({
  values,
  width = 88,
  height = 28,
  baseline,
  className = '',
  label,
}: {
  values: (number | null)[];
  width?: number;
  height?: number;
  /** Drawn as a faint rule — e.g. the starting level an index is measured from. */
  baseline?: number;
  className?: string;
  /** Accessible summary; the line itself is decorative to a screen reader. */
  label?: string;
}) {
  const pts = values
    .map((v, i) => (v === null || !Number.isFinite(v) ? null : { i, v }))
    .filter((p): p is { i: number; v: number } => p !== null);

  if (pts.length === 0) {
    return <span className={`inline-block ${className}`} style={{ width, height }} aria-hidden="true" />;
  }

  const all = baseline !== undefined ? [...pts.map((p) => p.v), baseline] : pts.map((p) => p.v);
  let min = Math.min(...all);
  let max = Math.max(...all);
  if (max - min < 1e-9) {
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * 0.15;
  min -= pad;
  max += pad;

  const inset = 3;
  const span = Math.max(1, values.length - 1);
  const x = (i: number) => inset + (i / span) * (width - inset * 2);
  const y = (v: number) => inset + (1 - (v - min) / (max - min)) * (height - inset * 2);

  const d = pts.map((p, k) => `${k === 0 ? 'M' : 'L'}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`shrink-0 overflow-visible ${className}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {baseline !== undefined && (
        <line
          x1={inset}
          x2={width - inset}
          y1={y(baseline)}
          y2={y(baseline)}
          className="stroke-black/10 dark:stroke-white/10"
          strokeDasharray="2 3"
        />
      )}
      {pts.length > 1 && (
        <path d={d} fill="none" className="stroke-accent-500" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      )}
      <circle cx={x(last.i)} cy={y(last.v)} r={2.5} className="fill-accent-500" />
    </svg>
  );
}
