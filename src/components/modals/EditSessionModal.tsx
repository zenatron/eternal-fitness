'use client';

import { ExclamationCircleIcon } from '@heroicons/react/20/solid';
import { useState, useEffect, useMemo } from 'react';
import { ModalShell } from '@/components/ui/ModalShell';
import {
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { useUpdateSession, UpdateSessionData } from '@/lib/hooks/useMutations';
import { DurationInput } from '@/components/ui/DurationInput';
import { StepperInput } from '@/components/workout/StepperInput';
import { getExerciseType } from '@/lib/exerciseSearch';
import { formatDurationHuman } from '@/utils/durationUtils';
import { formatVolume } from '@/utils/formatters';
import { performedSetsVolume, resolvePerSide, weightUnitLabel } from '@/lib/volume';
import { WorkoutSessionData, ExercisePerformance } from '@/types/workout';
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
  actualDistance?: number;
  actualRpe?: number;
  restTime?: number;
  completed: boolean;
  skipped?: boolean;
  notes?: string;
}

interface EditableExercise {
  exerciseId: string;
  exerciseKey: string;
  exerciseName: string;
  exerciseType: 'strength' | 'cardio' | 'flexibility';
  /** Resolved per-side flag — decides whether volume counts the load twice. */
  perSide?: boolean;
  sets: EditableSet[];
  exerciseNotes?: string;
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
          // Same resolution the server uses when it recomputes on save —
          // explicit flag, then the session's template snapshot — so the
          // number shown here is the number that will be stored. The library
          // default is deliberately not consulted: pre-perSide sessions were
          // saved ×1 and must stay that way.
          perSide: resolvePerSide(ep, exerciseId, template),
          sets: ep.sets.map(s => ({
            setId: s.setId,
            actualReps: s.actualReps,
            actualWeight: s.actualWeight,
            actualDuration: s.actualDuration,
            // Carried through so saving an edit cannot erase them — the
            // modal used to rebuild sets without these fields.
            actualDistance: s.actualDistance,
            restTime: s.restTime,
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

  // Volume through the shared maths (per-side ×2 included) so the figure the
  // user sees while editing is the figure the server will store — the two
  // disagreed by 2× on dumbbell work before this went through lib/volume.ts.
  const totalVolume = useMemo(() => {
    return exercises.reduce((total, ex) => {
      if (ex.exerciseType === 'cardio') return total;
      return total + performedSetsVolume(ex.sets as EditableSet[], ex.perSide);
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
        const exVolume = isCardio ? 0 : performedSetsVolume(ex.sets as EditableSet[], ex.perSide);
        performance[ex.exerciseId] = {
          exerciseKey: ex.exerciseKey,
          perSide: ex.perSide,
          sets: ex.sets,
          exerciseNotes: ex.exerciseNotes,
          // Recomputed server-side; sent so older servers / consumers that
          // read it see a number consistent with the sets.
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
      title="Edit workout"
      subtitle={session.templateName}
      maxWidth="max-w-2xl"
      footer={
        <div className="space-y-3">
          {updateSession.isError && (
            <div className="form-error">
              <ExclamationCircleIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {updateSession.error?.message || 'Failed to save changes'}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn btn-tertiary min-h-[44px]">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={updateSession.isPending}
              className="btn btn-primary min-h-[44px]"
            >
              {updateSession.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      }
    >
      {/* Same fields, labels and order as step 2 of "Log a past workout". */}
      <div className="form-section mb-4 space-y-4">
        <h2 className="section-title">When and how long</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="edit-completed-at" className="form-label">Finished</label>
            <input
              id="edit-completed-at"
              type="datetime-local"
              value={completedAt}
              onChange={(e) => setCompletedAt(e.target.value)}
              className="form-input"
            />
          </div>
          <div>
            <label htmlFor="edit-duration" className="form-label">Duration</label>
            <DurationInput id="edit-duration" value={duration} onChange={(v) => setDuration(v ?? 0)} />
          </div>
        </div>
        <div>
          <label htmlFor="edit-notes" className="form-label">
            Notes <span className="text-surface-600 dark:text-surface-500">(optional)</span>
          </label>
          <textarea
            id="edit-notes"
            value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="form-input resize-none"
          placeholder="How did it go?"
        />
        </div>
      </div>

      {/* Exercise Performance */}
      {exercises.length > 0 && (
        <div className="mb-4">
          <h3 className="section-title mb-2">Performance</h3>
          <div className="space-y-2">
            {exercises.map((exercise) => {
              const isExpanded = expandedExercise === exercise.exerciseId;
              const isCardio = exercise.exerciseType === 'cardio';
              const exVolume = isCardio ? 0 : performedSetsVolume(exercise.sets as EditableSet[], exercise.perSide);

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
                      <span className="text-sm font-medium text-surface-50 dark:text-white">
                        {exercise.exerciseName}
                      </span>
                      <span className="text-xs text-surface-500 dark:text-surface-600">
                        {exercise.sets.filter(s => s.completed).length}/{exercise.sets.length}{' '}
                        {exercise.sets.length === 1 ? 'set' : 'sets'}
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
                        className="border-t border-black/10 dark:border-surface-300"
                      >
                        <div className="p-3 space-y-2">
                          {exercise.sets.map((set, setIdx) => (
                            <div
                              key={set.setId}
                              className={`p-3 rounded-lg border transition-colors ${
                                set.completed
                                  ? 'border-success-200 dark:border-success-800/40 bg-success-50/50 dark:bg-success-900/10'
                                  : 'border-black/10 dark:border-surface-400 bg-surface-950/50 dark:bg-surface-200/20'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-medium text-surface-50 dark:text-white">
                                  Set <span className="figure">{setIdx + 1}</span>
                                </span>
                                <label className="ml-auto flex min-h-[44px] cursor-pointer select-none items-center gap-2 px-1 text-sm text-surface-500 dark:text-surface-700">
                                  <input
                                    type="checkbox"
                                    checked={set.completed}
                                    onChange={(e) =>
                                      updateSet(exercise.exerciseId, set.setId, {
                                        completed: e.target.checked,
                                        // Done and skipped are exclusive; the server
                                        // counts a set with both as skipped.
                                        ...(e.target.checked ? { skipped: false } : {}),
                                      })
                                    }
                                    className="h-5 w-5 accent-accent-500"
                                  />
                                  Done
                                </label>
                              </div>

                              {isCardio ? (
                                <div className="grid grid-cols-3 gap-3">
                                  <div>
                                    <label className="form-label">Duration</label>
                                    <DurationInput
                                      value={set.actualDuration}
                                      onChange={(v) => updateSet(exercise.exerciseId, set.setId, { actualDuration: v })}
                                      placeholder="30:00"
                                      className="!py-2"
                                    />
                                  </div>
                                  <StepperInput
                                    label={useMetric ? 'km' : 'mi'}
                                    value={set.actualDistance}
                                    onChange={(v) => updateSet(exercise.exerciseId, set.setId, { actualDistance: v })}
                                    step={0.1}
                                    min={0}
                                    allowDecimal
                                    placeholder="—"
                                    compact
                                  />
                                  <div>
                                    <StepperInput
                                      label="RPE"
                                      value={set.actualRpe}
                                      onChange={(v) => updateSet(exercise.exerciseId, set.setId, { actualRpe: v })}
                                      step={1}
                                      min={1}
                                      max={10}
                                      placeholder="—"
                                      compact
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="grid grid-cols-3 gap-3">
                                  <StepperInput
                                    label="Reps"
                                    value={set.actualReps}
                                    onChange={(v) => updateSet(exercise.exerciseId, set.setId, { actualReps: v })}
                                    step={1}
                                    placeholder="0"
                                    compact
                                  />
                                  <StepperInput
                                    label={weightUnitLabel(useMetric, exercise.perSide)}
                                    value={set.actualWeight}
                                    onChange={(v) => updateSet(exercise.exerciseId, set.setId, { actualWeight: v })}
                                    step={useMetric ? 2.5 : 5}
                                    allowDecimal
                                    placeholder="0"
                                    compact
                                  />
                                  <StepperInput
                                    label="RPE"
                                    value={set.actualRpe}
                                    onChange={(v) => updateSet(exercise.exerciseId, set.setId, { actualRpe: v })}
                                    step={1}
                                    min={1}
                                    max={10}
                                    placeholder="—"
                                    compact
                                  />
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
      <dl className="form-section grid grid-cols-2 gap-3">
        <div>
          <dt className="stat-label">Volume</dt>
          <dd className="figure mt-1 text-lg leading-none">{formatVolume(totalVolume, useMetric)}</dd>
        </div>
        <div>
          <dt className="stat-label">Duration</dt>
          <dd className="figure mt-1 text-lg leading-none">{formatDurationHuman(duration)}</dd>
        </div>
      </dl>
    </ModalShell>
  );
}
