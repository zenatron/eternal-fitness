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
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { formatVolume } from '@/utils/formatters';
import { ExercisePerformance } from '@/types/workout';
import WorkoutProgressTracker from '@/components/workout/WorkoutProgressTracker';
import { useActiveWorkout } from '@/lib/hooks/useActiveWorkout';

// Type for storing session performance data
type SessionSetPerformance = {
  setId: string; // Original set ID from template
  reps: number | null;
  weight: number | null;
};

type SessionExercisePerformance = {
  exerciseName: string; // Name for display
  sets: SessionSetPerformance[];
};

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

  const [sessionNotes, setSessionNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [workoutPerformance, setWorkoutPerformance] = useState<{ [exerciseId: string]: ExercisePerformance }>({});
  const [modifiedTemplate, setModifiedTemplate] = useState(template?.workoutData);
  const [showSaveTemplatePrompt, setShowSaveTemplatePrompt] = useState(false);

  // Active workout state management
  const {
    activeWorkout,
    startWorkout,
    updatePerformance,
    updateSessionNotes,
    updateModifiedTemplate,
    updateExerciseProgress,
    endWorkout,
    hasActiveWorkout,
  } = useActiveWorkout();

  // Timer state
  const [timer, setTimer] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [workoutCompleted, setWorkoutCompleted] = useState(false);

  // Initialize active workout on page load (but not if workout was just completed)
  useEffect(() => {
    if (template && !workoutCompleted && (!hasActiveWorkout || activeWorkout?.templateId !== template.id)) {
      startWorkout(template.id, template.name, template.workoutData);
    }
  }, [template, hasActiveWorkout, activeWorkout, startWorkout, workoutCompleted]);

  // Load saved state if available
  useEffect(() => {
    if (activeWorkout && activeWorkout.templateId === template?.id) {
      if (activeWorkout.sessionNotes) {
        setSessionNotes(activeWorkout.sessionNotes);
      }
      if (activeWorkout.workoutPerformance) {
        setWorkoutPerformance(activeWorkout.workoutPerformance);
      }
      if (activeWorkout.modifiedTemplate) {
        setModifiedTemplate(activeWorkout.modifiedTemplate);
      }
    }
  }, [activeWorkout, template]);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive) {
      if (startTime === null) {
        setStartTime(Date.now() - timer * 1000); // Adjust start time if resuming
      }
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer + 1);
      }, 1000);
    } else if (!isActive && timer !== 0) {
      if (interval) clearInterval(interval);
      setStartTime(null); // Reset start time when paused
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timer, startTime]);

  const formatTime = (timeInSeconds: number): string => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;
    const parts: string[] = [];
    if (hours > 0) parts.push(hours.toString().padStart(2, '0'));
    parts.push(minutes.toString().padStart(2, '0'));
    parts.push(seconds.toString().padStart(2, '0'));
    return parts.join(':');
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const handleTemplateModification = useCallback((newTemplate: any) => {
    setModifiedTemplate(newTemplate);
    updateModifiedTemplate(newTemplate);
    setShowSaveTemplatePrompt(true);
  }, [updateModifiedTemplate]);

  const handlePerformanceUpdate = useCallback((performance: { [exerciseId: string]: ExercisePerformance }) => {
    setWorkoutPerformance(performance);
    updatePerformance(performance);
  }, [updatePerformance]);

  const handleNotesUpdate = useCallback((notes: string) => {
    setSessionNotes(notes);
    updateSessionNotes(notes);
  }, [updateSessionNotes]);

  const saveAsNewTemplate = async () => {
    if (!modifiedTemplate) return;

    try {
      const response = await fetch('/api/template/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${template.name} (Modified)`,
          description: `Modified version of ${template.name} from workout session`,
          workoutData: modifiedTemplate,
          difficulty: template.difficulty,
          workoutType: template.workoutType,
          favorite: false,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save new template');
      }

      setSaveMessage('✅ Template saved as new workout!');
      setShowSaveTemplatePrompt(false);
    } catch (error) {
      console.error('Error saving new template:', error);
      setSaveMessage('❌ Failed to save template');
    }
  };

  const updateExistingTemplate = async () => {
    if (!modifiedTemplate) return;

    try {
      const response = await fetch(`/api/template/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          workoutData: modifiedTemplate,
          difficulty: template.difficulty,
          workoutType: template.workoutType,
          favorite: template.favorite,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update template');
      }

      setSaveMessage('✅ Template updated successfully!');
      setShowSaveTemplatePrompt(false);
    } catch (error) {
      console.error('Error updating template:', error);
      setSaveMessage('❌ Failed to update template');
    }
  };

  const stopTimerAndSave = async () => {
    setIsActive(false);
    const finalDurationMinutes = Math.max(1, Math.round(timer / 60)); // Duration in minutes, ensure at least 1

    // --- Call API to save session ---
    setIsSaving(true);
    setSaveMessage('');

    // Basic validation: Check if templateId exists
    if (!template?.id) {
      setSaveMessage('Error: Template ID is missing. Cannot save session.');
      setIsSaving(false);
      return;
    }

    // Prepare data for API
    let sessionData: any;

    if (scheduledSessionId) {
      // Completing a scheduled session - need performance data
      sessionData = {
        scheduledSessionId: scheduledSessionId,
        duration: finalDurationMinutes,
        notes: sessionNotes,
        performance: workoutPerformance, // Include actual workout performance
      };
    } else {
      // Creating a new immediate session - use simpler approach
      // Since we don't have detailed performance tracking yet,
      // let's use the legacy session API instead
      try {
        const response = await fetch(`/api/template/${template.id}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            duration: finalDurationMinutes,
            notes: sessionNotes,
            performance: workoutPerformance, // Include actual workout performance
          }),
        });

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: 'Failed to parse error response' }));
          throw new Error(errorData.error?.message || errorData.error || 'Failed to save session');
        }

        setSaveMessage('Session saved successfully!');
        // Mark workout as completed to prevent re-initialization
        setWorkoutCompleted(true);
        // End the active workout immediately
        endWorkout();
        // Redirect to profile page after save
        setTimeout(() => {
          router.push('/profile'); // Go back to profile page
        }, 1000);
        return;
      } catch (error) {
        console.error('Error saving session:', error);
        console.error('Error details:', {
          templateId: template.id,
          duration: finalDurationMinutes,
          notes: sessionNotes,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
        setSaveMessage(
          `Error: ${
            error instanceof Error ? error.message : 'Failed to save session'
          }`,
        );
        setIsSaving(false);
        return;
      }
    }

    try {
      const response = await fetch('/api/session-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(errorData.error?.message || errorData.error || 'Failed to save scheduled session');
      }

      setSaveMessage('Scheduled session completed successfully!');
      // Mark workout as completed to prevent re-initialization
      setWorkoutCompleted(true);
      // End the active workout immediately
      endWorkout();
      // Redirect to profile page after save
      setTimeout(() => {
        router.push('/profile'); // Go back to profile page
      }, 1000);
    } catch (error) {
      console.error('Error completing scheduled session:', error);
      console.error('Scheduled session error details:', {
        scheduledSessionId,
        templateId: template.id,
        duration: finalDurationMinutes,
        notes: sessionNotes,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      setSaveMessage(
        `Error: ${
          error instanceof Error ? error.message : 'Failed to complete scheduled session'
        }`,
      );
      setIsSaving(false); // Allow retry on error
    }
    // No finally block for setIsSaving(false) here, handled in error case or success redirect
  };

  const isLoading = templateLoading || profileLoading;

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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4"
    >
      <div className="max-w-5xl mx-auto">
        {/* Enhanced Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-br from-orange-600 via-red-600 to-orange-800 px-8 py-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => router.back()}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                    aria-label="Go back"
                  >
                    <ArrowLeftIcon className="h-6 w-6" />
                  </button>
                  <div>
                    <h1 className="text-3xl font-bold mb-2">
                      🔥 Active Session
                    </h1>
                    <p className="text-orange-100 text-lg">
                      {template.name}
                    </p>
                  </div>
                </div>

                {/* Live Timer Display */}
                <div className="text-right">
                  <div className="text-3xl font-mono font-bold">
                    {formatTime(timer)}
                  </div>
                  <div className="text-orange-100 text-sm">
                    {isActive ? '🟢 Recording' : '⏸️ Paused'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Session Type Indicator */}
        {scheduledSessionId && (
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
              <div className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <CalendarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Scheduled Workout
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      You are completing a previously scheduled workout session
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Timer Controls */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-500"></div>
            <div className="p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                    <ClockIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Session Timer
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Track your workout duration
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleTimer}
                    className={`px-6 py-3 rounded-xl transition-all duration-200 flex items-center gap-2 font-semibold ${
                      isActive
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                  >
                    {isActive ? (
                      <PauseIcon className="h-5 w-5" />
                    ) : (
                      <PlayIcon className="h-5 w-5" />
                    )}
                    {isActive ? 'Pause Timer' : 'Start Timer'}
                  </button>
                  <button
                    onClick={stopTimerAndSave}
                    disabled={isSaving}
                    className="px-6 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-xl transition-all duration-200 flex items-center gap-2 font-semibold"
                  >
                    {isSaving ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <CheckCircleIcon className="h-5 w-5" />
                    )}
                    {isSaving ? 'Saving...' : 'Finish & Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <div className="w-6 h-6 bg-blue-600 dark:bg-blue-400 rounded"></div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Workout Overview
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Today's training session details
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {template.workoutData?.exercises?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Exercises</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {template.workoutData?.exercises?.reduce((total, ex) => total + ex.sets.length, 0) || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Sets</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {template.totalVolume > 0 ? formatVolume(template.totalVolume, profile?.useMetric) : '-'}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Volume</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    ~{template.estimatedDuration}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Est. Minutes</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
                  <div className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                    {template.difficulty}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Difficulty</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Workout Progress Tracker */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          <WorkoutProgressTracker
            template={template.workoutData}
            onPerformanceUpdate={handlePerformanceUpdate}
            onTemplateModified={handleTemplateModification}
            onExerciseProgressUpdate={updateExerciseProgress}
            initialExerciseProgress={activeWorkout?.exerciseProgress}
            useMetric={profile?.useMetric}
          />
        </motion.div>

        {/* Session Notes */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                  <DocumentTextIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Session Notes
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Record your thoughts, PRs, and observations
                  </p>
                </div>
              </div>

              <textarea
                id="sessionNotes"
                rows={4}
                value={sessionNotes}
                onChange={(e) => handleNotesUpdate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none transition-all duration-200"
                placeholder="How did the session go? Any personal records? What felt challenging or easy today?"
                disabled={isSaving}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Save Template Prompt Modal */}
      <AnimatePresence>
        {showSaveTemplatePrompt && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowSaveTemplatePrompt(false)}
            />

            {/* Modal content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700">
                <div className="text-center mb-6">
                  <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl w-fit mx-auto mb-4">
                    <DocumentTextIcon className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Save Template Changes?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    You've modified this workout template. Would you like to save these changes?
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={saveAsNewTemplate}
                    className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors font-semibold"
                  >
                    Save as New Template
                  </button>
                  <button
                    onClick={updateExistingTemplate}
                    className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors font-semibold"
                  >
                    Update Existing Template
                  </button>
                  <button
                    onClick={() => setShowSaveTemplatePrompt(false)}
                    className="w-full px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                  >
                    Continue Without Saving
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
