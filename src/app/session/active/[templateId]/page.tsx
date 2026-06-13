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
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { formatVolume } from '@/utils/formatters';
import { ExercisePerformance } from '@/types/workout';
import WorkoutProgressTracker from '@/components/workout/WorkoutProgressTracker';
import VictoryPopup from '@/components/modals/VictoryPopup';
import { useActiveWorkout } from '@/lib/hooks/useActiveWorkout';

const springSnappy = { type: 'spring' as const, stiffness: 400, damping: 30, mass: 0.8 };
const springBouncy = { type: 'spring' as const, stiffness: 300, damping: 20, mass: 0.7 };
const springGentle = { type: 'spring' as const, stiffness: 200, damping: 25, mass: 0.9 };



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
  } = useActiveWorkout();

  const [workoutCompleted, setWorkoutCompleted] = useState(false);

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
      // Handle error - maybe show a toast notification
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
    if (confirm('Are you sure you want to cancel this workout? All progress will be lost.')) {
      await endWorkout();
      router.push('/profile');
    }
  };

  const performCompletion = async (options: {
    useModifiedTemplate: boolean;
    saveTemplate: 'none' | 'update' | 'new';
  }) => {
    const finalDurationMinutes = Math.max(1, Math.round(getWorkoutDuration() / 60));
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
        // Wait a tick for state to settle
        await new Promise(r => setTimeout(r, 100));
      }

      const result = await completeWorkout(finalDurationMinutes, activeWorkout?.sessionNotes || '');

      setWorkoutCompleted(true);

      const perfData = result?.session?.performanceData?.performance;
      const totalDistance = perfData
        ? Object.values(perfData).reduce((t: number, ep: any) => {
            return t + (ep.sets || []).reduce((st: number, s: any) => st + (s.actualDistance || 0), 0);
          }, 0)
        : 0;

      setVictoryData({
        workoutName: template?.name || 'Workout',
        durationMinutes: finalDurationMinutes,
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
        const finalDurationMinutes = Math.max(1, Math.round(getWorkoutDuration() / 60));
        const response = await fetch('/api/session-json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scheduledSessionId,
            duration: finalDurationMinutes,
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
          durationMinutes: finalDurationMinutes,
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
      <div className="min-h-screen app-bg py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-secondary">Loading session...</p>
        </div>
      </div>
    );
  }

  if (templateError || !template) {
    return (
      <div className="min-h-screen app-bg py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="p-4 bg-red-100 text-red-700 rounded-lg text-center">
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
      className="min-h-screen app-bg py-8 px-4"
    >
      <div className="max-w-5xl mx-auto">
        {/* Enhanced Header */}
        <motion.div
          className="mb-8"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: -20 }}
          animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
          transition={springGentle}
        >
          <div className="forge-card overflow-hidden">
            <div className="bg-gradient-to-br from-orange-600 via-red-600 to-orange-800 px-8 py-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <motion.button
                    onClick={() => router.back()}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    transition={springSnappy}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                    aria-label="Go back"
                  >
                    <ArrowLeftIcon className="h-6 w-6" />
                  </motion.button>
                  <div>
                    <h1 className="text-3xl font-display font-bold tracking-wide mb-2">
                      🔥 Active Session
                    </h1>
                    <p className="text-orange-100 text-lg">
                      {template.name}
                    </p>
                  </div>
                </div>

                {/* Live Timer Display */}
                <motion.div
                  className="text-right"
                  animate={isTimerActive && !prefersReducedMotion ? { scale: [1, 1.03, 1] } : {}}
                  transition={{ type: "tween", ease: "easeInOut", repeat: isTimerActive ? Infinity : 0, duration: 2 }}
                >
                  <div className="text-3xl font-mono font-bold">
                    {formatWorkoutDuration}
                  </div>
                  <div className="text-orange-100 text-sm">
                    {isTimerActive ? '🟢 Recording' : '⏸️ Paused'}
                  </div>
                </motion.div>
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
              <div className="h-1 bg-gradient-to-r from-forge-500 to-forge-300"></div>
              <div className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-forge-100 dark:bg-forge-900/30 rounded-xl">
                    <CalendarIcon className="h-6 w-6 text-forge-600 dark:text-forge-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-bold text-surface-800 dark:text-white">
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
          <div className="forge-card overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-500"></div>
            <div className="p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                    <ClockIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-bold text-surface-800 dark:text-white">
                      Session Timer
                    </h3>
                    <p className="text-surface-500 dark:text-surface-600">
                      Track your workout duration
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <motion.button
                    onClick={toggleTimer}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    transition={springSnappy}
                    className={`px-6 py-3 rounded-xl flex items-center gap-2 font-semibold ${
                      isTimerActive
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                  >
                    {isTimerActive ? (
                      <PauseIcon className="h-5 w-5" />
                    ) : (
                      <PlayIcon className="h-5 w-5" />
                    )}
                    {isTimerActive ? 'Pause Timer' : 'Start Timer'}
                  </motion.button>
                  <motion.button
                    onClick={handleCancelWorkout}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    transition={springSnappy}
                    className="px-6 py-3 bg-surface-200 dark:bg-surface-300 hover:bg-surface-300 dark:hover:bg-surface-400 text-surface-700 dark:text-surface-900 rounded-xl flex items-center gap-2 font-semibold transition-colors"
                  >
                    <XCircleIcon className="h-5 w-5" />
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={stopTimerAndSave}
                    disabled={isSaving}
                    whileHover={isSaving ? {} : { scale: 1.03 }}
                    whileTap={isSaving ? {} : { scale: 0.97 }}
                    transition={springSnappy}
                    className="px-6 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-xl flex items-center gap-2 font-semibold"
                  >
                    {isSaving ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <CheckCircleIcon className="h-5 w-5" />
                    )}
                    {isSaving ? 'Saving...' : 'Finish & Save'}
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
                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
            }`}>
              <div className="flex items-center gap-2">
                {saveMessage.startsWith('Error:') ? (
                  <div className="text-red-500">❌</div>
                ) : (
                  <div className="text-green-500">✅</div>
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
            <div className="h-1 bg-gradient-to-r from-forge-500 to-forge-700"></div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-forge-100 dark:bg-forge-900/30 rounded-xl">
                  <div className="w-6 h-6 bg-forge-600 dark:bg-blue-400 rounded"></div>
                </div>
                <div>
                  <h3 className="text-lg font-display font-bold text-surface-800 dark:text-white">
                    Workout Overview
                  </h3>
                  <p className="text-surface-500 dark:text-surface-600">
                    Today's training session details
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-surface-950 dark:bg-surface-200/50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-display font-bold tracking-wide text-surface-800 dark:text-white">
                    {template.workoutData?.exercises?.length || 0}
                  </div>
                  <div className="text-sm text-surface-500 dark:text-surface-600">Exercises</div>
                </div>
                <div className="bg-surface-950 dark:bg-surface-200/50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-display font-bold tracking-wide text-surface-800 dark:text-white">
                    {template.workoutData?.exercises?.reduce((total, ex) => total + ex.sets.length, 0) || 0}
                  </div>
                  <div className="text-sm text-surface-500 dark:text-surface-600">Total Sets</div>
                </div>
                <div className="bg-surface-950 dark:bg-surface-200/50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-display font-bold tracking-wide text-surface-800 dark:text-white">
                    {template.totalVolume > 0 ? formatVolume(template.totalVolume, profile?.useMetric) : '-'}
                  </div>
                  <div className="text-sm text-surface-500 dark:text-surface-600">Volume</div>
                </div>
                <div className="bg-surface-950 dark:bg-surface-200/50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-display font-bold tracking-wide text-surface-800 dark:text-white">
                    ~{template.estimatedDuration}
                  </div>
                  <div className="text-sm text-surface-500 dark:text-surface-600">Est. Minutes</div>
                </div>
                <div className="bg-surface-950 dark:bg-surface-200/50 rounded-xl p-4 text-center">
                  <div className="text-lg font-display font-bold text-surface-800 dark:text-white capitalize">
                    {template.difficulty}
                  </div>
                  <div className="text-sm text-surface-500 dark:text-surface-600">Difficulty</div>
                </div>
              </div>
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
              <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-500"></div>
              <div className="p-8 text-center">
                <div className="mb-6">
                  <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <PlayIcon className="w-10 h-10 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-2xl font-display font-bold tracking-wide text-surface-800 dark:text-white mb-2">
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
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg flex items-center gap-3 mx-auto"
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
            <div className="h-1 bg-gradient-to-r from-forge-500 to-pink-500"></div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-forge-100 dark:bg-forge-900/30 rounded-xl">
                  <DocumentTextIcon className="w-6 h-6 text-forge-600 dark:text-forge-400" />
                </div>
                <div>
                  <h3 className="text-lg font-display font-bold text-surface-800 dark:text-white">
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
                className="w-full px-4 py-3 border border-surface-300 dark:border-surface-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-surface-200 dark:text-white resize-none"
                placeholder="How did the session go? Any personal records? What felt challenging or easy today?"
                disabled={isSaving}
              />
            </div>
          </div>
        </motion.div>
        )}
      </div>

      {/* Template Modification Prompt — shown when finishing with modifications */}
      <AnimatePresence>
        {showCompletionPrompt && (
          <>
            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0 }}
              animate={prefersReducedMotion ? {} : { opacity: 1 }}
              exit={prefersReducedMotion ? {} : { opacity: 0 }}
              transition={springGentle}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowCompletionPrompt(false)}
            />
            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
              animate={prefersReducedMotion ? {} : { opacity: 1, scale: 1 }}
              exit={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
              transition={springBouncy}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="forge-card shadow-2xl p-8 max-w-md w-full">
                <div className="text-center mb-6">
                  <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl w-fit mx-auto mb-4">
                    <DocumentTextIcon className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="text-xl font-display font-bold tracking-wide text-surface-800 dark:text-white mb-2">
                    Template Modified
                  </h3>
                  <p className="text-surface-500 dark:text-surface-600">
                    Your workout differs from the original template. How would you like to handle these changes?
                  </p>
                </div>

                <div className="space-y-3">
                  <motion.button
                    onClick={() => performCompletion({ useModifiedTemplate: true, saveTemplate: 'update' })}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={springSnappy}
                    className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors font-semibold text-left"
                  >
                    <div className="text-sm font-bold">Save & Update Template</div>
                    <div className="text-xs text-green-100 mt-0.5">Log with new values and update the current template</div>
                  </motion.button>
                  <motion.button
                    onClick={() => performCompletion({ useModifiedTemplate: true, saveTemplate: 'none' })}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={springSnappy}
                    className="w-full px-6 py-3 bg-forge-500 hover:bg-forge-600 text-white rounded-xl transition-colors font-semibold text-left"
                  >
                    <div className="text-sm font-bold">Log New Values Only</div>
                    <div className="text-xs text-forge-100 mt-0.5">Log this workout with the modified values, don't change the template</div>
                  </motion.button>
                  <motion.button
                    onClick={() => performCompletion({ useModifiedTemplate: false, saveTemplate: 'none' })}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={springSnappy}
                    className="w-full px-6 py-3 border border-surface-300 dark:border-surface-400 text-surface-600 dark:text-surface-800 rounded-xl hover:bg-surface-950 dark:hover:bg-surface-200 transition-colors font-semibold text-left"
                  >
                    <div className="text-sm font-bold">Keep Original Template Values</div>
                    <div className="text-xs text-surface-500 dark:text-surface-600 mt-0.5">Discard modifications and log the original template as-is</div>
                  </motion.button>
                  <motion.button
                    onClick={() => setShowCompletionPrompt(false)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={springSnappy}
                    className="w-full px-6 py-3 text-surface-500 dark:text-surface-600 rounded-xl hover:bg-surface-950 dark:hover:bg-surface-200 transition-colors font-medium text-sm"
                  >
                    Cancel — go back to workout
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
    </motion.div>
  );
}
