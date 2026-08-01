'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  PlayCircleIcon,
  PauseCircleIcon,
  ClockIcon,
  XMarkIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { useActiveWorkout } from '@/lib/hooks/useActiveWorkout';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const springSnappy = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
};

export default function ActiveWorkoutIndicator() {
  const router = useRouter();
  const {
    activeWorkout,
    formatWorkoutDuration,
    hasActiveWorkout,
    endWorkout,
    isTimerActive,
  } = useActiveWorkout();
  const [minimized, setMinimized] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  if (!hasActiveWorkout || !activeWorkout) return null;

  const time = formatWorkoutDuration;

  const handleContinue = () =>
    router.push(`/session/active/${activeWorkout.templateId}`);
  // Was a native confirm(), which blocks the main thread — freezing the very
  // timer this bar is displaying — and cannot be styled.
  const handleEnd = () => setShowEndConfirm(true);

  return (
    <>
      <AnimatePresence>
        <motion.div
        initial={
          prefersReducedMotion
            ? {}
            : { opacity: 0, y: -16, height: 0 }
        }
        animate={
          prefersReducedMotion
            ? {}
            : { opacity: 1, y: 0, height: 'auto' }
        }
        exit={
          prefersReducedMotion
            ? {}
            : { opacity: 0, y: -16, height: 0 }
        }
        transition={springSnappy}
        className="overflow-hidden border-b border-accent-700/40 bg-gradient-to-r from-accent-600 to-accent-700 text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5">
          {minimized ? (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setMinimized(false)}
                className="flex items-center gap-3 hover:bg-white/10 rounded-lg px-3 py-1.5 transition-colors"
              >
                <motion.span
                  className="w-2 h-2 bg-white rounded-full"
                  animate={
                    prefersReducedMotion
                      ? {}
                      : { opacity: [1, 0.4, 1] }
                  }
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="font-medium text-sm">Active Workout</span>
                <span className="flex items-center gap-1.5 text-accent-100 text-sm">
                  <ClockIcon className="w-3.5 h-3.5" />
                  <span className="font-mono">{time}</span>
                </span>
              </button>
              <div className="flex items-center gap-1.5">
                <motion.button
                  onClick={handleContinue}
                  className="px-4 min-h-[40px] text-sm font-medium bg-white/15 hover:bg-white/20 rounded-lg transition-colors tap-control"
                  whileHover={
                    prefersReducedMotion ? {} : { scale: 1.05 }
                  }
                  whileTap={
                    prefersReducedMotion ? {} : { scale: 0.95 }
                  }
                  transition={springSnappy}
                >
                  Continue
                </motion.button>
                <motion.button
                  onClick={handleEnd}
                  aria-label="End workout"
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors touch-target flex items-center justify-center tap-control"
                  whileHover={
                    prefersReducedMotion ? {} : { scale: 1.1 }
                  }
                  whileTap={
                    prefersReducedMotion ? {} : { scale: 0.9 }
                  }
                  transition={springSnappy}
                >
                  <XMarkIcon className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          ) : (
            /* Six items in one flex row was unworkable at phone width: the
               template name wrapped mid-word ("Chestand Tri") and the status
               text collapsed into a two-line stack. The name now truncates,
               the secondary status is desktop-only, and everything else is
               shrink-0 so the row degrades predictably. */
            <div className="flex items-center gap-2.5 sm:gap-4">
              <motion.span
                className="w-2 h-2 shrink-0 bg-white rounded-full"
                animate={
                  prefersReducedMotion
                    ? {}
                    : { opacity: [1, 0.3, 1] }
                }
                transition={{ duration: 1.5, repeat: Infinity }}
              />

              <div className="min-w-0 flex-1">
                {/* The "Active Workout" label is redundant on a bright green
                    bar with a live timer, and at phone width it wrapped onto
                    two lines. The template name is what the user actually
                    needs, so on mobile it is the only line. */}
                <p className="hidden text-sm font-medium leading-tight sm:block">
                  Active Workout
                </p>
                <p className="truncate text-sm leading-tight text-white sm:text-xs sm:text-accent-100">
                  {activeWorkout.templateName}
                </p>
              </div>

              <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1 text-sm">
                <ClockIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="font-mono font-medium tabular">{time}</span>
              </span>

              {/* Status duplicates what the timer already conveys, so it is the
                  first thing dropped when space is tight. */}
              {isTimerActive ? (
                <span className="hidden shrink-0 items-center gap-1 text-xs text-accent-100 md:flex">
                  <PlayCircleIcon className="w-3.5 h-3.5" />
                  In Progress
                </span>
              ) : (
                <span className="hidden shrink-0 items-center gap-1 text-xs text-award-200 md:flex">
                  <PauseCircleIcon className="w-3.5 h-3.5" />
                  Paused
                </span>
              )}

              <div className="flex shrink-0 items-center gap-1">
                <motion.button
                  onClick={handleContinue}
                  className="flex min-h-[36px] items-center gap-1.5 rounded-lg bg-white px-3 text-sm font-medium text-accent-700 transition-colors hover:bg-accent-50 tap-control"
                  whileHover={
                    prefersReducedMotion ? {} : { scale: 1.05 }
                  }
                  whileTap={
                    prefersReducedMotion ? {} : { scale: 0.95 }
                  }
                  transition={springSnappy}
                >
                  Continue
                  <ArrowRightIcon className="w-3.5 h-3.5 shrink-0" />
                </motion.button>
                <motion.button
                  onClick={() => setMinimized(true)}
                  className="hidden touch-target items-center justify-center rounded-lg transition-colors hover:bg-white/10 tap-control sm:flex"
                  whileHover={
                    prefersReducedMotion ? {} : { scale: 1.1 }
                  }
                  whileTap={
                    prefersReducedMotion ? {} : { scale: 0.9 }
                  }
                  transition={springSnappy}
                  aria-label="Minimize"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 12H4"
                    />
                  </svg>
                </motion.button>
                <motion.button
                  onClick={handleEnd}
                  aria-label="End workout"
                  className="touch-target flex items-center justify-center rounded-lg transition-colors hover:bg-white/10 tap-control"
                  whileHover={
                    prefersReducedMotion ? {} : { scale: 1.1 }
                  }
                  whileTap={
                    prefersReducedMotion ? {} : { scale: 0.9 }
                  }
                  transition={springSnappy}
                >
                  <XMarkIcon className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          )}
        </div>
        </motion.div>
      </AnimatePresence>

      <ConfirmDialog
        open={showEndConfirm}
        title="Discard this workout?"
        message="Every set you've logged in this session will be deleted. This can't be undone."
        confirmLabel="Discard"
        cancelLabel="Keep training"
        destructive
        onConfirm={() => {
          setShowEndConfirm(false);
          void endWorkout();
        }}
        onCancel={() => setShowEndConfirm(false)}
      />
    </>
  );
}
