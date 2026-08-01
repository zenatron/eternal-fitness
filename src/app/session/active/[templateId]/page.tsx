'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTemplate } from '@/lib/hooks/useTemplate';
import { useProfile } from '@/lib/hooks/useProfile';
import {
  ArrowLeftIcon,
  ClockIcon,
  CheckCircleIcon,
  PlayIcon,
  PauseIcon,
  DocumentTextIcon,
  CalendarIcon,
  XCircleIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { motion, useReducedMotion } from 'framer-motion';
import { formatVolume } from '@/utils/formatters';
import { ExercisePerformance } from '@/types/workout';
import WorkoutProgressTracker from '@/components/workout/WorkoutProgressTracker';
import dynamic from 'next/dynamic';
import { springSnappy, springGentle } from '@/lib/motion';

/**
 * Shown once, at the very end of a workout, and carries a canvas particle
 * system. There is no reason for it to be in the bundle while the user is
 * still logging sets — by the time it is needed the network is idle.
 */
const VictoryPopup = dynamic(() => import('@/components/modals/VictoryPopup'), {
  ssr: false,
});
import { useActiveWorkout } from '@/lib/hooks/useActiveWorkout';
import { useWakeLock } from '@/lib/hooks/useWakeLock';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ModalShell } from '@/components/ui/ModalShell';
import toast from 'react-hot-toast';




export default function ActiveSessionPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const scheduledSessionId = searchParams.get('scheduledSessionId');

  const {
    template,
    isLoading: templateLoading,
    error: templateError,
  } = useTemplate(templateId);
  const { profile, isLoading: profileLoading } = useProfile();
  const prefersReducedMotion = useReducedMotion();

  // Only UI state that doesn't need persistence
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false);

  // Active workout state management
  const {
    activeWorkout,
    isLoading: isActiveWorkoutLoading,
    startWorkout,
    updatePerformance,
    updateSessionNotes,
    updateModifiedTemplate,
    updateExerciseProgress,
    endWorkout,
    completeWorkout,
    recoverSession,
    hasActiveWorkout,
    getWorkoutDuration,
    formatWorkoutDuration,
    toggleTimer,
    isTimerActive,
    flushNow,
  } = useActiveWorkout();

  const [workoutCompleted, setWorkoutCompleted] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Keep the screen on while a workout is running, so the phone doesn't lock
  // between every set. Released automatically when the timer is paused or the
  // page unmounts.
  const { isActive: wakeLockActive } = useWakeLock(
    hasActiveWorkout && isTimerActive && !workoutCompleted
  );

  const [showVictory, setShowVictory] = useState(false);
  const [victoryData, setVictoryData] = useState<{
    workoutName: string;
    durationMinutes: number;
    totalVolume: number;
    totalSets: number;
    totalExercises: number;
    totalDistance: number;
    newAchievementIds: string[];
    newPRs: Array<{ exerciseName: string; type: string; value: number }>;
    pointsAwarded: number;
    totalAwarded: number;
    progress: Record<string, number>;
  } | null>(null);

  // Check for existing active workout on page load
  useEffect(() => {
    if (template && !workoutCompleted && !isActiveWorkoutLoading) {
      if (hasActiveWorkout && activeWorkout?.templateId !== template.id) {
        // Active workout is for a different template, try to recover
        console.warn('Active workout is for a different template. Current:', activeWorkout?.templateId, 'Expected:', template.id);
        recoverSession(template.id, true).catch((error) => {
          console.error('Failed to recover session:', error);
          // If recovery fails, we'll let the user manually start a new workout
        });
      }
      // If hasActiveWorkout && activeWorkout.templateId === template.id, we continue the existing workout
      // If no active workout, we wait for user to click "Start Workout"
    }
  }, [template, hasActiveWorkout, activeWorkout, workoutCompleted, isActiveWorkoutLoading, recoverSession]);

  // Function to manually start a workout
  const handleStartWorkout = useCallback(async () => {
    if (!template) return;

    try {
      await startWorkout(template.id, template.name, template.workoutData);
    } catch (error) {
      console.error('Failed to start workout:', error);
      // Previously this only logged, so tapping "Start Workout" appeared to do
      // nothing at all when it failed.
      const status = (error as { status?: number })?.status;
      if (status === 409) {
        toast.error('You already have a workout in progress. Finish or discard it first.');
      } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
        toast.error("You're offline. Reconnect to start a new workout.");
      } else {
        toast.error(
          error instanceof Error ? error.message : 'Could not start the workout. Try again.'
        );
      }
    }
  }, [template, startWorkout]);

  // No more state synchronization needed - everything comes from activeWorkout directly

  const handleTemplateModification = useCallback((newTemplate: any) => {
    updateModifiedTemplate(newTemplate);
  }, [updateModifiedTemplate]);

  const handlePerformanceUpdate = useCallback((performance: { [exerciseId: string]: ExercisePerformance }) => {
    updatePerformance(performance);
  }, [updatePerformance]);

  const handleNotesUpdate = useCallback((notes: string) => {
    updateSessionNotes(notes);
  }, [updateSessionNotes]);

  const handleCancelWorkout = async () => {
    setShowCancelConfirm(false);
    try {
      await endWorkout();
      router.push('/profile');
    } catch {
      toast.error('Could not discard the workout. It will be cleared when you reconnect.');
      router.push('/profile');
    }
  };

  const performCompletion = async (options: {
    useModifiedTemplate: boolean;
    saveTemplate: 'none' | 'update' | 'new';
  }) => {
    // workoutSessions.duration is stored in SECONDS. The workout timer
    // (getWorkoutDuration) already produces seconds, so send it directly.
    const finalDurationSeconds = Math.max(1, Math.round(getWorkoutDuration()));
    const durationMinutes = Math.max(1, Math.round(finalDurationSeconds / 60));
    setIsSaving(true);
    setSaveMessage('');

    if (!template?.id) {
      setSaveMessage('Error: Template ID is missing. Cannot save session.');
      setIsSaving(false);
      return;
    }

    try {
      // If user wants to save template changes
      if (options.saveTemplate !== 'none' && activeWorkout?.modifiedTemplate) {
        if (options.saveTemplate === 'update') {
          await fetch(`/api/template/${template.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: template.name,
              workoutData: activeWorkout.modifiedTemplate,
              difficulty: template.difficulty,
              workoutType: template.workoutType,
              favorite: template.favorite,
            }),
          });
        } else {
          await fetch('/api/template/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: `${template.name} (Modified)`,
              description: `Modified version of ${template.name} from workout session`,
              workoutData: activeWorkout.modifiedTemplate,
              difficulty: template.difficulty,
              workoutType: template.workoutType,
              favorite: false,
            }),
          });
        }
      }

      // If user wants to revert to original template values
      if (!options.useModifiedTemplate && activeWorkout?.modifiedTemplate) {
        updateModifiedTemplate(activeWorkout.originalTemplate);
        // Push the revert before completing. This used to be a 100ms sleep,
        // which was a race rather than a guarantee — on a slow connection the
        // debounced sync had not fired and the workout was saved with the
        // modified template the user had just rejected.
        await flushNow();
      }

      const result = await completeWorkout(finalDurationSeconds, activeWorkout?.sessionNotes || '');

      setWorkoutCompleted(true);

      const perfData = result?.session?.performanceData?.performance;
      const totalDistance = perfData
        ? Object.values(perfData).reduce((t: number, ep: any) => {
            return t + (ep.sets || []).reduce((st: number, s: any) => st + (s.actualDistance || 0), 0);
          }, 0)
        : 0;

      setVictoryData({
        workoutName: template?.name || 'Workout',
        durationMinutes: durationMinutes,
        totalVolume: result?.session?.totalVolume || 0,
        totalSets: result?.session?.totalSets || 0,
        totalExercises: result?.session?.totalExercises || 0,
        totalDistance,
        newAchievementIds: result?.achievements?.newAchievements || [],
        newPRs: result?.newPRs || [],
        pointsAwarded: result?.achievements?.pointsAwarded || 0,
        totalAwarded: result?.totalAwarded || result?.achievements?.pointsAwarded || 0,
        progress: result?.achievements?.progress || {},
      });
      setShowVictory(true);
      setShowCompletionPrompt(false);
    } catch (error) {
      console.error('Error saving session:', error);
      setSaveMessage(`Error: ${error instanceof Error ? error.message : 'Failed to save session'}`);
      setIsSaving(false);
    }
  };

  const stopTimerAndSave = async () => {
    // For scheduled sessions, complete directly
    if (scheduledSessionId) {
      setIsSaving(true);
      try {
        // workoutSessions.duration is stored in SECONDS.
        const finalDurationSeconds = Math.max(1, Math.round(getWorkoutDuration()));
        const durationMinutes = Math.max(1, Math.round(finalDurationSeconds / 60));
        const response = await fetch('/api/session-json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scheduledSessionId,
            duration: finalDurationSeconds,
            notes: activeWorkout?.sessionNotes || '',
            performance: activeWorkout?.performance || {},
          }),
        });
        if (!response.ok) throw new Error('Failed to complete scheduled session');
        const result = await response.json();
        const sessionData = result.data;

        setWorkoutCompleted(true);
        endWorkout();

        const perfData = sessionData?.session?.performanceData?.performance;
        const totalDistance = perfData
          ? Object.values(perfData).reduce((t: number, ep: any) => {
              return t + (ep.sets || []).reduce((st: number, s: any) => st + (s.actualDistance || 0), 0);
            }, 0)
          : 0;

        setVictoryData({
          workoutName: template?.name || 'Workout',
          durationMinutes: durationMinutes,
          totalVolume: sessionData?.session?.totalVolume || 0,
          totalSets: sessionData?.session?.totalSets || 0,
          totalExercises: sessionData?.session?.totalExercises || 0,
          totalDistance,
          newAchievementIds: sessionData?.achievements?.newAchievements || [],
          newPRs: sessionData?.newPRs || [],
          pointsAwarded: sessionData?.achievements?.pointsAwarded || 0,
          totalAwarded: sessionData?.totalAwarded || sessionData?.achievements?.pointsAwarded || 0,
          progress: sessionData?.achievements?.progress || {},
        });
        setShowVictory(true);
        return;
      } catch (error) {
        setSaveMessage(`Error: ${error instanceof Error ? error.message : 'Failed to complete scheduled session'}`);
        setIsSaving(false);
      }
      return;
    }

    // Check if template was modified during the workout
    if (activeWorkout?.modifiedTemplate) {
      setShowCompletionPrompt(true);
      return;
    }

    await performCompletion({ useModifiedTemplate: true, saveTemplate: 'none' });
  };

  const isLoading = templateLoading || profileLoading || isActiveWorkoutLoading;

  if (isLoading) {
    return (
      <div className="app-bg py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-secondary">Loading session...</p>
        </div>
      </div>
    );
  }

  if (templateError || !template) {
    return (
      <div className="app-bg py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-500/30 text-danger-700 dark:text-danger-400 rounded-lg text-center">
            Error loading template:{' '}
            {String(templateError || 'Template not found')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0 }}
      animate={prefersReducedMotion ? {} : { opacity: 1 }}
      transition={springGentle}
      className="app-bg py-8 px-4"
    >
      <div className="max-w-5xl mx-auto">
        {/* Enhanced Header */}
        <motion.div
          className="mb-8"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: -20 }}
          animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
          transition={springGentle}
        >
          {/* Title and timer shared one row, so at phone width "Active Session"
              broke across two lines and collided with the clock. The elapsed
              time is dropped here entirely — it already appears in the sticky
              banner above and in the timer card directly below, so this was the
              third copy on one screen. */}
          <div className="forge-card overflow-hidden">
            <div className="greeting-gradient px-5 py-5 text-white sm:px-6">
              <div className="flex items-center gap-3">
                <motion.button
                  onClick={() => router.back()}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  transition={springSnappy}
                  className="touch-target flex shrink-0 items-center justify-center rounded-xl bg-white/10 transition-colors hover:bg-white/20 tap-control"
                  aria-label="Go back"
                >
                  <ArrowLeftIcon className="h-6 w-6" />
                </motion.button>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-xs uppercase tracking-[0.2em] text-accent-100">
                    {isTimerActive ? 'Active session' : 'Session paused'}
                  </p>
                  <h1 className="truncate font-display text-2xl font-bold tracking-wide sm:text-3xl">
                    {template.name}
                  </h1>
                </div>
                {isTimerActive && !prefersReducedMotion && (
                  <motion.span
                    className="h-2.5 w-2.5 shrink-0 rounded-full bg-white"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                    aria-hidden="true"
                  />
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Session Type Indicator */}
        {scheduledSessionId && (
          <motion.div
            className="mb-6"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ ...springGentle, delay: prefersReducedMotion ? 0 : 0.1 }}
          >
            <div className="forge-card overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-accent-500 to-accent-300"></div>
              <div className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-accent-100 dark:bg-accent-900/30 rounded-xl">
                    <CalendarIcon className="h-6 w-6 text-accent-600 dark:text-accent-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-bold text-surface-50 dark:text-white">
                      Scheduled Workout
                    </h3>
                    <p className="text-surface-500 dark:text-surface-600">
                      You are completing a previously scheduled workout session
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Timer Controls - Only show when workout is active */}
        {hasActiveWorkout && (
          <motion.div
            className="mb-6"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ ...springGentle, delay: prefersReducedMotion ? 0 : 0.2 }}
          >
          {/* Colour now follows meaning: finishing is the positive outcome
              (green), discarding is the destructive one (red). It was the exact
              reverse — "Finish & Save" was the red button on the row. */}
          <div className="forge-card overflow-hidden">
            <div
              className={`h-1 transition-colors ${
                isTimerActive
                  ? 'bg-gradient-to-r from-success-500 to-success-400'
                  : 'bg-gradient-to-r from-warning-500 to-warning-400'
              }`}
            />
            <div className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* The elapsed time is the point of this card, so it leads. */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                      isTimerActive
                        ? 'bg-success-100 dark:bg-success-900/30'
                        : 'bg-warning-100 dark:bg-warning-900/30'
                    }`}
                  >
                    <ClockIcon
                      className={`h-6 w-6 ${
                        isTimerActive
                          ? 'text-success-600 dark:text-success-400'
                          : 'text-warning-600 dark:text-warning-400'
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-2xl font-bold leading-none tabular text-surface-50 dark:text-white">
                      {formatWorkoutDuration}
                    </p>
                    <p className="mt-1 truncate text-xs text-surface-500 dark:text-surface-600">
                      {!isTimerActive
                        ? 'Paused'
                        : wakeLockActive
                          ? 'Screen stays on while you train'
                          : 'Session running'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-2.5">
                  {/* Icon-only: the label was redundant next to a running clock
                      and made the row overflow on a phone. */}
                  <motion.button
                    onClick={toggleTimer}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={springSnappy}
                    aria-label={isTimerActive ? 'Pause timer' : 'Resume timer'}
                    title={isTimerActive ? 'Pause timer' : 'Resume timer'}
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white transition-colors tap-control ${
                      isTimerActive
                        ? 'bg-warning-500 hover:bg-warning-600'
                        : 'bg-success-500 hover:bg-success-600'
                    }`}
                  >
                    {isTimerActive ? (
                      <PauseIcon className="h-6 w-6" />
                    ) : (
                      <PlayIcon className="h-6 w-6" />
                    )}
                  </motion.button>

                  <motion.button
                    onClick={() => setShowCancelConfirm(true)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    transition={springSnappy}
                    className="flex min-h-[48px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-danger-500/40 bg-danger-500/10 px-4 font-semibold text-danger-600 transition-colors hover:bg-danger-500/20 dark:text-danger-400 tap-control sm:flex-none"
                  >
                    <XCircleIcon className="h-5 w-5 shrink-0" />
                    Discard
                  </motion.button>

                  <motion.button
                    onClick={stopTimerAndSave}
                    disabled={isSaving}
                    whileHover={isSaving ? {} : { scale: 1.03 }}
                    whileTap={isSaving ? {} : { scale: 0.97 }}
                    transition={springSnappy}
                    className="flex min-h-[48px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-success-600 px-4 font-semibold text-white shadow-sm transition-colors hover:bg-success-700 disabled:opacity-60 tap-control sm:flex-none"
                  >
                    {isSaving ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <CheckCircleIcon className="h-5 w-5 shrink-0" />
                    )}
                    {isSaving ? 'Saving…' : 'Finish'}
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        )}

        {/* Save Message */}
        {saveMessage && (
          <div className="mb-6">
            <div className={`rounded-xl p-4 ${
              saveMessage.startsWith('Error:')
                ? 'bg-danger-50 dark:bg-danger-900/20 text-danger-700 dark:text-danger-300 border border-danger-200 dark:border-danger-800'
                : 'bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300 border border-success-200 dark:border-success-800'
            }`}>
              <div className="flex items-center gap-2">
                {saveMessage.startsWith('Error:') ? (
                  <div className="text-danger-500">❌</div>
                ) : (
                  <div className="text-success-500">✅</div>
                )}
                <p className="font-medium">{saveMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Template Overview */}
        <motion.div
          className="mb-6"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ ...springGentle, delay: prefersReducedMotion ? 0 : 0.3 }}
        >
          <div className="forge-card overflow-hidden">
            {/* The icon slot held a bare blue <div> — a placeholder that was
                never replaced, and the only blue pixel on the screen. Five
                full-size stat tiles for what is reference information also
                pushed the exercise list well below the fold, so they are now a
                single compact row. */}
            <div className="h-1 bg-gradient-to-r from-accent-500 to-accent-700"></div>
            <div className="p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2.5">
                <ClipboardDocumentListIcon className="h-5 w-5 shrink-0 text-accent-500" />
                <h3 className="font-display text-base font-bold uppercase tracking-wide text-surface-50 dark:text-white">
                  Workout Overview
                </h3>
                <span className="ml-auto shrink-0 rounded-full bg-accent-100 px-2.5 py-0.5 text-xs font-medium capitalize text-accent-700 dark:bg-accent-900/40 dark:text-accent-300">
                  {template.difficulty}
                </span>
              </div>

              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: 'Exercises', value: template.workoutData?.exercises?.length || 0 },
                  {
                    label: 'Sets',
                    value:
                      template.workoutData?.exercises?.reduce(
                        (total, ex) => total + ex.sets.length,
                        0
                      ) || 0,
                  },
                  {
                    label: 'Volume',
                    value:
                      template.totalVolume > 0
                        ? formatVolume(template.totalVolume, profile?.useMetric)
                        : '—',
                  },
                  { label: 'Est.', value: `${template.estimatedDuration}m` },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg bg-surface-950 px-2 py-2.5 text-center dark:bg-surface-200/50"
                  >
                    <dd className="font-display text-base font-bold tabular text-surface-50 dark:text-white">
                      {stat.value}
                    </dd>
                    <dt className="mt-0.5 text-[10px] uppercase tracking-wider text-surface-500 dark:text-surface-600">
                      {stat.label}
                    </dt>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </motion.div>

        {/* Start Workout Button - Show when no active workout */}
        {!hasActiveWorkout && !isActiveWorkoutLoading && (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ ...springGentle, delay: prefersReducedMotion ? 0 : 0.5 }}
            className="mb-6"
          >
            <div className="forge-card overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-success-500 to-success-500"></div>
              <div className="p-8 text-center">
                <div className="mb-6">
                  <div className="p-4 bg-success-100 dark:bg-success-900/30 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <PlayIcon className="w-10 h-10 text-success-600 dark:text-success-400" />
                  </div>
                  <h3 className="text-2xl font-display font-bold tracking-wide text-surface-50 dark:text-white mb-2">
                    Ready to Start Your Workout?
                  </h3>
                  <p className="text-surface-500 dark:text-surface-600">
                    Click the button below to begin tracking your workout session
                  </p>
                </div>

                <motion.button
                  onClick={handleStartWorkout}
                  whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                  transition={springSnappy}
                  className="bg-gradient-to-r from-success-500 to-success-500 hover:from-success-600 hover:to-success-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg flex items-center gap-3 mx-auto"
                >
                  <PlayIcon className="w-6 h-6" />
                  Start Workout
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Workout Progress Tracker */}
        {hasActiveWorkout && activeWorkout && (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ ...springGentle, delay: prefersReducedMotion ? 0 : 0.5 }}
          >
            <WorkoutProgressTracker
              key={`workout-tracker-${activeWorkout.templateId}-${new Date(activeWorkout.startedAt).getTime()}`}
              template={activeWorkout.modifiedTemplate || template.workoutData}
              onPerformanceUpdate={handlePerformanceUpdate}
              onTemplateModified={handleTemplateModification}
              onExerciseProgressUpdate={updateExerciseProgress}
              initialExerciseProgress={activeWorkout.exerciseProgress}
              useMetric={profile?.useMetric}
            />
          </motion.div>
        )}

        {/* Session Notes - Only show when workout is active */}
        {hasActiveWorkout && (
          <motion.div
            className="mb-6"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ ...springGentle, delay: prefersReducedMotion ? 0 : 0.4 }}
          >
          <div className="forge-card overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-accent-500 to-accent-600"></div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-accent-100 dark:bg-accent-900/30 rounded-xl">
                  <DocumentTextIcon className="w-6 h-6 text-accent-600 dark:text-accent-400" />
                </div>
                <div>
                  <h3 className="text-lg font-display font-bold text-surface-50 dark:text-white">
                    Session Notes
                  </h3>
                  <p className="text-surface-500 dark:text-surface-600">
                    Record your thoughts, PRs, and observations
                  </p>
                </div>
              </div>

              <textarea
                id="sessionNotes"
                rows={4}
                value={activeWorkout?.sessionNotes || ''}
                onChange={(e) => handleNotesUpdate(e.target.value)}
                className="w-full px-4 py-3 border border-surface-300 dark:border-surface-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent dark:bg-surface-200 dark:text-white resize-none"
                placeholder="How did the session go? Any personal records? What felt challenging or easy today?"
                disabled={isSaving}
              />
            </div>
          </div>
        </motion.div>
        )}
      </div>

      {/*
        Template Modification Prompt — shown when finishing with modifications.

        Was a bare `fixed inset-0 z-50` pair rendered inline, which put it inside
        AppShell's `relative z-10` <main>: the bottom nav and header (z-40, and
        outside that stacking context) painted over its top and bottom edges. On
        a phone that clipped the last option and the cancel row. ModalShell
        portals to <body> and becomes a safe-area-aware bottom sheet below `sm`.
      */}
      <ModalShell
        isOpen={showCompletionPrompt}
        onClose={() => setShowCompletionPrompt(false)}
        title="Template Modified"
        subtitle="Your workout differs from the original template"
        maxWidth="max-w-md"
        icon={
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning-100 dark:bg-warning-900/30">
            <DocumentTextIcon className="h-5 w-5 text-warning-600 dark:text-warning-400" />
          </div>
        }
      >
        <p className="mb-4 text-sm text-surface-500 dark:text-surface-600">
          How would you like to handle these changes?
        </p>

        <div className="space-y-3">
          <motion.button
            onClick={() => performCompletion({ useModifiedTemplate: true, saveTemplate: 'update' })}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={springSnappy}
            className="tap-control w-full px-5 py-3 bg-success-500 hover:bg-success-600 text-white rounded-xl transition-colors font-semibold text-left"
          >
            <div className="text-sm font-bold">Save &amp; Update Template</div>
            <div className="text-xs text-success-100 mt-0.5">Log with new values and update the current template</div>
          </motion.button>
          <motion.button
            onClick={() => performCompletion({ useModifiedTemplate: true, saveTemplate: 'none' })}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={springSnappy}
            className="tap-control w-full px-5 py-3 bg-accent-500 hover:bg-accent-600 text-white rounded-xl transition-colors font-semibold text-left"
          >
            <div className="text-sm font-bold">Log New Values Only</div>
            <div className="text-xs text-accent-100 mt-0.5">Log this workout with the modified values, don&apos;t change the template</div>
          </motion.button>
          <motion.button
            onClick={() => performCompletion({ useModifiedTemplate: false, saveTemplate: 'none' })}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={springSnappy}
            className="tap-control w-full px-5 py-3 border border-surface-300 dark:border-surface-400 text-surface-600 dark:text-surface-800 rounded-xl hover:bg-surface-950 dark:hover:bg-surface-200 transition-colors font-semibold text-left"
          >
            <div className="text-sm font-bold">Keep Original Template Values</div>
            <div className="text-xs text-surface-500 dark:text-surface-600 mt-0.5">Discard modifications and log the original template as-is</div>
          </motion.button>
          <motion.button
            onClick={() => setShowCompletionPrompt(false)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={springSnappy}
            className="tap-control w-full px-5 py-3 text-surface-500 dark:text-surface-600 rounded-xl hover:bg-surface-950 dark:hover:bg-surface-200 transition-colors font-medium text-sm"
          >
            Cancel — go back to workout
          </motion.button>
        </div>
      </ModalShell>

      {victoryData && (
        <VictoryPopup
          data={{ ...victoryData, useMetric: profile?.useMetric ?? false }}
          isOpen={showVictory}
          onContinue={() => {
            setShowVictory(false);
            router.push('/profile');
          }}
        />
      )}

      <ConfirmDialog
        open={showCancelConfirm}
        title="Discard this workout?"
        message="Every set you've logged in this session will be deleted. This can't be undone."
        confirmLabel="Discard"
        cancelLabel="Keep training"
        destructive
        onConfirm={handleCancelWorkout}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </motion.div>
  );
}
