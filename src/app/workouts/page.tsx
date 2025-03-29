'use client'

import { useRouter } from 'next/navigation'
import { 
  StarIcon, 
  ClockIcon, 
  CheckCircleIcon,
  PlusCircleIcon,
  CalendarDaysIcon,
  ArrowRightIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { motion } from 'framer-motion'
import { useWorkouts } from '@/lib/hooks/useWorkouts';
import { useToggleFavorite } from '@/lib/hooks/useMutations';

export default function WorkoutsPage() {
  const router = useRouter()
  const { workouts, isLoading, error, refetch } = useWorkouts();
  const toggleFavoriteMutation = useToggleFavorite();
  
  // Filter workouts by type
  const favoriteWorkouts = workouts?.filter(w => w.favorite) || [];
  const upcomingWorkouts = workouts?.filter(w => !w.completed && w.scheduledDate) || [];
  const completedWorkouts = workouts?.filter(w => w.completed) || [];
  const unscheduledWorkouts = workouts?.filter(w => !w.completed && !w.scheduledDate) || [];
  
  // Get today's and tomorrow's date strings for status labels
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  
  const getWorkoutStatus = (date?: string | Date) => {
    if (!date) return ''
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0]
    if (dateStr === today) return 'Today'
    if (dateStr === tomorrow) return 'Tomorrow'
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  
  const getTimeAgo = (date?: string | Date) => {
    if (!date) return ''
    
    const now = new Date()
    const completedDate = new Date(date)
    const diffMs = now.getTime() - completedDate.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return completedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  
  // Helper function to count unique exercises in a workout
  const countUniqueExercises = (workout: any) => {
    // Use a set to track unique exercise names
    const uniqueExerciseNames = new Set();
    
    if (workout.sets) {
      workout.sets.forEach((set: any) => {
        if (set.exercises) {
          set.exercises.forEach((exercise: any) => {
            uniqueExerciseNames.add(exercise.name);
          });
        }
      });
    }
    
    return uniqueExerciseNames.size;
  };
  
  // Format volume to display with proper unit
  const formatVolume = (volume: number) => {
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}k`;
    }
    return Math.round(volume).toString();
  };
  
  const handleToggleFavorite = (workoutId: string) => {
    toggleFavoriteMutation.mutate(workoutId);
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
            My Workouts
          </h1>
          <button
            onClick={() => router.push('/workout/create')}
            className="btn btn-primary flex items-center gap-2"
          >
            <PlusCircleIcon className="w-5 h-5" />
            Create Workout
          </button>
        </div>
        
        {/* Favorites Section */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <StarIconSolid className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              Favorites
            </h2>
          </div>
          
          {favoriteWorkouts.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center">
              <p className="text-secondary">No favorite workouts yet. Mark a workout as favorite to see it here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {favoriteWorkouts.map(workout => (
                <motion.div
                  key={workout.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden"
                >
                  <div className="p-5">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                        {workout.name}
                      </h3>
                      <button
                        onClick={() => handleToggleFavorite(workout.id)}
                        className="text-amber-400 hover:text-amber-500"
                      >
                        <StarIconSolid className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="text-sm text-secondary mt-1 flex flex-wrap gap-2">
                      <span>{countUniqueExercises(workout)} exercises</span>
                      <span>•</span>
                      <span>{workout.sets?.length || 0} sets</span>
                      {workout.totalVolume > 0 && (
                        <>
                          <span>•</span>
                          <span>{formatVolume(workout.totalVolume)} volume</span>
                        </>
                      )}
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                      <button
                        onClick={() => router.push(`/workout/${workout.id}`)}
                        className="text-primary text-sm font-medium flex items-center gap-1 hover:underline"
                      >
                        View Details
                        <ArrowRightIcon className="w-4 h-4" />
                      </button>
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full">
                        {workout.completed ? 'Completed' : 'Ready'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
        
        {/* Upcoming Workouts Section */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDaysIcon className="w-5 h-5 text-accent" />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              Upcoming Workouts
            </h2>
          </div>
          
          {upcomingWorkouts.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center">
              <p className="text-secondary">No upcoming workouts scheduled. Plan your fitness routine by scheduling workouts.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {upcomingWorkouts.map(workout => (
                <motion.div
                  key={workout.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden"
                >
                  <div className="p-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full w-12 h-12 flex items-center justify-center">
                        <ClockIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800 dark:text-white">
                          {workout.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                            {getWorkoutStatus(workout.scheduledDate)}
                          </span>
                          <span className="text-xs text-secondary">
                            {countUniqueExercises(workout)} exercises • {workout.sets?.length || 0} sets
                            {workout.totalVolume > 0 && ` • ${formatVolume(workout.totalVolume)} volume`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleFavorite(workout.id)}
                        className={`text-gray-400 hover:text-amber-400 ${workout.favorite ? 'text-amber-400' : ''}`}
                      >
                        {workout.favorite ? (
                          <StarIconSolid className="w-5 h-5" />
                        ) : (
                          <StarIcon className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => router.push(`/workout/${workout.id}`)}
                        className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors"
                      >
                        <ArrowRightIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
        
        {/* Two-Column Section for Completed and Unscheduled Workouts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Completed Workouts Column */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircleIcon className="w-5 h-5 text-green-500" />
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                Completed Workouts
              </h2>
            </div>
            
            {completedWorkouts.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center h-32 flex items-center justify-center">
                <p className="text-secondary">None completed yet, let's get started!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {completedWorkouts.slice(0, 3).map(workout => (
                  <motion.div
                    key={workout.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden"
                  >
                    <div className="p-4 flex justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-100 dark:bg-green-900/30 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
                          <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800 dark:text-white text-sm">
                            {workout.name}
                          </h3>
                          <div className="flex flex-wrap gap-1 text-xs text-secondary mt-1">
                            <span>Completed {getTimeAgo(workout.completedAt)}</span>
                            <span>•</span>
                            <span>{countUniqueExercises(workout)} exercises</span>
                            {workout.totalVolume > 0 && (
                              <>
                                <span>•</span>
                                <span>{formatVolume(workout.totalVolume)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => router.push(`/workout/${workout.id}`)}
                        className="p-1 text-primary hover:bg-primary/10 rounded-full transition-colors self-start"
                      >
                        <ArrowRightIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
                
                {completedWorkouts.length > 3 && (
                  <button
                    onClick={() => router.push('/workout/history')}
                    className="text-center p-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-secondary hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-sm"
                  >
                    View all {completedWorkouts.length} completed workouts
                  </button>
                )}
              </div>
            )}
          </section>
          
          {/* Unscheduled Workouts Column */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <QuestionMarkCircleIcon className="w-5 h-5 text-purple-500" />
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                Unscheduled Workouts
              </h2>
            </div>
            
            {unscheduledWorkouts.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center h-32 flex items-center justify-center">
                <p className="text-secondary">None unscheduled, well done!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {unscheduledWorkouts.slice(0, 3).map(workout => (
                  <motion.div
                    key={workout.id}
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
                            {workout.name}
                          </h3>
                          <div className="flex flex-wrap gap-1 text-xs text-secondary mt-1">
                            <span>{countUniqueExercises(workout)} exercises</span>
                            <span>•</span>
                            <span>{workout.sets?.length || 0} sets</span>
                            {workout.totalVolume > 0 && (
                              <>
                                <span>•</span>
                                <span>{formatVolume(workout.totalVolume)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleFavorite(workout.id)}
                          className={`text-gray-400 hover:text-amber-400 ${workout.favorite ? 'text-amber-400' : ''}`}
                        >
                          {workout.favorite ? (
                            <StarIconSolid className="w-4 h-4" />
                          ) : (
                            <StarIcon className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => router.push(`/workout/${workout.id}`)}
                          className="p-1 text-primary hover:bg-primary/10 rounded-full transition-colors"
                        >
                          <ArrowRightIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                {unscheduledWorkouts.length > 3 && (
                  <button
                    onClick={() => router.push('/workouts/unscheduled')}
                    className="text-center p-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-secondary hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-sm"
                  >
                    View all {unscheduledWorkouts.length} unscheduled workouts
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
} 