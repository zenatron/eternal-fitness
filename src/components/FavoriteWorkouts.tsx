import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  TrashIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline'
import { MdFavoriteBorder } from "react-icons/md";

interface Set {
  id: string
  reps: number
  weight: number
  exercises: Array<{
    name: string
    muscles: string[]
  }>
}

interface Workout {
  id: string
  name: string
  createdAt: string
  sets: Set[]
}

export default function FavoriteWorkouts() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchWorkouts()
  }, [])

  const fetchWorkouts = async () => {
    try {
      const response = await fetch('/api/workouts')
      if (!response.ok) {
        throw new Error('Failed to fetch workouts')
      }
      const data = await response.json()
      setWorkouts(data)
    } catch (error) {
      setError('Failed to load workouts')
      console.error('Error fetching workouts:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteWorkout = async (workoutId: string) => {
    try {
      const response = await fetch(`/api/workouts/${workoutId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete workout')
      }

      setWorkouts(workouts.filter(workout => workout.id !== workoutId))
    } catch (error) {
      console.error('Error deleting workout:', error)
      setError('Failed to delete workout')
    }
  }

  const toggleWorkout = (workoutId: string) => {
    setExpandedWorkout(expandedWorkout === workoutId ? null : workoutId)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded-lg">
        {error}
      </div>
    )
  }

  if (workouts.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 dark:bg-gray-800 rounded-xl">
        <p className="text-gray-600 dark:text-gray-400">
          No saved workouts yet. Create your first workout to get started!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
        <MdFavoriteBorder className="w-6 h-6 text-blue-500" />
        Favorite Workouts
      </h2>

      <div className="grid grid-cols-1 gap-6">
        {workouts.map((workout) => (
          <motion.div
            key={workout.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden"
          >
            <div 
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
              onClick={() => toggleWorkout(workout.id)}
            >
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                  {workout.name}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
                  <ClockIcon className="w-4 h-4" />
                  {new Date(workout.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteWorkout(workout.id)
                  }}
                  className="p-2 text-red-500 hover:text-red-700 transition-colors"
                  aria-label="Delete workout"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
                {expandedWorkout === workout.id ? (
                  <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>

            {expandedWorkout === workout.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-gray-200 dark:border-gray-700"
              >
                <div className="p-4 space-y-4">
                  {Object.entries(workout.sets.reduce((acc: { [key: string]: Set[] }, set) => {
                    const exerciseName = set.exercises[0]?.name
                    if (exerciseName) {
                      if (!acc[exerciseName]) {
                        acc[exerciseName] = []
                      }
                      acc[exerciseName].push(set)
                    }
                    return acc
                  }, {})).map(([exerciseName, sets]) => (
                    <div key={exerciseName} className="space-y-2">
                      <h4 className="font-medium text-gray-700 dark:text-gray-300">
                        {exerciseName}
                      </h4>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        {sets.map((set: Set, index: number) => (
                          <div 
                            key={set.id}
                            className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded"
                          >
                            <span className="text-gray-500 dark:text-gray-400">
                              Set {index + 1}:
                            </span>{' '}
                            {set.reps} reps @ {set.weight.toFixed(1)}kg
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
} 