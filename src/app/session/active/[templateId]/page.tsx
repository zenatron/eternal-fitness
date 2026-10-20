'use client';

import { useState, useEffect, use, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTemplate } from '@/lib/hooks/useTemplate';
import { useProfile } from '@/lib/hooks/useProfile';
import Link from 'next/link';
import { CheckIcon, PlayIcon, PauseIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatVolume } from '@/utils/formatters';

import WorkoutProgressTracker from '@/components/workout/WorkoutProgressTracker';
import dynamic from 'next/dynamic';

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
import { useTickingNow } from '@/lib/hooks/useTickingNow';
import { useRestTimerActions } from '@/components/workout/RestTimerProvider';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ModalShell } from '@/components/ui/ModalShell';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateWorkoutData } from '@/lib/queryKeys';

/**
 * The only part of this page that needs to re-render every second: it runs its
 * own tick loop and formats the clock at render time. The provider no longer
 * ticks app-wide (see ActiveWorkoutProvider), so the whole page no longer
 * re-renders just to move the timer by one second.
 */
function LiveWorkoutClock() {
  const { formatWorkoutDuration } = useActiveWorkout();
  useTickingNow();
  return (
    <p className="font-display text-2xl font-semibold leading-none tabular text-surface-50 dark:text-white">
      {formatWorkoutDuration()}
    </p>
  );
}

const NOTES_DEBOUNCE_MS = 600;

/**
 * Session notes with a local draft and a debounced commit.
 *
 * The textarea used to be wired straight into the provider, so every character
 * re-rendered the entire workout tree and rewrote the IndexedDB blob.
 * Autosave semantics are unchanged: the provider receives the note shortly
 * after typing stops, immediately on blur, and on unmount — so completing the
 * workout right after typing still captures it.
 */
function SessionNotesCard({
  disabled,
  notesRef,
}: {
  disabled: boolean;
  /** Shared with the page so Finish can read the draft even when the debounce
   *  has not fired — the completion path reads this, not provider state. */
  notesRef: React.MutableRefObject<string>;
}) {
  const { activeWorkout, updateSessionNotes } = useActiveWorkout();
  const serverNotes = activeWorkout?.sessionNotes || '';
  const [draft, setDraft] = useState(serverNotes);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** True between the first keystroke and the commit landing in the provider. */
  const dirtyRef = useRef(false);
  const updateRef = useRef(updateSessionNotes);
  updateRef.current = updateSessionNotes;

  // Adopt notes changed elsewhere (recovery, another tab) while not editing.
  useEffect(() => {
    if (!dirtyRef.current) setDraft(serverNotes);
  }, [serverNotes]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      // Flush on unmount: completing the workout tears this card down, and the
      // provider's copy of the notes should stay current for the sync path.
      if (dirtyRef.current) updateRef.current(notesRef.current);
    };
  }, [notesRef]);

  const handleChange = (value: string) => {
    setDraft(value);
    dirtyRef.current = true;
    notesRef.current = value;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      dirtyRef.current = false;
      updateRef.current(notesRef.current);
    }, NOTES_DEBOUNCE_MS);
  };

  const commitNow = () => {
    if (!dirtyRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    dirtyRef.current = false;
    updateRef.current(notesRef.current);
  };

  // Keep the shared ref truthful even before the first keystroke (e.g. notes
  // adopted from the provider).
  useEffect(() => {
    if (!dirtyRef.current) notesRef.current = serverNotes;
  }, [serverNotes, notesRef]);

  return (
    <div className="forge-card p-4">
      <label htmlFor="sessionNotes" className="section-title mb-2 block">
        Notes
      </label>
      <textarea
        id="sessionNotes"
        rows={3}
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={commitNow}
        className="form-input resize-none text-sm"
        placeholder="How did it go? Anything to remember next time?"
        disabled={disabled}
      />
    </div>
  );
}

export default function ActiveSessionPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const scheduledSessionId = searchParams.get('scheduledSessionId');

  const {
    template,
    isLoading: templateLoading,
    error: templateError,
  } = useTemplate(templateId);
  const { profile, isLoading: profileLoading } = useProfile();

  // Only UI state that doesn't need persistence
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false);

  // Active workout state management
  const {
    activeWorkout,
    isLoading: isActiveWorkoutLoading,
    startWorkout,
    updateWorkout,
    updateModifiedTemplate,
    endWorkout,
    completeWorkout,
    hasActiveWorkout,
    getWorkoutDuration,
    toggleTimer,
    isTimerActive,
    flushNow,
  } = useActiveWorkout();

  const [workoutCompleted, setWorkoutCompleted] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  /** Set when the user opens this page while a DIFFERENT template's workout is active. */
  const [showCrossTemplateConfirm, setShowCrossTemplateConfirm] = useState(false);
  /** The notes draft, shared with SessionNotesCard so Finish never loses typed-but-unsaved text. */
  const sessionNotesRef = useRef<string>('');

  // Actions only — the countdown state would re-render this whole page 4×/s.
  const restTimer = useRestTimerActions();

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
    if (!template || workoutCompleted || isActiveWorkoutLoading) return;
    if (!hasActiveWorkout || activeWorkout?.templateId === template.id) return;

    // A different template's workout is in progress. Used to force-recover
    // silently: the recover route re-labelled the old session onto THIS
    // template, and positional exercise IDs ('exercise-1') meant its logged
    // sets were adopted into whatever this template's first exercise is —
    // one tap from the templates grid, no warning. Now the user decides.
    if (recoverPromptDismissedRef.current) return;
    setShowCrossTemplateConfirm(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template?.id, hasActiveWorkout, activeWorkout?.templateId, workoutCompleted, isActiveWorkoutLoading]);

  const recoverPromptDismissedRef = useRef(false);

  // Function to manually start a workout
  const handleStartWorkout = useCallback(async () => {
    if (!template) return;

    // A live workout for a different template must be dealt with first; the
    // server start endpoint would (correctly) 409 this, but by then the user
    // is already looking at a session page that cannot run.
    if (hasActiveWorkout && activeWorkout && activeWorkout.templateId !== template.id) {
      setShowCrossTemplateConfirm(true);
      return;
    }

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
  }, [template, startWorkout, hasActiveWorkout, activeWorkout]);

  /** Cross-template resolution: discard the old session and take this page over. */
  const handleDiscardAndSwitch = async () => {
    setShowCrossTemplateConfirm(false);
    recoverPromptDismissedRef.current = true;
    if (!template) return;
    try {
      restTimer.skip();
      // Discard, then start fresh. This used to force-*recover* the old
      // session onto this template and then call start — which 409'd against
      // the session recovery had just created, leaving this workout running on
      // the old one's clock.
      await endWorkout();
      await startWorkout(template.id, template.name, template.workoutData);
    } catch (error) {
      console.error('Failed to switch workouts:', error);
      toast.error('Could not switch workouts. Finish or discard the other one first.');
    }
  };

  /** Keep the in-progress workout and go to it. */
  const handleKeepCurrentWorkout = () => {
    setShowCrossTemplateConfirm(false);
    if (activeWorkout?.templateId) {
      router.push(`/session/active/${activeWorkout.templateId}`);
    }
  };

  // No more state synchronization needed - everything comes from activeWorkout directly

  const handleTemplateModification = useCallback((newTemplate: any) => {
    updateModifiedTemplate(newTemplate);
  }, [updateModifiedTemplate]);

  const handleCancelWorkout = async () => {
    setShowCancelConfirm(false);
    // The rest bar is global; nothing else cancels it on discard, so the
    // countdown outlived the workout it belonged to.
    restTimer.skip();
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
        const response = options.saveTemplate === 'update'
          ? await fetch(`/api/template/${template.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: template.name,
                workoutData: activeWorkout.modifiedTemplate,
                difficulty: template.difficulty,
                workoutType: template.workoutType,
                favorite: template.favorite,
              }),
            })
          : await fetch('/api/template/create', {
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
        // A failed template save used to be swallowed silently while the
        // workout completed as if it had saved. The workout is still logged —
        // it is the real event — but the user is told the template side failed.
        if (!response.ok) {
          toast.error('The workout will be logged, but saving the template changes failed.', { duration: 6000 });
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

      // Read the notes through the shared ref: the debounced draft may not
      // have committed to the provider yet, and the unmount flush runs after
      // completion has already torn the card down — typed notes were lost.
      const finalNotes = sessionNotesRef.current || activeWorkout?.sessionNotes || '';

      const result = await completeWorkout(finalDurationSeconds, finalNotes);

      setWorkoutCompleted(true);
      restTimer.skip();

      // completeWorkout resolves to the API envelope { data: { session,
      // achievements, … } }. Reading `result.session` directly silently
      // discarded every field — the victory popup showed 0 sets / 0 exercises
      // for every live-completed workout.
      const payload = result?.data ?? result;

      // Offline completions resolve to { queued: true } with no session data:
      // the workout is safe in the outbox but has not reached the server. The
      // popup used to render zeros with no explanation — tell the user their
      // work is saved and will sync.
      if (payload?.queued) {
        toast.success('Saved on this device — it will sync when you reconnect.', { duration: 6000 });
      }

      const perfData = payload?.session?.performanceData?.performance;
      const totalDistance = perfData
        ? Object.values(perfData).reduce((t: number, ep: any) => {
            return t + (ep.sets || []).reduce((st: number, s: any) => st + (s.actualDistance || 0), 0);
          }, 0)
        : 0;

      setVictoryData({
        workoutName: template?.name || 'Workout',
        durationMinutes: durationMinutes,
        totalVolume: payload?.session?.totalVolume || 0,
        totalSets: payload?.session?.totalSets || 0,
        totalExercises: payload?.session?.totalExercises || 0,
        totalDistance,
        newAchievementIds: payload?.achievements?.newAchievements || [],
        newPRs: payload?.newPRs || [],
        pointsAwarded: payload?.achievements?.pointsAwarded || 0,
        totalAwarded: payload?.totalAwarded || payload?.achievements?.pointsAwarded || 0,
        progress: payload?.achievements?.progress || {},
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
        // Same guarantee as the regular path: every logged set has reached the
        // provider's copy before it is read below.
        await flushNow();
        // workoutSessions.duration is stored in SECONDS.
        const finalDurationSeconds = Math.max(1, Math.round(getWorkoutDuration()));
        const durationMinutes = Math.max(1, Math.round(finalDurationSeconds / 60));
        const response = await fetch('/api/session-json', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Stable per scheduled session, so a lost response + retry cannot
            // log it twice the way a bare retry could.
            'Idempotency-Key': `scheduled-complete:${scheduledSessionId}`,
          },
          body: JSON.stringify({
            scheduledSessionId,
            duration: finalDurationSeconds,
            notes: sessionNotesRef.current || activeWorkout?.sessionNotes || '',
            performance: activeWorkout?.performance || {},
          }),
        });
        if (response.status === 409) {
          // Someone (another tab, a recovered retry) already completed it —
          // that is success from the user's point of view, not an error. The
          // old path threw, showed an error, and left a phantom active
          // indicator for a session that was already logged.
          toast.success('This session was already logged.');
          setWorkoutCompleted(true);
          restTimer.skip();
          await endWorkout();
          await invalidateWorkoutData(queryClient);
          // There is no summary to show; the popup used to be "opened" with no
          // data, which rendered nothing and stranded the user here.
          router.push('/profile');
          return;
        }
        if (!response.ok) throw new Error('Failed to complete scheduled session');
        const result = await response.json();
        const sessionData = result.data;

        setWorkoutCompleted(true);
        restTimer.skip();
        await endWorkout();
        // Stats, streak, PRs and the dashboard all moved.
        void invalidateWorkoutData(queryClient);

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
      <div className="mx-auto max-w-3xl px-4 pt-16 text-center" aria-busy="true">
        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
        <p className="mt-3 text-sm text-surface-500 dark:text-surface-600">Loading workout…</p>
      </div>
    );
  }

  if (templateError || !template) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-8">
        <PageHeader back title="Workout not found" />
        <p className="forge-card p-5 text-sm text-surface-500 dark:text-surface-600">
          This workout could not be loaded — it may have been deleted.{' '}
          <Link href="/templates" className="font-medium text-accent-600 hover:underline dark:text-accent-400">
            Back to your workouts
          </Link>
        </p>
      </div>
    );
  }

  const plan = activeWorkout?.modifiedTemplate ?? template.workoutData;
  const status = !hasActiveWorkout
    ? scheduledSessionId
      ? 'Scheduled workout'
      : 'Not started'
    : isTimerActive
      ? 'In progress'
      : 'Paused';

  return (
    <>
    <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
      <PageHeader back eyebrow={status} title={template.name} />

      {/* Clock and controls. Finish is the one primary action; pause is a
          neutral control and discard a quiet one — they used to be amber,
          red-tinted and green blocks of equal weight under a colour stripe. */}
      {hasActiveWorkout && !showCrossTemplateConfirm && (
        <div className="forge-card mb-4 flex items-center gap-3 p-3 sm:p-4">
          <button
            onClick={toggleTimer}
            aria-label={isTimerActive ? 'Pause timer' : 'Resume timer'}
            title={isTimerActive ? 'Pause timer' : 'Resume timer'}
            className="tap-control flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-black/10 text-surface-100 transition-colors hover:bg-black/[0.04] dark:border-white/10 dark:text-surface-950 dark:hover:bg-white/[0.05]"
          >
            {isTimerActive ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
          </button>
          <div className="min-w-0 flex-1">
            <LiveWorkoutClock />
            <p className="mt-0.5 truncate text-xs text-surface-500 dark:text-surface-600">
              {!isTimerActive ? 'Paused' : wakeLockActive ? 'Screen stays on' : 'Running'}
            </p>
          </div>
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="tap-control hidden min-h-[44px] rounded-lg px-3 text-sm font-medium text-surface-500 transition-colors hover:text-danger-600 dark:text-surface-600 dark:hover:text-danger-400 sm:block"
          >
            Discard
          </button>
          <button
            onClick={stopTimerAndSave}
            disabled={isSaving}
            className="btn btn-primary tap-control min-h-[44px] shrink-0 px-5"
          >
            {isSaving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <CheckIcon className="h-4 w-4" />
            )}
            {isSaving ? 'Saving…' : 'Finish'}
          </button>
        </div>
      )}

      {saveMessage && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-danger-500/30 bg-danger-500/10 px-4 py-3 text-sm text-danger-700 dark:text-danger-300"
        >
          {saveMessage.replace(/^Error:\s*/, '')}
        </p>
      )}

      {/* Before starting: what is in the workout, and one button. This used to
          be a stats card plus a separate green card asking "Ready to Start Your
          Workout? Click the button below…" around a gradient button. */}
      {!hasActiveWorkout && !isActiveWorkoutLoading && (
        <div className="forge-card mb-4 overflow-hidden">
          <ul className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
            {(plan?.exercises ?? []).map((exercise) => {
              const first = exercise.sets[0];
              const reps =
                typeof first?.targetReps === 'number'
                  ? first.targetReps
                  : first?.targetReps
                    ? `${first.targetReps.min}–${first.targetReps.max}`
                    : null;
              return (
                <li key={exercise.id} className="flex items-baseline justify-between gap-3 px-4 py-3">
                  <span className="truncate text-sm font-medium text-surface-50 dark:text-white">{exercise.name}</span>
                  <span className="shrink-0 text-xs text-surface-500 dark:text-surface-600 tabular">
                    {exercise.sets.length} ×{' '}
                    {first?.targetDuration
                      ? `${Math.round(first.targetDuration / 60)} min`
                      : `${reps ?? '—'}${first?.targetWeight ? ` @ ${first.targetWeight}` : ''}`}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between gap-3 border-t border-black/[0.06] px-4 py-3 dark:border-white/[0.06]">
            <p className="text-xs text-surface-500 dark:text-surface-600 tabular">
              About {template.estimatedDuration} min
              {template.totalVolume > 0 && <> · {formatVolume(template.totalVolume, profile?.useMetric)} planned</>}
            </p>
            <button onClick={handleStartWorkout} className="btn btn-primary tap-control min-h-[44px] px-6">
              <PlayIcon className="h-4 w-4" />
              Start
            </button>
          </div>
        </div>
      )}

      {hasActiveWorkout && activeWorkout && !showCrossTemplateConfirm && (
        <WorkoutProgressTracker
          key={`workout-tracker-${activeWorkout.templateId}-${new Date(activeWorkout.startedAt).getTime()}`}
          template={activeWorkout.modifiedTemplate || template.workoutData}
          onSessionUpdate={updateWorkout}
          onTemplateModified={handleTemplateModification}
          initialExerciseProgress={activeWorkout.exerciseProgress}
          useMetric={profile?.useMetric}
        />
      )}

      {hasActiveWorkout && !showCrossTemplateConfirm && (
        <div className="mt-4 space-y-4">
          <SessionNotesCard disabled={isSaving} notesRef={sessionNotesRef} />
          {/* On phones Discard lives here, away from Finish: side by side in
              the control bar they were one slipped thumb apart. */}
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="tap-control w-full rounded-lg py-3 text-sm font-medium text-danger-600 transition-colors hover:bg-danger-500/10 dark:text-danger-400 sm:hidden"
          >
            Discard workout
          </button>
        </div>
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
        title="You changed this workout"
        subtitle="Added or removed exercises or sets. Your session is logged either way."
        maxWidth="max-w-md"
      >
        {/*
          Two answers to the one real question — should the template change? A
          third option ("keep original template values") swapped the stored
          snapshot back to the unmodified template while the performance still
          held the added exercises, so the logged session described itself
          inconsistently. It and "log new values only" did the same thing to the
          template, which is what the user was actually being asked about.
        */}
        <div className="space-y-2">
          <button
            onClick={() => performCompletion({ useModifiedTemplate: true, saveTemplate: 'update' })}
            disabled={isSaving}
            className="tap-control w-full rounded-lg bg-accent-500 px-4 py-3 text-left text-white transition-colors hover:bg-accent-600 disabled:opacity-60"
          >
            <span className="block text-sm font-semibold">Update “{template.name}”</span>
            <span className="mt-0.5 block text-xs text-white/80">Next time starts with today&apos;s changes</span>
          </button>
          <button
            onClick={() => performCompletion({ useModifiedTemplate: true, saveTemplate: 'none' })}
            disabled={isSaving}
            className="tap-control w-full rounded-lg border border-black/10 px-4 py-3 text-left transition-colors hover:bg-black/[0.03] disabled:opacity-60 dark:border-white/10 dark:hover:bg-white/[0.04]"
          >
            <span className="block text-sm font-semibold text-surface-50 dark:text-white">Keep the template as it was</span>
            <span className="mt-0.5 block text-xs text-surface-500 dark:text-surface-600">Today&apos;s changes apply to this session only</span>
          </button>
          <button
            onClick={() => setShowCompletionPrompt(false)}
            className="tap-control w-full rounded-lg px-4 py-2.5 text-sm font-medium text-surface-500 transition-colors hover:text-surface-50 dark:text-surface-600 dark:hover:text-white"
          >
            Back to workout
          </button>
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

      <ConfirmDialog
        open={showCrossTemplateConfirm}
        title="Another workout is in progress"
        message={`You have "${activeWorkout?.templateName || 'a workout'}" in progress. Discard it and start "${template.name}" instead, or go back to it.`}
        confirmLabel={`Discard & start ${template.name}`}
        cancelLabel="Go to workout in progress"
        destructive
        onConfirm={handleDiscardAndSwitch}
        onCancel={handleKeepCurrentWorkout}
      />
    </>
  );
}
