'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PlusCircleIcon,
  TrashIcon,
  StarIcon as StarOutline,
  CheckCircleIcon,
  DocumentDuplicateIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { exercises } from '@/lib/exercises';
import { useCreateTemplate } from '@/lib/hooks/useMutations';
import { TemplateInputData } from '@/lib/hooks/useMutations';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface ExerciseSet {
  id?: string; // Add unique ID for drag and drop
  reps: number;
  weight?: number;
  duration?: number;
  type: string;
  restTime?: number;
  notes?: string;
}

interface TemplateExercise {
  exerciseKey: string;
  sets: ExerciseSet[];
  instructions?: string;
  restBetweenSets?: number;
}

interface JsonTemplateFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<TemplateInputData>;
  onSuccess?: () => void;
}



export default function JsonTemplateForm({ mode, initialData, onSuccess }: JsonTemplateFormProps) {
  const router = useRouter();
  const createTemplateMutation = useCreateTemplate();

  // Form state
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [favorite, setFavorite] = useState(initialData?.favorite || false);
  const [workoutType, setWorkoutType] = useState(initialData?.workoutType || 'strength');
  const [difficulty, setDifficulty] = useState(initialData?.difficulty || 'intermediate');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [templateExercises, setTemplateExercises] = useState<TemplateExercise[]>(() => {
    const exercises = (initialData?.exercises as TemplateExercise[]) || [];
    // Ensure all sets have unique IDs
    return exercises.map(exercise => ({
      ...exercise,
      sets: exercise.sets.map(set => ({
        ...set,
        id: set.id || `set-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
      }))
    }));
  });

  // Handle drag end for sets
  const handleSetDragEnd = (result: DropResult, exerciseIndex: number) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    setTemplateExercises((prev) => {
      const updated = [...prev];
      const sets = [...updated[exerciseIndex].sets];

      // Remove the item from source position and insert at destination
      const [reorderedItem] = sets.splice(sourceIndex, 1);
      sets.splice(destinationIndex, 0, reorderedItem);

      updated[exerciseIndex].sets = sets;
      return updated;
    });
  };

  // Add new exercise
  const addExercise = (exerciseKey: string) => {
    const exerciseData = exercises[exerciseKey as keyof typeof exercises];
    if (!exerciseData) return;

    const newExercise: TemplateExercise = {
      exerciseKey,
      sets: [
        {
          id: `set-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          reps: 10,
          weight: 0,
          type: 'working',
          restTime: 60,
        },
      ],
      restBetweenSets: 60,
    };

    setTemplateExercises([...templateExercises, newExercise]);
  };

  // Remove exercise
  const removeExercise = (index: number) => {
    setTemplateExercises(templateExercises.filter((_, i) => i !== index));
  };

  // Add set to exercise
  const addSet = (exerciseIndex: number) => {
    const updated = [...templateExercises];
    const lastSet = updated[exerciseIndex].sets[updated[exerciseIndex].sets.length - 1];
    
    updated[exerciseIndex].sets.push({
      id: `set-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      reps: lastSet?.reps || 10,
      weight: lastSet?.weight || 0,
      type: 'working',
      restTime: 60,
    });
    
    setTemplateExercises(updated);
  };

  // Remove set from exercise
  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const updated = [...templateExercises];
    updated[exerciseIndex].sets = updated[exerciseIndex].sets.filter((_, i) => i !== setIndex);
    setTemplateExercises(updated);
  };

  // Duplicate set
  const duplicateSet = (exerciseIndex: number, setIndex: number) => {
    const updated = [...templateExercises];
    const setToDuplicate = {
      ...updated[exerciseIndex].sets[setIndex],
      id: `set-${Date.now()}-${Math.random().toString(36).substring(2, 11)}` // Generate new unique ID
    };
    updated[exerciseIndex].sets.splice(setIndex + 1, 0, setToDuplicate);
    setTemplateExercises(updated);
  };



  // Update set data
  const updateSet = (exerciseIndex: number, setIndex: number, field: keyof ExerciseSet, value: any) => {
    const updated = [...templateExercises];
    updated[exerciseIndex].sets[setIndex] = {
      ...updated[exerciseIndex].sets[setIndex],
      [field]: value,
    };
    setTemplateExercises(updated);
  };

  // Update exercise data
  const updateExercise = (exerciseIndex: number, field: keyof TemplateExercise, value: any) => {
    const updated = [...templateExercises];
    updated[exerciseIndex] = {
      ...updated[exerciseIndex],
      [field]: value,
    };
    setTemplateExercises(updated);
  };

  // Handle form submission
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

    // Validate exercise sets
    for (let i = 0; i < templateExercises.length; i++) {
      const exercise = templateExercises[i];

      if (exercise.sets.length === 0) {
        toast.error(`Exercise ${i + 1} must have at least one set`);
        return;
      }

      for (let j = 0; j < exercise.sets.length; j++) {
        const set = exercise.sets[j];

        if (set.reps <= 0) {
          toast.error(`Exercise ${i + 1}, Set ${j + 1}: Reps must be greater than 0`);
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
      await createTemplateMutation.mutateAsync(templateData);
      toast.success('Template created successfully!');
      onSuccess?.();
      router.push('/templates');
    } catch (error) {
      toast.error('Failed to create template');
      console.error('Template creation error:', error);
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Template Basic Info */}
        <motion.div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300">
          <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-500"></div>
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <PlusCircleIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Template Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
                  placeholder="e.g., Push Day, Full Body Workout"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Workout Type
                </label>
                <select
                  value={workoutType}
                  onChange={(e) => setWorkoutType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
                >
                  <option value="strength">💪 Strength Training</option>
                  <option value="cardio">🏃 Cardio</option>
                  <option value="hybrid">⚡ Hybrid</option>
                  <option value="flexibility">🧘 Flexibility</option>
                  <option value="sports">⚽ Sports</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Difficulty Level
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
                >
                  <option value="beginner">🌱 Beginner</option>
                  <option value="intermediate">🔥 Intermediate</option>
                  <option value="advanced">💎 Advanced</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setFavorite(!favorite)}
                  className={`flex items-center gap-3 px-6 py-3 rounded-xl border-2 transition-all duration-200 ${
                    favorite
                      ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                      : 'border-gray-300 dark:border-gray-600 hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                  }`}
                >
                  {favorite ? (
                    <StarSolid className="w-5 h-5 text-amber-500" />
                  ) : (
                    <StarOutline className="w-5 h-5" />
                  )}
                  <span className="font-medium">Mark as Favorite</span>
                </button>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
                rows={4}
                placeholder="Describe your workout template... What makes it special? What are the goals?"
              />
            </div>
          </div>
        </motion.div>

        {/* Exercise Selection */}
        <motion.div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300">
          <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-500"></div>
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <PlusCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Exercise Library</h3>
                <p className="text-gray-600 dark:text-gray-400">Choose exercises to build your workout</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-80 overflow-y-auto pr-2">
              {Object.entries(exercises).map(([key, exercise]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => addExercise(key)}
                  className="p-4 text-left border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200 group"
                >
                  <div className="font-semibold text-gray-900 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors">
                    {exercise.name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {exercise.muscles.slice(0, 2).join(', ')}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {exercise.equipment.slice(0, 2).join(', ')}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Template Exercises */}
        {templateExercises.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center">
            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full w-20 h-20 mx-auto mb-6">
              <PlusCircleIcon className="w-12 h-12 text-gray-400 mx-auto" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              No Exercises Added Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Choose exercises from the library above to start building your workout template
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              💡 Tip: Start with compound movements like squats, deadlifts, or bench press
            </p>
          </div>
        ) : (
          templateExercises.map((exercise, exerciseIndex) => {
            const exerciseData = exercises[exercise.exerciseKey as keyof typeof exercises];

            return (
            <div
              key={exerciseIndex}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
            >
              <div className="h-2 bg-gradient-to-r from-purple-500 to-pink-500"></div>
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                      <div className="w-6 h-6 bg-purple-600 dark:bg-purple-400 rounded"></div>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                        {exerciseData?.name || exercise.exerciseKey}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {exerciseData?.muscles.join(', ')} • {exerciseData?.equipment.join(', ')}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeExercise(exerciseIndex)}
                    className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Sets */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                  <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sets Configuration</h5>

                  <div className="space-y-4">
                    <div className="grid grid-cols-7 gap-4 text-sm font-semibold text-gray-600 dark:text-gray-400 pb-2 border-b border-gray-200 dark:border-gray-600">
                      <div>Drag</div>
                      <div>Set #</div>
                      <div>Reps</div>
                      <div>Weight</div>
                      <div>Rest (s)</div>
                      <div>Copy</div>
                      <div>Remove</div>
                    </div>

                    <DragDropContext
                      onDragEnd={(result) => handleSetDragEnd(result, exerciseIndex)}
                    >
                      <Droppable droppableId={`exercise-${exerciseIndex}`}>
                        {(provided) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="space-y-2"
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
                                    className={`${snapshot.isDragging ? 'opacity-75 shadow-lg' : ''}`}
                                  >
                                    <div className="grid grid-cols-7 gap-4 items-center">
                                      <div
                                        {...provided.dragHandleProps}
                                        className="cursor-grab p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                      >
                                        <Bars3Icon className="w-4 h-4 text-gray-400" />
                                      </div>
                                      <div className="flex items-center justify-center w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-sm font-bold text-purple-600 dark:text-purple-400">
                                        {setIndex + 1}
                                      </div>
                                      <input
                                        type="number"
                                        value={set.reps || ''}
                                        onChange={(e) => updateSet(exerciseIndex, setIndex, 'reps', e.target.value === '' ? 0 : parseInt(e.target.value) || 0)}
                                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                                        placeholder="0"
                                      />
                                      <input
                                        type="number"
                                        value={set.weight ?? ''}
                                        onChange={(e) => updateSet(exerciseIndex, setIndex, 'weight', e.target.value === '' ? undefined : parseFloat(e.target.value) || 0)}
                                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                                        step="0.5"
                                        placeholder="0"
                                      />
                                      <input
                                        type="number"
                                        value={set.restTime ?? ''}
                                        onChange={(e) => updateSet(exerciseIndex, setIndex, 'restTime', e.target.value === '' ? undefined : parseInt(e.target.value) || 60)}
                                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                                        placeholder="60"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => duplicateSet(exerciseIndex, setIndex)}
                                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                        title="Duplicate set"
                                      >
                                        <DocumentDuplicateIcon className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => removeSet(exerciseIndex, setIndex)}
                                        disabled={exercise.sets.length <= 1}
                                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Remove set"
                                      >
                                        <TrashIcon className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>

                    <button
                      type="button"
                      onClick={() => addSet(exerciseIndex)}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors font-medium"
                    >
                      <PlusCircleIcon className="w-5 h-5" />
                      Add Another Set
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
          })
        )}

        {/* Submit Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-green-500 to-blue-500"></div>
          <div className="p-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Ready to Create Your Template?
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {templateExercises.length === 0
                    ? "Add at least one exercise to create your template"
                    : `Your template has ${templateExercises.length} exercise${templateExercises.length === 1 ? '' : 's'} with ${templateExercises.reduce((total, ex) => total + ex.sets.length, 0)} total sets`
                  }
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTemplateMutation.isPending || templateExercises.length === 0}
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {createTemplateMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      Creating Template...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-5 h-5" />
                      Create Template
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}