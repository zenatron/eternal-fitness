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
  CheckCircleIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { useTemplates } from '@/lib/hooks/useTemplates';
import { useProfile } from '@/lib/hooks/useProfile';
import { useLogPastWorkout } from '@/lib/hooks/useMutations';
import VictoryPopup from '@/components/modals/VictoryPopup';
import { exercises as exerciseLibrary } from '@/lib/exercises';
import { parseDuration, formatDurationInput, formatDurationHuman } from '@/utils/durationUtils';
import { formatVolume } from '@/utils/formatters';
import { WorkoutTemplate } from '@/types/workout';
import { springSnappy, springGentle } from '@/lib/motion';


type Step = 'choose' | 'details' | 'performance';

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

function DurationField({ value, onChange, placeholder = '45:00', className = '' }: {
  value: number;
  onChange: (seconds: number) => void;
  placeholder?: string;
  className?: string;
}) {
  const [textValue, setTextValue] = useState(() => value > 0 ? formatDurationInput(value) : '');
  const [isFocused, setIsFocused] = useState(false);

  const parsed = textValue.trim() ? parseDuration(textValue) : null;
  const isInvalid = textValue.trim() !== '' && parsed === null;

  return (
    <div className="flex flex-col">
      <input
        type="text"
        value={textValue}
        onChange={(e) => {
          setTextValue(e.target.value);
          const p = parseDuration(e.target.value);
          if (p !== null) onChange(p);
        }}
        onBlur={() => {
          setIsFocused(false);
          if (parsed !== null) {
            setTextValue(formatDurationInput(parsed));
            onChange(parsed);
          }
        }}
        onFocus={() => setIsFocused(true)}
        className={`form-input ${isInvalid ? '!border-danger-400 dark:!border-danger-500 !focus:ring-danger-500/10' : ''} ${className}`}
        placeholder={placeholder}
      />
      {textValue.trim() !== '' && (
        <span className={`form-hint ${isInvalid ? '!text-danger-400' : ''}`}>
          {isInvalid ? 'Invalid format — try 1:30:00, 45:00, 30m, or 5400' : `= ${formatDurationHuman(parsed!)}`}
        </span>
      )}
    </div>
  );
}

function getExerciseType(exerciseKey: string): 'strength' | 'cardio' | 'flexibility' {
  const ex = exerciseLibrary[exerciseKey as keyof typeof exerciseLibrary];
  return (ex as any)?.exerciseType || 'strength';
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
  const [duration, setDuration] = useState(0);
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
  const [exerciseSearch, setExerciseSearch] = useState('');

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    if (!templateSearch) return templates;
    return templates.filter(t =>
      t.name.toLowerCase().includes(templateSearch.toLowerCase())
    );
  }, [templates, templateSearch]);

  const filteredExercises = useMemo(() => {
    const entries = Object.entries(exerciseLibrary);
    if (!exerciseSearch) return entries.slice(0, 20);
    return entries.filter(([, ex]) =>
      ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
      ex.muscles.some(m => m.toLowerCase().includes(exerciseSearch.toLowerCase()))
    ).slice(0, 20);
  }, [exerciseSearch]);

  const handleSelectTemplate = (template: WorkoutTemplate) => {
    setSelectedTemplate(template);
    setIsAdHoc(false);

    const templateData = template.workoutData;
    if (templateData?.exercises) {
      const entries: ExerciseEntry[] = templateData.exercises.map(ex => {
        const exType = getExerciseType(ex.exerciseKey);
        const isCardio = exType === 'cardio';
        return {
          id: ex.id,
          exerciseKey: ex.exerciseKey,
          name: ex.name,
          exerciseType: exType,
          sets: ex.sets.map((s, i) => ({
            id: s.id || `set-${i + 1}`,
            reps: isCardio ? 0 : (typeof s.targetReps === 'number' ? s.targetReps : (s.targetReps?.min || 0)),
            weight: isCardio ? 0 : (s.targetWeight || 0),
            duration: isCardio ? (s.targetDuration || 300) : undefined,
            distance: isCardio ? (s.targetDistance || undefined) : undefined,
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
    setStep('details');
  };

  const addExercise = (exerciseKey: string, name: string) => {
    const exType = getExerciseType(exerciseKey);
    const isCardio = exType === 'cardio';
    const id = `ex-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newEx: ExerciseEntry = {
      id,
      exerciseKey,
      name,
      exerciseType: exType,
      sets: [{
        id: 'set-1',
        reps: isCardio ? 0 : 10,
        weight: 0,
        duration: isCardio ? 300 : undefined,
        completed: true,
      }],
    };
    setExercises(prev => [...prev, newEx]);
    setExpandedExercise(id);
    setShowExercisePicker(false);
    setExerciseSearch('');
  };

  const removeExercise = (id: string) => {
    setExercises(prev => prev.filter(ex => ex.id !== id));
  };

  const addSet = (exerciseId: string) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id !== exerciseId) return ex;
      const lastSet = ex.sets[ex.sets.length - 1];
      return {
        ...ex,
        sets: [...ex.sets, {
          id: `set-${ex.sets.length + 1}`,
          reps: lastSet?.reps || 0,
          weight: lastSet?.weight || 0,
          duration: lastSet?.duration,
          distance: lastSet?.distance,
          completed: true,
        }],
      };
    }));
  };

  const removeSet = (exerciseId: string, setId: string) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id !== exerciseId) return ex;
      return { ...ex, sets: ex.sets.filter(s => s.id !== setId) };
    }));
  };

  const updateSet = (exerciseId: string, setId: string, updates: Partial<SetEntry>) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id !== exerciseId) return ex;
      return {
        ...ex,
        sets: ex.sets.map(s => s.id === setId ? { ...s, ...updates } : s),
      };
    }));
  };

  const totalVolume = useMemo(() => {
    return exercises.reduce((total, ex) => {
      if (ex.exerciseType === 'cardio') return total;
      return total + ex.sets.reduce((t, s) => {
        if (!s.completed) return t;
        return t + s.reps * s.weight;
      }, 0);
    }, 0);
  }, [exercises]);

  const handleSubmit = async () => {
    const completedDate = new Date(completedAt);
    const workoutName = selectedTemplate?.name || adHocName || 'Quick Workout';
    const totalCompletedSets = exercises.reduce((t, ex) => t + ex.sets.filter(s => s.completed).length, 0);

    let result: any;

    if (selectedTemplate) {
      const performance: Record<string, any> = {};
      for (const ex of exercises) {
        const isCardio = ex.exerciseType === 'cardio';
        const exVolume = isCardio ? 0 : ex.sets.reduce((t, s) => s.completed ? t + s.reps * s.weight : t, 0);
        performance[ex.id] = {
          exerciseKey: ex.exerciseKey,
          sets: ex.sets.map(s => ({
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
        duration,
        notes: notes || undefined,
        performance,
      });
    } else {
      result = await logWorkout.mutateAsync({
        completedAt: completedDate.toISOString(),
        duration,
        notes: notes || undefined,
        adHocName: adHocName || 'Quick Workout',
        adHocWorkoutType,
        adHocExercises: exercises.map(ex => ({
          exerciseKey: ex.exerciseKey,
          sets: ex.sets.filter(s => s.completed).map(s => ({
            reps: ex.exerciseType === 'cardio' ? 0 : s.reps,
            weight: s.weight > 0 ? s.weight : undefined,
            duration: s.duration,
            distance: s.distance,
          })),
        })),
      });
    }

    const totalDistance = exercises.reduce((t, ex) => {
      return t + ex.sets
        .filter(s => s.completed)
        .reduce((st, s) => st + (s.distance || 0), 0);
    }, 0);

    setVictoryData({
      workoutName,
      durationMinutes: Math.round(duration / 60),
      totalVolume,
      totalSets: totalCompletedSets,
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

  const stepIndex = ['choose', 'details', 'performance'].indexOf(step);

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
      animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
      transition={springGentle}
      className="app-bg py-8 px-4"
    >
      <div className="max-w-3xl mx-auto">
        {/* Header — matches template create page pattern */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 16, scale: 0.98 }}
          animate={prefersReducedMotion ? {} : { opacity: 1, y: 0, scale: 1 }}
          transition={{ ...springGentle, delay: 0.05 }}
          className="mb-8"
        >
          <div className="forge-card overflow-hidden">
            <div className="relative px-8 py-8 text-white greeting-gradient">
              <div className="absolute inset-0 bg-black/10" />
              <div className="relative flex items-center gap-4">
                <motion.button
                  onClick={() => {
                    if (step === 'choose') router.back();
                    else if (step === 'details') setStep('choose');
                    else setStep('details');
                  }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                  whileHover={prefersReducedMotion ? {} : { scale: 1.1 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
                  transition={springSnappy}
                >
                  <ArrowLeftIcon className="h-6 w-6" />
                </motion.button>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-wide uppercase">
                    Log Past Workout
                  </h1>
                  <p className="text-accent-100 text-sm mt-1">
                    {step === 'choose' && 'Select a template or log an ad-hoc workout'}
                    {step === 'details' && 'Enter when and how long your workout was'}
                    {step === 'performance' && 'Record what you actually did'}
                  </p>
                </div>
              </div>
            </div>

            {/* Step indicator inside card */}
            <div className="px-8 py-4 flex items-center gap-3 border-b border-surface-200 dark:border-surface-300">
              {(['Template', 'Details', 'Performance'] as const).map((label, i) => (
                <div key={label} className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (i < stepIndex) {
                        setStep(['choose', 'details', 'performance'][i] as Step);
                      }
                    }}
                    disabled={i > stepIndex}
                    className={`flex items-center gap-2 text-sm font-display font-semibold tracking-wide uppercase transition-colors ${
                      i === stepIndex
                        ? 'text-accent-600 dark:text-accent-400'
                        : i < stepIndex
                        ? 'text-success-600 dark:text-success-400 cursor-pointer hover:text-success-500'
                        : 'text-surface-400 dark:text-surface-500'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === stepIndex
                        ? 'bg-accent-500 text-white'
                        : i < stepIndex
                        ? 'bg-success-500 text-white'
                        : 'bg-surface-900 dark:bg-surface-400 text-surface-500'
                    }`}>
                      {i < stepIndex ? '✓' : i + 1}
                    </span>
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                  {i < 2 && (
                    <div className={`w-8 h-px ${
                      i < stepIndex ? 'bg-success-400' : 'bg-surface-900 dark:bg-surface-400'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {/* Step 1: Choose template or ad-hoc */}
          {step === 'choose' && (
            <motion.div
              key="choose"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={springSnappy}
            >
              <div className="forge-card p-6 mb-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
                  <input
                    type="text"
                    placeholder="Search templates..."
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    className="form-input !pl-11"
                  />
                </div>
              </div>

              <div className="space-y-2 mb-4 max-h-[26rem] overflow-y-auto">
                {templatesLoading ? (
                  <div className="forge-card p-12 text-center text-surface-500 dark:text-surface-600">Loading templates...</div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="forge-card p-12 text-center text-surface-500 dark:text-surface-600">No templates found</div>
                ) : (
                  filteredTemplates.map((template) => (
                    <motion.button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      whileHover={prefersReducedMotion ? {} : { scale: 1.01 }}
                      whileTap={prefersReducedMotion ? {} : { scale: 0.99 }}
                      transition={springSnappy}
                      className="w-full text-left forge-card heat-glow p-5 hover:border-accent-400/40 dark:hover:border-accent-500/40"
                    >
                      <div className="font-display font-bold text-surface-50 dark:text-white tracking-wide">
                        {template.name}
                      </div>
                      <div className="text-sm text-surface-500 dark:text-surface-600 mt-1 flex items-center gap-3">
                        <span>{template.exerciseCount} exercises</span>
                        <span className="text-surface-300 dark:text-surface-500">&middot;</span>
                        <span>~{template.estimatedDuration}min</span>
                        <span className="text-surface-300 dark:text-surface-500">&middot;</span>
                        <span className="capitalize">{template.workoutType}</span>
                      </div>
                    </motion.button>
                  ))
                )}
              </div>

              <button
                onClick={handleAdHoc}
                className="w-full p-5 forge-card border-2 !border-dashed hover:!border-accent-400/60 dark:hover:!border-accent-500/40 text-surface-500 dark:text-surface-600 hover:text-accent-600 dark:hover:text-accent-400 transition-colors flex items-center justify-center gap-2 font-display font-semibold tracking-wide uppercase text-sm"
              >
                <PlusIcon className="w-5 h-5" />
                Log Ad-Hoc Workout
              </button>
            </motion.div>
          )}

          {/* Step 2: Date, duration, notes */}
          {step === 'details' && (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={springSnappy}
            >
              <div className="forge-card overflow-hidden">
                <div className="p-6 sm:p-8 space-y-6">
                  {isAdHoc && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="form-label">Workout Name</label>
                        <input
                          type="text"
                          value={adHocName}
                          onChange={(e) => setAdHocName(e.target.value)}
                          className="form-input"
                          placeholder="e.g., Morning Run, Gym Session"
                        />
                      </div>
                      <div>
                        <label className="form-label">Workout Type</label>
                        <select
                          value={adHocWorkoutType}
                          onChange={(e) => setAdHocWorkoutType(e.target.value)}
                          className="form-input"
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

                  <div className="form-section">
                    <h2 className="text-sm font-semibold text-surface-600 dark:text-surface-500 uppercase tracking-wider mb-5">
                      When & How Long
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="form-label">
                          <CalendarDaysIcon className="w-3.5 h-3.5 inline mr-1.5" />
                          Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          value={completedAt}
                          onChange={(e) => setCompletedAt(e.target.value)}
                          className="form-input"
                        />
                      </div>
                      <div>
                        <label className="form-label">
                          <ClockIcon className="w-3.5 h-3.5 inline mr-1.5" />
                          Duration
                        </label>
                        <DurationField value={duration} onChange={setDuration} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="form-label">
                      <DocumentTextIcon className="w-3.5 h-3.5 inline mr-1.5" />
                      Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="form-input resize-none"
                      placeholder="How did it go?"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => setStep('performance')}
                      disabled={duration <= 0}
                      className="btn btn-primary disabled:opacity-50"
                    >
                      Next: Performance
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Performance data */}
          {step === 'performance' && (
            <motion.div
              key="performance"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={springSnappy}
            >
              <div className="forge-card overflow-hidden">
                <div className="p-6 sm:p-8 space-y-5">
                  {/* Exercise list */}
                  {exercises.map((exercise) => {
                    const isExpanded = expandedExercise === exercise.id;
                    const isCardio = exercise.exerciseType === 'cardio';
                    const exVolume = isCardio ? 0 : exercise.sets.reduce((t, s) => s.completed ? t + s.reps * s.weight : t, 0);

                    return (
                      <div key={exercise.id} className="form-section !p-0 overflow-hidden">
                        <div
                          className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-surface-950/50 dark:hover:bg-surface-100/50 transition-colors"
                          onClick={() => setExpandedExercise(isExpanded ? null : exercise.id)}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-2 h-2 rounded-full ${isCardio ? 'bg-info-500' : 'bg-accent-500'}`} />
                            <div>
                              <span className="font-display font-bold text-surface-50 dark:text-white text-sm tracking-wide">
                                {exercise.name}
                              </span>
                              <span className="ml-3 text-xs text-surface-500 dark:text-surface-600">
                                {exercise.sets.length} {exercise.sets.length === 1 ? 'set' : 'sets'}
                                {!isCardio && exVolume > 0 && ` · ${formatVolume(exVolume, useMetric)}`}
                                {isCardio && <span className="ml-1 px-1.5 py-0.5 bg-info-100 dark:bg-info-900/30 text-info-600 dark:text-info-400 rounded text-[10px] uppercase font-semibold">cardio</span>}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeExercise(exercise.id); }}
                            className="p-1.5 text-surface-400 hover:text-danger-500 transition-colors rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={springSnappy}
                              className="border-t border-surface-200 dark:border-surface-300"
                            >
                              <div className="p-4 space-y-3">
                                {exercise.sets.map((set, setIdx) => (
                                  <div
                                    key={set.id}
                                    className={`p-4 rounded-lg border transition-colors ${
                                      set.completed
                                        ? 'border-success-200 dark:border-success-800/40 bg-success-50/50 dark:bg-success-900/10'
                                        : 'border-surface-200 dark:border-surface-400 bg-surface-950/50 dark:bg-surface-200/20'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-3">
                                      <span className="form-label !mb-0">Set {setIdx + 1}</span>
                                      <div className="flex items-center gap-3">
                                        <label className="flex items-center gap-1.5 text-xs text-surface-500 cursor-pointer select-none">
                                          <input
                                            type="checkbox"
                                            checked={set.completed}
                                            onChange={(e) => updateSet(exercise.id, set.id, { completed: e.target.checked })}
                                            className="rounded border-surface-300 text-accent-500 focus:ring-accent-500 w-3.5 h-3.5"
                                          />
                                          <span className="font-display uppercase tracking-wider text-[10px] font-semibold">Done</span>
                                        </label>
                                        {exercise.sets.length > 1 && (
                                          <button
                                            onClick={() => removeSet(exercise.id, set.id)}
                                            className="p-1 text-surface-400 hover:text-danger-500 transition-colors"
                                          >
                                            <TrashIcon className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {isCardio ? (
                                      <div className="grid grid-cols-2 gap-3">
                                        <div>
                                          <label className="form-label">Duration</label>
                                          <DurationField
                                            value={set.duration || 0}
                                            onChange={(v) => updateSet(exercise.id, set.id, { duration: v })}
                                            placeholder="30:00"
                                            className="!py-2 !px-3 text-sm"
                                          />
                                        </div>
                                        <div>
                                          <label className="form-label">
                                            Distance ({useMetric ? 'km' : 'mi'})
                                          </label>
                                          <input
                                            type="number"
                                            step="0.1"
                                            value={set.distance ?? ''}
                                            onChange={(e) => updateSet(exercise.id, set.id, { distance: parseFloat(e.target.value) || undefined })}
                                            className="form-input !py-2 !px-3 text-sm"
                                            placeholder="0.0"
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-3 gap-3">
                                        <div>
                                          <label className="form-label">Reps</label>
                                          <input
                                            type="number"
                                            value={set.reps || ''}
                                            onChange={(e) => updateSet(exercise.id, set.id, { reps: parseInt(e.target.value) || 0 })}
                                            className="form-input !py-2 !px-3 text-sm"
                                          />
                                        </div>
                                        <div>
                                          <label className="form-label">{useMetric ? 'kg' : 'lbs'}</label>
                                          <input
                                            type="number"
                                            step="0.5"
                                            value={set.weight || ''}
                                            onChange={(e) => updateSet(exercise.id, set.id, { weight: parseFloat(e.target.value) || 0 })}
                                            className="form-input !py-2 !px-3 text-sm"
                                          />
                                        </div>
                                        <div>
                                          <label className="form-label">RPE</label>
                                          <input
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={set.rpe ?? ''}
                                            onChange={(e) => updateSet(exercise.id, set.id, { rpe: parseInt(e.target.value) || undefined })}
                                            className="form-input !py-2 !px-3 text-sm"
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                                <button
                                  onClick={() => addSet(exercise.id)}
                                  className="w-full py-2.5 text-xs font-display font-semibold tracking-wide uppercase text-accent-500 dark:text-accent-400 hover:bg-accent-50 dark:hover:bg-accent-900/20 rounded-lg transition-colors"
                                >
                                  + Add Set
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}

                  {/* Add exercise */}
                  {showExercisePicker ? (
                    <div className="form-section space-y-3">
                      <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                        <input
                          type="text"
                          placeholder="Search exercises..."
                          value={exerciseSearch}
                          onChange={(e) => setExerciseSearch(e.target.value)}
                          autoFocus
                          className="form-input !pl-10"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {filteredExercises.map(([key, ex]) => {
                          const exType = (ex as any).exerciseType || 'strength';
                          return (
                            <button
                              key={key}
                              onClick={() => addExercise(key, ex.name)}
                              className="w-full text-left px-4 py-3 text-sm rounded-lg hover:bg-surface-900 dark:hover:bg-surface-200/50 transition-colors flex items-center justify-between"
                            >
                              <span className="text-surface-50 dark:text-white font-medium">{ex.name}</span>
                              <span className="flex items-center gap-2">
                                <span className="text-xs text-surface-500">{ex.muscles.slice(0, 2).join(', ')}</span>
                                {exType === 'cardio' && (
                                  <span className="px-1.5 py-0.5 bg-info-100 dark:bg-info-900/30 text-info-600 dark:text-info-400 rounded text-[10px] uppercase font-semibold">cardio</span>
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => { setShowExercisePicker(false); setExerciseSearch(''); }}
                        className="btn btn-tertiary w-full text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowExercisePicker(true)}
                      className="w-full py-4 form-section !border-2 !border-dashed hover:!border-accent-400/60 dark:hover:!border-accent-500/40 text-surface-500 dark:text-surface-600 hover:text-accent-600 dark:hover:text-accent-400 transition-colors flex items-center justify-center gap-2 font-display font-semibold tracking-wide uppercase text-sm"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Add Exercise
                    </button>
                  )}

                  {/* Summary */}
                  <div className="form-section flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                    <span className="text-surface-500 dark:text-surface-600">
                      Volume: <strong className="text-surface-50 dark:text-white">{formatVolume(totalVolume, useMetric)}</strong>
                    </span>
                    <span className="text-surface-500 dark:text-surface-600">
                      Exercises: <strong className="text-surface-50 dark:text-white">{exercises.length}</strong>
                    </span>
                    <span className="text-surface-500 dark:text-surface-600">
                      Sets: <strong className="text-surface-50 dark:text-white">{exercises.reduce((t, ex) => t + ex.sets.filter(s => s.completed).length, 0)}</strong>
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between pt-2">
                    <button onClick={() => setStep('details')} className="btn btn-tertiary">
                      Back
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={logWorkout.isPending || exercises.length === 0}
                      className="btn btn-primary disabled:opacity-50"
                    >
                      {logWorkout.isPending ? 'Logging...' : 'Log Workout'}
                    </button>
                  </div>

                  {logWorkout.isError && (
                    <div className="form-error">
                      <div className="w-5 h-5 rounded-full bg-danger-500 flex items-center justify-center shrink-0">
                        <span className="text-white text-xs font-bold">!</span>
                      </div>
                      {logWorkout.error?.message || 'Failed to log workout'}
                    </div>
                  )}
                </div>
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
