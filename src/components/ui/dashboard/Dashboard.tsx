'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { StreakCard } from './StreakCard';
import { ProgressCard } from './ProgressCard';
import { RecentActivityCard } from './RecentActivityCard';
import { StatsCard } from './StatsCard';
import { QuickActionsCard } from './QuickActionsCard';
import { DashboardSkeletonLoader } from './DashboardSkeletonLoader';
import { useDashboardData } from '@/lib/hooks/useDashboardData';
import { UpcomingWorkoutsCard } from './UpcomingWorkoutsCard';
import { useDashboardConfig } from '@/lib/hooks/useDashboardConfig';
import DashboardSettingsModal from './DashboardSettingsModal';
import { useProfile } from '@/lib/hooks/useProfile';
import { PlusIcon, PlayIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

const springSnappy = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
  mass: 0.8,
};

const springGentle = {
  type: 'spring' as const,
  stiffness: 200,
  damping: 25,
  mass: 0.9,
};

function Greeting({ firstName }: { firstName: string }) {
  const prefersReducedMotion = useReducedMotion();
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <motion.div
      initial={
        prefersReducedMotion
          ? {}
          : { opacity: 0, y: 20, scale: 0.97 }
      }
      animate={
        prefersReducedMotion
          ? {}
          : { opacity: 1, y: 0, scale: 1 }
      }
      transition={{ ...springGentle, delay: 0.05 }}
      className="relative overflow-hidden rounded-lg"
    >
      <div className="absolute inset-0 greeting-gradient" />

      <div
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.08]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {!prefersReducedMotion && (
        <>
          <motion.div
            className="absolute w-64 h-64 rounded-full bg-white/10 -top-20 -right-20"
            animate={{
              x: [0, 30, 0],
              y: [0, -20, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute w-48 h-48 rounded-full bg-white/5 bottom-0 left-1/4"
            animate={{
              x: [0, -20, 0],
              y: [0, 15, 0],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1,
            }}
          />
        </>
      )}

      <div className="relative z-10 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <motion.h1
              className="text-3xl sm:text-4xl font-display font-bold text-white tracking-wide"
              initial={
                prefersReducedMotion
                  ? {}
                  : { opacity: 0, x: -20 }
              }
              animate={
                prefersReducedMotion
                  ? {}
                  : { opacity: 1, x: 0 }
              }
              transition={{ ...springSnappy, delay: 0.15 }}
            >
              WELCOME BACK, {firstName.toUpperCase()}
            </motion.h1>
            <motion.p
              className="text-forge-100 mt-1"
              initial={
                prefersReducedMotion
                  ? {}
                  : { opacity: 0, x: -20 }
              }
              animate={
                prefersReducedMotion
                  ? {}
                  : { opacity: 1, x: 0 }
              }
              transition={{ ...springSnappy, delay: 0.2 }}
            >
              {dateStr}
            </motion.p>
          </div>
          <motion.div
            className="flex items-center gap-3"
            initial={
              prefersReducedMotion
                ? {}
                : { opacity: 0, x: 20 }
            }
            animate={
              prefersReducedMotion
                ? {}
                : { opacity: 1, x: 0 }
            }
            transition={{ ...springSnappy, delay: 0.25 }}
          >
            <Link
              href="/templates"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-forge-700 text-sm font-display font-bold tracking-wide uppercase rounded-lg hover:bg-forge-50 transition-colors shadow-sm"
            >
              <PlayIcon className="w-4 h-4" />
              Start Workout
            </Link>
            <Link
              href="/template/create"
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-white/30 text-white text-sm font-display font-semibold tracking-wide uppercase rounded-lg hover:bg-white/10 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              New Template
            </Link>
            <button
              onClick={() => {
                const event = new CustomEvent('open-dashboard-settings');
                window.dispatchEvent(event);
              }}
              className="p-2.5 border border-white/30 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              title="Dashboard Settings"
            >
              <Cog6ToothIcon className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

const cardSpringVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 350,
      damping: 28,
      mass: 0.8,
      delay: i * 0.06,
    },
  }),
};

export default function Dashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { data, loading, error, refetch } = useDashboardData();
  const { config, saveConfig, isLoading: configLoading } = useDashboardConfig();
  const { profile, isLoading: profileLoading } = useProfile();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handler = () => setShowSettings(true);
    window.addEventListener('open-dashboard-settings', handler);
    return () => window.removeEventListener('open-dashboard-settings', handler);
  }, []);

  useEffect(() => {
    if (!mounted || profileLoading) return;
    if (profile === null) {
      router.replace('/profile/setup');
      return;
    }
    if (
      profile &&
      (profile.name == null ||
        profile.age == null ||
        profile.weight == null ||
        profile.height == null)
    ) {
      router.replace('/profile/setup');
    }
  }, [mounted, profileLoading, profile, router]);

  if (!mounted || loading || configLoading || profileLoading || !data) {
    return <DashboardSkeletonLoader />;
  }

  if (error) {
    return (
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
        animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
        transition={springSnappy}
        className="flex flex-col items-center justify-center min-h-[60vh] px-4"
      >
        <div className="forge-card p-8 max-w-md text-center">
          <h2 className="text-lg font-display font-bold text-ember-500 mb-2 tracking-wide uppercase">
            Error Loading Dashboard
          </h2>
          <p className="text-surface-500 dark:text-surface-600 text-sm mb-4">
            {error.message}
          </p>
          <motion.button
            onClick={() => refetch()}
            className="btn btn-primary"
            whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
            transition={springSnappy}
          >
            Try Again
          </motion.button>
        </div>
      </motion.div>
    );
  }

  const enabledTiles = config.tiles
    .filter((tile) => tile.enabled)
    .sort((a, b) => a.order - b.order);

  const firstName = profile?.name?.split(' ')[0] || 'Champion';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTile = (componentName: string, data: any) => {
    switch (componentName) {
      case 'StreakCard':
        return <StreakCard streak={data.streak} activityData={data.activityData} />;
      case 'ProgressCard':
        return <ProgressCard data={data.progress} />;
      case 'RecentActivityCard':
        return <RecentActivityCard activities={data.recentActivity} />;
      case 'UpcomingWorkoutsCard':
        return <UpcomingWorkoutsCard sessions={data.upcomingWorkouts} />;
      case 'StatsCard':
        return <StatsCard data={data.stats} />;
      case 'QuickActionsCard':
        return <QuickActionsCard />;
      default:
        return null;
    }
  };

  return (
    <div className="pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        <div className="mb-8">
          <Greeting firstName={firstName} />
        </div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial="hidden"
          animate="visible"
          variants={
            prefersReducedMotion
              ? {}
              : {
                  visible: {
                    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
                  },
                }
          }
        >
          {enabledTiles.map((tile, i) => (
            <motion.div
              key={tile.id}
              variants={prefersReducedMotion ? {} : cardSpringVariants}
              custom={i}
              whileHover={
                prefersReducedMotion
                  ? {}
                  : { y: -4, transition: springSnappy }
              }
              className="h-full"
            >
              <div className="h-full">
                {renderTile(tile.component, data)}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <DashboardSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        currentConfig={config}
        onSave={saveConfig}
      />
    </div>
  );
}
