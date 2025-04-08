'use client'

import { useRouter } from 'next/navigation'
import { 
  StarIcon, 
  PlusCircleIcon,
  ArrowRightIcon,
  QuestionMarkCircleIcon,
  PlayCircleIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

import { motion } from 'framer-motion'
import { Set as WorkoutSet, Exercise, WorkoutTemplate } from '@/types/workout'
import { useTemplates } from '@/lib/hooks/useTemplates';
import { useToggleFavorite } from '@/lib/hooks/useMutations';
import { useProfile } from '@/lib/hooks/useProfile';
import { formatVolume } from '@/utils/formatters';

export default function TemplatesPage() {
  const router = useRouter()
  const { templates, isLoading, error, refetch } = useTemplates();
  const toggleFavoriteMutation = useToggleFavorite();
  const { profile } = useProfile();
  // Filter templates
  const favoriteTemplates = templates?.filter(t => t.favorite) || [];
  // Since we don't have scheduledDate anymore, just show all non-favorites
  const unscheduledTemplates = templates?.filter(t => !t.favorite) || [];
  
  // Helper function to count unique exercises in a template
  const countUniqueExercises = (template: WorkoutTemplate) => {
    const uniqueExerciseNames = new Set();
    if (template.sets) {
      template.sets.forEach((set: WorkoutSet) => {
        if (set.exercises) {
          set.exercises.forEach((exercise: Exercise) => {
            uniqueExerciseNames.add(exercise.name);
          });
        }
      });
    }
    return uniqueExerciseNames.size;
  };
  
  const handleToggleFavorite = (templateId: string) => {
    console.log(`TemplatesPage: Toggling favorite for ${templateId}`);
    toggleFavoriteMutation.mutate(templateId);
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen app-bg py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/3"></div>
            <div className="space-y-4">
              <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
              <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="min-h-screen app-bg py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl">
            <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Error</h2>
            <p className="text-red-500 dark:text-red-300">{String(error)}</p>
            <button 
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen app-bg py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            My Workout Templates
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/session/start')}
              className="btn btn-quaternary flex items-center gap-2"
            >
              <PlayCircleIcon className="w-5 h-5" />
              Start Session
            </button>
            <button
              onClick={() => router.push('/template/create')}
              className="btn btn-primary flex items-center gap-2"
            >
              <PlusCircleIcon className="w-5 h-5" />
              Create Template
            </button>
          </div>
        </div>
        
        {/* Favorites Section */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <StarIconSolid className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              Favorite Templates
            </h2>
          </div>
          
          {favoriteTemplates.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center">
              <p className="text-secondary">{"Mark a template as favorite to see it here."}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {favoriteTemplates.map(template => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden"
                >
                  <div className="p-5">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                        {template.name}
                      </h3>
                      <button
                        onClick={() => handleToggleFavorite(template.id)}
                        className="text-amber-400 hover:text-amber-500"
                      >
                        <StarIconSolid className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="text-sm text-secondary mt-1 flex flex-wrap gap-2">
                      <span>{countUniqueExercises(template)} exercises</span>
                      <span>•</span>
                      <span>{template.sets?.length || 0} sets</span>
                      {template.totalVolume > 0 && (
                        <>
                          <span>•</span>
                          <span>{formatVolume(template.totalVolume)} {profile?.useMetric ? 'kg' : 'lbs'}</span>
                        </>
                      )}
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                      <button
                        onClick={() => router.push(`/template/${template.id}`)}
                        className="text-primary text-sm font-medium flex items-center gap-1 hover:underline"
                      >
                        View Template
                        <ArrowRightIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
        
        {/* Other Templates Section */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <QuestionMarkCircleIcon className="w-5 h-5 text-purple-500" />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              Other Templates
            </h2>
          </div>
          
          {unscheduledTemplates.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center">
              <p className="text-secondary">{"You haven't created any non-favorite templates yet."}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {unscheduledTemplates.map(template => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden"
                >
                  <div className="p-4 flex justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-purple-100 dark:bg-purple-900/30 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
                        <QuestionMarkCircleIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800 dark:text-white text-sm">
                          {template.name}
                        </h3>
                        <div className="flex flex-wrap gap-1 text-xs text-secondary mt-1">
                          <span>{countUniqueExercises(template)} exercises</span>
                          <span>•</span>
                          <span>{template.sets?.length || 0} sets</span>
                          {template.totalVolume > 0 && (
                            <>
                              <span>•</span>
                              <span>{formatVolume(template.totalVolume)} {profile?.useMetric ? 'kg' : 'lbs'}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleFavorite(template.id)}
                        className={`text-gray-400 hover:text-amber-400 ${template.favorite ? 'text-amber-400' : ''}`}
                      >
                        {template.favorite ? (
                          <StarIconSolid className="w-4 h-4" />
                        ) : (
                          <StarIcon className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => router.push(`/template/${template.id}`)}
                        className="p-1 text-primary hover:bg-primary/10 rounded-full transition-colors"
                      >
                        <ArrowRightIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
} 