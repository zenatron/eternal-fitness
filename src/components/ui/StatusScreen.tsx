import type { ComponentType, ReactNode } from 'react';

/**
 * Full-page "you can't be here right now" screen: not found, crashed, offline.
 *
 * The three used to look like three different apps — a 96px orange "404" in a
 * card, a red gradient tile with a warning glyph, a tinted 80px square. Same
 * job, so the same layout: a small icon, the page title in the display face, a
 * line of explanation, the way out.
 */
export function StatusScreen({
  icon: Icon,
  tone = 'neutral',
  title,
  children,
  actions,
  footer,
}: {
  icon: ComponentType<{ className?: string }>;
  tone?: 'neutral' | 'danger';
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-page flex-col items-center justify-center px-6 py-16 text-center">
      <span
        className={`mb-6 flex h-12 w-12 items-center justify-center rounded-xl border ${
          tone === 'danger'
            ? 'border-danger-500/25 bg-danger-500/10 text-danger-500 dark:text-danger-400'
            : 'border-black/10 bg-black/[0.03] text-surface-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-surface-700'
        }`}
      >
        <Icon className="h-6 w-6" />
      </span>
      <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight text-surface-50 dark:text-white">
        {title}
      </h1>
      {children && (
        <div className="mt-2 max-w-sm space-y-2 text-sm text-surface-500 dark:text-surface-600">{children}</div>
      )}
      {actions && <div className="mt-8 flex w-full max-w-xs flex-col gap-3 sm:flex-row sm:justify-center">{actions}</div>}
      {footer && <div className="mt-8">{footer}</div>}
    </div>
  );
}
