'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ForwardIcon,
  MinusIcon,
  PlusIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
} from '@heroicons/react/24/solid';
import { useRestTimer } from './RestTimerProvider';

/**
 * Floating rest countdown.
 *
 * Sits above the home indicator and stays reachable one-handed: the controls
 * are in the bottom third of the screen because that is where a thumb is while
 * you are holding a phone between sets.
 */

const RING_SIZE = 56;
const RING_STROKE = 4;
const RADIUS = (RING_SIZE - RING_STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function formatRest(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function RestTimerBar() {
  const { remaining, total, isRunning, label, adjust, skip, soundEnabled, setSoundEnabled } =
    useRestTimer();
  const prefersReducedMotion = useReducedMotion();

  const isFinished = remaining === 0;
  const progress = total && remaining !== null ? remaining / total : 0;

  return (
    <AnimatePresence>
      {isRunning && remaining !== null && (
        <motion.div
          // `x: '-50%'` rather than a `-translate-x-1/2` class — motion's inline
          // transform would override the utility and push the bar off-screen.
          initial={{ opacity: 0, y: 40, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 40, x: '-50%' }}
          transition={
            prefersReducedMotion
              ? { duration: 0.15 }
              : { type: 'spring', stiffness: 320, damping: 28 }
          }
          role="timer"
          aria-live="off"
          aria-label={
            isFinished ? 'Rest complete' : `Rest timer, ${remaining} seconds remaining`
          }
          className="fixed left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-md"
          // Sits above the mobile bottom nav rather than behind it.
          style={{ bottom: 'calc(1rem + var(--bottom-nav-total))' }}
        >
          <div
            className={`flex items-center gap-3 rounded-2xl border px-3 py-3 shadow-xl shadow-black/40 backdrop-blur-md transition-colors ${
              isFinished
                ? 'border-success-400/50 bg-success-600/95'
                : 'border-accent-500/30 bg-white/95 dark:bg-surface-100/95'
            }`}
          >
            {/* Countdown ring */}
            <div className="relative shrink-0" style={{ width: RING_SIZE, height: RING_SIZE }}>
              <svg
                width={RING_SIZE}
                height={RING_SIZE}
                className="-rotate-90"
                aria-hidden="true"
              >
                <circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  strokeWidth={RING_STROKE}
                  className={isFinished ? 'stroke-white/25' : 'stroke-surface-900 dark:stroke-surface-300'}
                />
                <circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  strokeWidth={RING_STROKE}
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
                  className={isFinished ? 'stroke-white' : 'stroke-accent-500'}
                  style={{ transition: 'stroke-dashoffset 250ms linear' }}
                />
              </svg>
              <span
                className={`absolute inset-0 flex items-center justify-center font-display text-sm tabular ${
                  isFinished ? 'text-white' : 'text-surface-50 dark:text-white'
                }`}
              >
                {isFinished ? '✓' : formatRest(remaining)}
              </span>
            </div>

            {/* Label */}
            <div className="min-w-0 flex-1">
              <p
                className={`font-display text-xs uppercase tracking-wider ${
                  isFinished ? 'text-success-100' : 'text-accent-400'
                }`}
              >
                {isFinished ? 'Rest complete' : 'Resting'}
              </p>
              {label && (
                <p
                  className={`truncate text-sm ${
                    isFinished ? 'text-white' : 'text-surface-600 dark:text-surface-800'
                  }`}
                >
                  Next: {label}
                </p>
              )}
            </div>

            {/* Controls — hidden once finished, when they'd do nothing useful */}
            {!isFinished && (
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => adjust(-15)}
                  aria-label="Subtract 15 seconds"
                  className="touch-target tap-control flex items-center justify-center rounded-lg text-surface-600 transition-colors hover:bg-surface-950 hover:text-surface-50 dark:text-surface-700 dark:hover:bg-surface-200 dark:hover:text-white"
                >
                  <MinusIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => adjust(15)}
                  aria-label="Add 15 seconds"
                  className="touch-target tap-control flex items-center justify-center rounded-lg text-surface-600 transition-colors hover:bg-surface-950 hover:text-surface-50 dark:text-surface-700 dark:hover:bg-surface-200 dark:hover:text-white"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  aria-label={soundEnabled ? 'Mute rest timer' : 'Unmute rest timer'}
                  aria-pressed={soundEnabled}
                  className="touch-target tap-control flex items-center justify-center rounded-lg text-surface-600 transition-colors hover:bg-surface-950 hover:text-surface-50 dark:text-surface-700 dark:hover:bg-surface-200 dark:hover:text-white"
                >
                  {soundEnabled ? (
                    <SpeakerWaveIcon className="h-4 w-4" />
                  ) : (
                    <SpeakerXMarkIcon className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={skip}
                  aria-label="Skip rest"
                  className="touch-target tap-control flex items-center justify-center rounded-lg bg-accent-500 px-3 text-white transition-colors hover:bg-accent-600"
                >
                  <ForwardIcon className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
