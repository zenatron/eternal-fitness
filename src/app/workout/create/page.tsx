'use client';

import { useState } from 'react';
import { exercises } from '@/lib/exercises';
import { motion } from 'framer-motion';
import { 
  PlusCircleIcon, 
  TrashIcon, 
  CheckCircleIcon,
  FlagIcon
} from '@heroicons/react/24/outline';
import { Exercise, Workout, ExerciseSet } from '@/types/workout';

export default function CreateWorkoutPage() {
  const [workoutName, setWorkoutName] = useState('');
  const [workoutExercises, setWorkoutExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  // Generate a unique ID
  const generateId = () => Math.random().toString(36).substring(2, 10);

  // Add a new exercise to the workout
  const addExercise = () => {
    if (!selectedExercise) return;
    
    const exerciseDetails = exercises[selectedExercise as keyof typeof exercises];
    const newExercise: Exercise = {
      name: exerciseDetails.name,
      muscles: exerciseDetails.muscles,
      equipment: exerciseDetails.equipment,
      sets: [
        {
          reps: 0,
          weight: 0,
          unit: 'lbs'
        }
      ]
    };
    
    setWorkoutExercises([...workoutExercises, newExercise]);
    setSelectedExercise('');
  };

  // Add a new set to an exercise
  const addSet = (exerciseName: string) => {
    setWorkoutExercises(workoutExercises.map(exercise => {
      if (exercise.name === exerciseName) {
        return {
          ...exercise,
          sets: [
            ...(exercise.sets || []),
            {
              reps: 0,
              weight: 0,
              unit: 'lbs'
            }
          ]
        };
      }
      return exercise;
    }));
  };

  // Remove an exercise from the workout
  const removeExercise = (exerciseName: string) => {
    setWorkoutExercises(workoutExercises.filter(
      exercise => exercise.name !== exerciseName
    ));
  };

  // Remove a set from an exercise
  const removeSet = (exerciseName: string, setIndex: number) => {
    setWorkoutExercises(workoutExercises.map(exercise => {
      if (exercise.name === exerciseName && exercise.sets) {
        return {
          ...exercise,
          sets: exercise.sets.filter((_, index) => index !== setIndex)
        };
      }
      return exercise;
    }));
  };

  // Update set details (reps, weight, unit)
  const updateSet = (
    exerciseName: string, 
    setIndex: number, 
    field: keyof ExerciseSet, 
    value: any
  ) => {
    setWorkoutExercises(workoutExercises.map(exercise => {
      if (exercise.name === exerciseName && exercise.sets) {
        return {
          ...exercise,
          sets: exercise.sets.map((set, index) => {
            if (index === setIndex) {
              return { ...set, [field]: value };
            }
            return set;
          })
        };
      }
      return exercise;
    }));
  };

  // Save the workout (placeholder for future implementation)
  const saveWorkout = () => {
    if (!workoutName.trim()) {
      setSaveMessage('Please give your workout a name');
      return;
    }

    if (workoutExercises.length === 0) {
      setSaveMessage('Please add at least one exercise to your workout');
      return;
    }

    const workout: Workout = {
      id: generateId(),
      name: workoutName,
      exercises: workoutExercises,
      date: new Date()
    };

    console.log('Workout saved:', workout);
    // TODO: Add database integration here in the future
    setSaveMessage('Workout saved successfully!');
    
    // Clear message after 3 seconds
    setTimeout(() => {
      setSaveMessage('');
    }, 3000);
  };

  return (
    <div className="w-full h-full py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="app-card rounded-2xl shadow-xl overflow-hidden mb-6">
          <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-12 text-white">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative flex items-center gap-6">
              <FlagIcon className="w-20 h-20" />
              <div>
                <h1 className="text-3xl font-bold">Create Custom Workout</h1>
                <p className="text-blue-100 mt-1">Design your own personalized workout routine</p>
              </div>
            </div>
          </div>

          {/* Workout Name */}
          <div className="p-8">
            {saveMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
                  saveMessage.includes('successfully') 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                }`}
              >
                {saveMessage.includes('successfully') 
                  ? <CheckCircleIcon className="h-5 w-5" /> 
                  : <TrashIcon className="h-5 w-5" />
                }
                {saveMessage}
              </motion.div>
            )}
            
            <div className="mb-6">
              <label htmlFor="workout-name" className="form-item-heading">Workout Name</label>
              <input
                id="workout-name"
                type="text"
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
                placeholder="e.g., Monday Upper Body"
                className="form-input"
                required
              />
            </div>

            {/* Exercise Selector */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
                Add Exercise
              </h2>
              
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label htmlFor="exercise-select" className="form-item-heading">Select Exercise</label>
                  <select 
                    id="exercise-select"
                    value={selectedExercise} 
                    onChange={(e) => setSelectedExercise(e.target.value)}
                    className="form-input"
                  >
                    <option value="">Select an exercise</option>
                    {Object.keys(exercises).sort().map((key) => (
                      <option key={key} value={key}>
                        {exercises[key as keyof typeof exercises].name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button 
                    type="button"
                    onClick={addExercise} 
                    disabled={!selectedExercise}
                    className="btn btn-primary flex items-center justify-center gap-2 h-[42px]"
                  >
                    <PlusCircleIcon className="h-5 w-5" />
                    Add to Workout
                  </button>
                </div>
              </div>
              
              {selectedExercise && (
                <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                  <p>
                    <span className="font-medium">Target muscles:</span>{" "}
                    {exercises[selectedExercise as keyof typeof exercises]?.muscles.join(", ")}
                  </p>
                  <p>
                    <span className="font-medium">Equipment:</span>{" "}
                    {exercises[selectedExercise as keyof typeof exercises]?.equipment.join(", ")}
                  </p>
                </div>
              )}
            </div>

            {/* Exercise List */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                Your Workout Plan{" "}
                <span className="text-gray-500 dark:text-gray-400 font-normal text-sm">
                  ({workoutExercises.length} exercises)
                </span>
              </h2>

              {workoutExercises.length === 0 ? (
                <div className="text-center p-10 border border-dashed rounded-lg text-gray-500 dark:text-gray-400">
                  <p>No exercises added yet. Start building your workout by adding exercises above.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {workoutExercises.map((exercise, exIndex) => (
                    <motion.div 
                      key={`${exercise.name}-${exIndex}`} 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: exIndex * 0.1 }}
                      className="bg-gray-50 dark:bg-gray-700/50 rounded-xl overflow-hidden"
                    >
                      <div className="flex justify-between items-center p-4 bg-gray-100 dark:bg-gray-600">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                          {exercise.name}
                        </h3>
                        <button 
                          type="button"
                          onClick={() => removeExercise(exercise.name)}
                          className="text-red-500 hover:text-red-700 transition-colors p-1"
                          aria-label="Remove exercise"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                      
                      <div className="p-4">
                        <div className="mb-3 grid grid-cols-4 gap-3">
                          <div className="text-sm font-bold text-gray-500 dark:text-gray-400">Set</div>
                          <div className="text-sm font-bold text-gray-500 dark:text-gray-400">Reps</div>
                          <div className="text-sm font-bold text-gray-500 dark:text-gray-400">Weight</div>
                          <div className="text-sm font-bold text-gray-500 dark:text-gray-400">Unit</div>
                        </div>
                        
                        <div className="space-y-3">
                          {exercise.sets?.map((set, index) => (
                            <div key={index} className="grid grid-cols-4 gap-3 items-center">
                              <div className="text-gray-700 dark:text-gray-300">
                                Set {index + 1}
                                {(exercise.sets?.length || 0) > 1 && (
                                  <button 
                                    type="button"
                                    onClick={() => removeSet(exercise.name, index)}
                                    className="ml-2 text-red-500 hover:text-red-700 transition-colors"
                                    aria-label="Remove set"
                                  >
                                    <TrashIcon className="h-4 w-4 inline" />
                                  </button>
                                )}
                              </div>
                              <div>
                                <input
                                  type="number"
                                  min="0"
                                  value={set.reps || ''}
                                  onChange={(e) => updateSet(
                                    exercise.name, 
                                    index, 
                                    'reps', 
                                    parseInt(e.target.value) || 0
                                  )}
                                  className="form-input"
                                  aria-label="Reps"
                                />
                              </div>
                              <div>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={set.weight || ''}
                                  onChange={(e) => updateSet(
                                    exercise.name, 
                                    index, 
                                    'weight', 
                                    parseFloat(e.target.value) || 0
                                  )}
                                  className="form-input"
                                  aria-label="Weight"
                                />
                              </div>
                              <div>
                                <select
                                  value={set.unit}
                                  onChange={(e) => updateSet(
                                    exercise.name,
                                    index,
                                    'unit',
                                    e.target.value as 'kg' | 'lbs'
                                  )}
                                  className="form-input"
                                  aria-label="Weight unit"
                                >
                                  <option value="lbs">lbs</option>
                                  <option value="kg">kg</option>
                                </select>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <button 
                          type="button"
                          onClick={() => addSet(exercise.name)}
                          className="btn btn-secondary text-sm mt-4 inline-flex items-center gap-1"
                        >
                          <PlusCircleIcon className="h-4 w-4" />
                          Add Set
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Save Button */}
              {workoutExercises.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-8"
                >
                  <button 
                    type="button"
                    onClick={saveWorkout} 
                    className="btn btn-tertiary w-full py-3 text-lg inline-flex items-center justify-center gap-2"
                  >
                    <CheckCircleIcon className="h-6 w-6" />
                    Save Workout
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 