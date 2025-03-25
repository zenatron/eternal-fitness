import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  TrashIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PencilSquareIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { MdFavoriteBorder } from "react-icons/md";
import { useRouter } from 'next/navigation'

interface Set {
  id: string
  reps: number
  weight: number
  unit?: 'kg' | 'lbs'
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
  const router = useRouter()
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchWorkouts()
  }, [])

  const fetchWorkouts = async () => {
    try {
      const response = await fetch('/api/workout')
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
      const response = await fetch(`/api/workout/${workoutId}`, {
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

  const startEditing = (workout: Workout) => {
    setEditingWorkout(workout)
    setEditName(workout.name)
  }

  const cancelEditing = () => {
    setEditingWorkout(null)
    setEditName('')
  }

  const editWorkout = async () => {
    if (!editingWorkout) return

    try {
      setSaving(true)

      // Prepare exercise data for the API in the expected format
      const exercises = Object.entries(editingWorkout.sets.reduce((acc: { [key: string]: any }, set) => {
        const exerciseName = set.exercises[0]?.name
        if (exerciseName) {
          if (!acc[exerciseName]) {
            acc[exerciseName] = {
              name: exerciseName,
              muscles: set.exercises[0]?.muscles || [],
              equipment: [],
              sets: []
            }
          }
          acc[exerciseName].sets.push({
            reps: set.reps,
            weight: set.weight,
            unit: set.unit || 'kg'
          })
        }
        return acc
      }, {})).map(([_, exercise]) => exercise)

      const response = await fetch(`/api/workout/${editingWorkout.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workoutId: editingWorkout.id,
          name: editName,
          exercises
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update workout')
      }

      // Get the updated workout
      const updatedWorkout = await response.json()

      // Update the workout in the local state
      setWorkouts(workouts.map(w => w.id === updatedWorkout.id ? updatedWorkout : w))
      
      // Close the editing form
      setEditingWorkout(null)
      setEditName('')
      
      // Force refresh data
      fetchWorkouts()
    } catch (error) {
      console.error('Error updating workout:', error)
      setError('Failed to update workout')
    } finally {
      setSaving(false)
    }
  }

  const navigateToDetailedEdit = (workoutId: string) => {
    router.push(`/workout/edit/${workoutId}`)
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
                    navigateToDetailedEdit(workout.id)
                  }}
                  className="p-2 text-blue-500 hover:text-blue-700 transition-colors"
                  aria-label="Edit workout"
                >
                  <PencilSquareIcon className="w-5 h-5" />
                </button>
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

      {/* Quick Edit Modal */}
      {editingWorkout && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                Edit Workout
              </h3>
              <button 
                onClick={cancelEditing}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Workout Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="form-input block w-full"
                  placeholder="Workout name"
                />
              </div>
              
              <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={cancelEditing}
                  className="btn btn-secondary"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={editWorkout}
                  className="btn btn-primary"
                  disabled={saving || !editName.trim()}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 