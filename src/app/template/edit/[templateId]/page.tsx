'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FlagIcon } from '@heroicons/react/24/outline';
import JsonTemplateForm from '@/components/ui/JsonTemplateForm';
import { WorkoutTemplate, SetType, WorkoutType, Difficulty } from '@/types/workout';
import { useTemplate } from '@/lib/hooks/useTemplate';
import { TemplateInputData } from '@/lib/hooks/useMutations';
import { toast } from 'react-hot-toast';

export default function EditTemplatePage({
  params,
}: {
  params: { templateId: string };
}) {
  const { templateId } = params;
  const router = useRouter();
  const { data: template, isLoading, error } = useTemplate(templateId);
  const [initialData, setInitialData] = useState<Partial<TemplateInputData> | undefined>(undefined);

  // Convert JSON-based WorkoutTemplate format to JsonTemplateForm format
  const convertTemplateToJsonFormat = useCallback(
    (templateData: WorkoutTemplate): TemplateInputData => {
      // Check if template has workoutData and exercises
      if (!templateData?.workoutData?.exercises) {
        console.warn('convertTemplateToJsonFormat: No exercises found in template data');
        return {
          name: templateData.name,
          favorite: templateData.favorite,
          workoutType: templateData.workoutType as WorkoutType,
          difficulty: templateData.difficulty as Difficulty,
          exercises: [],
        };
      }

      const exercises: TemplateInputData['exercises'] = [];

      templateData.workoutData.exercises.forEach((workoutExercise) => {
        // Check if the exercise exists
        if (!workoutExercise?.exerciseKey) {
          console.warn(
            'convertTemplateToJsonFormat: Skipping exercise due to missing exerciseKey:',
            workoutExercise,
          );
          return; // Skip this exercise if exerciseKey is missing
        }

        // Convert WorkoutSet[] to JsonTemplateForm set format
        const sets = workoutExercise.sets.map((set) => ({
          id: set.id || `set-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          reps: typeof set.targetReps === 'number' ? set.targetReps : set.targetReps?.min || 10,
          weight: set.targetWeight || 0,
          duration: set.targetDuration,
          type: set.type || SetType.WORKING,
          restTime: set.restTime || 60,
          notes: set.notes,
        }));

        // Create exercise object
        const exercise = {
          exerciseKey: workoutExercise.exerciseKey,
          sets,
          instructions: workoutExercise.instructions,
          restBetweenSets: workoutExercise.restBetweenSets,
        };

        exercises.push(exercise);
      });

      return {
        name: templateData.name,
        description: templateData.workoutData.metadata?.description,
        favorite: templateData.favorite,
        workoutType: templateData.workoutType as WorkoutType,
        difficulty: templateData.difficulty as Difficulty,
        tags: templateData.workoutData.metadata?.tags || [],
        exercises,
      };
    },
    [],
  );

  // Process template data when it loads
  useEffect(() => {
    if (template && template.workoutData) {
      console.log('Original template data:', template);
      const formattedData = convertTemplateToJsonFormat(template);
      console.log('Converted initialData:', formattedData);
      setInitialData(formattedData);
    }
  }, [template, convertTemplateToJsonFormat]);

  const handleSuccess = useCallback(() => {
    toast.success('Template updated successfully!');
    router.push('/templates');
  }, [router]);

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-br from-slate-600 via-slate-600 to-slate-800 px-8 py-8 text-white">
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                    <FlagIcon className="h-8 w-8" />
                    Edit Workout Template
                  </h1>
                  <p className="text-slate-200">
                    Update your workout template details
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <JsonTemplateForm
          mode="edit"
          templateId={templateId}
          initialData={initialData}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
}
