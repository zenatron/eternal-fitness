import type { ComponentType, ReactNode } from 'react';

/**
 * "Nothing here yet", said the same way on every screen.
 *
 * Each page used to roll its own: a 64px grey trophy over an Oswald headline on
 * one, plain centred text on another, an icon in a tinted square on a third.
 * One shape now — an optional small icon, a sentence, a hint, and at most one
 * thing to do about it.
 */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
  className = '',
}: {
  icon?: ComponentType<{ className?: string }>;
  title: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`forge-card px-6 py-10 text-center ${className}`}>
      {Icon && <Icon className="mx-auto mb-3 h-6 w-6 text-surface-600 dark:text-surface-500" />}
      <p className="text-sm font-semibold text-surface-50 dark:text-white">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-xs text-sm text-surface-500 dark:text-surface-600">{hint}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
