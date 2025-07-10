'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircleIcon,
  XMarkIcon,
  PlusIcon,
  ClockIcon,
  ScaleIcon,
  ArrowPathIcon,
  TrashIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';
import { WorkoutTemplateData, WorkoutExercise, WorkoutSet, ExercisePerformance, PerformedSet } from '@/types/workout';
import { formatVolume } from '@/utils/formatters';

// Basic exercise database for adding new exercises during workout
const COMMON_EXERCISES = [
  { key: 'bench-press', name: 'Bench Press', muscles: ['chest', 'triceps', 'shoulders'], equipment: ['barbell'] },
  { key: 'squat', name: 'Squat', muscles: ['quadriceps', 'glutes', 'hamstrings'], equipment: ['barbell'] },
  { key: 'deadlift', name: 'Deadlift', muscles: ['hamstrings', 'glutes', 'back'], equipment: ['barbell'] },
  { key: 'overhead-press', name: 'Overhead Press', muscles: ['shoulders', 'triceps'], equipment: ['barbell'] },
  { key: 'bent-over-row', name: 'Bent Over Row', muscles: ['back', 'biceps'], equipment: ['barbell'] },
  { key: 'pull-up', name: 'Pull Up', muscles: ['back', 'biceps'], equipment: ['bodyweight'] },
  { key: 'push-up', name: 'Push Up', muscles: ['chest', 'triceps', 'shoulders'], equipment: ['bodyweight'] },
  { key: 'dumbbell-curl', name: 'Dumbbell Curl', muscles: ['biceps'], equipment: ['dumbbell'] },
  { key: 'tricep-dip', name: 'Tricep Dip', muscles: ['triceps'], equipment: ['bodyweight'] },
  { key: 'lat-pulldown', name: 'Lat Pulldown', muscles: ['back', 'biceps'], equipment: ['cable'] },
  { key: 'leg-press', name: 'Leg Press', muscles: ['quadriceps', 'glutes'], equipment: ['machine'] },
  { key: 'shoulder-press', name: 'Shoulder Press', muscles: ['shoulders', 'triceps'], equipment: ['dumbbell'] },
];

interface WorkoutProgressTrackerProps {
  template: WorkoutTemplateData;
  onPerformanceUpdate: (performance: { [exerciseId: string]: ExercisePerformance }) => void;
  onTemplateModified?: (modifiedTemplate: WorkoutTemplateData) => void;
  onExerciseProgressUpdate?: (progress: { [exerciseId: string]: ExerciseProgress }) => void;
  initialExerciseProgress?: { [exerciseId: string]: ExerciseProgress };
  useMetric?: boolean;
}

interface SetProgress {
  setId: string;
  completed: boolean;
  actualReps?: number;
  actualWeight?: number;
  actualDuration?: number;
  actualRpe?: number;
  notes?: string;
  skipped?: boolean;
  restTime?: number;
}

interface ExerciseProgress {
  exerciseId: string;
  sets: SetProgress[];
  exerciseNotes?: string;
  completed: boolean;
}

export default function WorkoutProgressTracker({
  template,
  onPerformanceUpdate,
  onTemplateModified,
  onExerciseProgressUpdate,
  initialExerciseProgress,
  useMetric = false,
}: WorkoutProgressTrackerProps) {
  const [exerciseProgress, setExerciseProgress] = useState<{ [exerciseId: string]: ExerciseProgress }>({});
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [modifiedTemplate, setModifiedTemplate] = useState<WorkoutTemplateData>(template);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [hasModifications, setHasModifications] = useState(false);
  const isInitialized = useRef(false);
  const lastPerformanceRef = useRef<string>('');
  const onPerformanceUpdateRef = useRef(onPerformanceUpdate);
  const onExerciseProgressUpdateRef = useRef(onExerciseProgressUpdate);

  // Keep the refs updated
  useEffect(() => {
    onPerformanceUpdateRef.current = onPerformanceUpdate;
    onExerciseProgressUpdateRef.current = onExerciseProgressUpdate;
  }, [onPerformanceUpdate, onExerciseProgressUpdate]);

  // Sync modifiedTemplate with template prop changes
  useEffect(() => {
    setModifiedTemplate(template);
  }, [template]);

  // Initialize progress state from template or saved state
  useEffect(() => {
    // Use initial progress if provided, otherwise create new progress
    if (initialExerciseProgress && Object.keys(initialExerciseProgress).length > 0) {
      setExerciseProgress(initialExerciseProgress);
      isInitialized.current = true;
    } else if (!isInitialized.current) {
      const initialProgress: { [exerciseId: string]: ExerciseProgress } = {};

      template.exercises.forEach((exercise) => {
        initialProgress[exercise.id] = {
          exerciseId: exercise.id,
          sets: exercise.sets.map((set) => ({
            setId: set.id,
            completed: false,
            actualReps: typeof set.targetReps === 'number' ? set.targetReps : set.targetReps?.min,
            actualWeight: set.targetWeight,
            actualDuration: set.targetDuration,
          })),
          completed: false,
        };
      });

      setExerciseProgress(initialProgress);
      isInitialized.current = true;
    }
  }, [initialExerciseProgress]); // Remove template from dependencies to prevent re-initialization

  // Handle template changes after initialization (e.g., adding new exercises/sets)
  useEffect(() => {
    if (!isInitialized.current) return;

    setExerciseProgress(prev => {
      const updated = { ...prev };
      let hasChanges = false;

      // Add progress for new exercises
      modifiedTemplate.exercises.forEach((exercise) => {
        if (!updated[exercise.id]) {
          updated[exercise.id] = {
            exerciseId: exercise.id,
            sets: exercise.sets.map((set) => ({
              setId: set.id,
              completed: false,
              actualReps: typeof set.targetReps === 'number' ? set.targetReps : set.targetReps?.min,
              actualWeight: set.targetWeight,
              actualDuration: set.targetDuration,
            })),
            completed: false,
          };
          hasChanges = true;
        } else {
          // Add progress for new sets in existing exercises
          const existingProgress = updated[exercise.id];
          const existingSetIds = new Set(existingProgress.sets.map(s => s.setId));

          exercise.sets.forEach((set) => {
            if (!existingSetIds.has(set.id)) {
              existingProgress.sets.push({
                setId: set.id,
                completed: false,
                actualReps: typeof set.targetReps === 'number' ? set.targetReps : set.targetReps?.min,
                actualWeight: set.targetWeight,
                actualDuration: set.targetDuration,
              });
              hasChanges = true;
            }
          });
        }
      });

      // Remove progress for deleted exercises
      Object.keys(updated).forEach(exerciseId => {
        if (!modifiedTemplate.exercises.find(ex => ex.id === exerciseId)) {
          delete updated[exerciseId];
          hasChanges = true;
        }
      });

      return hasChanges ? updated : prev;
    });
  }, [modifiedTemplate.exercises]); // Only depend on exercises array

  // Update parent component when progress changes
  useEffect(() => {
    console.log('🎯 WorkoutProgressTracker: Performance calculation effect running');
    console.log('🎯 exerciseProgress:', JSON.stringify(exerciseProgress, null, 2));

    const performance: { [exerciseId: string]: ExercisePerformance } = {};

    Object.values(exerciseProgress).forEach((progress) => {
      const exercise = modifiedTemplate.exercises.find(ex => ex.id === progress.exerciseId);
      if (!exercise) return;

      const performedSets: PerformedSet[] = progress.sets.map((setProgress) => ({
        setId: setProgress.setId,
        actualReps: setProgress.actualReps,
        actualWeight: setProgress.actualWeight,
        actualDuration: setProgress.actualDuration,
        actualRpe: setProgress.actualRpe,
        completed: setProgress.completed,
        skipped: setProgress.skipped || false,
        notes: setProgress.notes,
      }));

      const totalVolume = performedSets.reduce((total, set) => {
        if (set.completed && set.actualReps && set.actualWeight) {
          return total + (set.actualReps * set.actualWeight);
        }
        return total;
      }, 0);

      const completedSets = performedSets.filter(set => set.completed);
      const averageRpe = completedSets.length > 0
        ? completedSets.reduce((sum, set) => sum + (set.actualRpe || 0), 0) / completedSets.length
        : undefined;

      performance[progress.exerciseId] = {
        exerciseKey: exercise.exerciseKey,
        sets: performedSets,
        exerciseNotes: progress.exerciseNotes,
        totalVolume,
        averageRpe,
      };
    });

    // Only update if performance has actually changed
    const performanceString = JSON.stringify(performance);
    console.log('🎯 Calculated performance:', JSON.stringify(performance, null, 2));
    console.log('🎯 Performance string comparison:', {
      current: performanceString,
      last: lastPerformanceRef.current,
      different: performanceString !== lastPerformanceRef.current
    });

    if (performanceString !== lastPerformanceRef.current) {
      lastPerformanceRef.current = performanceString;
      console.log('🎯 Calling onPerformanceUpdate with:', JSON.stringify(performance, null, 2));
      onPerformanceUpdateRef.current(performance);
    }
  }, [exerciseProgress, modifiedTemplate.exercises]); // Removed onPerformanceUpdate from dependencies

  // Notify parent of exercise progress changes for persistence
  useEffect(() => {
    if (onExerciseProgressUpdateRef.current && Object.keys(exerciseProgress).length > 0) {
      onExerciseProgressUpdateRef.current(exerciseProgress);
    }
  }, [exerciseProgress]); // Removed onExerciseProgressUpdate from dependencies

  const updateSetProgress = (exerciseId: string, setId: string, updates: Partial<SetProgress>) => {
    setExerciseProgress(prev => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        sets: prev[exerciseId].sets.map(set =>
          set.setId === setId ? { ...set, ...updates } : set
        ),
      },
    }));
  };

  const toggleSetCompletion = (exerciseId: string, setId: string) => {
    const currentSet = exerciseProgress[exerciseId]?.sets.find(s => s.setId === setId);
    if (!currentSet) return;

    const newCompletedState = !currentSet.completed;

    // Update the set and check if all sets are completed in a single state update
    setExerciseProgress(prev => {
      const updatedSets = prev[exerciseId].sets.map(set =>
        set.setId === setId
          ? { ...set, completed: newCompletedState, skipped: false }
          : set
      );

      const allSetsCompleted = updatedSets.every(set => set.completed || set.skipped);

      return {
        ...prev,
        [exerciseId]: {
          ...prev[exerciseId],
          sets: updatedSets,
          completed: allSetsCompleted,
        },
      };
    });
  };

  const skipSet = (exerciseId: string, setId: string) => {
    updateSetProgress(exerciseId, setId, {
      skipped: true,
      completed: false,
    });
  };

  const addExtraSet = (exerciseId: string) => {
    const exercise = modifiedTemplate.exercises.find(ex => ex.id === exerciseId);
    if (!exercise) return;

    const lastSet = exercise.sets[exercise.sets.length - 1];
    const newSetId = `extra-set-${Date.now()}`;

    // Update both template and progress state simultaneously to avoid clearing progress
    const updatedTemplate = {
      ...modifiedTemplate,
      exercises: modifiedTemplate.exercises.map(ex =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: [
                ...ex.sets,
                {
                  id: newSetId,
                  type: lastSet.type,
                  targetReps: lastSet.targetReps,
                  targetWeight: lastSet.targetWeight,
                  targetDuration: lastSet.targetDuration,
                  restTime: lastSet.restTime,
                },
              ],
            }
          : ex
      ),
    };

    // Update progress state first to preserve existing progress
    setExerciseProgress(prev => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        sets: [
          ...prev[exerciseId].sets,
          {
            setId: newSetId,
            completed: false,
            actualReps: typeof lastSet.targetReps === 'number' ? lastSet.targetReps : lastSet.targetReps?.min,
            actualWeight: lastSet.targetWeight,
            actualDuration: lastSet.targetDuration,
          },
        ],
      },
    }));

    // Then update template (this won't trigger progress reset since we updated progress first)
    setModifiedTemplate(updatedTemplate);
    setHasModifications(true);
    onTemplateModified?.(updatedTemplate);
  };

  const addExercise = (exerciseData: typeof COMMON_EXERCISES[0]) => {
    const newExerciseId = `exercise-${Date.now()}`;
    const newSetId = `set-1`;

    const newExercise = {
      id: newExerciseId,
      exerciseKey: exerciseData.key,
      name: exerciseData.name,
      muscles: exerciseData.muscles,
      equipment: exerciseData.equipment,
      sets: [
        {
          id: newSetId,
          type: 'standard' as const,
          targetReps: 10,
          targetWeight: 0,
          restTime: 60,
        },
      ],
      restBetweenSets: 60,
    };

    const updatedTemplate = {
      ...modifiedTemplate,
      exercises: [...modifiedTemplate.exercises, newExercise],
    };

    setModifiedTemplate(updatedTemplate);
    setHasModifications(true);
    onTemplateModified?.(updatedTemplate);

    // Initialize progress for the new exercise
    setExerciseProgress(prev => ({
      ...prev,
      [newExerciseId]: {
        exerciseId: newExerciseId,
        sets: [
          {
            setId: newSetId,
            completed: false,
            actualReps: 10,
            actualWeight: 0,
          },
        ],
        completed: false,
      },
    }));

    setShowAddExercise(false);
    setExerciseSearch('');
  };

  const removeExercise = (exerciseId: string) => {
    const updatedTemplate = {
      ...modifiedTemplate,
      exercises: modifiedTemplate.exercises.filter(ex => ex.id !== exerciseId),
    };

    setModifiedTemplate(updatedTemplate);
    setHasModifications(true);
    onTemplateModified?.(updatedTemplate);

    // Remove from progress tracking
    setExerciseProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[exerciseId];
      return newProgress;
    });
  };

  const filteredExercises = COMMON_EXERCISES.filter(exercise =>
    exercise.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
    exercise.muscles.some(muscle => muscle.toLowerCase().includes(exerciseSearch.toLowerCase()))
  );

  const getExerciseStats = (exerciseId: string) => {
    const progress = exerciseProgress[exerciseId];
    if (!progress) return { completed: 0, total: 0, volume: 0 };

    const completed = progress.sets.filter(set => set.completed).length;
    const total = progress.sets.length;
    const volume = progress.sets.reduce((sum, set) => {
      if (set.completed && set.actualReps && set.actualWeight) {
        return sum + (set.actualReps * set.actualWeight);
      }
      return sum;
    }, 0);

    return { completed, total, volume };
  };

  const getOverallProgress = () => {
    const allSets = Object.values(exerciseProgress).flatMap(ex => ex.sets);
    const completedSets = allSets.filter(set => set.completed || set.skipped).length;
    const totalSets = allSets.length;
    const totalVolume = allSets.reduce((sum, set) => {
      if (set.completed && set.actualReps && set.actualWeight) {
        return sum + (set.actualReps * set.actualWeight);
      }
      return sum;
    }, 0);

    return {
      completedSets,
      totalSets,
      totalVolume,
      percentage: totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0,
    };
  };

  const overallProgress = getOverallProgress();

  return (
    <div className="space-y-6">
      {/* Overall Progress Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-500"></div>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Workout Progress
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Track your actual performance vs planned
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {overallProgress.percentage}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {overallProgress.completedSets}/{overallProgress.totalSets} sets
              </div>
              {hasModifications && (
                <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  ⚠️ Modified
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {overallProgress.completedSets}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Sets Completed</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatVolume(overallProgress.totalVolume, useMetric)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Volume Lifted</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {modifiedTemplate.exercises.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Exercises</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${overallProgress.percentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Exercise Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-purple-500 to-pink-500"></div>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Add Exercise
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Customize your workout on the fly
              </p>
            </div>
            <div className="flex items-center gap-2">
              {showAddExercise && (
                <button
                  onClick={() => {
                    setShowAddExercise(false);
                    setExerciseSearch('');
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => setShowAddExercise(!showAddExercise)}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                {showAddExercise ? 'Close' : 'Add Exercise'}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showAddExercise && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search exercises..."
                    value={exerciseSearch}
                    onChange={(e) => setExerciseSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                  {filteredExercises.map((exercise) => (
                    <button
                      key={exercise.key}
                      onClick={() => addExercise(exercise)}
                      className="p-3 text-left border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="font-medium text-gray-900 dark:text-white">
                        {exercise.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {exercise.muscles.join(', ')}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Cancel button for add exercise modal */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {filteredExercises.length} exercise{filteredExercises.length !== 1 ? 's' : ''} found
                  </p>
                  <button
                    onClick={() => {
                      setShowAddExercise(false);
                      setExerciseSearch('');
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Exercise List */}
      <div className="space-y-4">
        {modifiedTemplate.exercises.map((exercise, index) => {
          const progress = exerciseProgress[exercise.id];
          const stats = getExerciseStats(exercise.id);
          const isExpanded = expandedExercise === exercise.id;

          return (
            <motion.div
              key={exercise.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden"
            >
              <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-500"></div>
              <div className="p-6">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedExercise(isExpanded ? null : exercise.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${
                      progress?.completed 
                        ? 'bg-green-100 dark:bg-green-900/30' 
                        : 'bg-blue-100 dark:bg-blue-900/30'
                    }`}>
                      {progress?.completed ? (
                        <CheckCircleIconSolid className="w-6 h-6 text-green-600 dark:text-green-400" />
                      ) : (
                        <div className="w-6 h-6 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                        {exercise.name}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>{stats.completed}/{stats.total} sets</span>
                        <span>•</span>
                        <span>{formatVolume(stats.volume, useMetric)} volume</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addExtraSet(exercise.id);
                      }}
                      className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                      title="Add extra set"
                    >
                      <PlusIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Remove ${exercise.name} from workout?`)) {
                          removeExercise(exercise.id);
                        }
                      }}
                      className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                      title="Remove exercise"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {Math.round((stats.completed / stats.total) * 100)}%
                      </div>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && progress && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-6 space-y-3"
                    >
                      {progress.sets.map((setProgress, setIndex) => {
                        const templateSet = exercise.sets.find(s => s.id === setProgress.setId);
                        const isExtraSet = !templateSet;

                        return (
                          <div
                            key={setProgress.setId}
                            className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                              setProgress.completed
                                ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                                : setProgress.skipped
                                ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20'
                                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                  Set {setIndex + 1} {isExtraSet && '(Extra)'}
                                </span>
                                {templateSet && (
                                  <span className="text-xs text-gray-500 dark:text-gray-500">
                                    Target: {typeof templateSet.targetReps === 'number' ? templateSet.targetReps : `${templateSet.targetReps?.min}-${templateSet.targetReps?.max}`} reps
                                    {templateSet.targetWeight && ` @ ${templateSet.targetWeight}${useMetric ? 'kg' : 'lbs'}`}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => skipSet(exercise.id, setProgress.setId)}
                                  disabled={setProgress.completed}
                                  className="p-1 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded transition-colors disabled:opacity-50"
                                  title="Skip set"
                                >
                                  <XMarkIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => toggleSetCompletion(exercise.id, setProgress.setId)}
                                  className={`p-1 rounded transition-colors ${
                                    setProgress.completed
                                      ? 'text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30'
                                      : 'text-gray-400 hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30'
                                  }`}
                                  title={setProgress.completed ? 'Mark incomplete' : 'Mark complete'}
                                >
                                  <CheckCircleIcon className="w-5 h-5" />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                  Reps
                                </label>
                                <input
                                  type="number"
                                  value={setProgress.actualReps || ''}
                                  onChange={(e) => updateSetProgress(exercise.id, setProgress.setId, {
                                    actualReps: parseInt(e.target.value) || undefined
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                  Weight ({useMetric ? 'kg' : 'lbs'})
                                </label>
                                <input
                                  type="number"
                                  step="0.5"
                                  value={setProgress.actualWeight || ''}
                                  onChange={(e) => updateSetProgress(exercise.id, setProgress.setId, {
                                    actualWeight: parseFloat(e.target.value) || undefined
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                  RPE (1-10)
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={setProgress.actualRpe || ''}
                                  onChange={(e) => updateSetProgress(exercise.id, setProgress.setId, {
                                    actualRpe: parseInt(e.target.value) || undefined
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                                  placeholder="RPE"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                  Rest (sec)
                                </label>
                                <input
                                  type="number"
                                  value={setProgress.restTime || ''}
                                  onChange={(e) => updateSetProgress(exercise.id, setProgress.setId, {
                                    restTime: parseInt(e.target.value) || undefined
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                                  placeholder="60"
                                />
                              </div>
                            </div>

                            {/* Set Notes */}
                            <div className="mt-3">
                              <input
                                type="text"
                                value={setProgress.notes || ''}
                                onChange={(e) => updateSetProgress(exercise.id, setProgress.setId, {
                                  notes: e.target.value
                                })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                                placeholder="Set notes (e.g., felt easy, form breakdown, etc.)"
                              />
                            </div>
                          </div>
                        );
                      })}

                      {/* Exercise Notes */}
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                          Exercise Notes
                        </label>
                        <textarea
                          value={progress.exerciseNotes || ''}
                          onChange={(e) => setExerciseProgress(prev => ({
                            ...prev,
                            [exercise.id]: {
                              ...prev[exercise.id],
                              exerciseNotes: e.target.value,
                            },
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm resize-none"
                          rows={2}
                          placeholder="Overall thoughts on this exercise..."
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
