'use client';

import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';
import { CheckIcon } from '@heroicons/react/20/solid';
import { WorkoutTemplateData, ExercisePerformance, PerformedSet, ActiveSessionUpdatePayload } from '@/types/workout';
import { formatVolume } from '@/utils/formatters';
import { performedSetsVolume, weightUnitLabel } from '@/lib/volume';
import {
  canonicalExerciseKey,
  isBarbellExercise,
  isCardioExercise,
  type ExerciseSearchResult,
} from '@/lib/exerciseLookup';
import { searchExercises } from '@/lib/exerciseSearch';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { parseDuration, formatDurationInput, formatDurationHuman } from '@/utils/durationUtils';
import { useRestTimerActions } from './RestTimerProvider';
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
  /**
   * Called with the full derived session state after every edit. One callback
   * rather than separate performance/progress handlers: two handlers meant two
   * provider updates, two context re-renders and two IndexedDB writes per
   * keystroke, for state that changes together and travels together.
   */
  onSessionUpdate: (updates: ActiveSessionUpdatePayload) => void;
  onTemplateModified?: (modifiedTemplate: WorkoutTemplateData) => void;
  initialExerciseProgress?: { [exerciseId: string]: ExerciseProgress };
  useMetric?: boolean;
}

interface SetProgress {
  setId: string;
  completed: boolean;
  actualReps?: number;
  actualWeight?: number;
  actualDuration?: number;
  actualDistance?: number;
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

function WorkoutProgressTracker({
  template,
  onSessionUpdate,
  onTemplateModified,
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
  const lastProgressRef = useRef<{ [exerciseId: string]: ExerciseProgress } | null>(null);
  const onSessionUpdateRef = useRef(onSessionUpdate);

  // Actions only: subscribing to the countdown state here would re-render this
  // 950-line tree four times a second while a rest runs — right when the user
  // is typing weights into these inputs.
  const restTimer = useRestTimerActions();
  const weightStep = useMetric ? WEIGHT_STEP_METRIC : WEIGHT_STEP_IMPERIAL;

  // "Last time" reference values, keyed by exercise.
  const { data: lastPerformance } = useLastPerformance(
    modifiedTemplate.exercises.map((exercise) => exercise.exerciseKey)
  );

  useEffect(() => {
    onSessionUpdateRef.current = onSessionUpdate;
  }, [onSessionUpdate]);

  /*
   * Open the first exercise with work left, once, when progress first loads.
   * Everything used to start collapsed, so the first thing every workout asked
   * for was a tap to find out what to do.
   */
  const autoExpandedRef = useRef(false);
  useEffect(() => {
    if (autoExpandedRef.current || Object.keys(exerciseProgress).length === 0) return;
    autoExpandedRef.current = true;
    const next = modifiedTemplate.exercises.find((exercise) =>
      exerciseProgress[exercise.id]?.sets.some((set) => !set.completed && !set.skipped)
    );
    if (next) setExpandedExercise(next.id);
  }, [exerciseProgress, modifiedTemplate.exercises]);

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
            actualDistance: set.targetDistance,
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
              actualDistance: set.targetDistance,
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

  /*
   * One effect, one provider update, one IndexedDB write per edit. This used to
   * be two effects that each called `applyUpdate` with their half of the state,
   * so every keystroke in a set field re-rendered every context consumer twice
   * and wrote the whole workout blob to IndexedDB twice.
   */
  useEffect(() => {
    // Templates always carry at least one exercise, so an empty map can only
    // mean "the init effect above has set state that has not landed in this
    // render yet". Publishing here pushed an empty performance blob to the
    // provider (and to the server, and into IndexedDB) before the real
    // progress overwrote it one render later — a crash/kill window on every
    // refresh mid-workout.
    if (Object.keys(exerciseProgress).length === 0) return;
    const performance: { [exerciseId: string]: ExercisePerformance } = {};
    Object.values(exerciseProgress).forEach((progress) => {
      const exercise = modifiedTemplate.exercises.find(ex => ex.id === progress.exerciseId);
      if (!exercise) return;
      const performedSets: PerformedSet[] = progress.sets.map((setProgress) => ({
        setId: setProgress.setId,
        actualReps: setProgress.actualReps,
        actualWeight: setProgress.actualWeight,
        actualDuration: setProgress.actualDuration,
        // Never captured live before: cardio distance only existed for
        // retro-logged workouts, so live runs set no distance PRs.
        actualDistance: setProgress.actualDistance,
        actualRpe: setProgress.actualRpe,
        restTime: setProgress.restTime,
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

    // Skip runs where nothing actually moved (e.g. a template-shape change that
    // derives identical performance), mirroring the old diff guard.
    const performanceString = JSON.stringify(performance);
    if (performanceString === lastPerformanceRef.current && exerciseProgress === lastProgressRef.current) {
      return;
    }
    lastPerformanceRef.current = performanceString;
    lastProgressRef.current = exerciseProgress;

    onSessionUpdateRef.current({ performance, exerciseProgress });
  }, [exerciseProgress, modifiedTemplate.exercises]);

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

    // Last set of this exercise done: move straight on to the next one with
    // work left, so the next tap is a set rather than a hunt for the card.
    const othersDone = (exerciseProgress[exerciseId]?.sets ?? []).every(
      (set) => set.setId === setId || set.completed || set.skipped
    );
    if (othersDone) {
      const currentIndex = modifiedTemplate.exercises.findIndex((ex) => ex.id === exerciseId);
      const next = [
        ...modifiedTemplate.exercises.slice(currentIndex + 1),
        ...modifiedTemplate.exercises.slice(0, currentIndex),
      ].find((ex) => exerciseProgress[ex.id]?.sets.some((set) => !set.completed && !set.skipped));
      if (next) setExpandedExercise(next.id);
    }
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
    // coming, without reopening the app. When nothing remains in THIS
    // exercise, look ahead to the next incomplete one — naming a finished
    // exercise ("Next: Bench Press" with every bench set done) is worse than
    // naming nothing.
    const remaining = exerciseProgress[exerciseId]?.sets.filter(
      s => s.setId !== setId && !s.completed && !s.skipped
    ).length ?? 0;

    let nextLabel: string;
    if (remaining > 0) {
      nextLabel = `${exercise.name} · ${remaining} set${remaining === 1 ? '' : 's'} left`;
    } else {
      const currentIndex = modifiedTemplate.exercises.findIndex(ex => ex.id === exerciseId);
      const nextExercise = modifiedTemplate.exercises
        .slice(currentIndex + 1)
        .find(ex => {
          const progress = exerciseProgress[ex.id];
          return progress ? progress.sets.some(s => !s.completed && !s.skipped) : true;
        });
      nextLabel = nextExercise ? nextExercise.name : 'Workout complete';
    }

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
        sets: [...prev[exerciseId].sets, { setId: newSetId, completed: false, actualReps: typeof lastSet.targetReps === 'number' ? lastSet.targetReps : lastSet.targetReps?.min, actualWeight: lastSet.targetWeight, actualDuration: lastSet.targetDuration, actualDistance: lastSet.targetDistance }],
      },
    }));
    setModifiedTemplate(updatedTemplate);
    setHasModifications(true);
    onTemplateModified?.(updatedTemplate);
  };

  const addExercise = (exerciseData: ExerciseSearchResult) => {
    const newExerciseId = `exercise-${Date.now()}`;
    const newSetId = 'set-1';
    const isCardio = exerciseData.exerciseType === 'cardio';
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
      // Carried from the library like the template builder does — without it a
      // dumbbell press added on the fly logged half its volume.
      perSide: exerciseData.perSide,
      sets: [{
        id: newSetId,
        type: 'standard' as const,
        targetReps: isCardio ? undefined : 10,
        targetWeight: 0,
        targetDuration: isCardio ? 300 : undefined,
        // Cardio sets rest 0s, matching the builder's default.
        restTime: isCardio ? 0 : 60,
      }],
      restBetweenSets: isCardio ? 0 : 60,
    };
    const updatedTemplate = { ...modifiedTemplate, exercises: [...modifiedTemplate.exercises, newExercise] };
    setModifiedTemplate(updatedTemplate);
    setHasModifications(true);
    onTemplateModified?.(updatedTemplate);
    setExerciseProgress(prev => ({
      ...prev,
      // Seeded to match the set just created: a cardio exercise used to start
      // with 10 reps at 0 weight and no duration.
      [newExerciseId]: {
        exerciseId: newExerciseId,
        sets: [isCardio
          ? { setId: newSetId, completed: false, actualDuration: 300 }
          : { setId: newSetId, completed: false, actualReps: 10, actualWeight: 0 }],
        completed: false,
      },
    }));
    setShowAddExercise(false);
    setExerciseSearch('');
    setExpandedExercise(newExerciseId);
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
  // The fuzzy scorer the template builder and log page use, mapped from its
  // tuple shape into the object addExercise expects. The in-workout picker used
  // the plain-includes search, so "db press" found nothing mid-workout while
  // working fine everywhere else.
  const filteredExercises = useMemo(
    () =>
      searchExercises(exerciseSearch)
        .slice(0, 40)
        .map(([key, exercise]) => ({ key, ...exercise })),
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
      {/* Overall progress: one line of figures and a bar. */}
      <div className="forge-card p-4">
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <p className="text-sm text-surface-500 dark:text-surface-600 tabular">
            <span className="font-semibold text-surface-50 dark:text-white">
              {overallProgress.completedSets}/{overallProgress.totalSets}
            </span>{' '}
            sets {'\u00B7'} {formatVolume(overallProgress.totalVolume, useMetric)}
            {hasModifications && <span className="ml-2 text-xs text-warning-600 dark:text-warning-400">modified</span>}
          </p>
          <span className="font-display text-lg font-semibold text-surface-50 dark:text-white tabular">
            {overallProgress.percentage}%
          </span>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]"
          role="progressbar"
          aria-valuenow={overallProgress.percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Sets completed"
        >
          <div
            className="h-full rounded-full bg-accent-500 transition-[width] duration-300"
            style={{ width: `${overallProgress.percentage}%` }}
          />
        </div>
      </div>

      {/* Exercise List */}
      <div className="space-y-4">
        {modifiedTemplate.exercises.map((exercise, index) => {
          const progress = exerciseProgress[exercise.id];
          const stats = getExerciseStats(exercise.id);
          const isExpanded = expandedExercise === exercise.id;

          return (
            <div
              key={exercise.id}
              className={`forge-card overflow-hidden ${isExpanded ? 'ring-1 ring-accent-500/40' : ''}`}
            >
              <div className="p-3 sm:p-4">
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
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center">
                      {progress?.completed ? (
                        <CheckCircleIconSolid className="h-7 w-7 text-success-500" />
                      ) : (
                        // Sets done so far, so progress reads without expanding.
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-black/15 text-xs font-semibold tabular text-surface-300 dark:border-white/15 dark:text-surface-900">
                          {stats.completed}
                        </span>
                      )}
                    </span>
                    <div className="min-w-0">
                      <h4 className="truncate text-base font-semibold text-surface-50 dark:text-white">{exercise.name}</h4>
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
                    <button
                      onClick={() => addExtraSet(exercise.id)}
                      className="touch-target tap-control flex items-center justify-center rounded-lg text-surface-500 transition-colors hover:bg-black/[0.05] hover:text-surface-50 dark:text-surface-600 dark:hover:bg-white/[0.06] dark:hover:text-white"
                      aria-label={`Add a set to ${exercise.name}`}
                      title="Add set"
                    >
                      <PlusIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setPendingRemoval(exercise.id)}
                      className="touch-target tap-control flex items-center justify-center rounded-lg text-surface-500 transition-colors hover:bg-danger-500/10 hover:text-danger-500 dark:text-surface-600"
                      aria-label={`Remove ${exercise.name} from this workout`}
                      title="Remove exercise"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
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
                      className="mt-3 space-y-2"
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
                            className={`rounded-lg border p-2.5 sm:p-3 ${
                              setProgress.completed
                                ? 'border-success-500/30 bg-success-500/[0.06]'
                                : setProgress.skipped
                                ? 'border-black/[0.06] bg-black/[0.02] opacity-60 dark:border-white/[0.06] dark:bg-white/[0.02]'
                                : 'border-black/[0.08] dark:border-white/[0.08]'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-surface-50 dark:text-white">
                                  Set {setIndex + 1}
                                  {isExtraSet && <span className="ml-1 font-normal text-surface-500"> · added</span>}
                                  {setProgress.skipped && <span className="ml-1 font-normal text-surface-500"> · skipped</span>}
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
                                  className="touch-target tap-control flex items-center justify-center rounded-lg text-surface-500 transition-colors hover:bg-black/[0.05] disabled:opacity-30 dark:text-surface-600 dark:hover:bg-white/[0.06]"
                                  aria-label={`Skip set ${setIndex + 1}`}
                                  title="Skip set"
                                >
                                  <XMarkIcon className="w-4 h-4" />
                                </button>
                                <motion.button
                                  onClick={() => toggleSetCompletion(exercise.id, setProgress.setId)}
                                  whileTap={{ scale: 0.9 }}
                                  transition={springSnappy}
                                  className={`tap-control flex h-11 min-w-[44px] items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors ${
                                    setProgress.completed
                                      ? 'bg-success-500 text-white hover:bg-success-600'
                                      : 'border border-black/15 text-surface-300 hover:border-success-500 hover:text-success-600 dark:border-white/15 dark:text-surface-900'
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
                                    <CheckIcon className="h-5 w-5" />
                                  </motion.span>
                                  <span className="hidden sm:inline">{setProgress.completed ? 'Done' : 'Log'}</span>
                                </motion.button>
                              </div>
                            </div>

                            {(() => {
                              const isCardio = isCardioExercise(exercise.exerciseKey);
                              const fieldPrefix = `${exercise.id}-${setProgress.setId}`;

                              if (isCardio) {
                                return (
                                  <div className="space-y-2.5 md:grid md:grid-cols-4 md:gap-3 md:space-y-0">
                                    <div className="grid grid-cols-2 gap-2.5 md:contents">
                                      <div>
                                        <label
                                          htmlFor={`${fieldPrefix}-duration`}
                                          className="form-label"
                                        >
                                          Time
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
                                      <StepperInput
                                        id={`${fieldPrefix}-distance`}
                                        label={`Distance (${useMetric ? 'km' : 'mi'})`}
                                        value={setProgress.actualDistance}
                                        onChange={(actualDistance) => updateSetProgress(exercise.id, setProgress.setId, { actualDistance })}
                                        step={0.1}
                                        min={0}
                                        allowDecimal
                                        ghost={ghostSet?.distance}
                                        compact
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

                            <div className="mt-3">
                              <label className="sr-only" htmlFor={`${exercise.id}-${setProgress.setId}-notes`}>
                                Notes for set {setIndex + 1}
                              </label>
                              <input
                                id={`${exercise.id}-${setProgress.setId}-notes`}
                                type="text"
                                value={setProgress.notes || ''}
                                onChange={(e) => updateSetProgress(exercise.id, setProgress.setId, { notes: e.target.value })}
                                className="form-input !py-2 !px-3 text-sm"
                                placeholder="Note for this set"
                              />
                            </div>
                          </div>
                        );
                      })}

                      <div className="pt-1">
                        <label className="form-label" htmlFor={`${exercise.id}-notes`}>Exercise notes</label>
                        <textarea
                          value={progress.exerciseNotes || ''}
                          onChange={(e) => setExerciseProgress(prev => ({ ...prev, [exercise.id]: { ...prev[exercise.id], exerciseNotes: e.target.value } }))}
                          className="form-input !py-2 !px-3 text-sm resize-none"
                          rows={2}
                          id={`${exercise.id}-notes`}
                          placeholder="Cues, setup, how it felt"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      {/* Adding is occasional, so it sits after the list as a single button;
          it used to be a full card with its own heading above the exercises,
          pushing the first set further down every time. */}
      <div className="forge-card p-3">
        {!showAddExercise ? (
          <button
            onClick={() => setShowAddExercise(true)}
            className="tap-control flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg text-sm font-medium text-accent-600 transition-colors hover:bg-accent-500/10 dark:text-accent-400"
          >
            <PlusIcon className="h-4 w-4" />
            Add exercise
          </button>
        ) : (
          <div className="space-y-3 p-1">
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-500" />
              <input
                type="search"
                autoFocus
                placeholder="Search exercises"
                aria-label="Search exercises"
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                className="form-input !pl-9"
              />
            </div>
            <ul className="max-h-64 divide-y divide-black/[0.06] overflow-y-auto dark:divide-white/[0.06]">
              {filteredExercises.map((exercise) => (
                <li key={exercise.key}>
                  <button
                    onClick={() => addExercise(exercise)}
                    className="w-full px-2 py-2.5 text-left transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                  >
                    <span className="block text-sm font-medium text-surface-50 dark:text-white">{exercise.name}</span>
                    <span className="block text-xs text-surface-500 dark:text-surface-600">{exercise.muscles.join(', ')}</span>
                  </button>
                </li>
              ))}
              {filteredExercises.length === 0 && (
                <li className="px-2 py-4 text-sm text-surface-500 dark:text-surface-600">No exercises match.</li>
              )}
            </ul>
            <button
              onClick={() => { setShowAddExercise(false); setExerciseSearch(''); }}
              className="btn btn-tertiary w-full"
            >
              Cancel
            </button>
          </div>
        )}
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

/*
 * Memoized: during a workout this whole tree re-renders on every keystroke the
 * user makes in its own inputs (necessary), but it must NOT re-render from the
 * provider echo of that same edit. All props are referentially stable across an
 * edit — `template` only changes when the template is modified,
 * `initialExerciseProgress` is the same object the tracker itself published,
 * and the callbacks are stable useCallbacks — so the memo holds. The clock and
 * notes edits stay local to their own components for the same reason.
 */
export default memo(WorkoutProgressTracker);
