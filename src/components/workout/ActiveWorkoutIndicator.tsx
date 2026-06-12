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
  const prefersReducedMotion = useReducedMotion();

  if (!hasActiveWorkout || !activeWorkout) return null;

  const time = formatWorkoutDuration;

  const handleContinue = () =>
    router.push(`/session/active/${activeWorkout.templateId}`);
  const handleEnd = () => {
    if (confirm('End this workout? All progress will be lost.')) {
      endWorkout();
    }
  };

  return (
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
        className="sticky top-16 z-30 bg-emerald-600 text-white overflow-hidden"
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
                <span className="flex items-center gap-1.5 text-emerald-100 text-sm">
                  <ClockIcon className="w-3.5 h-3.5" />
                  <span className="font-mono">{time}</span>
                </span>
              </button>
              <div className="flex items-center gap-1.5">
                <motion.button
                  onClick={handleContinue}
                  className="px-3 py-1 text-sm font-medium bg-white/15 hover:bg-white/20 rounded-lg transition-colors"
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
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.span
                  className="w-2 h-2 bg-white rounded-full"
                  animate={
                    prefersReducedMotion
                      ? {}
                      : { opacity: [1, 0.3, 1] }
                  }
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <div>
                  <p className="font-medium text-sm">Active Workout</p>
                  <p className="text-emerald-100 text-xs">
                    {activeWorkout.templateName}
                  </p>
                </div>
                <span className="flex items-center gap-1.5 bg-white/15 rounded-lg px-2.5 py-1 text-sm">
                  <ClockIcon className="w-3.5 h-3.5" />
                  <span className="font-mono font-medium">{time}</span>
                </span>
                {isTimerActive ? (
                  <span className="flex items-center gap-1 text-emerald-100 text-xs">
                    <PlayCircleIcon className="w-3.5 h-3.5" />
                    In Progress
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-yellow-200 text-xs">
                    <PauseCircleIcon className="w-3.5 h-3.5" />
                    Paused
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  onClick={handleContinue}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-emerald-700 text-sm font-medium rounded-lg hover:bg-forge-50 transition-colors"
                  whileHover={
                    prefersReducedMotion ? {} : { scale: 1.05 }
                  }
                  whileTap={
                    prefersReducedMotion ? {} : { scale: 0.95 }
                  }
                  transition={springSnappy}
                >
                  Continue
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </motion.button>
                <motion.button
                  onClick={() => setMinimized(true)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  whileHover={
                    prefersReducedMotion ? {} : { scale: 1.1 }
                  }
                  whileTap={
                    prefersReducedMotion ? {} : { scale: 0.9 }
                  }
                  transition={springSnappy}
                  title="Minimize"
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
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  whileHover={
                    prefersReducedMotion ? {} : { scale: 1.1 }
                  }
                  whileTap={
                    prefersReducedMotion ? {} : { scale: 0.9 }
                  }
                  transition={springSnappy}
                  title="End workout"
                >
                  <XMarkIcon className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
