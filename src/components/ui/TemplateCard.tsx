'use client';

import Link from 'next/link';
import { CalendarDaysIcon, StarIcon, TrashIcon } from '@heroicons/react/24/outline';
import { PlayIcon, StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import type { WorkoutTemplate } from '@/types/workout';
import { TemplateSummary } from '@/components/ui/TemplateSummary';

/**
 * The single template card used everywhere (templates list, profile).
 *
 * Start is the one primary action. It used to be a full-width orange slab with
 * a full-width "Details" bar, a tinted "Schedule" pill and a red trash tile
 * beneath it — four buttons of comparable weight on every card, so a list of
 * five routines was twenty competing buttons. Secondary actions are now quiet
 * icon buttons, and the card body itself opens the details.
 */

interface TemplateCardProps {
  template: WorkoutTemplate;
  useMetric?: boolean;
  onToggleFavorite?: (templateId: string) => void;
  onSchedule?: (templateId: string, templateName: string) => void;
  onDelete?: (templateId: string, templateName: string) => void;
  /** Hides Schedule/Delete where those actions don't belong (e.g. /profile). */
  compact?: boolean;
  /** Kept for call-site compatibility; cards no longer stagger in. */
  index?: number;
}

const quietIcon =
  'touch-target tap-control flex items-center justify-center rounded-lg text-surface-500 transition-colors hover:bg-black/[0.05] hover:text-surface-50 dark:text-surface-600 dark:hover:bg-white/[0.06] dark:hover:text-white';

export function TemplateCard({
  template,
  useMetric = false,
  onToggleFavorite,
  onSchedule,
  onDelete,
  compact = false,
}: TemplateCardProps) {
  return (
    <div className="forge-card flex flex-col p-4">
      <Link
        href={`/template/${template.id}`}
        className="-m-1 block rounded-lg p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
        aria-label={`${template.name} details`}
      >
        <TemplateSummary template={template} useMetric={useMetric} />
      </Link>

      <div className="mt-3 flex items-center gap-1 pt-1">
        <Link
          href={`/session/active/${template.id}`}
          className="btn btn-primary tap-control mr-auto min-h-[40px] px-4"
        >
          <PlayIcon className="h-4 w-4" />
          Start
        </Link>

        {onToggleFavorite && (
          <button
            onClick={() => onToggleFavorite(template.id)}
            aria-pressed={template.favorite}
            aria-label={template.favorite ? `Remove ${template.name} from favorites` : `Add ${template.name} to favorites`}
            title={template.favorite ? 'Unfavorite' : 'Favorite'}
            className={quietIcon}
          >
            {template.favorite ? (
              <StarIconSolid className="h-5 w-5 text-award-500" />
            ) : (
              <StarIcon className="h-5 w-5" />
            )}
          </button>
        )}
        {!compact && onSchedule && (
          <button
            onClick={() => onSchedule(template.id, template.name)}
            aria-label={`Schedule ${template.name}`}
            title="Schedule"
            className={quietIcon}
          >
            <CalendarDaysIcon className="h-5 w-5" />
          </button>
        )}
        {!compact && onDelete && (
          <button
            onClick={() => onDelete(template.id, template.name)}
            aria-label={`Delete ${template.name}`}
            title="Delete"
            className={`${quietIcon} hover:!text-danger-500`}
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
