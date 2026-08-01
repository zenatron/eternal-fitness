'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
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
import { performedSetsVolume, weightUnitLabel } from '@/lib/volume';
import {
  canonicalExerciseKey,
  isBarbellExercise,
  isCardioExercise,
  searchExercises,
  type ExerciseSearchResult,
} from '@/lib/exerciseLookup';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { parseDuration, formatDurationInput, formatDurationHuman } from '@/utils/durationUtils';
import { useRestTimer } from './RestTimerProvider';
import { StepperInput } from './StepperInput';
import { SetInsights } from './SetInsights';
import { bestOneRepMax, formatOneRepMax } from '@/utils/oneRepMax';
import { playSetComplete } from '@/lib/workout/feedback';
import { useLastPerformance } from '@/lib/hooks/useLastPerformance';
import { springSnappy, springBouncy } from '@/lib/motion';


/**
 * Weight increments differ by unit: 2.5kg is the smallest pair of plates in a
 * metric gym, 5lb in an imperial one. Stepping by 1 would be useless in both.
 */
const WEIGHT_STEP_METRIC = 2.5;
const WEIGHT_STEP_IMPERIAL = 5;

/** Fallback rest when neither the set nor the exercise specifies one. */
const DEFAULT_REST_SECONDS = 90;

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
  /** Exercise queued for removal, pending confirmation. */
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);
  const isInitialized = useRef(false);
  const lastPerformanceRef = useRef<string>('');
  const onPerformanceUpdateRef = useRef(onPerformanceUpdate);
  const onExerciseProgressUpdateRef = useRef(onExerciseProgressUpdate);

  const restTimer = useRestTimer();
  const weightStep = useMetric ? WEIGHT_STEP_METRIC : WEIGHT_STEP_IMPERIAL;

  // "Last time" reference values, keyed by exercise.
  const { data: lastPerformance } = useLastPerformance(
    modifiedTemplate.exercises.map((exercise) => exercise.exerciseKey)
  );

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
      const totalVolume = performedSetsVolume(performedSets, exercise.perSide);
      const completedSets = performedSets.filter(set => set.completed);
      const averageRpe = completedSets.length > 0
        ? completedSets.reduce((sum, set) => sum + (set.actualRpe || 0), 0) / completedSets.length
        : undefined;
      performance[progress.exerciseId] = {
        exerciseKey: exercise.exerciseKey,
        // Snapshotted so the logged session stays self-describing even if the
        // template's per-side setting changes later.
        perSide: exercise.perSide,
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

    // Completing a set is the natural trigger for rest — the whole reason
    // `restTime` was being stored. Un-completing cancels it, since the rest was
    // started by a tap the user has just taken back.
    if (!newCompletedState) {
      restTimer.skip();
      return;
    }

    playSetComplete();
    startRestAfterSet(exerciseId, setId);
  };

  /**
   * Kicks off the rest countdown using the most specific duration available:
   * the set's own rest, then the exercise default, then a sane fallback.
   */
  const startRestAfterSet = (exerciseId: string, setId: string) => {
    const exercise = modifiedTemplate.exercises.find(ex => ex.id === exerciseId);
    if (!exercise) return;

    const setProgress = exerciseProgress[exerciseId]?.sets.find(s => s.setId === setId);
    const templateSet = exercise.sets.find(s => s.id === setId);

    const restSeconds =
      setProgress?.restTime ??
      templateSet?.restTime ??
      exercise.restBetweenSets ??
      DEFAULT_REST_SECONDS;

    if (restSeconds <= 0) return;

    // Name the next thing up so a glance at the timer is enough to know what's
    // coming, without reopening the app.
    const remaining = exerciseProgress[exerciseId]?.sets.filter(
      s => s.setId !== setId && !s.completed && !s.skipped
    ).length ?? 0;

    const nextLabel =
      remaining > 0
        ? `${exercise.name} · ${remaining} set${remaining === 1 ? '' : 's'} left`
        : exercise.name;

    restTimer.start(restSeconds, nextLabel);
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

  const addExercise = (exerciseData: ExerciseSearchResult) => {
    const newExerciseId = `exercise-${Date.now()}`;
    const newSetId = 'set-1';
    const newExercise = {
      id: newExerciseId,
      // The library's own key, so lookups downstream resolve. The previous
      // hardcoded list used slugs ('bench-press') while the library is keyed by
      // display name, so every mid-workout addition failed to resolve and was
      // silently treated as a strength exercise.
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

  // Ranked search across the whole ~220-exercise library, replacing the
  // hardcoded 12-item list that used to be the only in-workout option.
  const filteredExercises = useMemo(
    () => searchExercises(exerciseSearch),
    [exerciseSearch]
  );

  const getExerciseStats = (exerciseId: string) => {
    const progress = exerciseProgress[exerciseId];
    if (!progress) return { completed: 0, total: 0, volume: 0 };
    const completed = progress.sets.filter(set => set.completed).length;
    const total = progress.sets.length;
    const exercise = modifiedTemplate.exercises.find(ex => ex.id === exerciseId);
    const volume = performedSetsVolume(
      progress.sets as unknown as PerformedSet[],
      exercise?.perSide
    );
    // Best estimated 1RM across the sets logged so far, so the exercise header
    // answers "was this session actually stronger?" without expanding it.
    // Null for cardio, bodyweight and high-rep work, where it means nothing.
    const bestE1RM = isCardioExercise(exercise?.exerciseKey)
      ? null
      : bestOneRepMax(progress.sets);
    return { completed, total, volume, bestE1RM };
  };

  const getOverallProgress = () => {
    const allSets = Object.values(exerciseProgress).flatMap(ex => ex.sets);
    const completedSets = allSets.filter(set => set.completed || set.skipped).length;
    const totalSets = allSets.length;
    // Summed per exercise rather than over a flat set list: the per-side
    // multiplier differs between exercises in the same workout.
    const totalVolume = Object.values(exerciseProgress).reduce((sum, progress) => {
      const exercise = modifiedTemplate.exercises.find(ex => ex.id === progress.exerciseId);
      return sum + performedSetsVolume(
        progress.sets as unknown as PerformedSet[],
        exercise?.perSide
      );
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
        {/* Compacted: the three stat tiles were full-width blocks stacked on
            mobile, pushing the actual exercise list below the fold. They are now
            one inline row, and the descriptive subtitle is gone \u2014 the heading
            and the percentage already say what this is. */}
        <div className="h-2 bg-gradient-to-r from-accent-500 to-accent-700"></div>
        <div className="p-4 sm:p-5">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-display text-lg font-bold uppercase tracking-wide text-surface-50 dark:text-white">
                Workout Progress
              </h3>
              <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-600 tabular">
                {/* Braced, not bare: `\u00B7` in JSX *text* is not an escape
                    sequence, so it rendered as the literal characters
                    "2/8 sets \u00B7 700 lbs". */}
                {overallProgress.completedSets}/{overallProgress.totalSets} sets {'\u00B7'}{' '}
                {formatVolume(overallProgress.totalVolume, useMetric)} {'\u00B7'}{' '}
                {modifiedTemplate.exercises.length} exercises
              </p>
            </div>
            <div className="shrink-0 text-right">
              <motion.div
                className="font-display text-3xl font-bold leading-none tracking-wide tabular text-accent-600 dark:text-accent-400"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ ...springBouncy, delay: 0.3 }}
              >
                {overallProgress.percentage}%
              </motion.div>
              {hasModifications && (
                <div className="mt-1 text-[10px] uppercase tracking-wider text-warning-600 dark:text-warning-400">
                  Modified
                </div>
              )}
            </div>
          </div>

          <div
            className="h-2.5 w-full overflow-hidden rounded-full bg-surface-900 dark:bg-surface-300"
            role="progressbar"
            aria-valuenow={overallProgress.percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Sets completed"
          >
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-400"
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress.percentage}%` }}
              transition={{ ...springBouncy, delay: 0.4 }}
            />
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
        {/* Was `to-pink-500` with a `hover:bg-purple-600` button — leftovers
            from an older palette that clash with the forge accents used
            everywhere else on this screen. */}
        <div className="h-2 bg-gradient-to-r from-accent-500 to-accent-700"></div>
        <div className="p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-lg font-display font-bold text-surface-50 dark:text-white">Add Exercise</h3>
              <p className="text-sm text-surface-500 dark:text-surface-600">Customize your workout on the fly</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {showAddExercise && (
                <button
                  onClick={() => { setShowAddExercise(false); setExerciseSearch(''); }}
                  className="min-h-[44px] flex-1 whitespace-nowrap rounded-lg border border-surface-300 px-4 text-surface-600 transition-colors hover:bg-surface-950 dark:border-surface-400 dark:text-surface-800 dark:hover:bg-surface-200 tap-control sm:flex-none"
                >
                  Cancel
                </button>
              )}
              <motion.button
                onClick={() => setShowAddExercise(!showAddExercise)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={springSnappy}
                // The label duplicated the heading beside it and wrapped onto
                // two lines; "Add" reads the same in context and fits.
                className="flex min-h-[44px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-accent-500 px-5 text-white transition-colors hover:bg-accent-600 tap-control sm:flex-none"
              >
                <motion.span
                  animate={{ rotate: showAddExercise ? 45 : 0 }}
                  transition={springSnappy}
                >
                  <PlusIcon className="w-4 h-4" />
                </motion.span>
                {showAddExercise ? 'Close' : 'Add'}
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
                      <div className="font-medium text-surface-50 dark:text-white">{exercise.name}</div>
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
              <div className="h-2 bg-gradient-to-r from-accent-500 to-accent-700"></div>
              <div className="p-4 sm:p-6">
                {/* A real button, not a div-with-onClick: this is the primary
                    control for each exercise and has to be keyboard reachable
                    and announced as expandable. */}
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedExercise(isExpanded ? null : exercise.id)}
                    aria-expanded={isExpanded}
                    aria-controls={`exercise-panel-${exercise.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left tap-control focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 sm:gap-4"
                  >
                    <motion.div
                      className={`shrink-0 p-2.5 sm:p-3 rounded-xl ${progress?.completed ? 'bg-success-100 dark:bg-success-900/30' : 'bg-accent-100 dark:bg-accent-900/30'}`}
                      initial={{ scale: progress?.completed ? 1.2 : 1 }}
                      animate={{ scale: 1 }}
                      transition={springBouncy}
                      key={progress?.completed ? 'completed' : 'pending'}
                    >
                      {progress?.completed ? (
                        <CheckCircleIconSolid className="w-6 h-6 text-success-600 dark:text-success-400" />
                      ) : (
                        // A ring showing how far through this exercise you are,
                        // rather than an opaque coloured block.
                        <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-accent-500/70 text-[10px] font-display font-bold tabular text-accent-600 dark:text-accent-400">
                          {stats.completed}
                        </span>
                      )}
                    </motion.div>
                    <div className="min-w-0">
                      <h4 className="text-lg font-display font-bold text-surface-50 dark:text-white truncate">{exercise.name}</h4>
                      {/* whitespace-nowrap + a tighter gap: at phone width each
                          of these fragments was wrapping onto its own two lines,
                          turning a one-line summary into a six-line block. */}
                      {/* overflow-hidden as well as nowrap: without it a third
                          fragment does not wrap, it runs underneath the add and
                          remove buttons to its right. */}
                      <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap text-xs text-surface-500 dark:text-surface-600 sm:gap-4 sm:text-sm">
                        <span className="tabular">{stats.completed}/{stats.total} sets</span>
                        {/* Volume yields to e1RM below `sm` \u2014 three fragments do
                            not fit at phone width, and volume is the most
                            redundant of them, already shown in the overall
                            progress header and in the expanded panel. */}
                        <span aria-hidden="true" className={stats.bestE1RM ? 'hidden sm:inline' : ''}>
                          {'\u2022'}
                        </span>
                        <span className={`tabular ${stats.bestE1RM ? 'hidden sm:inline' : ''}`}>
                          {formatVolume(stats.volume, useMetric)}
                        </span>
                        {stats.bestE1RM && (
                          <>
                            <span aria-hidden="true">{'\u2022'}</span>
                            <span
                              className="tabular"
                              title={`Best estimated 1RM this session, from ${stats.bestE1RM.reps} reps at ${stats.bestE1RM.weight}`}
                            >
                              {formatOneRepMax(stats.bestE1RM.oneRepMax, useMetric)} e1RM
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                    <motion.button
                      onClick={() => addExtraSet(exercise.id)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      transition={springSnappy}
                      className="touch-target flex items-center justify-center bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400 rounded-lg hover:bg-accent-200 dark:hover:bg-accent-900/50 transition-colors tap-control"
                      aria-label={`Add an extra set to ${exercise.name}`}
                    >
                      <PlusIcon className="w-4 h-4" />
                    </motion.button>
                    <button
                      onClick={() => setPendingRemoval(exercise.id)}
                      className="touch-target flex items-center justify-center bg-danger-100 dark:bg-danger-900/30 text-danger-600 dark:text-danger-400 rounded-lg hover:bg-danger-200 dark:hover:bg-danger-900/50 transition-colors tap-control"
                      aria-label={`Remove ${exercise.name} from this workout`}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                    <div className="hidden text-right sm:block">
                      <div className="text-lg font-display font-bold text-surface-50 dark:text-white tabular">
                        {/* Guard the divide: an exercise with no sets rendered
                            "NaN%" before. */}
                        {stats.total > 0
                          ? Math.round((stats.completed / stats.total) * 100)
                          : 0}
                        %
                      </div>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && progress && (
                    <motion.div
                      id={`exercise-panel-${exercise.id}`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={springSnappy}
                      className="mt-6 space-y-3"
                    >
                      {progress.sets.map((setProgress, setIndex) => {
                        const templateSet = exercise.sets.find(s => s.id === setProgress.setId);
                        const isExtraSet = !templateSet;

                        // What was done for the same set index last time, shown
                        // as a reference so progressive overload is possible
                        // without remembering last week's numbers.
                        const ghostSet = lastPerformance?.[canonicalExerciseKey(exercise.exerciseKey)]
                          ?.sets?.[setIndex];

                        return (
                          <div
                            key={setProgress.setId}
                            className={`p-2.5 sm:p-4 rounded-xl border-2 ${
                              setProgress.completed
                                ? 'border-success-300 dark:border-success-800 bg-success-50 dark:bg-success-900/20'
                                : setProgress.skipped
                                ? 'border-warning-300 dark:border-warning-800 bg-warning-50 dark:bg-warning-900/20'
                                : 'border-surface-900 dark:border-surface-400 bg-surface-950 dark:bg-surface-200/50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-surface-500 dark:text-surface-600">
                                  Set {setIndex + 1} {isExtraSet && '(Extra)'}
                                </span>
                                {templateSet && (() => {
                                  const isCardioEx = isCardioExercise(exercise.exerciseKey);
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
                                  className="touch-target flex items-center justify-center rounded-lg text-award-600 transition-colors hover:bg-award-100 disabled:opacity-40 dark:text-award-400 dark:hover:bg-award-900/30 tap-control"
                                  aria-label={`Skip set ${setIndex + 1}`}
                                >
                                  <XMarkIcon className="w-4 h-4" />
                                </button>
                                <motion.button
                                  onClick={() => toggleSetCompletion(exercise.id, setProgress.setId)}
                                  whileHover={{ scale: 1.15 }}
                                  whileTap={{ scale: 0.85 }}
                                  transition={springSnappy}
                                  className={`touch-target flex items-center justify-center rounded-lg tap-control ${
                                    setProgress.completed
                                      ? 'text-success-600 dark:text-success-400 hover:bg-success-100 dark:hover:bg-success-900/30'
                                      : 'text-surface-600 hover:text-success-600 hover:bg-success-100 dark:hover:bg-success-900/30'
                                  }`}
                                  aria-label={
                                    setProgress.completed
                                      ? `Mark set ${setIndex + 1} incomplete`
                                      : `Mark set ${setIndex + 1} complete`
                                  }
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
                              const isCardio = isCardioExercise(exercise.exerciseKey);
                              const fieldPrefix = `${exercise.id}-${setProgress.setId}`;

                              if (isCardio) {
                                return (
                                  <div className="space-y-2.5 md:grid md:grid-cols-3 md:gap-3 md:space-y-0">
                                    <div>
                                      <label
                                        htmlFor={`${fieldPrefix}-duration`}
                                        className="form-label"
                                      >
                                        Duration
                                      </label>
                                      <input
                                        id={`${fieldPrefix}-duration`}
                                        type="text"
                                        inputMode="numeric"
                                        value={setProgress.actualDuration ? formatDurationInput(setProgress.actualDuration) : ''}
                                        onChange={(e) => {
                                          const parsed = parseDuration(e.target.value);
                                          if (parsed !== null) updateSetProgress(exercise.id, setProgress.setId, { actualDuration: parsed });
                                        }}
                                        className="form-input tabular !py-2 !px-3 text-sm"
                                        placeholder="30:00"
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2.5 md:contents">
                                      <StepperInput
                                        id={`${fieldPrefix}-rpe`}
                                        label="RPE"
                                        value={setProgress.actualRpe}
                                        onChange={(actualRpe) => updateSetProgress(exercise.id, setProgress.setId, { actualRpe })}
                                        min={1}
                                        max={10}
                                        ghost={ghostSet?.rpe}
                                        compact
                                      />
                                      <StepperInput
                                        id={`${fieldPrefix}-rest`}
                                        label="Rest"
                                        value={setProgress.restTime}
                                        onChange={(restTime) => updateSetProgress(exercise.id, setProgress.setId, { restTime })}
                                        step={15}
                                        min={0}
                                        max={900}
                                        suffix="s"
                                        compact
                                      />
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                /* Two steppers per row left each numeric field
                                   46px wide on a phone — a 44px button either
                                   side of it. Reps and weight, the fields that
                                   actually get edited mid-set, now take the
                                   full width each; RPE and rest are secondary
                                   and drop their +/- buttons to share a row. */
                                <div className="space-y-2.5 md:grid md:grid-cols-4 md:gap-3 md:space-y-0">
                                  <StepperInput
                                    id={`${fieldPrefix}-reps`}
                                    label="Reps"
                                    value={setProgress.actualReps}
                                    onChange={(actualReps) => updateSetProgress(exercise.id, setProgress.setId, { actualReps })}
                                    min={0}
                                    max={999}
                                    ghost={ghostSet?.reps}
                                  />
                                  <StepperInput
                                    id={`${fieldPrefix}-weight`}
                                    label={`Weight (${weightUnitLabel(useMetric, exercise.perSide)})`}
                                    value={setProgress.actualWeight}
                                    onChange={(actualWeight) => updateSetProgress(exercise.id, setProgress.setId, { actualWeight })}
                                    step={weightStep}
                                    min={0}
                                    allowDecimal
                                    ghost={ghostSet?.weight}
                                  />
                                  <div className="grid grid-cols-2 gap-2.5 md:contents">
                                    <StepperInput
                                      id={`${fieldPrefix}-rpe`}
                                      label="RPE"
                                      value={setProgress.actualRpe}
                                      onChange={(actualRpe) => updateSetProgress(exercise.id, setProgress.setId, { actualRpe })}
                                      min={1}
                                      max={10}
                                      ghost={ghostSet?.rpe}
                                      compact
                                    />
                                    <StepperInput
                                      id={`${fieldPrefix}-rest`}
                                      label="Rest"
                                      value={setProgress.restTime}
                                      onChange={(restTime) => updateSetProgress(exercise.id, setProgress.setId, { restTime })}
                                      step={15}
                                      min={0}
                                      max={900}
                                      suffix="s"
                                      compact
                                    />
                                  </div>
                                </div>
                              );
                            })()}

                            {!isCardioExercise(exercise.exerciseKey) && (
                              <SetInsights
                                exerciseKey={exercise.exerciseKey}
                                exerciseName={exercise.name}
                                isBarbell={isBarbellExercise(exercise.exerciseKey)}
                                weight={setProgress.actualWeight}
                                reps={setProgress.actualReps}
                                useMetric={useMetric}
                              />
                            )}

                            <div className="mt-4 border-t border-surface-900/60 pt-3 dark:border-surface-400/40">
                              <label className="sr-only" htmlFor={`${exercise.id}-${setProgress.setId}-notes`}>
                                Notes for set {setIndex + 1}
                              </label>
                              <input
                                id={`${exercise.id}-${setProgress.setId}-notes`}
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

                      <div className="mt-5 rounded-xl border border-surface-900 bg-surface-950 p-3 dark:border-surface-400/50 dark:bg-surface-200/40">
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

      <ConfirmDialog
        open={pendingRemoval !== null}
        title="Remove exercise?"
        message={
          pendingRemoval
            ? `"${
                modifiedTemplate.exercises.find((ex) => ex.id === pendingRemoval)?.name ??
                'This exercise'
              }" and any sets you've logged for it will be dropped from this workout.`
            : ''
        }
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          if (pendingRemoval) removeExercise(pendingRemoval);
          setPendingRemoval(null);
        }}
        onCancel={() => setPendingRemoval(null)}
      />
    </div>
  );
}
