'use client';

import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { useTemplates } from '@/lib/hooks/useTemplates';
import { useToggleFavorite } from '@/lib/hooks/useMutations';
import { useProfile } from '@/lib/hooks/useProfile';
import { TemplateCard } from '@/components/ui/TemplateCard';
import { ErrorState } from '@/components/ui/ErrorState';

/**
 * Favourite templates on the profile page.
 *
 * Previously rendered its own bespoke card — three-column stat blocks, a
 * different header, a "View Details" link instead of a start action — so the
 * same template looked completely different here and on /templates. It now uses
 * the shared TemplateCard in compact mode (no schedule/delete, which belong on
 * the templates page).
 */
export default function FavoriteWorkouts() {
  const { profile } = useProfile();
  const { data: allTemplates, isLoading, error, refetch } = useTemplates();
  const toggleFavoriteMutation = useToggleFavorite();

  const templates = allTemplates?.filter((template) => template.favorite) ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return <ErrorState what="your favourite templates" onRetry={() => void refetch()} />;
  }

  if (templates.length === 0) {
    return (
      <div className="forge-card p-8 text-center">
        <StarIconSolid className="mx-auto mb-4 h-14 w-14 text-surface-600" />
        <p className="mb-2 text-surface-500 dark:text-surface-600">
          No favourite templates yet
        </p>
        <p className="text-sm text-surface-600 dark:text-surface-500">
          Tap the star on any template to pin it here for quick access
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((template, index) => (
        <TemplateCard
          key={template.id}
          template={template}
          index={index}
          compact
          useMetric={profile?.useMetric ?? false}
          onToggleFavorite={(id) => toggleFavoriteMutation.mutate(id)}
        />
      ))}
    </div>
  );
}
