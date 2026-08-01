'use client';

import { motion, useReducedMotion } from 'framer-motion';

const springGentle = { type: 'spring' as const, stiffness: 200, damping: 25, mass: 0.9 };

export function ProfileSkeleton() {
  const prefersReducedMotion = useReducedMotion();
  const noMotion = prefersReducedMotion ?? false;

  return (
    <div className="bg-surface-950 dark:bg-surface-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <style>{`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          .skeleton-shimmer {
            background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%);
            background-size: 200% 100%;
            animation: shimmer 1.8s infinite;
          }
          .dark .skeleton-shimmer {
            background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%);
            background-size: 200% 100%;
            animation: shimmer 1.8s infinite;
          }
        `}</style>

        {/* Back button skeleton */}
        <div className="mb-6">
          <div className="h-10 w-32 bg-surface-700 dark:bg-surface-200 rounded-lg overflow-hidden relative">
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
        </div>

        {/* Profile header skeleton */}
        <motion.div
          initial={noMotion ? {} : { opacity: 0, y: 12 }}
          animate={noMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ ...springGentle, delay: noMotion ? 0 : 0.05 }}
          className="forge-card overflow-hidden mb-8"
        >
          <div className="bg-gradient-to-br from-surface-300 to-surface-400 dark:from-surface-400 dark:to-surface-500 px-8 py-12 relative overflow-hidden">
            <div className="absolute inset-0 skeleton-shimmer" />
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-surface-900 dark:bg-surface-600 rounded-full relative overflow-hidden">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
                <div>
                  <div className="h-10 w-48 bg-surface-900 dark:bg-surface-600 rounded-lg relative overflow-hidden mb-2">
                    <div className="absolute inset-0 skeleton-shimmer" />
                  </div>
                  <div className="h-4 w-32 bg-surface-900 dark:bg-surface-600 rounded relative overflow-hidden mb-1">
                    <div className="absolute inset-0 skeleton-shimmer" />
                  </div>
                  <div className="h-3 w-40 bg-surface-900 dark:bg-surface-600 rounded relative overflow-hidden">
                    <div className="absolute inset-0 skeleton-shimmer" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 h-20 bg-surface-900 dark:bg-surface-600 rounded-xl relative overflow-hidden">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
                <div className="w-12 h-12 bg-surface-900 dark:bg-surface-600 rounded-xl relative overflow-hidden">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-6 relative">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-8 w-20 bg-surface-900 dark:bg-surface-600 rounded-full relative overflow-hidden">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
              ))}
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 bg-surface-700 dark:bg-surface-200 rounded-lg relative overflow-hidden">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Stats overview skeleton */}
        <div className="mb-8">
          <div className="h-8 w-48 bg-surface-700 dark:bg-surface-200 rounded-lg relative overflow-hidden mb-6">
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <motion.div
                key={i}
                initial={noMotion ? {} : { opacity: 0, y: 12 }}
                animate={noMotion ? {} : { opacity: 1, y: 0 }}
                transition={{ ...springGentle, delay: noMotion ? 0 : 0.05 + i * 0.04 }}
                className="forge-card p-6"
              >
                <div className="h-2 bg-surface-700 dark:bg-surface-200 rounded-full relative overflow-hidden mb-4">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="h-4 w-24 bg-surface-700 dark:bg-surface-200 rounded relative overflow-hidden mb-2">
                      <div className="absolute inset-0 skeleton-shimmer" />
                    </div>
                    <div className="h-8 w-16 bg-surface-700 dark:bg-surface-200 rounded relative overflow-hidden">
                      <div className="absolute inset-0 skeleton-shimmer" />
                    </div>
                  </div>
                  <div className="w-14 h-14 bg-surface-700 dark:bg-surface-200 rounded-xl relative overflow-hidden">
                    <div className="absolute inset-0 skeleton-shimmer" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Content grid skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              initial={noMotion ? {} : { opacity: 0, y: 12 }}
              animate={noMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ ...springGentle, delay: noMotion ? 0 : 0.1 + i * 0.05 }}
              className="forge-card p-6"
            >
              <div className="h-6 w-32 bg-surface-700 dark:bg-surface-200 rounded relative overflow-hidden mb-6">
                <div className="absolute inset-0 skeleton-shimmer" />
              </div>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="flex items-center justify-between p-4 bg-surface-950 dark:bg-surface-200/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-surface-900 dark:bg-surface-600 rounded-lg relative overflow-hidden">
                        <div className="absolute inset-0 skeleton-shimmer" />
                      </div>
                      <div>
                        <div className="h-4 w-24 bg-surface-900 dark:bg-surface-600 rounded relative overflow-hidden mb-1">
                          <div className="absolute inset-0 skeleton-shimmer" />
                        </div>
                        <div className="h-3 w-16 bg-surface-900 dark:bg-surface-600 rounded relative overflow-hidden">
                          <div className="absolute inset-0 skeleton-shimmer" />
                        </div>
                      </div>
                    </div>
                    <div className="h-4 w-12 bg-surface-900 dark:bg-surface-600 rounded relative overflow-hidden">
                      <div className="absolute inset-0 skeleton-shimmer" />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Favorite templates skeleton */}
        <div className="mb-8">
          <div className="h-8 w-48 bg-surface-700 dark:bg-surface-200 rounded-lg relative overflow-hidden mb-6">
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
          <div className="forge-card p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-surface-700 dark:bg-surface-200 rounded-xl relative overflow-hidden">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
