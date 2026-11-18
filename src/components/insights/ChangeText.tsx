/**
 * A signed percentage change, coloured by direction.
 *
 * Shared by the Progress figures and the strength views, which each had their
 * own way of writing "+12%": one rounded, one did not, one used a hyphen for
 * minus. A true minus sign, whole percents, and nothing at all for zero.
 */
export function ChangeText({
  percent,
  className = '',
  flatBand = 0,
}: {
  /** Change in percent (12 = +12%). */
  percent: number | null | undefined;
  className?: string;
  /** Changes inside ±this read as neutral rather than up or down. */
  flatBand?: number;
}) {
  if (percent === null || percent === undefined || !Number.isFinite(percent)) return null;
  const rounded = Math.round(percent);
  if (rounded === 0) {
    return <span className={`text-xs font-medium text-surface-500 dark:text-surface-600 tabular ${className}`}>0%</span>;
  }
  const flat = Math.abs(percent) < flatBand;
  const tone = flat
    ? 'text-surface-500 dark:text-surface-600'
    : rounded > 0
      ? 'text-success-600 dark:text-success-400'
      : 'text-danger-600 dark:text-danger-400';
  return (
    <span className={`text-xs font-medium tabular ${tone} ${className}`}>
      {rounded > 0 ? '+' : '−'}
      {Math.abs(rounded)}%
    </span>
  );
}
