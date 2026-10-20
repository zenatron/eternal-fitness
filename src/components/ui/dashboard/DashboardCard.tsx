import Link from 'next/link';
import { ChevronRightIcon } from '@heroicons/react/20/solid';
import { ReactNode } from 'react';

interface DashboardCardProps {
  title: string;
  /** A "see more" link (or button) in the header, where the tile summarises something fuller. */
  action?: { href: string; label: string } | { onClick: () => void; label: string };
  children: ReactNode;
  className?: string;
}

const actionClass =
  '-mr-1 inline-flex min-h-[32px] items-center rounded px-1 text-xs font-medium text-accent-600 hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300';

/**
 * One dashboard tile. A quiet sentence-case title and the content — no
 * decorative header icon and no divider band; the tiles read as a set because
 * they share this, not because each wears its own glyph.
 */
export function DashboardCard({ title, action, children, className = '' }: DashboardCardProps) {
  return (
    <section className={`forge-card flex flex-col p-4 sm:p-5 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="section-title">{title}</h2>
        {action &&
          ('href' in action ? (
            <Link href={action.href} className={actionClass}>
              {action.label}
              <ChevronRightIcon className="h-4 w-4" />
            </Link>
          ) : (
            <button type="button" onClick={action.onClick} className={actionClass}>
              {action.label}
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          ))}
      </div>
      <div className="flex-1">{children}</div>
    </section>
  );
}
