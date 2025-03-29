'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeftIcon, 
  CalendarDaysIcon, 
  PencilIcon, 
  TrashIcon,
  StarIcon as StarOutline,
  ClockIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

interface Exercise {
  id: string;
  name: string;
  muscles: string[];
  equipment: string[];
}

interface Set {
  id: string;
  reps: number;
  weight: number;
  exercises: Exercise[];
}

interface Workout {
  id: string;
  name: string;
  description?: string;
  completed: boolean;
  completedAt?: string;
  scheduledDate?: string;
  favorite: boolean;
  createdAt: string;
  sets: Set[];
}

export default function WorkoutDetailPage({ params }: { params: Promise<{ workoutId: string }> }) {
  const { workoutId } = use(params);
  const router = useRouter();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ useMetric: boolean } | null>(null);

  // Fetch user profile to determine weight unit
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await fetch('/api/profile')
        if (!response.ok) throw new Error('Failed to fetch user profile')
        const data = await response.json()
        setUserProfile(data)
      } catch (error) {
        console.error('Error fetching user profile:', error)
      }
    }
    fetchUserProfile()
  }, [])

  // Fetch workout data
  useEffect(() => {
    const fetchWorkout = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/workout/${workoutId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch workout');
        }
        
        const data = await response.json();
        setWorkout(data);
      } catch (error) {
        console.error('Error fetching workout:', error);
        setError(error instanceof Error ? error.message : 'Failed to load workout details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchWorkout();
  }, [workoutId]);

  // Toggle favorite status
  const toggleFavorite = async () => {
    if (!workout) return;
    
    try {
      const response = await fetch(`/api/workout/${workoutId}/favorite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to update favorite status');
      }
      
      const data = await response.json();
      setWorkout(prev => prev ? {...prev, favorite: data.favorite} : null);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not scheduled';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Delete the workout
  const deleteWorkout = async () => {
    if (!confirm('Are you sure you want to delete this workout?')) return;
    
    try {
      const response = await fetch(`/api/workout/${workoutId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete workout');
      }
      
      router.push('/workouts');
    } catch (error) {
      console.error('Error deleting workout:', error);
    }
  };

  // Group exercises by name
  const exerciseGroups = workout?.sets.reduce<Record<string, { muscles: string[], equipment: string[], sets: Set[] }>>(
    (groups, set) => {
      if (!set.exercises[0]) return groups;
      
      const exercise = set.exercises[0];
      const name = exercise.name;
      
      if (!groups[name]) {
        groups[name] = {
          muscles: exercise.muscles,
          equipment: exercise.equipment,
          sets: []
        };
      }
      
      groups[name].sets.push(set);
      return groups;
    },
    {}
  ) || {};

  // Loading state
  if (loading) {
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
  if (error || !workout) {
    return (
      <div className="w-full h-full py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="p-4 bg-red-100 text-red-700 rounded-lg">
            {error || 'Workout not found'}
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
                  <span>{formatDate(workout.scheduledDate)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={toggleFavorite}
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
                  onClick={deleteWorkout}
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
                {workout.sets.length} sets
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
                          <th className="px-2 py-2 text-right">Weight ({userProfile?.useMetric ? 'kg' : 'lbs'})</th>
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