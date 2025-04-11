'use client';

import { useState, useEffect, use } from 'react';
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

  // Timer state
  const [timer, setTimer] = useState(0);
  const [isActive, setIsActive] = useState(false);
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

  const stopTimerAndSave = async () => {
    setIsActive(false);
    const finalDurationMinutes = Math.max(1, Math.round(timer / 60)); // Duration in minutes, ensure at least 1

    // --- Call API to save session ---
    setIsSaving(true);
    setSaveMessage('');

    // Prepare data for API
    const sessionData = {
      templateId: template?.id,
      duration: finalDurationMinutes,
      notes: sessionNotes,
      scheduledSessionId: scheduledSessionId || undefined,
    };

    // Basic validation: Check if templateId exists
    if (!sessionData.templateId) {
      setSaveMessage('Error: Template ID is missing. Cannot save session.');
      setIsSaving(false);
      return;
    }

    // Optional: Add validation for performance data if needed

    try {
      const response = await fetch('/api/session', {
        // New API endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(errorData.error || 'Failed to save session');
      }

      setSaveMessage('Session saved successfully!');
      // Redirect to activity/history page or dashboard after save
      setTimeout(() => {
        router.push('/activity'); // Go back to activity page
      }, 1000);
    } catch (error) {
      console.error('Error saving session:', error);
      setSaveMessage(
        `Error: ${
          error instanceof Error ? error.message : 'Failed to save session'
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
    <div className="min-h-screen app-bg py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()} // Go back to start page or template detail
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex-1">
            Active Session: {template.name}
          </h1>
        </div>

        {/* Session Type Indicator (Scheduled vs New) */}
        {scheduledSessionId && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4 flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <CalendarIcon className="h-5 w-5" />
            <span>You are completing a scheduled workout</span>
          </div>
        )}

        {/* Timer Display and Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 mb-6 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-6 w-6 text-primary" />
            <span className="text-2xl font-mono font-semibold text-heading">
              {formatTime(timer)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTimer}
              className={`btn btn-sm ${
                isActive ? 'btn-warning' : 'btn-success'
              }`}
            >
              {isActive ? (
                <PauseIcon className="h-5 w-5 mr-1" />
              ) : (
                <PlayIcon className="h-5 w-5 mr-1" />
              )}
              {isActive ? 'Pause' : 'Start'}
            </button>
            <button
              onClick={stopTimerAndSave}
              disabled={isSaving}
              className="btn btn-sm btn-danger flex items-center"
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
              ) : (
                <CheckCircleIcon className="h-5 w-5 mr-1" />
              )}
              Finish & Save
            </button>
          </div>
        </div>
        {saveMessage && (
          <p
            className={`mb-4 text-sm text-center ${
              saveMessage.startsWith('Error:')
                ? 'text-red-500 dark:text-red-400'
                : 'text-green-600 dark:text-green-400'
            }`}
          >
            {saveMessage}
          </p>
        )}

        {/* Session Notes */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <label
            htmlFor="sessionNotes"
            className="flex items-center gap-2 text-lg font-semibold text-heading mb-2"
          >
            <DocumentTextIcon className="w-5 h-5" /> Session Notes
          </label>
          <textarea
            id="sessionNotes"
            rows={3}
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            className="form-input w-full"
            placeholder="How did the session go? Any PRs?"
            disabled={isSaving}
          />
        </div>

        {/* Bottom Save Button (redundant with top one, maybe remove or keep based on UX pref) */}
        <div className="mt-8 text-center">
          <button
            onClick={stopTimerAndSave}
            disabled={isSaving}
            className="btn btn-danger btn-lg flex items-center mx-auto"
          >
            {isSaving ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
            ) : (
              <CheckCircleIcon className="h-6 w-6 mr-1" />
            )}
            Finish & Save Session
          </button>
        </div>
      </div>
    </div>
  );
}
