'use client';

/**
 * Section title for long forms.
 *
 * The profile editor and the profile setup form were each a stack of identical
 * grey uppercase labels on identical grey panels, which is why they read as a
 * wall of fields rather than as a few things you might want to change. The icon
 * gives each section a shape to aim for when scanning; the subtitle answers
 * "what does this affect?" inline instead of leaving it to be guessed.
 */
export function SectionHeading({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      {/* Neutral, not an accent tile: the accent is kept for things you can
          press and for progress, and five orange squares down one form made
          the section icons the loudest thing on the page. */}
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] dark:bg-white/[0.06]">
        <Icon className="h-5 w-5 text-surface-400 dark:text-surface-800" />
      </span>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-surface-50 dark:text-white">
          {title}
        </h2>
        {children && (
          <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-600">{children}</p>
        )}
      </div>
    </div>
  );
}
