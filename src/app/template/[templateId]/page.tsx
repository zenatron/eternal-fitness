'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeftIcon, 
  PencilIcon, 
  TrashIcon,
  StarIcon as StarOutline,
  ClockIcon,
  PlayCircleIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { toast } from 'react-hot-toast';

import { useTemplate } from '@/lib/hooks/useTemplate';
import { useProfile } from '@/lib/hooks/useProfile';
import { useToggleFavorite, useDeleteTemplate } from '@/lib/hooks/useMutations';
import { Set as WorkoutSet, WorkoutTemplate, Exercise } from '@/types/workout';
import { formatVolume } from '@/utils/formatters';
import { formatUTCDateToLocalDateFriendly } from '@/utils/dateUtils';

export default function TemplateDetailPage({ params }: { params: Promise<{ templateId: string }> }) {
  const { templateId } = use(params);
  const router = useRouter();
  
  const { template, isLoading: templateLoading, error: templateError } = useTemplate(templateId);
  const { profile, isLoading: profileLoading } = useProfile();
  const toggleFavoriteMutation = useToggleFavorite();
  const deleteTemplateMutation = useDeleteTemplate();
  
  const handleToggleFavorite = () => {
    if (!template) return;
    toggleFavoriteMutation.mutate(templateId);
  };

  const handleDeleteTemplate = async () => {
    if (!template) return;
    if (!confirm(`Are you sure you want to delete the template "${template.name}"? This cannot be undone.`)) return;
    try {
      await deleteTemplateMutation.mutateAsync(templateId);
      toast.success('Template deleted successfully!');
      router.push('/');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template.');
    }
  };

  const exerciseGroups = template?.sets?.reduce<Record<string, { muscles: string[], equipment: string[], sets: WorkoutSet[] }>>(
    (groups: Record<string, { muscles: string[], equipment: string[], sets: WorkoutSet[] }>, set: WorkoutSet) => {
      const exercise = set.exercises?.[0] as Exercise | undefined;
      if (!exercise) return groups;
      
      const name = exercise.name;
      
      if (!groups[name]) {
        groups[name] = {
          muscles: exercise.muscles || [],
          equipment: exercise.equipment || [],
          sets: []
        };
      }
      
      groups[name].sets.push(set);
      return groups;
    },
    {}
  ) || {};

  const isLoading = templateLoading || profileLoading;
  
  if (isLoading) {
    return (
      <div className="w-full h-full py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        </div>
      </div>
    );
  }

  if (templateError || !template) {
    return (
      <div className="w-full h-full py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="p-4 bg-red-100 text-red-700 rounded-lg">
            {templateError ? String(templateError) : 'Template not found'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full min-h-screen py-12 px-4 bg-gray-50 dark:bg-gray-900"
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={() => router.back()}
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex-1">
            Template Details
          </h1>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  {template.name}
                </h2>
                <div className="flex items-center gap-2 text-blue-100">
                  <ClockIcon className="h-5 w-5" />
                  <span>Created: {formatUTCDateToLocalDateFriendly(template.createdAt, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleToggleFavorite}
                  className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors"
                  aria-label={template.favorite ? "Remove from favorites" : "Add to favorites"}
                >
                  {template.favorite ? (
                    <StarSolid className="h-6 w-6 text-amber-400" />
                  ) : (
                    <StarOutline className="h-6 w-6 text-white" />
                  )}
                </button>
                <button 
                  onClick={() => router.push(`/template/edit/${templateId}`)}
                  className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors"
                  aria-label="Edit template"
                >
                  <PencilIcon className="h-6 w-6 text-white" />
                </button>
                <button 
                  onClick={handleDeleteTemplate}
                  className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors"
                  aria-label="Delete template"
                >
                  <TrashIcon className="h-6 w-6 text-white" />
                </button>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 mt-4 text-sm text-white">
              <div className="bg-white/20 rounded-lg px-3 py-1">
                {Object.keys(exerciseGroups).length} exercises
              </div>
              <div className="bg-white/20 rounded-lg px-3 py-1">
                {template.sets?.length || 0} sets
              </div>
              <div className="bg-white/20 rounded-lg px-3 py-1">
                {formatVolume(template.totalVolume)} {profile?.useMetric ? 'kg' : 'lbs'} typical volume
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Exercises in Template
            </h3>
            
            <div className="space-y-6">
              {Object.entries(exerciseGroups).map(([name, data]: [string, { muscles: string[], equipment: string[], sets: WorkoutSet[] }]) => (
                <div key={name} className="border dark:border-gray-700 rounded-xl overflow-hidden">
                  <div className="bg-gray-100 dark:bg-gray-700 p-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {name}
                    </h4>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span className="font-medium">Muscles:</span> {data.muscles.join(', ')}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium">Equipment:</span> {data.equipment.join(', ')}
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                          <th className="px-2 py-2 text-left">Set</th>
                          <th className="px-2 py-2 text-right">Reps</th>
                          <th className="px-2 py-2 text-right">Weight ({profile?.useMetric ? 'kg' : 'lbs'})</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.sets.map((set: WorkoutSet, index: number) => (
                          <tr key={set.id} className="border-b dark:border-gray-700 last:border-0">
                            <td className="px-2 py-3 text-left font-medium text-gray-900 dark:text-white">
                              Set {index + 1}
                            </td>
                            <td className="px-2 py-3 text-right text-gray-900 dark:text-white">
                              {set.reps}
                            </td>
                            <td className="px-2 py-3 text-right text-gray-900 dark:text-white">
                              {set.weight}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="text-center">
          <button
            onClick={() => router.push(`/session/active/${templateId}`)}
            className="btn btn-success btn-lg flex items-center gap-2 mx-auto"
          >
            <PlayCircleIcon className="w-6 h-6" />
            Start Session with this Template
          </button>
        </div>
      </div>
    </motion.div>
  );
} 