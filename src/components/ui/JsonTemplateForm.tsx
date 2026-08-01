'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  BoltIcon,
  PlusCircleIcon,
  TrashIcon,
  StarIcon as StarOutline,
  CheckCircleIcon,
  DocumentDuplicateIcon,
  Bars3Icon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { exercises } from '@/lib/exercises';
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

// ============================================================================
// DURATION PARSING & FORMATTING HELPERS
// ============================================================================

/**
 * Parse a flexible duration string into seconds.
 * Supported formats:
 *   - Pure number: "300" -> 300s
 *   - MM:SS: "5:00" -> 300s
 *   - H:MM:SS: "1:30:00" -> 5400s
 *   - Shorthand: "5m" -> 300s, "1h30m" -> 5400s, "90s" -> 90s, "1h" -> 3600s
 * Returns null for invalid input.
 */
function parseDuration(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Try shorthand notation: 1h30m15s, 5m, 90s, 1h, etc.
  const shorthandRegex = /^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?$/i;
  const shorthandMatch = trimmed.match(shorthandRegex);
  if (shorthandMatch && (shorthandMatch[1] || shorthandMatch[2] || shorthandMatch[3])) {
    const hours = parseInt(shorthandMatch[1] || '0', 10);
    const minutes = parseInt(shorthandMatch[2] || '0', 10);
    const seconds = parseInt(shorthandMatch[3] || '0', 10);
    return hours * 3600 + minutes * 60 + seconds;
  }

  // Try H:MM:SS or MM:SS format
  const colonParts = trimmed.split(':');
  if (colonParts.length === 2) {
    const mins = parseInt(colonParts[0], 10);
    const secs = parseInt(colonParts[1], 10);
    if (!isNaN(mins) && !isNaN(secs) && secs >= 0 && secs < 60) {
      return mins * 60 + secs;
    }
  }
  if (colonParts.length === 3) {
    const hrs = parseInt(colonParts[0], 10);
    const mins = parseInt(colonParts[1], 10);
    const secs = parseInt(colonParts[2], 10);
    if (!isNaN(hrs) && !isNaN(mins) && !isNaN(secs) && mins >= 0 && mins < 60 && secs >= 0 && secs < 60) {
      return hrs * 3600 + mins * 60 + secs;
    }
  }

  // Try pure number (seconds)
  const num = parseFloat(trimmed);
  if (!isNaN(num) && num >= 0 && /^\d+(\.\d+)?$/.test(trimmed)) {
    return Math.round(num);
  }

  return null;
}

/**
 * Format seconds into a human-readable string: "5m 00s", "1h 30m 00s"
 */
function formatDuration(seconds: number): string {
  if (seconds < 0) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  }
  if (m > 0) {
    return `${m}m ${String(s).padStart(2, '0')}s`;
  }
  return `${s}s`;
}

/**
 * Format seconds into normalized input display: "5:00", "1:30:00"
 */
function formatDurationInput(seconds: number): string {
  if (seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ============================================================================
// DURATION INPUT COMPONENT
// ============================================================================

interface DurationInputProps {
  value: number | undefined;
  onChange: (seconds: number | undefined) => void;
  placeholder?: string;
  className?: string;
  focusRingColor?: string;
}

function DurationInput({ value, onChange, placeholder = '5:00', className = '', focusRingColor = 'focus:ring-accent-500' }: DurationInputProps) {
  const [textValue, setTextValue] = useState<string>(() =>
    value !== undefined && value !== null ? formatDurationInput(value) : ''
  );
  const [isFocused, setIsFocused] = useState(false);

  // Sync text value when the external value changes and input is not focused
  const lastExternalValue = React.useRef(value);
  if (!isFocused && value !== lastExternalValue.current) {
    lastExternalValue.current = value;
    setTextValue(value !== undefined && value !== null ? formatDurationInput(value) : '');
  }

  const parsed = textValue.trim() ? parseDuration(textValue) : null;
  const isInvalid = textValue.trim() !== '' && parsed === null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setTextValue(newText);

    // Live-update the stored value as the user types
    const newParsed = parseDuration(newText);
    if (newParsed !== null) {
      onChange(newParsed);
    } else if (newText.trim() === '') {
      onChange(undefined);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (parsed !== null) {
      // Normalize the display
      setTextValue(formatDurationInput(parsed));
      onChange(parsed);
      lastExternalValue.current = parsed;
    } else if (textValue.trim() === '') {
      onChange(undefined);
      lastExternalValue.current = undefined;
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  return (
    <div className="flex flex-col">
      <input
        type="text"
        value={textValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        className={`px-3 py-2 border rounded-lg text-sm transition-all duration-200 ${
          isInvalid
            ? 'border-danger-400 dark:border-danger-500 focus:ring-2 focus:ring-danger-500'
            : `border-surface-300 dark:border-surface-400 focus:ring-2 ${focusRingColor}`
        } focus:border-transparent dark:bg-surface-200 dark:text-white ${className}`}
        placeholder={placeholder}
      />
      {textValue.trim() !== '' && (
        <span className={`text-xs mt-0.5 ${isInvalid ? 'text-danger-400' : 'text-surface-500 dark:text-surface-600'}`}>
          {isInvalid ? 'invalid' : `= ${formatDuration(parsed!)}`}
        </span>
      )}
    </div>
  );
}


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
  const [exerciseSearch, setExerciseSearch] = useState('');
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

  const fuzzySearch = (text: string, searchTerms: string[]): number => {
    if (!text || searchTerms.length === 0) return 0;

    const textLower = text.toLowerCase();
    let score = 0;

    for (const term of searchTerms) {
      if (!term || term.length === 0) continue;

      if (textLower.includes(term)) {
        score += 10;

        const wordBoundaryRegex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
        if (wordBoundaryRegex.test(text)) {
          score += 5;
        }

        if (textLower.startsWith(term)) {
          score += 3;
        }
      } else if (term.length >= 2) {
        let partialScore = 0;
        let lastIndex = -1;

        for (const char of term) {
          const charIndex = textLower.indexOf(char, lastIndex + 1);
          if (charIndex > lastIndex) {
            partialScore += 1;
            lastIndex = charIndex;
          }
        }

        const threshold = Math.max(2, Math.ceil(term.length * 0.6));
        if (partialScore >= threshold) {
          score += partialScore * 0.5;
        }
      }
    }

    return score;
  };

  const filteredExercises = useMemo(() => {
    if (!exerciseSearch.trim()) {
      return Object.entries(exercises);
    }

    const searchTerms = exerciseSearch.toLowerCase().trim().split(/\s+/);

    const exerciseScores = Object.entries(exercises).map(([key, exercise]) => {
      let totalScore = 0;

      const nameScore = fuzzySearch(exercise.name, searchTerms) * 3;
      totalScore += nameScore;

      const muscleScore = exercise.muscles.reduce((score, muscle) => {
        return score + fuzzySearch(muscle, searchTerms);
      }, 0) * 2;
      totalScore += muscleScore;

      const equipmentScore = exercise.equipment.reduce((score, equipment) => {
        return score + fuzzySearch(equipment, searchTerms);
      }, 0);
      totalScore += equipmentScore;

      return {
        key,
        exercise,
        score: totalScore
      };
    });

    return exerciseScores
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => [item.key, item.exercise] as [string, typeof item.exercise]);
  }, [exerciseSearch]);

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

            {/* Search Input */}
            <div className="mb-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-surface-600" />
                </div>
                <input
                  type="text"
                  value={exerciseSearch}
                  onChange={(e) => setExerciseSearch(e.target.value)}
                  className="form-input !pl-10 !pr-10"
                  placeholder="Search exercises... Try 'chest press', 'leg quad', or 'dumbbell'"
                />
                {exerciseSearch && (
                  <button
                    type="button"
                    onClick={() => setExerciseSearch('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <XMarkIcon className="h-5 w-5 text-surface-600 hover:text-surface-500 dark:hover:text-surface-800 transition-colors" />
                  </button>
                )}
              </div>

              {!exerciseSearch && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-xs text-surface-500 dark:text-surface-600">Quick searches:</span>
                  {['chest', 'legs', 'back', 'shoulders', 'barbell', 'dumbbell'].map((term) => (
                    <motion.button
                      key={term}
                      type="button"
                      onClick={() => setExerciseSearch(term)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      transition={springSnappy}
                      className="px-2 py-1 text-xs bg-surface-900 dark:bg-surface-200 text-surface-500 dark:text-surface-600 rounded-md hover:bg-surface-200 dark:hover:bg-surface-600 transition-colors"
                    >
                      {term}
                    </motion.button>
                  ))}
                </div>
              )}

              {exerciseSearch && (
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm text-surface-500 dark:text-surface-600">
                    Found {filteredExercises.length} exercise{filteredExercises.length === 1 ? '' : 's'}
                    {filteredExercises.length > 0 && (
                      <span className="text-success-600 dark:text-success-400 font-medium"> (sorted by relevance)</span>
                    )}
                  </p>
                  {exerciseSearch.includes(' ') && (
                    <p className="text-xs text-accent-600 dark:text-accent-400">
                      💡 Multi-word search active
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Exercise Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-80 overflow-y-auto pr-2">
              {filteredExercises.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <div className="p-4 bg-surface-900 dark:bg-surface-200 rounded-full w-16 h-16 mx-auto mb-4">
                    <MagnifyingGlassIcon className="w-8 h-8 text-surface-600 mx-auto" />
                  </div>
                  <h4 className="text-lg font-semibold text-surface-50 dark:text-white mb-2">
                    No exercises found
                  </h4>
                  <p className="text-surface-500 dark:text-surface-600 mb-4">
                    Try adjusting your search terms or browse all exercises
                  </p>
                  <button
                    type="button"
                    onClick={() => setExerciseSearch('')}
                    className="px-4 py-2 bg-success-100 dark:bg-success-900/30 text-success-600 dark:text-success-400 rounded-lg hover:bg-success-200 dark:hover:bg-success-900/50 transition-colors font-medium"
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                filteredExercises.map(([key, exercise]) => (
                  <motion.button
                    key={key}
                    type="button"
                    onClick={() => addExercise(key)}
                    whileHover={{ scale: 1.03, borderColor: 'rgb(var(--success-400))' }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ ...springSnappy }}
                    className="p-4 text-left border-2 border-surface-200 dark:border-surface-400 rounded-xl hover:border-success-300 hover:bg-success-50 dark:hover:bg-success-900/20 transition-colors group"
                  >
                    <div className="font-semibold text-surface-50 dark:text-white group-hover:text-success-700 dark:group-hover:text-success-400 transition-colors">
                      {exercise.name}
                    </div>
                    <div className="text-sm text-surface-500 dark:text-surface-600 mt-1">
                      {exercise.muscles.slice(0, 2).join(', ')}
                      {exercise.muscles.length > 2 && ` +${exercise.muscles.length - 2} more`}
                    </div>
                    <div className="text-xs text-surface-600 dark:text-surface-500 mt-1">
                      {exercise.equipment.slice(0, 2).join(', ')}
                      {exercise.equipment.length > 2 && ` +${exercise.equipment.length - 2} more`}
                    </div>
                  </motion.button>
                ))
              )}
            </div>
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
                                            focusRingColor="focus:ring-accent-500"
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
                                            focusRingColor="focus:ring-accent-500"
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
                                            focusRingColor="focus:ring-accent-500"
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
