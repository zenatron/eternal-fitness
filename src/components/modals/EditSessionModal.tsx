'use client';

import { useState, useEffect, useMemo } from 'react';
import { ModalShell } from '@/components/ui/ModalShell';
import {
  PencilSquareIcon,
  ClockIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { useUpdateSession, UpdateSessionData } from '@/lib/hooks/useMutations';
import { parseDuration, formatDurationInput, formatDurationHuman } from '@/utils/durationUtils';
import { formatVolume } from '@/utils/formatters';
import { WorkoutSessionData, ExercisePerformance } from '@/types/workout';
import { exercises as exerciseLibrary } from '@/lib/exercises';
import { springSnappy } from '@/lib/motion';


interface SessionData {
  id: string;
  completedAt: string;
  duration: number;
  totalVolume: number;
  totalSets: number;
  totalExercises: number;
  notes?: string;
  performanceData?: WorkoutSessionData;
  templateName: string;
}

interface EditSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: SessionData | null;
  useMetric: boolean;
}

interface EditableSet {
  setId: string;
  actualReps?: number;
  actualWeight?: number;
  actualDuration?: number;
  actualRpe?: number;
  completed: boolean;
  skipped?: boolean;
  notes?: string;
}

interface EditableExercise {
  exerciseId: string;
  exerciseKey: string;
  exerciseName: string;
  exerciseType: 'strength' | 'cardio' | 'flexibility';
  sets: EditableSet[];
  exerciseNotes?: string;
}

function getExerciseType(exerciseKey: string): 'strength' | 'cardio' | 'flexibility' {
  const ex = exerciseLibrary[exerciseKey as keyof typeof exerciseLibrary];
  return (ex as any)?.exerciseType || 'strength';
}

function DurationField({ value, onChange, placeholder = '45:00' }: {
  value: number;
  onChange: (seconds: number) => void;
  placeholder?: string;
}) {
  const [textValue, setTextValue] = useState(() => formatDurationInput(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) setTextValue(formatDurationInput(value));
  }, [value, isFocused]);

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
        className={`form-input !py-2 ${isInvalid ? '!border-danger-400 dark:!border-danger-500' : ''}`}
        placeholder={placeholder}
      />
      {textValue.trim() !== '' && (
        <span className={`form-hint ${isInvalid ? '!text-danger-400' : ''}`}>
          {isInvalid ? 'Invalid format' : `= ${formatDurationHuman(parsed!)}`}
        </span>
      )}
    </div>
  );
}

export function EditSessionModal({ isOpen, onClose, session, useMetric }: EditSessionModalProps) {
  const updateSession = useUpdateSession();

  const [duration, setDuration] = useState(0);
  const [notes, setNotes] = useState('');
  const [completedAt, setCompletedAt] = useState('');
  const [exercises, setExercises] = useState<EditableExercise[]>([]);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    setDuration(session.duration || 0);
    setNotes(session.notes || '');

    const date = new Date(session.completedAt);
    const tzOffset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - tzOffset * 60000);
    setCompletedAt(local.toISOString().slice(0, 16));

    const perfData = session.performanceData;
    if (perfData?.performance) {
      const perf = perfData.performance as Record<string, ExercisePerformance>;
      const template = perfData.templateSnapshot;
      const editableExercises: EditableExercise[] = [];

      for (const [exerciseId, ep] of Object.entries(perf)) {
        const templateExercise = template?.exercises?.find(
          (e: any) => e.id === exerciseId || e.exerciseKey === ep.exerciseKey
        );
        editableExercises.push({
          exerciseId,
          exerciseKey: ep.exerciseKey,
          exerciseName: templateExercise?.name || ep.exerciseKey,
          exerciseType: getExerciseType(ep.exerciseKey),
          sets: ep.sets.map(s => ({
            setId: s.setId,
            actualReps: s.actualReps,
            actualWeight: s.actualWeight,
            actualDuration: s.actualDuration,
            actualRpe: s.actualRpe,
            completed: s.completed,
            skipped: s.skipped,
            notes: s.notes,
          })),
          exerciseNotes: ep.exerciseNotes,
        });
      }
      setExercises(editableExercises);
      if (editableExercises.length > 0) {
        setExpandedExercise(editableExercises[0].exerciseId);
      }
    } else {
      setExercises([]);
    }
  }, [session]);

  const totalVolume = useMemo(() => {
    return exercises.reduce((total, ex) => {
      if (ex.exerciseType === 'cardio') return total;
      return total + ex.sets.reduce((setTotal, set) => {
        if (!set.completed) return setTotal;
        return setTotal + (set.actualReps || 0) * (set.actualWeight || 0);
      }, 0);
    }, 0);
  }, [exercises]);

  const updateSet = (exerciseId: string, setId: string, updates: Partial<EditableSet>) => {
    setExercises(prev => prev.map(ex => {
      if (ex.exerciseId !== exerciseId) return ex;
      return {
        ...ex,
        sets: ex.sets.map(s => s.setId === setId ? { ...s, ...updates } : s),
      };
    }));
  };

  const handleSave = async () => {
    if (!session) return;

    const completedDate = new Date(completedAt);

    const data: UpdateSessionData = {
      duration,
      notes: notes || undefined,
      completedAt: completedDate.toISOString(),
    };

    if (exercises.length > 0) {
      const performance: UpdateSessionData['performance'] = {};
      for (const ex of exercises) {
        const isCardio = ex.exerciseType === 'cardio';
        const exVolume = isCardio ? 0 : ex.sets.reduce((t, s) => {
          if (!s.completed) return t;
          return t + (s.actualReps || 0) * (s.actualWeight || 0);
        }, 0);
        performance[ex.exerciseId] = {
          exerciseKey: ex.exerciseKey,
          sets: ex.sets,
          exerciseNotes: ex.exerciseNotes,
          totalVolume: exVolume,
        };
      }
      data.performance = performance;
    }

    await updateSession.mutateAsync({ id: session.id, data });
    onClose();
  };

  if (!session) return null;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Workout"
      subtitle={session.templateName}
      maxWidth="max-w-2xl"
      icon={
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-100 dark:bg-accent-900/30">
          <PencilSquareIcon className="h-5 w-5 text-accent-500" />
        </div>
      }
      footer={
        <div className="space-y-3">
          {updateSession.isError && (
            <div className="form-error">
              <div className="w-5 h-5 rounded-full bg-danger-500 flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              {updateSession.error?.message || 'Failed to save changes'}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn btn-tertiary">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={updateSession.isPending}
              className="btn btn-primary disabled:opacity-50"
            >
              {updateSession.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      }
    >
      {/* Duration + Date */}
      <div className="form-section mb-5">
        <h2 className="text-sm font-semibold text-surface-600 dark:text-surface-500 uppercase tracking-wider mb-4">
          Session Info
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">
              <ClockIcon className="w-3.5 h-3.5 inline mr-1.5" />
              Duration
            </label>
            <DurationField value={duration} onChange={setDuration} />
          </div>
          <div>
            <label className="form-label">
              <CalendarDaysIcon className="w-3.5 h-3.5 inline mr-1.5" />
              Completed At
            </label>
            <input
              type="datetime-local"
              value={completedAt}
              onChange={(e) => setCompletedAt(e.target.value)}
              className="form-input !py-2"
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="mb-5">
        <label className="form-label">
          <DocumentTextIcon className="w-3.5 h-3.5 inline mr-1.5" />
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="form-input resize-none"
          placeholder="Workout notes..."
        />
      </div>

      {/* Exercise Performance */}
      {exercises.length > 0 && (
        <div className="mb-5">
          <h3 className="form-label !mb-3">Performance Data</h3>
          <div className="space-y-2">
            {exercises.map((exercise) => {
              const isExpanded = expandedExercise === exercise.exerciseId;
              const isCardio = exercise.exerciseType === 'cardio';
              const exVolume = isCardio ? 0 : exercise.sets.reduce((t, s) => {
                if (!s.completed) return t;
                return t + (s.actualReps || 0) * (s.actualWeight || 0);
              }, 0);

              return (
                <div
                  key={exercise.exerciseId}
                  className="form-section !p-0 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedExercise(isExpanded ? null : exercise.exerciseId)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-950/50 dark:hover:bg-surface-100/50 transition-colors"
                  >
                    <div className="text-left flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${isCardio ? 'bg-info-500' : 'bg-accent-500'}`} />
                      <span className="text-sm font-display font-bold text-surface-50 dark:text-white tracking-wide">
                        {exercise.exerciseName}
                      </span>
                      <span className="text-xs text-surface-500 dark:text-surface-600">
                        {exercise.sets.filter(s => s.completed).length}/{exercise.sets.length} set
                        {!isCardio && exVolume > 0 && ` · ${formatVolume(exVolume, useMetric)}`}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUpIcon className="w-4 h-4 text-surface-500" />
                    ) : (
                      <ChevronDownIcon className="w-4 h-4 text-surface-500" />
                    )}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={springSnappy}
                        className="border-t border-surface-200 dark:border-surface-300"
                      >
                        <div className="p-3 space-y-2">
                          {exercise.sets.map((set, setIdx) => (
                            <div
                              key={set.setId}
                              className={`p-3 rounded-lg border transition-colors ${
                                set.completed
                                  ? 'border-success-200 dark:border-success-800/40 bg-success-50/50 dark:bg-success-900/10'
                                  : 'border-surface-200 dark:border-surface-400 bg-surface-950/50 dark:bg-surface-200/20'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <span className="form-label !mb-0">Set {setIdx + 1}</span>
                                <label className="flex items-center gap-1 text-xs text-surface-500 ml-auto cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={set.completed}
                                    onChange={(e) => updateSet(exercise.exerciseId, set.setId, { completed: e.target.checked })}
                                    className="rounded border-surface-300 text-accent-500 focus:ring-accent-500 w-3.5 h-3.5"
                                  />
                                  <span className="font-display uppercase tracking-wider text-[10px] font-semibold">Done</span>
                                </label>
                              </div>

                              {isCardio ? (
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="form-label">Duration</label>
                                    <DurationField
                                      value={set.actualDuration || 0}
                                      onChange={(v) => updateSet(exercise.exerciseId, set.setId, { actualDuration: v })}
                                      placeholder="30:00"
                                    />
                                  </div>
                                  <div>
                                    <label className="form-label">RPE</label>
                                    <input
                                      type="number"
                                      min="1"
                                      max="10"
                                      value={set.actualRpe ?? ''}
                                      onChange={(e) => updateSet(exercise.exerciseId, set.setId, { actualRpe: parseInt(e.target.value) || undefined })}
                                      className="form-input !py-2 !px-3 text-sm"
                                      placeholder="—"
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="grid grid-cols-3 gap-3">
                                  <div>
                                    <label className="form-label">Reps</label>
                                    <input
                                      type="number"
                                      value={set.actualReps ?? ''}
                                      onChange={(e) => updateSet(exercise.exerciseId, set.setId, { actualReps: parseInt(e.target.value) || undefined })}
                                      className="form-input !py-2 !px-3 text-sm"
                                      placeholder="0"
                                    />
                                  </div>
                                  <div>
                                    <label className="form-label">{useMetric ? 'kg' : 'lbs'}</label>
                                    <input
                                      type="number"
                                      step="0.5"
                                      value={set.actualWeight ?? ''}
                                      onChange={(e) => updateSet(exercise.exerciseId, set.setId, { actualWeight: parseFloat(e.target.value) || undefined })}
                                      className="form-input !py-2 !px-3 text-sm"
                                      placeholder="0"
                                    />
                                  </div>
                                  <div>
                                    <label className="form-label">RPE</label>
                                    <input
                                      type="number"
                                      min="1"
                                      max="10"
                                      value={set.actualRpe ?? ''}
                                      onChange={(e) => updateSet(exercise.exerciseId, set.setId, { actualRpe: parseInt(e.target.value) || undefined })}
                                      className="form-input !py-2 !px-3 text-sm"
                                      placeholder="—"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="form-section flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
        <span className="text-surface-500 dark:text-surface-600">
          Volume: <strong className="text-surface-50 dark:text-white">{formatVolume(totalVolume, useMetric)}</strong>
        </span>
        <span className="text-surface-500 dark:text-surface-600">
          Duration: <strong className="text-surface-50 dark:text-white">{formatDurationHuman(duration)}</strong>
        </span>
      </div>
    </ModalShell>
  );
}
