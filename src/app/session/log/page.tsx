'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  DocumentTextIcon,
  ChevronRightIcon,
  BoltIcon,
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
import { formatDurationHuman } from '@/utils/durationUtils';
import { formatVolume } from '@/utils/formatters';
import { formatSessionDateTime } from '@/utils/relativeTime';
import { WorkoutTemplate } from '@/types/workout';
import { springSnappy, springGentle } from '@/lib/motion';

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

  const totalVolume = useMemo(
    () =>
      exercises.reduce((total, ex) => {
        if (ex.exerciseType === 'cardio') return total;
        return total + ex.sets.reduce((t, s) => (s.completed ? t + s.reps * s.weight : t), 0);
      }, 0),
    [exercises]
  );

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
        const exVolume = isCardio
          ? 0
          : ex.sets.reduce((t, s) => (s.completed ? t + s.reps * s.weight : t), 0);
        performance[ex.id] = {
          exerciseKey: ex.exerciseKey,
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
          totalVolume: exVolume,
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
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
      animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
      transition={springGentle}
      className="app-bg py-8 px-4"
    >
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 16, scale: 0.98 }}
          animate={prefersReducedMotion ? {} : { opacity: 1, y: 0, scale: 1 }}
          transition={{ ...springGentle, delay: 0.05 }}
          className="mb-6"
        >
          <div className="forge-card overflow-hidden">
            <div className="relative px-6 py-7 text-white greeting-gradient sm:px-8">
              <div className="absolute inset-0 bg-black/10" />
              <div className="relative flex items-center gap-4">
                <motion.button
                  onClick={goBack}
                  aria-label="Go back"
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                  whileHover={prefersReducedMotion ? {} : { scale: 1.1 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
                  transition={springSnappy}
                >
                  <ArrowLeftIcon className="h-6 w-6" />
                </motion.button>
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-wide uppercase">
                    Log Past Workout
                  </h1>
                  <p className="text-accent-100 text-sm mt-1">{current.hint}</p>
                </div>
              </div>
            </div>

            {/* Step rail. Completed steps are clickable so a wrong template is one
                tap to fix rather than a full restart. */}
            <div className="flex items-center gap-2 border-b border-surface-200 px-6 py-4 dark:border-surface-300 sm:px-8">
              {STEPS.map(({ id, label }, i) => (
                <div key={id} className="flex flex-1 items-center gap-2">
                  <button
                    onClick={() => i < stepIndex && setStep(id)}
                    disabled={i > stepIndex}
                    className={`flex items-center gap-2 text-sm font-display font-semibold uppercase tracking-wide transition-colors ${
                      i === stepIndex
                        ? 'text-accent-600 dark:text-accent-400'
                        : i < stepIndex
                          ? 'cursor-pointer text-success-600 hover:text-success-500 dark:text-success-400'
                          : 'text-surface-400 dark:text-surface-500'
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        i === stepIndex
                          ? 'bg-accent-500 text-white'
                          : i < stepIndex
                            ? 'bg-success-500 text-white'
                            : 'bg-surface-900 text-surface-500 dark:bg-surface-400'
                      }`}
                    >
                      {i < stepIndex ? '✓' : i + 1}
                    </span>
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`h-px flex-1 ${
                        i < stepIndex ? 'bg-success-400' : 'bg-surface-900 dark:bg-surface-400'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

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
                  placeholder="Search your templates..."
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  aria-label="Search templates"
                  className="form-input !pl-11"
                />
              </div>

              <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                {templatesLoading ? (
                  <div className="forge-card p-12 text-center text-surface-500 dark:text-surface-600">
                    Loading templates...
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="forge-card p-12 text-center text-surface-500 dark:text-surface-600">
                    {templateSearch ? 'No templates match that search' : 'No templates yet'}
                  </div>
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
                      className="forge-card heat-glow w-full overflow-hidden text-left hover:border-accent-400/40 dark:hover:border-accent-500/40"
                    >
                      <div className="h-1 bg-gradient-to-r from-accent-500 to-accent-700" />
                      <div className="p-4">
                        {/* Same summary block as the cards on /templates. */}
                        <TemplateSummary
                          template={template}
                          useMetric={useMetric}
                          action={
                            <ChevronRightIcon className="mt-1 h-5 w-5 shrink-0 text-surface-400 dark:text-surface-500" />
                          }
                        />
                      </div>
                    </motion.button>
                  ))
                )}
              </div>

              <button
                onClick={handleAdHoc}
                className="forge-card flex w-full items-center justify-center gap-2 border-2 !border-dashed p-5 font-display text-sm font-semibold uppercase tracking-wide text-surface-500 transition-colors hover:!border-accent-400/60 hover:text-accent-600 dark:text-surface-600 dark:hover:!border-accent-500/40 dark:hover:text-accent-400"
              >
                <PlusIcon className="h-5 w-5" />
                Log Ad-Hoc Workout
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
              <div className="forge-card flex items-center gap-3 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-100 dark:bg-accent-900/30">
                  <BoltIcon className="h-5 w-5 text-accent-500" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display font-bold tracking-wide text-surface-50 dark:text-white">
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
                  className="btn btn-tertiary shrink-0 !px-3 !py-1.5 text-xs"
                >
                  Change
                </button>
              </div>

              <div className="forge-card overflow-hidden">
                <div className="space-y-6 p-6 sm:p-8">
                  {isAdHoc && (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="adhoc-name" className="form-label">
                          Workout Name
                        </label>
                        <input
                          id="adhoc-name"
                          type="text"
                          value={adHocName}
                          onChange={(e) => setAdHocName(e.target.value)}
                          className="form-input"
                          placeholder="e.g. Morning Run"
                        />
                      </div>
                      <div>
                        <label htmlFor="adhoc-type" className="form-label">
                          Workout Type
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
                    <h2 className="mb-1 font-display text-sm font-bold uppercase tracking-wider text-surface-50 dark:text-white">
                      When &amp; How Long
                    </h2>
                    <p className="mb-5 text-xs text-surface-500 dark:text-surface-600">
                      Defaults to right now — change it if you are catching up on an earlier session.
                    </p>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="completed-at" className="form-label">
                          <CalendarDaysIcon className="mr-1.5 inline h-3.5 w-3.5" />
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
                          <ClockIcon className="mr-1.5 inline h-3.5 w-3.5" />
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
                              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                duration === mins * 60
                                  ? 'bg-accent-500 text-white'
                                  : 'bg-surface-900 text-surface-500 hover:bg-accent-100 hover:text-accent-700 dark:bg-surface-200 dark:text-surface-600 dark:hover:bg-accent-900/30 dark:hover:text-accent-300'
                              }`}
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
                      <DocumentTextIcon className="mr-1.5 inline h-3.5 w-3.5" />
                      Notes <span className="font-normal normal-case">(optional)</span>
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

                  <div className="flex items-center justify-between gap-3 border-t border-surface-200 pt-5 dark:border-surface-300">
                    <p className="text-xs text-surface-500 dark:text-surface-600">
                      {duration ? formatDurationHuman(duration) : 'Enter a duration to continue'}
                    </p>
                    <button
                      onClick={() => setStep('performance')}
                      disabled={!duration || duration <= 0}
                      className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next: Performance
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
              <div className="forge-card overflow-hidden">
                <div className="space-y-4 p-4 sm:p-6">
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
                        className="overflow-hidden rounded-xl border border-surface-200 bg-white dark:border-surface-300 dark:bg-surface-100"
                      >
                        <div className="flex items-center gap-2 px-4 py-3">
                          <button
                            onClick={() => setExpandedExercise(isExpanded ? null : exercise.id)}
                            aria-expanded={isExpanded}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          >
                            <ChevronDownIcon
                              className={`h-4 w-4 shrink-0 text-surface-400 transition-transform ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                            />
                            <span className="min-w-0">
                              <span className="block truncate font-display text-sm font-bold tracking-wide text-surface-50 dark:text-white">
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
                                  <span className="rounded bg-info-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-info-600 dark:bg-info-900/30 dark:text-info-400">
                                    cardio
                                  </span>
                                )}
                              </span>
                            </span>
                          </button>
                          <button
                            onClick={() => removeExercise(exercise.id)}
                            aria-label={`Remove ${exercise.name}`}
                            className="touch-target flex shrink-0 items-center justify-center rounded-lg text-surface-400 transition-colors hover:bg-danger-50 hover:text-danger-500 dark:hover:bg-danger-900/20 tap-control"
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
                              className="border-t border-surface-200 dark:border-surface-300"
                            >
                              <div className="space-y-2.5 p-3 sm:p-4">
                                {exercise.sets.map((set, setIdx) => (
                                  <div
                                    key={set.id}
                                    className={`rounded-xl border p-3 transition-colors ${
                                      set.completed
                                        ? 'border-success-200 bg-success-50/50 dark:border-success-800/40 dark:bg-success-900/10'
                                        : 'border-surface-200 bg-surface-950/50 dark:border-surface-400 dark:bg-surface-200/20'
                                    }`}
                                  >
                                    <div className="mb-2.5 flex items-center gap-2">
                                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-100 font-display text-sm font-bold tabular text-accent-700 dark:bg-accent-900/40 dark:text-accent-300">
                                        {setIdx + 1}
                                      </span>
                                      <span className="min-w-0 flex-1 text-xs uppercase tracking-wider text-surface-500 dark:text-surface-600">
                                        Set {setIdx + 1}
                                      </span>
                                      <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-surface-500">
                                        <input
                                          type="checkbox"
                                          checked={set.completed}
                                          onChange={(e) =>
                                            updateSet(exercise.id, set.id, {
                                              completed: e.target.checked,
                                            })
                                          }
                                          className="h-4 w-4 rounded border-surface-300 text-accent-500 accent-accent-500 focus:ring-accent-500"
                                        />
                                        <span className="font-display text-[10px] font-semibold uppercase tracking-wider">
                                          Done
                                        </span>
                                      </label>
                                      <button
                                        onClick={() => removeSet(exercise.id, set.id)}
                                        disabled={exercise.sets.length <= 1}
                                        aria-label={`Remove set ${setIdx + 1}`}
                                        className="touch-target flex shrink-0 items-center justify-center rounded-lg text-danger-600 transition-colors hover:bg-danger-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-danger-400 dark:hover:bg-danger-900/30 tap-control"
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
                                  className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-accent-100 font-display text-xs font-semibold uppercase tracking-wide text-accent-700 transition-colors hover:bg-accent-200 dark:bg-accent-900/30 dark:text-accent-400 dark:hover:bg-accent-900/50 tap-control"
                                >
                                  <PlusIcon className="h-4 w-4" />
                                  Add Set
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
                    <div className="rounded-xl border border-surface-200 p-4 dark:border-surface-300">
                      <ExercisePicker
                        onSelect={addExercise}
                        layout="list"
                        initialLimit={25}
                        autoFocus
                      />
                      <button
                        onClick={() => setShowExercisePicker(false)}
                        className="btn btn-tertiary mt-3 w-full text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowExercisePicker(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-surface-200 py-4 font-display text-sm font-semibold uppercase tracking-wide text-surface-500 transition-colors hover:border-accent-400/60 hover:text-accent-600 dark:border-surface-400 dark:text-surface-600 dark:hover:border-accent-500/40 dark:hover:text-accent-400"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Add Exercise
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
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                  <span className="text-surface-500 dark:text-surface-600">
                    Volume{' '}
                    <strong className="tabular text-surface-50 dark:text-white">
                      {formatVolume(totalVolume, useMetric)}
                    </strong>
                  </span>
                  <span className="text-surface-500 dark:text-surface-600">
                    Exercises{' '}
                    <strong className="tabular text-surface-50 dark:text-white">
                      {exercises.length}
                    </strong>
                  </span>
                  <span className="text-surface-500 dark:text-surface-600">
                    Sets{' '}
                    <strong className="tabular text-surface-50 dark:text-white">
                      {completedSetCount}
                    </strong>
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <button onClick={() => setStep('details')} className="btn btn-tertiary">
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={logWorkout.isPending || exercises.length === 0}
                    className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {logWorkout.isPending ? 'Logging...' : 'Log Workout'}
                  </button>
                </div>

                {logWorkout.isError && (
                  <div className="form-error mt-3">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-danger-500">
                      <span className="text-xs font-bold text-white">!</span>
                    </div>
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
    </motion.div>
  );
}
