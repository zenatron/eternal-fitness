'use client';

import { useState, useEffect, use } from 'react';
import { FlagIcon } from '@heroicons/react/24/outline';
import WorkoutFormEditor from '@/components/ui/WorkoutFormEditor';
import { Exercise } from '@/types/workout';

// Generate a simple unique ID
function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

export default function EditWorkoutPage({ params }: { params: Promise<{ workoutId: string }> }) {

  const { workoutId } = use(params);
  const [initialWorkoutName, setInitialWorkoutName] = useState('');
  const [initialExercises, setInitialExercises] = useState<(Exercise & { id: string })[]>([]);
  const [initialScheduledDate, setInitialScheduledDate] = useState('');
  const [initialFavorite, setInitialFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing workout data
  useEffect(() => {
    const fetchWorkout = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/workout/${workoutId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch workout');
        }
        
        const workout = await response.json();
        
        // Set workout name
        setInitialWorkoutName(workout.name);
        
        // Set scheduled date if exists
        if (workout.scheduledDate) {
          // Format date to YYYY-MM-DD for input
          const date = new Date(workout.scheduledDate);
          const formattedDate = date.toISOString().split('T')[0];
          setInitialScheduledDate(formattedDate);
        }

        // Set favorite status
        setInitialFavorite(workout.favorite || false);
        
        // Convert from DB format to the format used in the edit form
        const formattedExercises = convertDbWorkoutToFormWorkout(workout);
        setInitialExercises(formattedExercises);
      } catch (error) {
        console.error('Error fetching workout:', error);
        setError(error instanceof Error ? error.message : 'Failed to load workout details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchWorkout();
  }, [workoutId]);

  // Convert DB format to form format
  const convertDbWorkoutToFormWorkout = (workout: any) => {
    // Create an object to group sets by exercise name
    const exerciseMap: Record<string, any> = {};
    
    // Group sets by exercise name
    workout.sets?.forEach((set: any) => {
      const exercise = set.exercises[0];
      if (!exercise) return;
      
      const exerciseName = exercise.name;
      
      if (!exerciseMap[exerciseName]) {
        exerciseMap[exerciseName] = {
          id: generateId(),
          name: exerciseName,
          muscles: exercise.muscles || [],
          equipment: exercise.equipment || [],
          sets: []
        };
      }
      
      exerciseMap[exerciseName].sets.push({
        reps: set.reps,
        weight: set.weight,
        // Convert to lbs for display if needed
        unit: 'kg'
      });
    });
    
    // Convert the map to an array
    return Object.values(exerciseMap);
  };

  const headerElement = (
    <div className="app-card rounded-2xl shadow-xl overflow-hidden mb-6">
      <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-12 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative flex items-center gap-6">
          <FlagIcon className="w-20 h-20" />
          <div>
            <h1 className="text-3xl font-bold">Edit Workout</h1>
            <p className="text-blue-100 mt-1">Update your workout routine</p>
          </div>
        </div>
      </div>
    </div>
  );

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

  if (error) {
    return (
      <div className="w-full h-full py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <WorkoutFormEditor
      mode="edit"
      workoutId={workoutId}
      initialWorkoutName={initialWorkoutName}
      initialExercises={initialExercises}
      initialScheduledDate={initialScheduledDate}
      initialFavorite={initialFavorite}
      headerElement={headerElement}
    />
  );
} 