import { motion } from 'framer-motion';
import {
  ArrowRightIcon,
  StarIcon,
  CalendarDaysIcon,
  TrashIcon,
  PlayCircleIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { useRouter } from 'next/navigation';
import { WorkoutTemplate } from '@/types/workout';
import { formatVolume } from '@/utils/formatters';
import { countUniqueExercises, getTotalSetsCount } from '@/utils/workoutDisplayUtils';

interface TemplateCardProps {
  template: WorkoutTemplate;
  index?: number;
  useMetric?: boolean;
  showFavoriteButton?: boolean;
  onToggleFavorite?: (templateId: string) => void;
  showScheduleButton?: boolean;
  onSchedule?: (templateId: string, templateName: string) => void;
  showDeleteButton?: boolean;
  onDelete?: (templateId: string, templateName: string) => void;
  compact?: boolean;
  variant?: 'default' | 'favorite' | 'all' | 'templates';
}

export function TemplateCard({
  template,
  index = 0,
  useMetric = false,
  showFavoriteButton = true,
  onToggleFavorite,
  showScheduleButton = false,
  onSchedule,
  showDeleteButton = false,
  onDelete,
  compact = false,
  variant = 'default'
}: TemplateCardProps) {
  const router = useRouter();

  const getBorderColor = () => {
    switch (variant) {
      case 'favorite':
        return 'from-amber-500 to-orange-500';
      case 'all':
        return 'from-blue-500 to-slate-500';
      case 'templates':
        return 'from-blue-500 to-slate-500';
      default:
        return 'from-blue-500 to-blue-600';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105 ${compact ? 'max-w-sm' : ''}`}
    >
      <div className={`h-2 bg-gradient-to-r ${getBorderColor()}`}></div>
      <div className={compact ? "p-4" : "p-6"}>
        <div className="flex justify-between items-start mb-3">
          <h3 className={`font-bold text-gray-900 dark:text-white ${compact ? 'text-base' : 'text-lg'}`}>
            {template.name}
          </h3>
          {showFavoriteButton && onToggleFavorite && (
            <button
              onClick={() => onToggleFavorite(template.id)}
              className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
            >
              {template.favorite ? (
                <StarIconSolid className="w-5 h-5" />
              ) : (
                <StarIcon className="w-5 h-5" />
              )}
            </button>
          )}
        </div>

        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-1">
          {template.workoutData?.metadata?.description || 'No description'}
        </p>

        <div className={`grid ${compact ? 'grid-cols-3 gap-3 mb-3' : 'grid-cols-3 gap-4 mb-4'}`}>
          <div className="text-center">
            <p className={`font-bold text-blue-600 dark:text-blue-400 ${compact ? 'text-xl' : 'text-2xl'}`}>
              {countUniqueExercises(template)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Exercises</p>
          </div>
          <div className="text-center">
            <p className={`font-bold text-green-600 dark:text-green-400 ${compact ? 'text-xl' : 'text-2xl'}`}>
              {getTotalSetsCount(template)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Sets</p>
          </div>
          <div className="text-center">
            <p className={`font-bold text-purple-600 dark:text-purple-400 ${compact ? 'text-xl' : 'text-2xl'}`}>
              {template.totalVolume && template.totalVolume > 0
                ? formatVolume(template.totalVolume, useMetric)
                : '-'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Volume</p>
          </div>
        </div>

        {(variant === 'templates' || variant === 'all' || variant === 'favorite') ? (
          <div className={`flex gap-2 ${compact ? '' : 'mt-2'} flex-wrap`}>
            <button
              onClick={() => router.push(`/template/${template.id}`)}
              className="flex-1 btn btn-secondary text-sm"
            >
              View Details
            </button>
            {showScheduleButton && onSchedule && (
              <button
                onClick={() => onSchedule(template.id, template.name)}
                className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm flex items-center gap-1"
              >
                <CalendarDaysIcon className="w-4 h-4" />
                Schedule
              </button>
            )}
            {showDeleteButton && onDelete && (
              <button
                onClick={() => onDelete(template.id, template.name)}
                className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm flex items-center gap-1"
              >
                <TrashIcon className="w-4 h-4" />
                Delete
              </button>
            )}
            <button
              onClick={() => router.push(`/session/active/${template.id}`)}
              className="flex-1 btn btn-primary text-sm flex items-center justify-center gap-1"
            >
              <PlayCircleIcon className="w-4 h-4" />
              Start
            </button>
          </div>
        ) : (
          <div className={`flex items-center justify-between gap-2 ${compact ? '' : 'mt-2'}`}>
            <button
              onClick={() => router.push(`/template/${template.id}`)}
              className={`btn btn-secondary flex items-center gap-2 ${compact ? 'px-3 py-2 text-sm' : 'px-4 py-2 text-sm'}`}
            >
              View Details
              <ArrowRightIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => router.push(`/session/active/${template.id}`)}
              className={`btn btn-primary flex items-center justify-center gap-2 ${compact ? 'px-3 py-2 text-sm' : 'px-4 py-2 text-sm'}`}
            >
              Start Now
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
