'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { FlagIcon } from '@heroicons/react/24/outline';
import TemplateFormEditor from '@/components/ui/TemplateFormEditor';
import {
  WorkoutTemplate,
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

  // Convert JSON-based WorkoutTemplate format to FormExercise[] format for the editor
  const convertTemplateToFormExercises = useCallback(
    (templateData: WorkoutTemplate): FormExerciseWithSets[] => {
      // Check if template has workoutData and exercises
      if (!templateData?.workoutData?.exercises) {
        console.warn('convertTemplateToFormExercises: No exercises found in template data');
        return [];
      }

      const formExercises: FormExerciseWithSets[] = [];

      templateData.workoutData.exercises.forEach((workoutExercise) => {
        // Check if the exercise exists
        if (!workoutExercise?.exerciseKey) {
          console.warn(
            'convertTemplateToFormExercises: Skipping exercise due to missing exerciseKey:',
            workoutExercise,
          );
          return; // Skip this exercise if exerciseKey is missing
        }

        // Convert WorkoutSet[] to FormSet[]
        const formSets = workoutExercise.sets.map((set) => ({
          id: set.id,
          reps: typeof set.targetReps === 'number' ? set.targetReps : set.targetReps?.min || 0,
          weight: set.targetWeight || 0,
          duration: set.targetDuration,
          workoutTemplateId: templateData.id,
          exerciseId: workoutExercise.exerciseKey,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        // Create FormExerciseWithSets
        const formExercise: FormExerciseWithSets = {
          id: workoutExercise.exerciseKey,
          name: workoutExercise.exerciseKey, // Will be resolved by exercise data
          muscles: [], // Will be resolved by exercise data
          equipment: [], // Will be resolved by exercise data
          createdAt: new Date(),
          updatedAt: new Date(),
          sets: formSets,
        };

        formExercises.push(formExercise);
      });

      return formExercises;
    },
    [templateId],
  );

  // Process template data when it loads
  useEffect(() => {
    if (template && template.workoutData) {
      // Set template name
      setInitialTemplateName(template.name);

      // Set favorite status
      setInitialFavorite(template.favorite || false);

      // Convert JSON-based template data to form format
      const formattedExercises = convertTemplateToFormExercises(template);
      setInitialExercises(formattedExercises as Exercise[]);
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
