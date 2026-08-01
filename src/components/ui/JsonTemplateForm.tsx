'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BoltIcon,
  PlusCircleIcon,
  TrashIcon,
  StarIcon as StarOutline,
  CheckCircleIcon,
  DocumentDuplicateIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { exercises } from '@/lib/exercises';
import { ExercisePicker } from '@/components/ui/ExercisePicker';
import { DurationInput } from '@/components/ui/DurationInput';
import { StepperInput } from '@/components/workout/StepperInput';
import { weightUnitLabel } from '@/lib/volume';
import { useCreateTemplate, useUpdateTemplate } from '@/lib/hooks/useMutations';
import { TemplateInputData } from '@/lib/hooks/useMutations';
import { useProfile } from '@/lib/hooks/useProfile';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { WorkoutType, Difficulty } from '@/types/workout';
import { springSnappy } from '@/lib/motion';

interface ExerciseSet {
  id?: string;
  reps: number;
  weight?: number;
  duration?: number;
  distance?: number;
  type: string;
  restTime?: number;
  notes?: string;
}

interface TemplateExercise {
  exerciseKey: string;
  exerciseType?: 'strength' | 'cardio' | 'flexibility';
  sets: ExerciseSet[];
  instructions?: string;
  restBetweenSets?: number;
  /** Logged weight is per limb — volume counts it twice. See lib/volume.ts. */
  perSide?: boolean;
}

interface JsonTemplateFormProps {
  mode: 'create' | 'edit';
  templateId?: string;
  initialData?: Partial<TemplateInputData>;
  onSuccess?: () => void;
}



export default function JsonTemplateForm({ mode, templateId, initialData, onSuccess }: JsonTemplateFormProps) {
  const router = useRouter();
  const createTemplateMutation = useCreateTemplate();
  const updateTemplateMutation = useUpdateTemplate();
  const { profile } = useProfile();
  const useMetric = profile?.useMetric ?? true;

  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [favorite, setFavorite] = useState(initialData?.favorite || false);
  const [workoutType, setWorkoutType] = useState(initialData?.workoutType || 'strength');
  const [difficulty, setDifficulty] = useState(initialData?.difficulty || 'intermediate');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [templateExercises, setTemplateExercises] = useState<TemplateExercise[]>(() => {
    const initExercises = (initialData?.exercises as TemplateExercise[]) || [];
    return initExercises.map(exercise => {
      const staticData = exercises[exercise.exerciseKey as keyof typeof exercises];
      return {
        ...exercise,
        exerciseType: exercise.exerciseType || staticData?.exerciseType || 'strength',
        // Existing templates predate this flag; fall back to the library default
        // rather than silently treating everything as bilateral.
        perSide: exercise.perSide ?? staticData?.perSide ?? false,
        sets: exercise.sets.map(set => ({
          ...set,
          id: set.id || `set-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
        }))
      };
    });
  });

  const handleSetDragEnd = (result: DropResult, exerciseIndex: number) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    setTemplateExercises((prev) => {
      const updated = [...prev];
      const sets = [...updated[exerciseIndex].sets];

      const [reorderedItem] = sets.splice(sourceIndex, 1);
      sets.splice(destinationIndex, 0, reorderedItem);

      updated[exerciseIndex].sets = sets;
      return updated;
    });
  };

  const addExercise = (exerciseKey: string) => {
    const exerciseData = exercises[exerciseKey as keyof typeof exercises];
    if (!exerciseData) return;

    const isCardio = exerciseData.exerciseType === 'cardio';
    const newExercise: TemplateExercise = {
      exerciseKey,
      exerciseType: exerciseData.exerciseType || 'strength',
      // Defaulted from the library so the common cases (dumbbells, unilateral
      // movements) are already right; overridable per template below.
      perSide: exerciseData.perSide ?? false,
      sets: [
        {
          id: `set-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          reps: isCardio ? 0 : 10,
          weight: isCardio ? undefined : 0,
          duration: isCardio ? 300 : undefined,
          distance: undefined,
          type: 'working',
          restTime: isCardio ? 0 : 60,
        },
      ],
      restBetweenSets: isCardio ? 0 : 60,
    };

    setTemplateExercises([...templateExercises, newExercise]);
  };

  const toggleExercisePerSide = (index: number) => {
    setTemplateExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, perSide: !ex.perSide } : ex))
    );
  };

  const removeExercise = (index: number) => {
    setTemplateExercises(templateExercises.filter((_, i) => i !== index));
  };

  const addSet = (exerciseIndex: number) => {
    const updated = [...templateExercises];
    const exercise = updated[exerciseIndex];
    const lastSet = exercise.sets[exercise.sets.length - 1];
    const isCardio = exercise.exerciseType === 'cardio';

    updated[exerciseIndex].sets.push({
      id: `set-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      reps: lastSet?.reps ?? (isCardio ? 0 : 10),
      weight: lastSet?.weight ?? (isCardio ? undefined : 0),
      duration: lastSet?.duration,
      distance: lastSet?.distance,
      type: 'working',
      restTime: lastSet?.restTime ?? (isCardio ? 0 : 60),
    });

    setTemplateExercises(updated);
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const updated = [...templateExercises];
    updated[exerciseIndex].sets = updated[exerciseIndex].sets.filter((_, i) => i !== setIndex);
    setTemplateExercises(updated);
  };

  const duplicateSet = (exerciseIndex: number, setIndex: number) => {
    const updated = [...templateExercises];
    const setToDuplicate = {
      ...updated[exerciseIndex].sets[setIndex],
      id: `set-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
    };
    updated[exerciseIndex].sets.splice(setIndex + 1, 0, setToDuplicate);
    setTemplateExercises(updated);
  };



  const updateSet = (exerciseIndex: number, setIndex: number, field: keyof ExerciseSet, value: any) => {
    const updated = [...templateExercises];
    updated[exerciseIndex].sets[setIndex] = {
      ...updated[exerciseIndex].sets[setIndex],
      [field]: value,
    };
    setTemplateExercises(updated);
  };

  const updateExercise = (exerciseIndex: number, field: keyof TemplateExercise, value: any) => {
    const updated = [...templateExercises];
    updated[exerciseIndex] = {
      ...updated[exerciseIndex],
      [field]: value,
    };
    setTemplateExercises(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Template name is required');
      return;
    }

    if (templateExercises.length === 0) {
      toast.error('At least one exercise is required');
      return;
    }

    for (let i = 0; i < templateExercises.length; i++) {
      const exercise = templateExercises[i];

      if (exercise.sets.length === 0) {
        toast.error(`Exercise ${i + 1} must have at least one set`);
        return;
      }

      const isCardio = exercise.exerciseType === 'cardio';

      for (let j = 0; j < exercise.sets.length; j++) {
        const set = exercise.sets[j];

        if (!isCardio && set.reps <= 0) {
          toast.error(`Exercise ${i + 1}, Set ${j + 1}: Reps must be greater than 0`);
          return;
        }

        if (isCardio && !set.duration && !set.distance) {
          toast.error(`Exercise ${i + 1}, Set ${j + 1}: Duration or distance is required`);
          return;
        }

        if (set.weight !== undefined && set.weight < 0) {
          toast.error(`Exercise ${i + 1}, Set ${j + 1}: Weight cannot be negative`);
          return;
        }

        if (set.restTime !== undefined && set.restTime < 0) {
          toast.error(`Exercise ${i + 1}, Set ${j + 1}: Rest time cannot be negative`);
          return;
        }
      }
    }

    const templateData: TemplateInputData = {
      name: name.trim(),
      description: description.trim() || undefined,
      favorite,
      workoutType: workoutType as any,
      difficulty: difficulty as any,
      tags,
      exercises: templateExercises,
    };

    try {
      if (mode === 'edit' && templateId) {
        await updateTemplateMutation.mutateAsync({ id: templateId, data: templateData });
        toast.success('Template updated successfully!');
      } else {
        await createTemplateMutation.mutateAsync(templateData);
        toast.success('Template created successfully!');
      }
      onSuccess?.();
      router.push('/templates');
    } catch (error) {
      toast.error(mode === 'edit' ? 'Failed to update template' : 'Failed to create template');
      console.error('Template save error:', error);
    }
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Template Basic Info */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          transition={springSnappy}
          whileHover={{ y: -2 }}
          className="forge-card overflow-hidden"
        >
          <div className="h-2 bg-gradient-to-r from-accent-500 to-accent-700"></div>
          <div className="p-4 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-accent-100 dark:bg-accent-900/30 rounded-xl">
                <PlusCircleIcon className="h-6 w-6 text-accent-600 dark:text-accent-400" />
              </div>
              <h3 className="text-2xl font-bold text-surface-50 dark:text-white">Template Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-surface-600 dark:text-surface-800 mb-3">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                  placeholder="e.g., Push Day, Full Body Workout"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-surface-600 dark:text-surface-800 mb-3">
                  Workout Type
                </label>
                <select
                  value={workoutType}
                  onChange={(e) => setWorkoutType(e.target.value as WorkoutType)}
                  className="form-input"
                >
                  <option value="strength">💪 Strength Training</option>
                  <option value="cardio">🏃 Cardio</option>
                  <option value="hybrid">⚡ Hybrid</option>
                  <option value="flexibility">🧘 Flexibility</option>
                  <option value="sports">⚽ Sports</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-surface-600 dark:text-surface-800 mb-3">
                  Difficulty Level
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                  className="form-input"
                >
                  <option value="beginner">🌱 Beginner</option>
                  <option value="intermediate">🔥 Intermediate</option>
                  <option value="advanced">💎 Advanced</option>
                </select>
              </div>

              <div className="flex items-end">
                <motion.button
                  type="button"
                  onClick={() => setFavorite(!favorite)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={springSnappy}
                  className={`flex items-center gap-3 px-6 py-3 rounded-xl border-2 ${
                    favorite
                      ? 'border-award-300 bg-award-50 dark:bg-award-900/20 text-award-700 dark:text-award-400'
                      : 'border-surface-300 dark:border-surface-400 hover:border-award-300 hover:bg-award-50 dark:hover:bg-award-900/20'
                  }`}
                >
                  {favorite ? (
                    <StarSolid className="w-5 h-5 text-award-500" />
                  ) : (
                    <StarOutline className="w-5 h-5" />
                  )}
                  <span className="font-medium">Mark as Favorite</span>
                </motion.button>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-semibold text-surface-600 dark:text-surface-800 mb-3">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-input"
                rows={4}
                placeholder="Describe your workout template... What makes it special? What are the goals?"
              />
            </div>
          </div>
        </motion.div>

        {/* Exercise Selection */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          transition={{ ...springSnappy, delay: 0.1 }}
          whileHover={{ y: -2 }}
          className="forge-card overflow-hidden"
        >
          <div className="h-2 bg-gradient-to-r from-accent-500 to-accent-700"></div>
          <div className="p-4 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-success-100 dark:bg-success-900/30 rounded-xl">
                <PlusCircleIcon className="h-6 w-6 text-success-600 dark:text-success-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-surface-50 dark:text-white">Exercise Library</h3>
                <p className="text-surface-500 dark:text-surface-600">Choose exercises to build your workout</p>
              </div>
            </div>

            <ExercisePicker onSelect={(key) => addExercise(key)} layout="grid" />
          </div>
        </motion.div>

        {/* Template Exercises */}
        {templateExercises.length === 0 ? (
          <div className="forge-card p-12 text-center">
            <div className="p-4 bg-surface-900 dark:bg-surface-200 rounded-full w-20 h-20 mx-auto mb-6">
              <PlusCircleIcon className="w-12 h-12 text-surface-600 mx-auto" />
            </div>
            <h3 className="text-xl font-bold text-surface-50 dark:text-white mb-2">
              No Exercises Added Yet
            </h3>
            <p className="text-surface-500 dark:text-surface-600 mb-4">
              Choose exercises from the library above to start building your workout template
            </p>
            <p className="text-sm text-surface-500 dark:text-surface-500">
              💡 Tip: Start with compound movements like squats, deadlifts, or bench press
            </p>
          </div>
        ) : (
          templateExercises.map((exercise, exerciseIndex) => {
            const exerciseData = exercises[exercise.exerciseKey as keyof typeof exercises];

            return (
            <motion.div
              key={exerciseIndex}
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
              transition={{ ...springSnappy, delay: 0.1 + exerciseIndex * 0.05 }}
              whileHover={{ y: -2 }}
              className="forge-card overflow-hidden"
            >
              <div className="h-2 bg-gradient-to-r from-accent-500 to-accent-700"></div>
              <div className="p-4 sm:p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-accent-100 dark:bg-accent-900/30 rounded-xl">
                      <BoltIcon className="h-6 w-6 text-accent-600 dark:text-accent-400" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-surface-50 dark:text-white">
                        {exerciseData?.name || exercise.exerciseKey}
                      </h4>
                      <p className="text-sm text-surface-500 dark:text-surface-600">
                        {exerciseData?.muscles.join(', ')} • {exerciseData?.equipment.join(', ')}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeExercise(exerciseIndex)}
                    aria-label={`Remove ${exerciseData?.name || exercise.exerciseKey}`}
                    className="touch-target flex shrink-0 items-center justify-center rounded-lg bg-danger-100 text-danger-600 transition-colors hover:bg-danger-200 dark:bg-danger-900/30 dark:text-danger-400 dark:hover:bg-danger-900/50 tap-control"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Per-side toggle.
                    Dumbbell and unilateral work is logged as the weight of one
                    limb, so the session moves twice that load. Without this the
                    volume for roughly a third of the library is half of what it
                    should be. Defaulted from the exercise library; this is the
                    override for the cases the default gets wrong. */}
                {exercise.exerciseType !== 'cardio' && (
                  <label className="mb-5 flex cursor-pointer items-start gap-3 rounded-xl border border-surface-900 p-3 dark:border-surface-400/50">
                    <input
                      type="checkbox"
                      checked={exercise.perSide ?? false}
                      onChange={() => toggleExercisePerSide(exerciseIndex)}
                      className="mt-0.5 h-5 w-5 shrink-0 accent-accent-500"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-surface-50 dark:text-white">
                        Weight is per side
                      </span>
                      <span className="mt-0.5 block text-xs text-surface-500 dark:text-surface-600">
                        {exercise.perSide
                          ? 'Enter the weight for one side; volume counts both.'
                          : 'Enter the total weight moved.'}
                      </span>
                    </span>
                  </label>
                )}

                {/* Sets.
                    Was a seven-column grid (drag, number, reps, weight, rest,
                    copy, remove) which gave each column ~40px on a phone — the
                    labels were clipped and the inputs unusable. Each set is now
                    its own card: identity and actions on one row, the numeric
                    fields on a two-column grid beneath, using the same stepper
                    control as the live workout tracker. */}
                <div>
                  <h5 className="mb-3 font-display text-base font-bold uppercase tracking-wide text-surface-50 dark:text-white">
                    Sets
                  </h5>

                  <div className="space-y-3">
                    <DragDropContext
                      onDragEnd={(result) => handleSetDragEnd(result, exerciseIndex)}
                    >
                      <Droppable droppableId={`exercise-${exerciseIndex}`}>
                        {(provided) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="space-y-2.5"
                          >
                            {exercise.sets.map((set, setIndex) => (
                              <Draggable
                                key={set.id || `set-${exerciseIndex}-${setIndex}`}
                                draggableId={set.id || `set-${exerciseIndex}-${setIndex}`}
                                index={setIndex}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`rounded-xl border border-surface-900 bg-white p-2.5 dark:border-surface-400/50 dark:bg-surface-100 sm:p-3 ${
                                      snapshot.isDragging ? 'opacity-80 shadow-lg' : ''
                                    }`}
                                  >
                                    <div className="mb-2.5 flex items-center gap-2">
                                      <div
                                        {...provided.dragHandleProps}
                                        aria-label={`Reorder set ${setIndex + 1}`}
                                        className="touch-target flex shrink-0 cursor-grab items-center justify-center rounded-lg text-surface-600 transition-colors hover:bg-surface-900 dark:hover:bg-surface-300"
                                      >
                                        <Bars3Icon className="h-5 w-5" />
                                      </div>

                                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-100 font-display text-sm font-bold tabular text-accent-700 dark:bg-accent-900/40 dark:text-accent-300">
                                        {setIndex + 1}
                                      </span>

                                      <span className="min-w-0 flex-1 text-xs uppercase tracking-wider text-surface-500 dark:text-surface-600">
                                        Set {setIndex + 1}
                                      </span>

                                      <button
                                        type="button"
                                        onClick={() => duplicateSet(exerciseIndex, setIndex)}
                                        aria-label={`Duplicate set ${setIndex + 1}`}
                                        className="touch-target flex shrink-0 items-center justify-center rounded-lg text-accent-600 transition-colors hover:bg-accent-100 dark:text-accent-400 dark:hover:bg-accent-900/30 tap-control"
                                      >
                                        <DocumentDuplicateIcon className="h-5 w-5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => removeSet(exerciseIndex, setIndex)}
                                        disabled={exercise.sets.length <= 1}
                                        aria-label={`Remove set ${setIndex + 1}`}
                                        className="touch-target flex shrink-0 items-center justify-center rounded-lg text-danger-600 transition-colors hover:bg-danger-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-danger-400 dark:hover:bg-danger-900/30 tap-control"
                                      >
                                        <TrashIcon className="h-5 w-5" />
                                      </button>
                                    </div>

                                    {exercise.exerciseType === 'cardio' ? (
                                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                        <div>
                                          <label className="form-label">Duration</label>
                                          <DurationInput
                                            value={set.duration}
                                            onChange={(val) => updateSet(exerciseIndex, setIndex, 'duration', val)}
                                            placeholder="5:00"
                                          />
                                        </div>
                                        <StepperInput
                                          label={`Distance (${useMetric ? 'km' : 'mi'})`}
                                          value={set.distance}
                                          onChange={(val) => updateSet(exerciseIndex, setIndex, 'distance', val)}
                                          step={0.5}
                                          allowDecimal
                                          min={0}
                                        />
                                        <div className="sm:col-span-2">
                                          <label className="form-label">Rest</label>
                                          <DurationInput
                                            value={set.restTime}
                                            onChange={(val) => updateSet(exerciseIndex, setIndex, 'restTime', val)}
                                            placeholder="1:00"
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                        <StepperInput
                                          label="Reps"
                                          value={set.reps || undefined}
                                          onChange={(val) => updateSet(exerciseIndex, setIndex, 'reps', val ?? 0)}
                                          min={0}
                                          max={999}
                                        />
                                        <StepperInput
                                          label={`Weight (${weightUnitLabel(useMetric, exercise.perSide)})`}
                                          value={set.weight}
                                          onChange={(val) => updateSet(exerciseIndex, setIndex, 'weight', val)}
                                          step={useMetric ? 2.5 : 5}
                                          allowDecimal
                                          min={0}
                                        />
                                        <div className="sm:col-span-2">
                                          <label className="form-label">Rest</label>
                                          <DurationInput
                                            value={set.restTime}
                                            onChange={(val) => updateSet(exerciseIndex, setIndex, 'restTime', val)}
                                            placeholder="1:00"
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>

                    <motion.button
                      type="button"
                      onClick={() => addSet(exerciseIndex)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      transition={springSnappy}
                      className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-accent-100 font-medium text-accent-700 transition-colors hover:bg-accent-200 dark:bg-accent-900/30 dark:text-accent-400 dark:hover:bg-accent-900/50 tap-control"
                    >
                      <PlusCircleIcon className="w-5 h-5 shrink-0" />
                      Add Set
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
          })
        )}

        {/* Submit Section */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          transition={{ ...springSnappy, delay: 0.2 }}
          className="forge-card overflow-hidden"
        >
          <div className="h-2 bg-gradient-to-r from-accent-500 to-accent-700"></div>
          <div className="p-4 sm:p-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                <h3 className="text-xl font-bold text-surface-50 dark:text-white mb-2">
                  Ready to Create Your Template?
                </h3>
                <p className="text-surface-500 dark:text-surface-600">
                  {templateExercises.length === 0
                    ? "Add at least one exercise to create your template"
                    : `Your template has ${templateExercises.length} exercise${templateExercises.length === 1 ? '' : 's'} with ${templateExercises.reduce((total, ex) => total + ex.sets.length, 0)} total sets`
                  }
                </p>
              </div>

              <div className="flex gap-4">
                <motion.button
                  type="button"
                  onClick={() => router.back()}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={springSnappy}
                  className="btn btn-tertiary min-h-[48px] flex-1 tap-control sm:flex-none"
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  disabled={(mode === 'edit' ? updateTemplateMutation.isPending : createTemplateMutation.isPending) || templateExercises.length === 0}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={springSnappy}
                  className="flex min-h-[48px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-accent-500 to-accent-700 px-6 font-semibold text-white shadow-lg transition-shadow hover:from-accent-600 hover:to-accent-800 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 tap-control sm:flex-none"
                >
                  {(mode === 'edit' ? updateTemplateMutation.isPending : createTemplateMutation.isPending) ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      {mode === 'edit' ? 'Updating Template...' : 'Creating Template...'}
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-5 h-5" />
                      {mode === 'edit' ? 'Update Template' : 'Create Template'}
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </form>
    </div>
  );
}
