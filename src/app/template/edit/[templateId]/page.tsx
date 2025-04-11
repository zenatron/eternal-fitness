'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { FlagIcon } from '@heroicons/react/24/outline';
import TemplateFormEditor from '@/components/ui/TemplateFormEditor';
import {
  WorkoutTemplateWithSets,
  Exercise,
  Set as WorkoutSet,
} from '@/types/workout';
import { useTemplate } from '@/lib/hooks/useTemplate';

// Define a local type for the structure used in the map
interface FormExerciseWithSets extends Exercise {
  sets: WorkoutSet[]; // Use WorkoutSet for the sets array
}

export default function EditTemplatePage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = use(params);
  const { template, isLoading, error } = useTemplate(templateId);
  const [initialTemplateName, setInitialTemplateName] = useState('');
  const [initialExercises, setInitialExercises] = useState<Exercise[]>([]);
  const [initialFavorite, setInitialFavorite] = useState(false);

  // Convert DB WorkoutTemplate format to FormExercise[] format for the editor
  const convertTemplateToFormExercises = useCallback(
    (templateData: WorkoutTemplateWithSets): FormExerciseWithSets[] => {
      // Type guard already handled by template check in useEffect
      // if (!templateData?.sets) { ... }

      const exerciseMap: Record<string, FormExerciseWithSets> = {};

      templateData.sets.forEach((workoutSet) => {
        // Check if the set and its nested exercise exist
        if (!workoutSet?.exercise?.id) {
          console.warn(
            'convertTemplateToFormExercises: Skipping set due to missing exercise data:',
            workoutSet,
          );
          return; // Skip this set if exercise data is missing
        }

        const exercise = workoutSet.exercise;
        const exerciseId = exercise.id;

        // Initialize exercise in map if it doesn't exist
        if (!exerciseMap[exerciseId]) {
          exerciseMap[exerciseId] = {
            ...exercise, // Spread existing exercise properties
            // Explicitly handle potential null from Prisma type
            description: exercise.description ?? undefined,
            createdAt: exercise.createdAt || new Date(),
            updatedAt: exercise.updatedAt || new Date(),
            sets: [],
          };
        }

        // Add the current set's details to the corresponding exercise's sets array
        exerciseMap[exerciseId].sets.push({
          ...workoutSet,
          // Explicitly handle potential null from Prisma types
          duration: workoutSet.duration ?? undefined,
          volume: workoutSet.volume ?? undefined,
          // The nested exercise is already spread from workoutSet.
        });
      });

      // Convert the map to an array
      return Object.values(exerciseMap);
    },
    [templateId],
  );

  // Process template data when it loads
  useEffect(() => {
    if (template) {
      // Set template name
      setInitialTemplateName(template.name);

      // Set favorite status
      setInitialFavorite(template.favorite || false);

      // Convert template data (which is WorkoutTemplateWithSets)
      const formattedExercises = convertTemplateToFormExercises(template);
      // Ensure TemplateFormEditor accepts Exercise[] | FormExerciseWithSets[]
      // For now, we might need a type assertion if TemplateFormEditor expects strictly Exercise[]
      setInitialExercises(formattedExercises as Exercise[]); // <-- Potential type assertion needed here
    }
  }, [template, convertTemplateToFormExercises]);

  const headerElement = (
    <div className="app-card rounded-2xl shadow-xl overflow-hidden mb-6">
      <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-12 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative flex items-center gap-6">
          <FlagIcon className="w-20 h-20" />
          <div>
            <h1 className="text-3xl font-bold">Edit Workout Template</h1>
            <p className="text-blue-100 mt-1">
              Update your workout template details
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="w-full h-full py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="p-4 bg-red-100 text-red-700 rounded-lg">
            {String(error)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <TemplateFormEditor
      mode="edit"
      templateId={templateId}
      initialTemplateName={initialTemplateName}
      initialExercises={initialExercises as FormExerciseWithSets[]}
      initialFavorite={initialFavorite}
      headerElement={headerElement}
    />
  );
}
