'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircleIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';
import { WorkoutTemplateData, ExercisePerformance, PerformedSet } from '@/types/workout';
import { formatVolume } from '@/utils/formatters';
import { exercises as exerciseLibrary } from '@/lib/exercises';
import { parseDuration, formatDurationInput, formatDurationHuman } from '@/utils/durationUtils';

const springSnappy = { type: 'spring' as const, stiffness: 400, damping: 30, mass: 0.8 };
const springBouncy = { type: 'spring' as const, stiffness: 300, damping: 20, mass: 0.7 };
const springGentle = { type: 'spring' as const, stiffness: 200, damping: 25, mass: 0.9 };

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

  useEffect(() => {
    onPerformanceUpdateRef.current = onPerformanceUpdate;
    onExerciseProgressUpdateRef.current = onExerciseProgressUpdate;
  }, [onPerformanceUpdate, onExerciseProgressUpdate]);

  useEffect(() => {
    setModifiedTemplate(template);
  }, [template]);

  useEffect(() => {
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
  }, [initialExerciseProgress]);

  useEffect(() => {
    if (!isInitialized.current) return;
    setExerciseProgress(prev => {
      const updated = { ...prev };
      let hasChanges = false;
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
      Object.keys(updated).forEach(exerciseId => {
        if (!modifiedTemplate.exercises.find(ex => ex.id === exerciseId)) {
          delete updated[exerciseId];
          hasChanges = true;
        }
      });
      return hasChanges ? updated : prev;
    });
  }, [modifiedTemplate.exercises]);

  useEffect(() => {
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
    const performanceString = JSON.stringify(performance);
    if (performanceString !== lastPerformanceRef.current) {
      lastPerformanceRef.current = performanceString;
      onPerformanceUpdateRef.current(performance);
    }
  }, [exerciseProgress, modifiedTemplate.exercises]);

  useEffect(() => {
    if (onExerciseProgressUpdateRef.current && Object.keys(exerciseProgress).length > 0) {
      onExerciseProgressUpdateRef.current(exerciseProgress);
    }
  }, [exerciseProgress]);

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
    updateSetProgress(exerciseId, setId, { skipped: true, completed: false });
  };

  const addExtraSet = (exerciseId: string) => {
    const exercise = modifiedTemplate.exercises.find(ex => ex.id === exerciseId);
    if (!exercise) return;
    const lastSet = exercise.sets[exercise.sets.length - 1];
    const newSetId = `extra-set-${Date.now()}`;
    const updatedTemplate = {
      ...modifiedTemplate,
      exercises: modifiedTemplate.exercises.map(ex =>
        ex.id === exerciseId
          ? { ...ex, sets: [...ex.sets, { id: newSetId, type: lastSet.type, targetReps: lastSet.targetReps, targetWeight: lastSet.targetWeight, targetDuration: lastSet.targetDuration, restTime: lastSet.restTime }] }
          : ex
      ),
    };
    setExerciseProgress(prev => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        sets: [...prev[exerciseId].sets, { setId: newSetId, completed: false, actualReps: typeof lastSet.targetReps === 'number' ? lastSet.targetReps : lastSet.targetReps?.min, actualWeight: lastSet.targetWeight, actualDuration: lastSet.targetDuration }],
      },
    }));
    setModifiedTemplate(updatedTemplate);
    setHasModifications(true);
    onTemplateModified?.(updatedTemplate);
  };

  const addExercise = (exerciseData: typeof COMMON_EXERCISES[0]) => {
    const newExerciseId = `exercise-${Date.now()}`;
    const newSetId = 'set-1';
    const newExercise = {
      id: newExerciseId,
      exerciseKey: exerciseData.key,
      name: exerciseData.name,
      muscles: exerciseData.muscles,
      equipment: exerciseData.equipment,
      sets: [{ id: newSetId, type: 'standard' as const, targetReps: 10, targetWeight: 0, restTime: 60 }],
      restBetweenSets: 60,
    };
    const updatedTemplate = { ...modifiedTemplate, exercises: [...modifiedTemplate.exercises, newExercise] };
    setModifiedTemplate(updatedTemplate);
    setHasModifications(true);
    onTemplateModified?.(updatedTemplate);
    setExerciseProgress(prev => ({
      ...prev,
      [newExerciseId]: { exerciseId: newExerciseId, sets: [{ setId: newSetId, completed: false, actualReps: 10, actualWeight: 0 }], completed: false },
    }));
    setShowAddExercise(false);
    setExerciseSearch('');
  };

  const removeExercise = (exerciseId: string) => {
    const updatedTemplate = { ...modifiedTemplate, exercises: modifiedTemplate.exercises.filter(ex => ex.id !== exerciseId) };
    setModifiedTemplate(updatedTemplate);
    setHasModifications(true);
    onTemplateModified?.(updatedTemplate);
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
    return { completedSets, totalSets, totalVolume, percentage: totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0 };
  };

  const overallProgress = getOverallProgress();

  return (
    <div className="space-y-6">
      {/* Overall Progress Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springSnappy}
        className="forge-card overflow-hidden"
      >
        <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-500"></div>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-display font-bold tracking-wide text-surface-800 dark:text-white">Workout Progress</h3>
              <p className="text-surface-500 dark:text-surface-600">Track your actual performance vs planned</p>
            </div>
            <div className="text-right">
              <motion.div
                className="text-3xl font-display font-bold tracking-wide text-green-600 dark:text-green-400"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ ...springBouncy, delay: 0.3 }}
              >
                {overallProgress.percentage}%
              </motion.div>
              <div className="text-sm text-surface-500 dark:text-surface-600">
                {overallProgress.completedSets}/{overallProgress.totalSets} sets
              </div>
              {hasModifications && (
                <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">{'\u26a0\uFE0F'} Modified</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { value: overallProgress.completedSets, label: 'Sets Completed' },
              { value: formatVolume(overallProgress.totalVolume, useMetric), label: 'Volume Lifted' },
              { value: modifiedTemplate.exercises.length, label: 'Exercises' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springSnappy, delay: i * 0.1 + 0.2 }}
                className="bg-surface-950 dark:bg-surface-200/50 rounded-xl p-4 text-center"
              >
                <div className="text-2xl font-display font-bold tracking-wide text-surface-800 dark:text-white">{stat.value}</div>
                <div className="text-sm text-surface-500 dark:text-surface-600">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-surface-200 dark:bg-surface-200 rounded-full h-3 overflow-hidden">
              <motion.div
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${overallProgress.percentage}%` }}
                transition={{ ...springBouncy, delay: 0.5 }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Add Exercise Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springSnappy, delay: 0.1 }}
        className="forge-card overflow-hidden"
      >
        <div className="h-2 bg-gradient-to-r from-forge-500 to-pink-500"></div>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-display font-bold text-surface-800 dark:text-white">Add Exercise</h3>
              <p className="text-surface-500 dark:text-surface-600">Customize your workout on the fly</p>
            </div>
            <div className="flex items-center gap-2">
              {showAddExercise && (
                <button
                  onClick={() => { setShowAddExercise(false); setExerciseSearch(''); }}
                  className="px-4 py-2 border border-surface-300 dark:border-surface-400 text-surface-600 dark:text-surface-800 rounded-lg hover:bg-surface-950 dark:hover:bg-surface-200 transition-colors"
                >
                  Cancel
                </button>
              )}
              <motion.button
                onClick={() => setShowAddExercise(!showAddExercise)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={springSnappy}
                className="px-4 py-2 bg-forge-500 hover:bg-purple-600 text-white rounded-lg flex items-center gap-2"
              >
                <motion.span
                  animate={{ rotate: showAddExercise ? 45 : 0 }}
                  transition={springSnappy}
                >
                  <PlusIcon className="w-4 h-4" />
                </motion.span>
                {showAddExercise ? 'Close' : 'Add Exercise'}
              </motion.button>
            </div>
          </div>

          <AnimatePresence>
            {showAddExercise && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={springSnappy}
                className="space-y-4"
              >
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-surface-600" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search exercises..."
                    value={exerciseSearch}
                    onChange={(e) => setExerciseSearch(e.target.value)}
                    className="form-input !pl-10"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                  {filteredExercises.map((exercise) => (
                    <button
                      key={exercise.key}
                      onClick={() => addExercise(exercise)}
                      className="p-3 text-left border border-surface-200 dark:border-surface-400 rounded-lg hover:bg-surface-950 dark:hover:bg-surface-200 transition-colors"
                    >
                      <div className="font-medium text-surface-800 dark:text-white">{exercise.name}</div>
                      <div className="text-sm text-surface-500 dark:text-surface-600">{exercise.muscles.join(', ')}</div>
                    </button>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-surface-200 dark:border-surface-400">
                  <p className="text-sm text-surface-500 dark:text-surface-600">
                    {filteredExercises.length} exercise{filteredExercises.length !== 1 ? 's' : ''} found
                  </p>
                  <button
                    onClick={() => { setShowAddExercise(false); setExerciseSearch(''); }}
                    className="px-4 py-2 border border-surface-300 dark:border-surface-400 text-surface-600 dark:text-surface-800 rounded-lg hover:bg-surface-950 dark:hover:bg-surface-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

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
              transition={{ ...springSnappy, delay: index * 0.08 }}
              className="forge-card overflow-hidden"
            >
              <div className="h-2 bg-gradient-to-r from-forge-500 to-forge-700"></div>
              <div className="p-6">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedExercise(isExpanded ? null : exercise.id)}
                >
                  <div className="flex items-center gap-4">
                    <motion.div
                      className={`p-3 rounded-xl ${progress?.completed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-forge-100 dark:bg-forge-900/30'}`}
                      initial={{ scale: progress?.completed ? 1.2 : 1 }}
                      animate={{ scale: 1 }}
                      transition={springBouncy}
                      key={progress?.completed ? 'completed' : 'pending'}
                    >
                      {progress?.completed ? (
                        <CheckCircleIconSolid className="w-6 h-6 text-green-600 dark:text-green-400" />
                      ) : (
                        <div className="w-6 h-6 bg-forge-600 dark:bg-blue-400 rounded-full"></div>
                      )}
                    </motion.div>
                    <div>
                      <h4 className="text-lg font-display font-bold text-surface-800 dark:text-white">{exercise.name}</h4>
                      <div className="flex items-center gap-4 text-sm text-surface-500 dark:text-surface-600">
                        <span>{stats.completed}/{stats.total} sets</span>
                        <span>{'\u2022'}</span>
                        <span>{formatVolume(stats.volume, useMetric)} volume</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.button
                      onClick={(e) => { e.stopPropagation(); addExtraSet(exercise.id); }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      transition={springSnappy}
                      className="p-2 bg-forge-100 dark:bg-forge-900/30 text-forge-600 dark:text-forge-400 rounded-lg hover:bg-purple-200 dark:hover:bg-forge-900/50 transition-colors"
                      title="Add extra set"
                    >
                      <PlusIcon className="w-4 h-4" />
                    </motion.button>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm(`Remove ${exercise.name} from workout?`)) { removeExercise(exercise.id); } }}
                      className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                      title="Remove exercise"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                    <div className="text-right">
                      <div className="text-lg font-display font-bold text-surface-800 dark:text-white">
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
                      transition={springSnappy}
                      className="mt-6 space-y-3"
                    >
                      {progress.sets.map((setProgress, setIndex) => {
                        const templateSet = exercise.sets.find(s => s.id === setProgress.setId);
                        const isExtraSet = !templateSet;

                        return (
                          <div
                            key={setProgress.setId}
                            className={`p-4 rounded-xl border-2 ${
                              setProgress.completed
                                ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                                : setProgress.skipped
                                ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20'
                                : 'border-surface-200 dark:border-surface-400 bg-surface-950 dark:bg-surface-200/50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-surface-500 dark:text-surface-600">
                                  Set {setIndex + 1} {isExtraSet && '(Extra)'}
                                </span>
                                {templateSet && (() => {
                                  const exLib = exerciseLibrary[exercise.exerciseKey as keyof typeof exerciseLibrary];
                                  const isCardioEx = (exLib as any)?.exerciseType === 'cardio';
                                  if (isCardioEx) {
                                    return (
                                      <span className="text-xs text-surface-500">
                                        Target: {templateSet.targetDuration ? formatDurationHuman(templateSet.targetDuration) : '—'}
                                        {templateSet.targetDistance && ` / ${templateSet.targetDistance}${useMetric ? 'km' : 'mi'}`}
                                      </span>
                                    );
                                  }
                                  return (
                                    <span className="text-xs text-surface-500">
                                      Target: {typeof templateSet.targetReps === 'number' ? templateSet.targetReps : `${templateSet.targetReps?.min}-${templateSet.targetReps?.max}`} reps
                                      {templateSet.targetWeight && ` @ ${templateSet.targetWeight}${useMetric ? 'kg' : 'lbs'}`}
                                    </span>
                                  );
                                })()}
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
                                <motion.button
                                  onClick={() => toggleSetCompletion(exercise.id, setProgress.setId)}
                                  whileHover={{ scale: 1.15 }}
                                  whileTap={{ scale: 0.85 }}
                                  transition={springSnappy}
                                  className={`p-1 rounded ${
                                    setProgress.completed
                                      ? 'text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30'
                                      : 'text-surface-600 hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30'
                                  }`}
                                  title={setProgress.completed ? 'Mark incomplete' : 'Mark complete'}
                                >
                                  <motion.span
                                    initial={{ scale: setProgress.completed ? 1.3 : 1 }}
                                    animate={{ scale: 1 }}
                                    transition={springBouncy}
                                    key={String(setProgress.completed)}
                                  >
                                    <CheckCircleIcon className="w-5 h-5" />
                                  </motion.span>
                                </motion.button>
                              </div>
                            </div>

                            {(() => {
                              const exLib = exerciseLibrary[exercise.exerciseKey as keyof typeof exerciseLibrary];
                              const isCardio = (exLib as any)?.exerciseType === 'cardio';

                              if (isCardio) {
                                return (
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    <div>
                                      <label className="form-label">Duration</label>
                                      <input
                                        type="text"
                                        value={setProgress.actualDuration ? formatDurationInput(setProgress.actualDuration) : ''}
                                        onChange={(e) => {
                                          const parsed = parseDuration(e.target.value);
                                          if (parsed !== null) updateSetProgress(exercise.id, setProgress.setId, { actualDuration: parsed });
                                        }}
                                        className="form-input !py-2 !px-3 text-sm"
                                        placeholder="30:00"
                                      />
                                    </div>
                                    <div>
                                      <label className="form-label">RPE (1-10)</label>
                                      <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={setProgress.actualRpe || ''}
                                        onChange={(e) => updateSetProgress(exercise.id, setProgress.setId, { actualRpe: parseInt(e.target.value) || undefined })}
                                        className="form-input !py-2 !px-3 text-sm"
                                        placeholder="RPE"
                                      />
                                    </div>
                                    <div>
                                      <label className="form-label">Rest (sec)</label>
                                      <input
                                        type="number"
                                        value={setProgress.restTime || ''}
                                        onChange={(e) => updateSetProgress(exercise.id, setProgress.setId, { restTime: parseInt(e.target.value) || undefined })}
                                        className="form-input !py-2 !px-3 text-sm"
                                        placeholder="60"
                                      />
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  <div>
                                    <label className="form-label">Reps</label>
                                    <input
                                      type="number"
                                      value={setProgress.actualReps || ''}
                                      onChange={(e) => updateSetProgress(exercise.id, setProgress.setId, { actualReps: parseInt(e.target.value) || undefined })}
                                      className="form-input !py-2 !px-3 text-sm"
                                      placeholder="0"
                                    />
                                  </div>
                                  <div>
                                    <label className="form-label">
                                      Weight ({useMetric ? 'kg' : 'lbs'})
                                    </label>
                                    <input
                                      type="number"
                                      step="0.5"
                                      value={setProgress.actualWeight || ''}
                                      onChange={(e) => updateSetProgress(exercise.id, setProgress.setId, { actualWeight: parseFloat(e.target.value) || undefined })}
                                      className="form-input !py-2 !px-3 text-sm"
                                      placeholder="0"
                                    />
                                  </div>
                                  <div>
                                    <label className="form-label">RPE (1-10)</label>
                                    <input
                                      type="number"
                                      min="1"
                                      max="10"
                                      value={setProgress.actualRpe || ''}
                                      onChange={(e) => updateSetProgress(exercise.id, setProgress.setId, { actualRpe: parseInt(e.target.value) || undefined })}
                                      className="form-input !py-2 !px-3 text-sm"
                                      placeholder="RPE"
                                    />
                                  </div>
                                  <div>
                                    <label className="form-label">Rest (sec)</label>
                                    <input
                                      type="number"
                                      value={setProgress.restTime || ''}
                                      onChange={(e) => updateSetProgress(exercise.id, setProgress.setId, { restTime: parseInt(e.target.value) || undefined })}
                                      className="form-input !py-2 !px-3 text-sm"
                                      placeholder="60"
                                    />
                                  </div>
                                </div>
                              );
                            })()}

                            <div className="mt-3">
                              <input
                                type="text"
                                value={setProgress.notes || ''}
                                onChange={(e) => updateSetProgress(exercise.id, setProgress.setId, { notes: e.target.value })}
                                className="form-input !py-2 !px-3 text-sm"
                                placeholder="Set notes (e.g., felt easy, form breakdown, etc.)"
                              />
                            </div>
                          </div>
                        );
                      })}

                      <div className="mt-4">
                        <label className="form-label">Exercise Notes</label>
                        <textarea
                          value={progress.exerciseNotes || ''}
                          onChange={(e) => setExerciseProgress(prev => ({ ...prev, [exercise.id]: { ...prev[exercise.id], exerciseNotes: e.target.value } }))}
                          className="form-input !py-2 !px-3 text-sm resize-none"
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
