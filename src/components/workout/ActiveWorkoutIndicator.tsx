'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlayCircleIcon,
  PauseCircleIcon,
  ClockIcon,
  XMarkIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { useActiveWorkout } from '@/lib/hooks/useActiveWorkout';

export default function ActiveWorkoutIndicator() {
  const router = useRouter();
  const { activeWorkout, formatWorkoutDuration, hasActiveWorkout, endWorkout, isTimerActive } = useActiveWorkout();
  const [isMinimized, setIsMinimized] = useState(false);

  // formatWorkoutDuration is now the live-updating time string
  const currentTime = formatWorkoutDuration;

  if (!hasActiveWorkout || !activeWorkout) {
    return null;
  }

  const handleContinueWorkout = () => {
    router.push(`/session/active/${activeWorkout.templateId}`);
  };

  const handleEndWorkout = () => {
    if (confirm('Are you sure you want to end this workout? All progress will be lost.')) {
      endWorkout();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -100 }}
        className="fixed top-16 left-0 right-0 z-30 bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg"
      >
        <div className="max-w-7xl mx-auto px-4 py-3">
          <AnimatePresence mode="wait">
            {isMinimized ? (
              <motion.div
                key="minimized"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between"
              >
                <button
                  onClick={() => setIsMinimized(false)}
                  className="flex items-center gap-3 hover:bg-white/10 rounded-lg px-3 py-2 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                    <span className="font-semibold">Active Workout</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-100">
                    <ClockIcon className="w-4 h-4" />
                    <span className="font-mono text-sm">{currentTime}</span>
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleContinueWorkout}
                    className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                  >
                    Continue
                  </button>
                  <button
                    onClick={handleEndWorkout}
                    className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="expanded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                    <div>
                      <div className="font-semibold">Active Workout</div>
                      <div className="text-green-100 text-sm">{activeWorkout.templateName}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                    <ClockIcon className="w-4 h-4" />
                    <span className="font-mono font-semibold">{currentTime}</span>
                  </div>
                  {isTimerActive ? (
                    <div className="flex items-center gap-2 text-green-100">
                      <PlayCircleIcon className="w-4 h-4" />
                      <span className="text-sm">In Progress</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-yellow-200">
                      <PauseCircleIcon className="w-4 h-4" />
                      <span className="text-sm">Paused</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleContinueWorkout}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-green-600 rounded-lg hover:bg-green-50 transition-colors font-semibold"
                  >
                    Continue Workout
                    <ArrowRightIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsMinimized(true)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    title="Minimize"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <button
                    onClick={handleEndWorkout}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    title="End workout"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
