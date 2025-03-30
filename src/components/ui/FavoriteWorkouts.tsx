import { motion } from 'framer-motion'
import { 
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { useRouter } from 'next/navigation'
import type { Workout, Set as WorkoutSet, Exercise } from '@/types/workout'
import { useWorkouts } from '@/lib/hooks/useWorkouts'
import { useToggleFavorite } from '@/lib/hooks/useMutations'

export default function FavoriteWorkouts() {
  const router = useRouter()
  const { workouts: allWorkouts, isLoading, error } = useWorkouts()
  const toggleFavoriteMutation = useToggleFavorite()
  
  // Filter to only get favorited workouts
  const workouts = allWorkouts.filter(workout => workout.favorite)

  // Helper function to count unique exercises in a workout
  const countUniqueExercises = (workout: Workout) => {
    // Use a set to track unique exercise names
    const uniqueExerciseNames = new Set();
    
    if (workout.sets) {
      workout.sets.forEach((set: WorkoutSet) => {
        if (set.exercises) {
          set.exercises.forEach((exercise: Exercise) => {
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
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded-lg">
        {String(error)}
      </div>
    )
  }

  if (workouts.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center">
        <p className="text-secondary">No favorite workouts yet. Mark a workout as favorite to see it here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
        <StarIconSolid className="w-5 h-5 text-amber-400" />
        Favorite Workouts
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {workouts.map((workout) => (
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
    </div>
  )
} 