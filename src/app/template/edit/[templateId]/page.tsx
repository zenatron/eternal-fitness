'use client';

import { use, useMemo } from 'react';
import { FlagIcon } from '@heroicons/react/24/outline';
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
        sets: exercise.sets.map((set) => ({
          reps: typeof set.targetReps === 'number' ? set.targetReps : set.targetReps?.min || 0,
          weight: set.targetWeight || 0,
          duration: set.targetDuration,
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
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-forge-500 border-t-transparent"></div>
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
          <div className="p-4 bg-red-100 text-red-700 rounded-lg">
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
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 16, scale: 0.98 }}
          animate={prefersReducedMotion ? {} : { opacity: 1, y: 0, scale: 1 }}
          transition={{ ...springGentle, delay: 0.05 }}
          className="app-card rounded-lg shadow-xl overflow-hidden mb-6"
        >
          <div className="relative px-8 py-12 text-white greeting-gradient">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative flex items-center gap-6">
              <motion.div
                initial={prefersReducedMotion ? {} : { scale: 0, rotate: -20 }}
                animate={prefersReducedMotion ? {} : { scale: 1, rotate: 0 }}
                transition={{ ...springBouncy, delay: 0.1 }}
              >
                <FlagIcon className="w-20 h-20" />
              </motion.div>
              <motion.div
                initial={prefersReducedMotion ? {} : { opacity: 0, x: -12 }}
                animate={prefersReducedMotion ? {} : { opacity: 1, x: 0 }}
                transition={{ ...springGentle, delay: 0.15 }}
              >
                <h1 className="text-3xl font-display font-bold tracking-wide">Edit Workout Template</h1>
                <p className="text-forge-100 mt-1">
                  Update your workout template details
                </p>
              </motion.div>
            </div>
          </div>
        </motion.div>

        <JsonTemplateForm
          mode="edit"
          templateId={templateId}
          initialData={initialData}
        />
      </div>
    </motion.div>
  );
}
