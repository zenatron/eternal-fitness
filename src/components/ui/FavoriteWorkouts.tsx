import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { useTemplates } from '@/lib/hooks/useTemplates';
import { useToggleFavorite } from '@/lib/hooks/useMutations';
import { useProfile } from '@/lib/hooks/useProfile';
import { TemplateCard } from './TemplateCard';

export default function FavoriteWorkouts() {
  const { profile } = useProfile();
  const { data: allTemplates, isLoading, error } = useTemplates();
  const toggleFavoriteMutation = useToggleFavorite();

  const templates = allTemplates?.filter((template) => template.favorite) ?? [];

  const handleToggleFavorite = (templateId: string) => {
    toggleFavoriteMutation.mutate(templateId);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded-lg">
        Error loading favorite workouts: {error.message}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
        <StarIconSolid className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400 mb-2">
          No favorite templates yet
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Mark templates as favorites to see them here for quick access
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {templates.map((template, index) => (
        <TemplateCard
          key={template.id}
          template={template}
          index={index}
          useMetric={profile?.useMetric}
          showFavoriteButton={true}
          onToggleFavorite={handleToggleFavorite}
          variant="favorite"
        />
      ))}
    </div>
  );
}
