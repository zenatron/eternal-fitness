"use client";

import { useState, useEffect, useCallback, use } from "react";
import { FlagIcon } from "@heroicons/react/24/outline";
import TemplateFormEditor from "@/components/ui/TemplateFormEditor";
import { WorkoutTemplate, Exercise, Set as WorkoutSet } from "@/types/workout";
import { useTemplate } from "@/lib/hooks/useTemplate";

// Generate a simple unique ID
function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

export default function EditTemplatePage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = use(params);
  const { template, isLoading, error } = useTemplate(templateId);
  const [initialTemplateName, setInitialTemplateName] = useState("");
  const [initialExercises, setInitialExercises] = useState<Exercise[]>([]);
  const [initialFavorite, setInitialFavorite] = useState(false);

  // Convert DB WorkoutTemplate format to FormExercise[] format for the editor
  const convertTemplateToFormExercises = useCallback(
    (templateData: WorkoutTemplate): Exercise[] => {
      const exerciseMap: Record<string, Exercise> = {};

      templateData.sets?.forEach((workoutSet: WorkoutSet) => {
        const primaryExercise = workoutSet.exercises?.[0];
        if (!primaryExercise) return;

        const exerciseName = primaryExercise.name;

        if (!exerciseMap[exerciseName]) {
          exerciseMap[exerciseName] = {
            id: primaryExercise.id || generateId(),
            name: exerciseName,
            muscles: primaryExercise.muscles || [],
            equipment: primaryExercise.equipment || [],
            createdAt: new Date(),
            updatedAt: new Date(),
            sets: [],
          };
        }

        // Add the set details (reps/weight) to the exercise
        exerciseMap[exerciseName].sets?.push({
          id: workoutSet.id || generateId(),
          workoutTemplateId: templateId,
          reps: workoutSet.reps,
          weight: workoutSet.weight,
          createdAt: new Date(),
          updatedAt: new Date(),
          exercises: [],
        });
      });

      // Convert the map to an array
      return Object.values(exerciseMap);
    },
    [templateId]
  );

  // Process template data when it loads
  useEffect(() => {
    if (template) {
      // Set template name
      setInitialTemplateName(template.name);

      // Set favorite status
      setInitialFavorite(template.favorite || false);

      // Convert template data to the format expected by TemplateFormEditor
      const formattedExercises = convertTemplateToFormExercises(template);
      setInitialExercises(formattedExercises);
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
      initialExercises={initialExercises}
      initialFavorite={initialFavorite}
      headerElement={headerElement}
    />
  );
}
