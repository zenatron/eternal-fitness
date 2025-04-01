'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeftIcon, 
  CalendarDaysIcon, 
  PencilIcon, 
  TrashIcon,
  StarIcon as StarOutline,
  ClockIcon,
  CheckIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

import { useWorkout } from '@/lib/hooks/useWorkout';
import { useProfile } from '@/lib/hooks/useProfile';
import { useToggleFavorite, useDeleteWorkout, useToggleComplete } from '@/lib/hooks/useMutations';
import { Set as WorkoutSet } from '@/types/workout';
import { formatVolume } from '@/utils/formatters';
import { formatUTCDateToLocalDateFriendly } from '@/utils/dateUtils';

export default function WorkoutDetailPage({ params }: { params: Promise<{ workoutId: string }> }) {
  const { workoutId } = use(params);
  const router = useRouter();
  
  // Use our custom hooks instead of directly fetching data
  const { workout, isLoading: workoutLoading, error: workoutError } = useWorkout(workoutId);
  const { profile, isLoading: profileLoading } = useProfile();
  const toggleFavoriteMutation = useToggleFavorite();
  const toggleCompleteMutation = useToggleComplete();
  const deleteWorkoutMutation = useDeleteWorkout();
  
  // Toggle favorite status
  const handleToggleFavorite = () => {
    if (!workout) return;
    toggleFavoriteMutation.mutate(workoutId);
  };

  // Toggle completion status
  const handleToggleComplete = () => {
    if (!workout) return;
    toggleCompleteMutation.mutate(workoutId);
  };

  // Delete the workout
  const handleDeleteWorkout = async () => {
    if (!confirm('Are you sure you want to delete this workout?')) return;
    deleteWorkoutMutation.mutate(workoutId, {
      onSuccess: () => {
        router.push('/workouts');
      }
    });
  };

  // Group exercises by name
  const exerciseGroups = workout?.sets?.reduce<Record<string, { muscles: string[], equipment: string[], sets: WorkoutSet[] }>>(
    (groups, set) => {
      if (!set.exercises[0]) return groups;
      
      const exercise = set.exercises[0];
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

  // Loading state
  const isLoading = workoutLoading || profileLoading;
  
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

  // Error state
  if (workoutError || !workout) {
    return (
      <div className="w-full h-full py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="p-4 bg-red-100 text-red-700 rounded-lg">
            {workoutError ? String(workoutError) : 'Workout not found'}
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
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={() => router.back()}
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex-1">
            Workout Details
          </h1>
        </div>

        {/* Workout Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden mb-8">
          {/* Hero Section */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  {workout.name}
                </h2>
                <div className="flex items-center gap-2 text-blue-100">
                  <CalendarDaysIcon className="h-5 w-5" />
                  <span>{formatUTCDateToLocalDateFriendly(workout.scheduledDate) || 'Not scheduled'}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleToggleComplete}
                  className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors"
                  aria-label={workout.completed ? "Mark as not completed" : "Mark as completed"}
                >
                  {workout.completed ? (
                    <CheckCircleSolid className="h-6 w-6 text-green-400" />
                  ) : (
                    <CheckCircleIcon className="h-6 w-6 text-white" />
                  )}
                </button>
                <button 
                  onClick={handleToggleFavorite}
                  className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors"
                  aria-label={workout.favorite ? "Remove from favorites" : "Add to favorites"}
                >
                  {workout.favorite ? (
                    <StarSolid className="h-6 w-6 text-amber-400" />
                  ) : (
                    <StarOutline className="h-6 w-6 text-white" />
                  )}
                </button>
                <button 
                  onClick={() => router.push(`/workout/edit/${workoutId}`)}
                  className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors"
                  aria-label="Edit workout"
                >
                  <PencilIcon className="h-6 w-6 text-white" />
                </button>
                <button 
                  onClick={handleDeleteWorkout}
                  className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors"
                  aria-label="Delete workout"
                >
                  <TrashIcon className="h-6 w-6 text-white" />
                </button>
              </div>
            </div>
            
            {/* Status and metadata */}
            <div className="flex gap-4 mt-4">
              <div className="bg-white/20 rounded-lg px-3 py-1 text-sm text-white flex items-center gap-1">
                {workout.completed ? (
                  <>
                    <CheckIcon className="h-4 w-4" />
                    Completed
                  </>
                ) : (
                  <>
                    <ClockIcon className="h-4 w-4" />
                    {workout.scheduledDate ? 'Scheduled' : 'Not started'}
                  </>
                )}
              </div>
              <div className="bg-white/20 rounded-lg px-3 py-1 text-sm text-white">
                {Object.keys(exerciseGroups).length} exercises
              </div>
              <div className="bg-white/20 rounded-lg px-3 py-1 text-sm text-white">
                {workout.sets?.length || 0} sets
              </div>
              <div className="bg-white/20 rounded-lg px-3 py-1 text-sm text-white">
                {formatVolume(workout.totalVolume)} {profile?.useMetric ? 'kg' : 'lbs'} volume
              </div>
            </div>
          </div>
          
          {/* Exercises */}
          <div className="p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Exercises
            </h3>
            
            <div className="space-y-6">
              {Object.entries(exerciseGroups).map(([name, { muscles, equipment, sets }]) => (
                <div key={name} className="border dark:border-gray-700 rounded-xl overflow-hidden">
                  <div className="bg-gray-100 dark:bg-gray-700 p-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {name}
                    </h4>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span className="font-medium">Muscles:</span> {muscles.join(', ')}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium">Equipment:</span> {equipment.join(', ')}
                    </div>
                  </div>
                  
                  {/* Sets Table */}
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
                        {sets.map((set, index) => (
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
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <button
            onClick={() => router.push('/workouts')}
            className="btn btn-secondary flex-1"
          >
            Back to Workouts
          </button>
          
          {!workout.completed && (
            <button 
              onClick={() => router.push(`/workout/start/${workoutId}`)} 
              className="btn btn-primary flex-1"
            >
              Start Workout
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
} 