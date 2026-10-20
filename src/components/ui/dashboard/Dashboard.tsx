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
import LevelCard from './LevelCard';
import { DashboardSkeletonLoader } from './DashboardSkeletonLoader';
import { useDashboardData } from '@/lib/hooks/useDashboardData';
import { UpcomingWorkoutsCard } from './UpcomingWorkoutsCard';
import { useDashboardConfig } from '@/lib/hooks/useDashboardConfig';
import DashboardSettingsModal from './DashboardSettingsModal';
import { useProfile } from '@/lib/hooks/useProfile';
import { ErrorState } from '@/components/ui/ErrorState';
import { PlayIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/ui/PageHeader';

/**
 * A plain header — the date, a greeting, and the two ways to train. It used to
 * be an animated gradient banner with floating circles and a dot pattern, the
 * same orange slab every other page opened with.
 */
function Greeting({ firstName }: { firstName: string }) {
  /*
   * Formatted on both server and client, which disagree: the container runs in
   * UTC while the browser uses the viewer's timezone, so either side of
   * midnight they produce different dates. The client value is the correct
   * one; suppressHydrationWarning lets it replace the server's silently.
   */
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <PageHeader
      eyebrow={dateStr}
      title={`Hey, ${firstName}`}
      actions={
        <>
          <Link href="/templates" className="btn btn-primary min-h-[44px] flex-1 px-5 sm:flex-none">
            <PlayIcon className="h-4 w-4" />
            Start workout
          </Link>
          <Link href="/session/log" className="btn btn-tertiary min-h-[44px] flex-1 sm:flex-none">
            Log past
          </Link>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-dashboard-settings'))}
            className="btn btn-tertiary touch-target !px-0"
            aria-label="Customize dashboard"
            title="Customize dashboard"
          >
            <Cog6ToothIcon className="h-5 w-5" />
          </button>
        </>
      }
    />
  );
}

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

  // Error must be checked BEFORE the data gate: useDashboardData leaves
  // `data` undefined on a failed fetch, so gating on `!data` first rendered a
  // shimmering skeleton forever — precisely the offline cold-start case the
  // error card with "Try Again" below was built for.
  if (!mounted || (error && !data)) {
    if (!mounted || loading || configLoading || profileLoading) {
      return <DashboardSkeletonLoader />;
    }
    return (
      <div className="mx-auto max-w-md px-4 pt-16">
        <ErrorState what="your dashboard" onRetry={() => refetch()} />
      </div>
    );
  }

  if (!mounted || loading || configLoading || profileLoading || !data) {
    return <DashboardSkeletonLoader />;
  }

  const enabledTiles = config.tiles
    .filter((tile) => tile.enabled)
    .sort((a, b) => a.order - b.order);

  const firstName = profile?.name?.split(' ')[0] || 'there';

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
      case 'LevelCard':
        return <LevelCard totalPoints={data.totalPoints} />;
      default:
        return null;
    }
  };

  return (
    <div className="pb-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Greeting firstName={firstName} />

        {/* One quick fade for the grid as a whole. Each tile used to spring in
            on its own staggered scale-up and lift on hover — motion on every
            card, every visit, for content that is just numbers. */}
        <motion.div
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
        >
          {enabledTiles.map((tile) => (
            <div key={tile.id} className="h-full">
              {renderTile(tile.component, data)}
            </div>
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
