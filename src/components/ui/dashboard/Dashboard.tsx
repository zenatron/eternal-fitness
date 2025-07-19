'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardHeader } from './DashboardHeader';
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
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import { useProfile } from '@/lib/hooks/useProfile';

export default function Dashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { data, loading, error, refetch } = useDashboardData();
  const { config, saveConfig, isLoading: configLoading } = useDashboardConfig();
  const { profile, isLoading: profileLoading } = useProfile();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Profile setup redirect logic
  useEffect(() => {
    // Only perform checks after initial loading is done and we're mounted
    if (mounted && !profileLoading) {
      // If profile is null (not found), redirect to setup
      if (profile === null) {
        router.replace('/profile/setup');
        return;
      }

      // If profile exists but is incomplete, redirect to setup
      if (profile && (
        profile.name == null ||
        profile.age == null ||
        profile.weight == null ||
        profile.height == null
      )) {
        router.replace('/profile/setup');
      }
    }
  }, [mounted, profileLoading, profile, router]);

  if (!mounted || loading || configLoading || profileLoading || !data) {
    return <DashboardSkeletonLoader />;
  }

  if (error) {
    return (
      <div className="min-h-screen app-bg flex flex-col items-center justify-center px-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 max-w-md">
          <h2 className="text-xl font-bold text-red-500 mb-4">
            Error Loading Dashboard
          </h2>
          <p className="text-secondary">{error.message}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Component mapping for dynamic rendering
  const componentMap = {
    StreakCard: () => <StreakCard streak={data.streak} activityData={data.activityData} />,
    ProgressCard: () => <ProgressCard data={data.progress} />,
    RecentActivityCard: () => <RecentActivityCard activities={data.recentActivity} />,
    UpcomingWorkoutsCard: () => <UpcomingWorkoutsCard sessions={data.upcomingWorkouts} />,
    StatsCard: () => <StatsCard data={data.stats} />,
    QuickActionsCard: () => <QuickActionsCard />,
  };

  // Get enabled tiles sorted by order
  const enabledTiles = (config?.tiles || [])
    .filter(tile => tile.enabled)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
      <div className="w-full max-w-7xl mx-auto px-4 pt-8">
        {/* Enhanced Dashboard Header */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 px-8 py-8 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Welcome back! 👋</h1>
                  <p className="text-blue-100">
                    Ready to crush your fitness goals today?
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShowSettings(true)}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    title="Dashboard Settings"
                  >
                    <Cog6ToothIcon className="h-6 w-6 text-white" />
                  </button>
                  <div className="hidden md:block">
                    <div className="text-right">
                      <p className="text-blue-100 text-sm">Today</p>
                      <p className="text-xl font-semibold">
                        {new Date().toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enabledTiles.map((tile) => {
            const Component = componentMap[tile.component as keyof typeof componentMap];
            return Component ? (
              <div key={tile.id}>
                {Component()}
              </div>
            ) : null;
          })}
        </div>
      </div>

      {/* Dashboard Settings Modal */}
      <DashboardSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        currentConfig={config}
        onSave={saveConfig}
      />
    </div>
  );
}
