'use client';

import { ExclamationCircleIcon } from '@heroicons/react/20/solid';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { useTemplates } from '@/lib/hooks/useTemplates';
import { useProfile } from '@/lib/hooks/useProfile';
import { useLogPastWorkout } from '@/lib/hooks/useMutations';
import VictoryPopup from '@/components/modals/VictoryPopup';
import { ExercisePicker } from '@/components/ui/ExercisePicker';
import { DurationInput } from '@/components/ui/DurationInput';
import { TemplateSummary } from '@/components/ui/TemplateSummary';
import { StepperInput } from '@/components/workout/StepperInput';
import { getExerciseType } from '@/lib/exerciseSearch';
import { resolveExercise } from '@/lib/exerciseLookup';
import { formatDurationHuman } from '@/utils/durationUtils';
import { formatVolume } from '@/utils/formatters';
import { formatSessionDateTime } from '@/utils/relativeTime';
import { performedSetsVolume } from '@/lib/volume';
import { WorkoutTemplate } from '@/types/workout';
import { springSnappy } from '@/lib/motion';

/**
 * Log a workout that already happened.
 *
 * This screen used to reimplement most of the app: its own template list, its own
 * exercise search, its own duration field, its own set editor. All four now come
 * from the same components the live workout and template builder use — see
 * ui/ExercisePicker, ui/DurationInput, ui/TemplateSummary and
 * workout/StepperInput.
 */

type Step = 'choose' | 'details' | 'performance';

const STEPS: { id: Step; label: string; hint: string }[] = [
  { id: 'choose', label: 'Workout', hint: 'Pick a template, or log something one-off' },
  { id: 'details', label: 'Details', hint: 'When it happened and how long it took' },
  { id: 'performance', label: 'Performance', hint: 'What you actually did' },
];

/** How long a duration-less quick entry defaults to, in seconds. */
const DEFAULT_CARDIO_SET_DURATION = 300;

interface SetEntry {
  id: string;
  reps: number;
  weight: number;
  duration?: number;
  distance?: number;
  rpe?: number;
  completed: boolean;
}

interface ExerciseEntry {
  id: string;
  exerciseKey: string;
  name: string;
  exerciseType: 'strength' | 'cardio' | 'flexibility';
  /** Dumbbell/unilateral work: the entered weight counts twice (lib/volume.ts). */
  perSide?: boolean;
  sets: SetEntry[];
}

export default function LogPastWorkoutPage() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const { data: templates, isLoading: templatesLoading } = useTemplates();
  const { profile } = useProfile();
  const logWorkout = useLogPastWorkout();
  const useMetric = profile?.useMetric ?? false;

  const [step, setStep] = useState<Step>('choose');
  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate | null>(null);
  const [isAdHoc, setIsAdHoc] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');

  const [completedAt, setCompletedAt] = useState(() => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - tzOffset * 60000);
    return local.toISOString().slice(0, 16);
  });
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [adHocName, setAdHocName] = useState('');
  const [adHocWorkoutType, setAdHocWorkoutType] = useState<string>('strength');

  const [showVictory, setShowVictory] = useState(false);
  const [victoryData, setVictoryData] = useState<{
    workoutName: string;
    durationMinutes: number;
    totalVolume: number;
    totalSets: number;
    totalExercises: number;
    totalDistance: number;
    newAchievementIds: string[];
    newPRs: Array<{ exerciseName: string; type: string; value: number }>;
    pointsAwarded: number;
    totalAwarded: number;
    progress: Record<string, number>;
  } | null>(null);

  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [showExercisePicker, setShowExercisePicker] = useState(false);

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    if (!templateSearch) return templates;
    const q = templateSearch.toLowerCase();
    return templates.filter((t) => t.name.toLowerCase().includes(q));
  }, [templates, templateSearch]);

  const handleSelectTemplate = (template: WorkoutTemplate) => {
    setSelectedTemplate(template);
    setIsAdHoc(false);

    const templateData = template.workoutData;
    if (templateData?.exercises) {
      const entries: ExerciseEntry[] = templateData.exercises.map((ex) => {
        const exType = getExerciseType(ex.exerciseKey);
        const isCardio = exType === 'cardio';
        return {
          id: ex.id,
          exerciseKey: ex.exerciseKey,
          name: ex.name,
          exerciseType: exType,
          perSide: ex.perSide,
          sets: ex.sets.map((s, i) => ({
            id: s.id || `set-${i + 1}`,
            reps: isCardio ? 0 : typeof s.targetReps === 'number' ? s.targetReps : s.targetReps?.min || 0,
            weight: isCardio ? 0 : s.targetWeight || 0,
            duration: isCardio ? s.targetDuration || DEFAULT_CARDIO_SET_DURATION : undefined,
            distance: isCardio ? s.targetDistance || undefined : undefined,
            completed: true,
          })),
        };
      });
      setExercises(entries);
      if (entries.length > 0) setExpandedExercise(entries[0].id);
    }

    if (templateData?.metadata?.estimatedDuration) {
      setDuration(templateData.metadata.estimatedDuration * 60);
    }

    setStep('details');
  };

  const handleAdHoc = () => {
    setSelectedTemplate(null);
    setIsAdHoc(true);
    setExercises([]);
    setExpandedExercise(null);
    setStep('details');
  };

  const addExercise = (exerciseKey: string, name: string) => {
    const exType = getExerciseType(exerciseKey);
    const isCardio = exType === 'cardio';
    const id = `ex-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setExercises((prev) => [
      ...prev,
      {
        id,
        exerciseKey,
        name,
        exerciseType: exType,
        perSide: resolveExercise(exerciseKey)?.perSide,
        sets: [
          {
            id: 'set-1',
            reps: isCardio ? 0 : 10,
            weight: 0,
            duration: isCardio ? DEFAULT_CARDIO_SET_DURATION : undefined,
            completed: true,
          },
        ],
      },
    ]);
    setExpandedExercise(id);
    setShowExercisePicker(false);
  };

  const removeExercise = (id: string) => {
    setExercises((prev) => prev.filter((ex) => ex.id !== id));
  };

  const addSet = (exerciseId: string) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const lastSet = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [
            ...ex.sets,
            {
              id: `set-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              reps: lastSet?.reps || 0,
              weight: lastSet?.weight || 0,
              duration: lastSet?.duration,
              distance: lastSet?.distance,
              completed: true,
            },
          ],
        };
      })
    );
  };

  const removeSet = (exerciseId: string, setId: string) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId ? { ...ex, sets: ex.sets.filter((s) => s.id !== setId) } : ex
      )
    );
  };

  const updateSet = (exerciseId: string, setId: string, updates: Partial<SetEntry>) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId
          ? { ...ex, sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...updates } : s)) }
          : ex
      )
    );
  };

  /** Volume through the shared maths so dumbbell work counts both sides. */
  const volumeFor = (ex: ExerciseEntry): number => {
    if (ex.exerciseType === 'cardio') return 0;
    return performedSetsVolume(
      ex.sets.map((s) => ({
        setId: s.id,
        actualReps: s.reps,
        actualWeight: s.weight,
        completed: s.completed,
        skipped: !s.completed && s.reps === 0 && !s.weight,
      })),
      ex.perSide
    );
  };

  const totalVolume = useMemo(() => exercises.reduce((total, ex) => total + volumeFor(ex), 0), [exercises]);

  const completedSetCount = useMemo(
    () => exercises.reduce((t, ex) => t + ex.sets.filter((s) => s.completed).length, 0),
    [exercises]
  );

  const handleSubmit = async () => {
    const completedDate = new Date(completedAt);
    const workoutName = selectedTemplate?.name || adHocName || 'Quick Workout';
    const durationSeconds = duration ?? 0;

    let result: any;

    if (selectedTemplate) {
      const performance: Record<string, any> = {};
      for (const ex of exercises) {
        const isCardio = ex.exerciseType === 'cardio';
        performance[ex.id] = {
          exerciseKey: ex.exerciseKey,
          perSide: ex.perSide,
          sets: ex.sets.map((s) => ({
            setId: s.id,
            actualReps: isCardio ? 0 : s.reps,
            actualWeight: isCardio ? 0 : s.weight,
            actualDuration: s.duration,
            actualDistance: s.distance,
            actualRpe: s.rpe,
            completed: s.completed,
            skipped: !s.completed,
          })),
          // Recomputed server-side from the sets; included so the payload is
          // self-consistent for any consumer that reads it.
          totalVolume: volumeFor(ex),
        };
      }

      result = await logWorkout.mutateAsync({
        templateId: selectedTemplate.id,
        completedAt: completedDate.toISOString(),
        duration: durationSeconds,
        notes: notes || undefined,
        performance,
      });
    } else {
      result = await logWorkout.mutateAsync({
        completedAt: completedDate.toISOString(),
        duration: durationSeconds,
        notes: notes || undefined,
        adHocName: adHocName || 'Quick Workout',
        adHocWorkoutType,
        adHocExercises: exercises.map((ex) => ({
          exerciseKey: ex.exerciseKey,
          sets: ex.sets
            .filter((s) => s.completed)
            .map((s) => ({
              reps: ex.exerciseType === 'cardio' ? 0 : s.reps,
              weight: s.weight > 0 ? s.weight : undefined,
              duration: s.duration,
              distance: s.distance,
            })),
        })),
      });
    }

    const totalDistance = exercises.reduce(
      (t, ex) =>
        t + ex.sets.filter((s) => s.completed).reduce((st, s) => st + (s.distance || 0), 0),
      0
    );

    setVictoryData({
      workoutName,
      durationMinutes: Math.round(durationSeconds / 60),
      totalVolume,
      totalSets: completedSetCount,
      totalExercises: exercises.length,
      totalDistance,
      newAchievementIds: result?.achievements?.newAchievements || [],
      newPRs: result?.newPRs || [],
      pointsAwarded: result?.achievements?.pointsAwarded || 0,
      totalAwarded: result?.totalAwarded || result?.achievements?.pointsAwarded || 0,
      progress: result?.achievements?.progress || {},
    });
    setShowVictory(true);
  };

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const current = STEPS[stepIndex];

  const goBack = () => {
    if (step === 'choose') router.back();
    else if (step === 'details') setStep('choose');
    else setStep('details');
  };

  return (
    <div className="px-4 pb-16 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <PageHeader back={goBack} title="Log a past workout" description={current.hint}>
          {/* Step rail: three segments under the title, the same rule-and-label
              shape as everything else on the page. Finished steps stay
              tappable, so a wrong template is one tap to fix, not a restart. */}
          <ol className="grid grid-cols-3 gap-2" aria-label="Steps">
            {STEPS.map(({ id, label }, i) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => i < stepIndex && setStep(id)}
                  disabled={i > stepIndex}
                  aria-current={i === stepIndex ? 'step' : undefined}
                  className="tap-control group block w-full text-left disabled:cursor-default"
                >
                  <span
                    className={`block h-1 rounded-full transition-colors ${
                      i <= stepIndex ? 'bg-accent-500' : 'bg-black/10 dark:bg-white/10'
                    }`}
                  />
                  <span
                    className={`mt-1.5 block text-xs font-medium ${
                      i === stepIndex
                        ? 'text-surface-50 dark:text-white'
                        : i < stepIndex
                          ? 'text-surface-500 group-hover:text-surface-50 dark:text-surface-600 dark:group-hover:text-white'
                          : 'text-surface-600 dark:text-surface-500'
                    }`}
                  >
                    {label}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </PageHeader>

        <AnimatePresence mode="wait">
          {step === 'choose' && (
            <motion.div
              key="choose"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={springSnappy}
              className="space-y-4"
            >
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-surface-500" />
                <input
                  type="text"
                  placeholder="Search your templates"
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  aria-label="Search templates"
                  className="form-input !pl-11"
                />
              </div>

              <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                {templatesLoading ? (
                  /* Skeleton rows matching the card layout, so the list doesn't
                     jump when loading finishes. */
                  <div className="space-y-3" aria-busy="true" aria-label="Loading templates">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="forge-card overflow-hidden animate-pulse">
                        <div className="h-1 bg-black/[0.06] dark:bg-white/[0.06]" />
                        <div className="p-4 space-y-2">
                          <div className="h-4 w-1/3 rounded bg-black/[0.06] dark:bg-white/[0.06]" />
                          <div className="h-3 w-2/3 rounded bg-surface-200 dark:bg-surface-400/30" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <EmptyState
                    title={templateSearch ? 'No templates match' : 'No templates yet'}
                    hint={templateSearch ? 'Try another name, or log it without a template.' : 'Log it without a template below.'}
                  />
                ) : (
                  filteredTemplates.map((template, i) => (
                    <motion.button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
                      animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
                      transition={{ ...springSnappy, delay: Math.min(i * 0.04, 0.24) }}
                      whileHover={prefersReducedMotion ? {} : { scale: 1.01 }}
                      whileTap={prefersReducedMotion ? {} : { scale: 0.99 }}
                      className="forge-card w-full overflow-hidden text-left transition-colors hover:border-black/20 dark:hover:border-white/15"
                    >
                      <div className="p-4">
                        {/* Same summary block as the cards on /templates. */}
                        <TemplateSummary
                          template={template}
                          useMetric={useMetric}
                          action={
                            <ChevronRightIcon className="mt-1 h-5 w-5 shrink-0 text-surface-600" />
                          }
                        />
                      </div>
                    </motion.button>
                  ))
                )}
              </div>

              <button
                onClick={handleAdHoc}
                className="forge-card flex w-full items-center justify-center gap-2 border !border-dashed p-4 text-sm font-medium text-surface-500 transition-colors hover:!border-accent-400/60 hover:text-accent-600 dark:text-surface-600 dark:hover:!border-accent-500/40 dark:hover:text-accent-400"
              >
                <PlusIcon className="h-5 w-5" />
                Log something without a template
              </button>
            </motion.div>
          )}

          {step === 'details' && (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={springSnappy}
              className="space-y-4"
            >
              {/* What is being logged, so the choice made on the previous step
                  stays visible rather than being something to remember. */}
              <div className="form-section flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-surface-50 dark:text-white">
                    {selectedTemplate?.name || adHocName || 'Ad-hoc workout'}
                  </p>
                  <p className="text-xs text-surface-500 dark:text-surface-600">
                    {selectedTemplate
                      ? `${exercises.length} exercise${exercises.length === 1 ? '' : 's'} from template`
                      : 'Not based on a template'}
                  </p>
                </div>
                <button
                  onClick={() => setStep('choose')}
                  className="btn btn-tertiary min-h-[36px] shrink-0 !px-3 text-xs"
                >
                  Change
                </button>
              </div>

              <div className="form-section">
                <div className="space-y-5">
                  {isAdHoc && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="adhoc-name" className="form-label">
                          Workout name
                        </label>
                        <input
                          id="adhoc-name"
                          type="text"
                          value={adHocName}
                          onChange={(e) => setAdHocName(e.target.value)}
                          className="form-input"
                          placeholder="Morning run"
                        />
                      </div>
                      <div>
                        <label htmlFor="adhoc-type" className="form-label">
                          Workout type
                        </label>
                        <select
                          id="adhoc-type"
                          value={adHocWorkoutType}
                          onChange={(e) => setAdHocWorkoutType(e.target.value)}
                          className="form-select"
                        >
                          <option value="strength">Strength</option>
                          <option value="cardio">Cardio</option>
                          <option value="hybrid">Hybrid</option>
                          <option value="flexibility">Flexibility</option>
                          <option value="sports">Sports</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div>
                    <h2 className="section-title">When and how long</h2>
                    <p className="mb-4 text-xs text-surface-500 dark:text-surface-600">
                      Defaults to right now — change it if you are catching up on an earlier session.
                    </p>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="completed-at" className="form-label">
                          Finished
                        </label>
                        <input
                          id="completed-at"
                          type="datetime-local"
                          value={completedAt}
                          onChange={(e) => setCompletedAt(e.target.value)}
                          className="form-input"
                        />
                        <p className="form-hint">{formatSessionDateTime(completedAt)}</p>
                      </div>
                      <div>
                        <label htmlFor="duration" className="form-label">
                          Duration
                        </label>
                        <DurationInput id="duration" value={duration} onChange={setDuration} />
                        {/* One tap covers the overwhelmingly common lengths; the
                            field still takes anything. */}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {[30, 45, 60, 90].map((mins) => (
                            <button
                              key={mins}
                              type="button"
                              onClick={() => setDuration(mins * 60)}
                              aria-pressed={duration === mins * 60}
                              className="chip"
                            >
                              {mins}m
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="notes" className="form-label">
                      Notes <span className="text-surface-600 dark:text-surface-500">(optional)</span>
                    </label>
                    <textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="form-input resize-none"
                      placeholder="How did it go?"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-black/[0.06] pt-4 dark:border-white/[0.06]">
                    <p className="text-xs text-surface-500 dark:text-surface-600">
                      {duration ? formatDurationHuman(duration) : 'Enter a duration to continue'}
                    </p>
                    <button
                      onClick={() => setStep('performance')}
                      disabled={!duration || duration <= 0}
                      className="btn btn-primary min-h-[44px]"
                    >
                      Next: performance
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'performance' && (
            <motion.div
              key="performance"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={springSnappy}
              className="space-y-4"
            >
              <div className="form-section">
                <div className="space-y-3">
                  {exercises.map((exercise) => {
                    const isExpanded = expandedExercise === exercise.id;
                    const isCardio = exercise.exerciseType === 'cardio';
                    const exVolume = isCardio
                      ? 0
                      : exercise.sets.reduce(
                          (t, s) => (s.completed ? t + s.reps * s.weight : t),
                          0
                        );

                    return (
                      <div
                        key={exercise.id}
                        className="overflow-hidden rounded-xl border border-black/10 bg-white dark:border-surface-300 dark:bg-surface-100"
                      >
                        <div className="flex items-center gap-2 px-4 py-3">
                          <button
                            onClick={() => setExpandedExercise(isExpanded ? null : exercise.id)}
                            aria-expanded={isExpanded}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          >
                            <ChevronDownIcon
                              className={`h-4 w-4 shrink-0 text-surface-600 transition-transform ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-surface-50 dark:text-white">
                                {exercise.name}
                              </span>
                              <span className="mt-0.5 flex items-center gap-1.5 text-xs text-surface-500 dark:text-surface-600">
                                {exercise.sets.length} {exercise.sets.length === 1 ? 'set' : 'sets'}
                                {!isCardio && exVolume > 0 && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    {formatVolume(exVolume, useMetric)}
                                  </>
                                )}
                                {isCardio && (
                                  <span className="tag">Cardio</span>
                                )}
                              </span>
                            </span>
                          </button>
                          <button
                            onClick={() => removeExercise(exercise.id)}
                            aria-label={`Remove ${exercise.name}`}
                            className="touch-target flex shrink-0 items-center justify-center rounded-lg text-surface-600 transition-colors hover:bg-danger-50 hover:text-danger-500 dark:hover:bg-danger-900/20 tap-control"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>

                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={springSnappy}
                              className="border-t border-black/10 dark:border-surface-300"
                            >
                              <div className="space-y-2.5 p-3 sm:p-4">
                                {exercise.sets.map((set, setIdx) => (
                                  <div
                                    key={set.id}
                                    className={`rounded-xl border p-3 transition-colors ${
                                      set.completed
                                        ? 'border-success-200 bg-success-50/50 dark:border-success-800/40 dark:bg-success-900/10'
                                        : 'border-black/10 bg-surface-950/50 dark:border-surface-400 dark:bg-surface-200/20'
                                    }`}
                                  >
                                    <div className="mb-2.5 flex items-center gap-2">
                                      <span className="min-w-0 flex-1 text-sm font-medium text-surface-50 dark:text-white">
                                        Set <span className="figure">{setIdx + 1}</span>
                                      </span>
                                      <label className="flex min-h-[44px] cursor-pointer select-none items-center gap-2 px-1 text-sm text-surface-500 dark:text-surface-700">
                                        <input
                                          type="checkbox"
                                          checked={set.completed}
                                          onChange={(e) =>
                                            updateSet(exercise.id, set.id, {
                                              completed: e.target.checked,
                                            })
                                          }
                                          className="h-5 w-5 accent-accent-500"
                                        />
                                        Done
                                      </label>
                                      <button
                                        onClick={() => removeSet(exercise.id, set.id)}
                                        disabled={exercise.sets.length <= 1}
                                        aria-label={`Remove set ${setIdx + 1}`}
                                        className="touch-target flex shrink-0 items-center justify-center rounded-lg text-surface-500 transition-colors hover:bg-danger-500/10 hover:text-danger-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-surface-700 dark:hover:text-danger-400 tap-control"
                                      >
                                        <TrashIcon className="h-4 w-4" />
                                      </button>
                                    </div>

                                    {/* Same stepper controls as the template
                                        builder and the live workout tracker. */}
                                    {isCardio ? (
                                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                        <div>
                                          <label className="form-label">Duration</label>
                                          <DurationInput
                                            value={set.duration}
                                            onChange={(v) =>
                                              updateSet(exercise.id, set.id, { duration: v })
                                            }
                                            placeholder="30:00"
                                          />
                                        </div>
                                        <StepperInput
                                          label={`Distance (${useMetric ? 'km' : 'mi'})`}
                                          value={set.distance}
                                          onChange={(v) =>
                                            updateSet(exercise.id, set.id, { distance: v })
                                          }
                                          step={0.5}
                                          allowDecimal
                                          min={0}
                                        />
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                                        <StepperInput
                                          label="Reps"
                                          value={set.reps || undefined}
                                          onChange={(v) =>
                                            updateSet(exercise.id, set.id, { reps: v ?? 0 })
                                          }
                                          min={0}
                                          max={999}
                                        />
                                        <StepperInput
                                          label={useMetric ? 'Weight (kg)' : 'Weight (lbs)'}
                                          value={set.weight || undefined}
                                          onChange={(v) =>
                                            updateSet(exercise.id, set.id, { weight: v ?? 0 })
                                          }
                                          step={useMetric ? 2.5 : 5}
                                          allowDecimal
                                          min={0}
                                        />
                                        <StepperInput
                                          label="RPE"
                                          value={set.rpe}
                                          onChange={(v) => updateSet(exercise.id, set.id, { rpe: v })}
                                          min={1}
                                          max={10}
                                        />
                                      </div>
                                    )}
                                  </div>
                                ))}

                                <button
                                  onClick={() => addSet(exercise.id)}
                                  className="btn btn-tertiary min-h-[44px] w-full border-dashed tap-control"
                                >
                                  <PlusIcon className="h-4 w-4" />
                                  Add set
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}

                  {/* Same picker as the template builder — same search, same
                      ranking, same rows. */}
                  {showExercisePicker ? (
                    <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
                      <ExercisePicker
                        onSelect={addExercise}
                        layout="list"
                        initialLimit={25}
                        autoFocus
                      />
                      <button
                        onClick={() => setShowExercisePicker(false)}
                        className="btn btn-tertiary mt-3 min-h-[44px] w-full"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowExercisePicker(true)}
                      className="btn btn-tertiary min-h-[48px] w-full border-dashed"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Add exercise
                    </button>
                  )}

                  {exercises.length === 0 && !showExercisePicker && (
                    <p className="text-center text-sm text-surface-500 dark:text-surface-600">
                      Add at least one exercise to log this workout.
                    </p>
                  )}
                </div>
              </div>

              {/* Sticky summary + submit: on a long exercise list the action was
                  scrolled off the bottom of the page. */}
              <div className="forge-card sticky bottom-4 p-4">
                <dl className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Volume', value: formatVolume(totalVolume, useMetric) },
                    { label: 'Exercises', value: exercises.length },
                    { label: 'Sets done', value: completedSetCount },
                  ].map((f) => (
                    <div key={f.label}>
                      <dt className="stat-label">{f.label}</dt>
                      <dd className="figure mt-1 text-lg leading-none">{f.value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <button onClick={() => setStep('details')} className="btn btn-tertiary min-h-[44px]">
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={logWorkout.isPending || exercises.length === 0}
                    className="btn btn-primary min-h-[44px]"
                  >
                    {logWorkout.isPending ? 'Logging…' : 'Log workout'}
                  </button>
                </div>

                {logWorkout.isError && (
                  <div className="form-error mt-3">
                    <ExclamationCircleIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    {logWorkout.error?.message || 'Failed to log workout'}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {victoryData && (
        <VictoryPopup
          data={{ ...victoryData, useMetric }}
          isOpen={showVictory}
          onContinue={() => {
            setShowVictory(false);
            router.push('/templates');
          }}
        />
      )}
    </div>
  );
}
