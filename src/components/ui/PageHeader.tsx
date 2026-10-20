'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import type { ReactNode } from 'react';

/**
 * The top of a page: an optional back control, a title, one line of context,
 * and the page's own actions.
 *
 * Replaces the animated accent-gradient banners every page used to open with.
 * Those put the same orange slab, white uppercase headline and white button at
 * the top of fifteen screens, so nothing about a page's header told you which
 * page you were on — and the strongest colour in the app went to decoration
 * instead of to the one action that mattered.
 */
export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  back,
}: {
  title: ReactNode;
  /** Small line above the title — a date, a parent section. */
  eyebrow?: ReactNode;
  description?: ReactNode;
  /** Buttons for this page, right-aligned on wide screens, below on phones. */
  actions?: ReactNode;
  /** `true` goes back in history; a string links to that path. */
  back?: boolean | string;
}) {
  const router = useRouter();

  return (
    <header className="pb-5 pt-5 sm:pt-8">
      {back && (
        <button
          type="button"
          onClick={() => (typeof back === 'string' ? router.push(back) : router.back())}
          className="tap-control -ml-2 mb-2 inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2 text-sm text-surface-500 transition-colors hover:text-surface-50 dark:text-surface-600 dark:hover:text-white"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </button>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1 text-sm text-surface-500 dark:text-surface-600" suppressHydrationWarning>
              {eyebrow}
            </p>
          )}
          <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight text-surface-50 dark:text-white sm:text-[32px]">
            {title}
          </h1>
          {description && (
            <p className="mt-1 max-w-prose text-sm text-surface-500 dark:text-surface-600">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
