'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import { use, useMemo } from 'react';

import { motion, useReducedMotion } from 'framer-motion';
import JsonTemplateForm from '@/components/ui/JsonTemplateForm';
import { useTemplate } from '@/lib/hooks/useTemplate';
import { TemplateInputData } from '@/lib/hooks/useMutations';

const springBouncy = { type: 'spring' as const, stiffness: 300, damping: 20, mass: 0.7 };
const springGentle = { type: 'spring' as const, stiffness: 200, damping: 25, mass: 0.9 };

export default function EditTemplatePage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = use(params);
  const { template, isLoading, error } = useTemplate(templateId);
  const prefersReducedMotion = useReducedMotion();

  const initialData: Partial<TemplateInputData> | undefined = useMemo(() => {
    if (!template?.workoutData) return undefined;

    const { workoutData } = template;

    return {
      name: template.name,
      description: workoutData.metadata?.description,
      favorite: template.favorite || false,
      workoutType: workoutData.metadata?.workoutType,
      difficulty: workoutData.metadata?.difficulty,
      tags: workoutData.metadata?.tags || [],
      exercises: workoutData.exercises.map((exercise) => ({
        exerciseKey: exercise.exerciseKey,
        // Carry the explicit override so editing doesn't silently revert it to
        // the library default (the PUT route resolves
        // `perSide ?? libraryDefault`, which halved/doubled volume for anyone
        // who had overridden the flag).
        perSide: exercise.perSide,
        sets: exercise.sets.map((set) => ({
          reps: typeof set.targetReps === 'number' ? set.targetReps : set.targetReps?.min || 0,
          weight: set.targetWeight || 0,
          duration: set.targetDuration,
          // Cardio distances were dropped here, wiping them on every save.
          distance: set.targetDistance,
          type: set.type || 'working',
          restTime: set.restTime,
          notes: set.notes,
        })),
        instructions: exercise.instructions,
        restBetweenSets: exercise.restBetweenSets,
      })),
    };
  }, [template]);

  if (isLoading) {
    return (
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
        animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
        transition={springGentle}
        className="w-full h-full py-12 px-4"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent-500 border-t-transparent"></div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
        animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
        transition={springGentle}
        className="w-full h-full py-12 px-4"
      >
        <div className="max-w-7xl mx-auto">
          <div className="p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-500/30 text-danger-700 dark:text-danger-400 rounded-lg">
            {String(error)}
          </div>
        </div>
      </motion.div>
    );
  }

  if (!initialData) return null;

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
      animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
      transition={springGentle}
      className="w-full h-full py-12 px-4"
    >
      <div className="max-w-7xl mx-auto">
        <PageHeader back title="Edit template" />

        <JsonTemplateForm
          mode="edit"
          templateId={templateId}
          initialData={initialData}
        />
      </div>
    </motion.div>
  );
}
