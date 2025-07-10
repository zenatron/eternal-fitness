'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  UserCircleIcon,
  CalendarDaysIcon,
  TrophyIcon,
  ArrowLeftIcon,
  Cog6ToothIcon,
  ArrowRightStartOnRectangleIcon,
  ScaleIcon,
  BoltIcon,
  SparklesIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

import { SignedIn } from '@clerk/nextjs';
import SavedWorkouts from '@/components/ui/FavoriteWorkouts';
import { useProfile } from '@/lib/hooks/useProfile';
import { useUserStats } from '@/lib/hooks/useUserStats';
import { SignOutButton } from '@clerk/nextjs';

// Import new profile components
import { StatsOverview } from '@/components/ui/profile/StatsOverview';
import { RecentActivity } from '@/components/ui/profile/RecentActivity';
import { PersonalRecords } from '@/components/ui/profile/PersonalRecords';
import { TopExercises } from '@/components/ui/profile/TopExercises';
import { Achievements } from '@/components/ui/profile/Achievements';

// Import modals
import { PersonalRecordsModal } from '@/components/modals/PersonalRecordsModal';
import { TopExercisesModal } from '@/components/modals/TopExercisesModal';
import { RecentActivityModal } from '@/components/modals/RecentActivityModal';
import { AchievementsModal } from '@/components/modals/AchievementsModal';
import { MonthlyProgress } from '@/components/ui/profile/MonthlyProgress';
import { ProfileSkeleton } from '@/components/ui/profile/ProfileSkeleton';

export default function Profile() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, isLoading, error } = useProfile();
  const { stats, isLoading: statsLoading, error: statsError } = useUserStats();

  // Modal state management
  const [activeModal, setActiveModal] = useState<'records' | 'exercises' | 'activity' | 'achievements' | null>(null);

  // Achievements state
  const [achievements, setAchievements] = useState<any>(null);
  const [achievementsLoading, setAchievementsLoading] = useState(true);

  // Fetch achievements
  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const response = await fetch('/api/user/achievements');

        if (response.ok) {
          const result = await response.json();
          setAchievements(result.data);
        }
      } catch (error) {
        console.error('Error fetching achievements:', error);
      } finally {
        setAchievementsLoading(false);
      }
    };

    fetchAchievements();
  }, []);

  // Handle URL query params for modal opening
  useEffect(() => {
    const modal = searchParams.get('modal');
    if (modal === 'records' || modal === 'exercises' || modal === 'activity' || modal === 'achievements') {
      setActiveModal(modal as any);
    }
  }, [searchParams]);

  // Modal handlers
  const openModal = (modalType: 'records' | 'exercises' | 'activity' | 'achievements') => {
    setActiveModal(modalType);
    // Update URL without causing navigation
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('modal', modalType);
    window.history.pushState({}, '', newUrl.toString());
  };

  const closeModal = () => {
    setActiveModal(null);
    // Remove modal param from URL
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('modal');
    window.history.pushState({}, '', newUrl.toString());
  };

  useEffect(() => {
    // Only perform checks and redirects after the initial loading is done.
    if (!isLoading) {
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
  }, [isLoading, profile, error, router]);

  const getDisplayValue = (value: number | null) => {
    if (!value) return '';
    return value.toFixed(1);
  };

  const getUnitLabel = (isHeight: boolean) => {
    return profile?.useMetric
      ? isHeight
        ? 'cm'
        : 'kg'
      : isHeight
      ? 'in'
      : 'lbs';
  };

  if (isLoading || statsLoading || profile === null) {
    return <ProfileSkeleton />;
  }

  if (error || statsError) {
    return (
      <div className="min-h-screen app-bg py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl">
            <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">
              Error
            </h2>
            <p className="text-red-500 dark:text-red-300">
              {String(error || statsError)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Back to Dashboard Button */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-primary hover:text-primary-dark transition-colors py-2 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* Enhanced Profile Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden mb-8">
          <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 px-8 py-12 text-white">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <UserCircleIcon className="w-24 h-24" />
                    <div className="absolute -bottom-2 -right-2 bg-green-500 w-6 h-6 rounded-full border-2 border-white"></div>
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold mb-2">{profile?.name}</h1>
                    <p className="text-blue-100 mb-1">
                      Member since{' '}
                      {new Date(profile?.joinDate || '').toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                    {stats && (
                      <p className="text-blue-200 text-sm">
                        {stats.totalWorkouts} workouts completed • {stats.currentStreak} day streak
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-white/10 rounded-xl px-6 py-4 backdrop-blur-sm text-center">
                    <TrophyIcon className="w-8 h-8 text-yellow-300 mx-auto mb-2" />
                    <p className="text-sm text-blue-100">Points</p>
                    <p className="text-2xl font-bold">{profile?.points || 0}</p>
                  </div>
                  <Link
                    href="/profile/edit"
                    className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors backdrop-blur-sm"
                    aria-label="Edit Profile"
                  >
                    <Cog6ToothIcon className="w-6 h-6" />
                  </Link>
                </div>
              </div>

              {/* User Stats Pills */}
              <div className="flex flex-wrap gap-3 mt-6">
                {profile?.age && (
                  <div className="bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm flex items-center gap-2">
                    <span className="text-blue-100 text-sm">Age:</span>
                    <span className="font-medium">{profile.age} yrs</span>
                  </div>
                )}
                {profile?.weight && (
                  <div className="bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm flex items-center gap-2">
                    <ScaleIcon className="w-4 h-4 text-blue-100" />
                    <span className="font-medium">
                      {getDisplayValue(profile.weight)} {getUnitLabel(false)}
                    </span>
                  </div>
                )}
                {profile?.height && (
                  <div className="bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm flex items-center gap-2">
                    <SparklesIcon className="w-4 h-4 text-blue-100" />
                    <span className="font-medium">
                      {getDisplayValue(profile.height)} {getUnitLabel(true)}
                    </span>
                  </div>
                )}
                {profile?.gender && (
                  <div className="bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm flex items-center gap-2">
                    <span className="text-blue-100 text-sm">Gender:</span>
                    <span className="font-medium">{profile.gender}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <SignedIn>
                <Link
                  href="/template/create"
                  className="btn btn-primary inline-flex items-center justify-center gap-2 text-sm"
                >
                  <CalendarDaysIcon className="w-4 h-4" />
                  Create Template
                </Link>
                <Link
                  href="/templates"
                  className="btn btn-secondary inline-flex items-center justify-center gap-2 text-sm"
                >
                  <CalendarDaysIcon className="w-4 h-4" />
                  Templates
                </Link>
                <button
                  onClick={() => openModal('activity')}
                  className="btn btn-tertiary inline-flex items-center justify-center gap-2 text-sm"
                >
                  <ChartBarIcon className="w-4 h-4" />
                  Activity
                </button>
                <Link
                  href="/account"
                  className="btn btn-secondary inline-flex items-center justify-center gap-2 text-sm"
                >
                  <UserCircleIcon className="w-4 h-4" />
                  Account
                </Link>
                <SignOutButton redirectUrl="/login">
                  <button className="btn btn-danger inline-flex items-center justify-center gap-2 text-sm">
                    <ArrowRightStartOnRectangleIcon className="w-4 h-4" />
                    Sign Out
                  </button>
                </SignOutButton>
              </SignedIn>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Your Statistics
            </h2>
            <StatsOverview stats={stats} useMetric={profile?.useMetric || false} />
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Recent Activity */}
          {stats && (
            <RecentActivity
              stats={stats}
              useMetric={profile?.useMetric || false}
              onViewAll={() => openModal('activity')}
            />
          )}

          {/* Personal Records */}
          {stats && (
            <PersonalRecords
              stats={stats}
              useMetric={profile?.useMetric || false}
              onViewAll={() => openModal('records')}
            />
          )}

          {/* Top Exercises */}
          {stats && (
            <TopExercises
              stats={stats}
              useMetric={profile?.useMetric || false}
              onViewAll={() => openModal('exercises')}
            />
          )}

          {/* Achievements */}
          {achievements && !achievementsLoading && (
            <Achievements
              achievements={achievements.achievements}
              unlockedCount={achievements.unlockedCount}
              totalCount={achievements.totalCount}
              onViewAll={() => openModal('achievements')}
            />
          )}

          {/* Monthly Progress */}
          {stats && (
            <MonthlyProgress stats={stats} useMetric={profile?.useMetric || false} />
          )}
        </div>

        {/* Saved Workouts Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Favorite Templates
          </h2>
          <SavedWorkouts />
        </div>
      </div>

      {/* Modals */}
      {stats && (
        <>
          <PersonalRecordsModal
            isOpen={activeModal === 'records'}
            onClose={closeModal}
            stats={stats}
            useMetric={profile?.useMetric || false}
          />
          <TopExercisesModal
            isOpen={activeModal === 'exercises'}
            onClose={closeModal}
            stats={stats}
            useMetric={profile?.useMetric || false}
          />
          <RecentActivityModal
            isOpen={activeModal === 'activity'}
            onClose={closeModal}
            stats={stats}
            useMetric={profile?.useMetric || false}
          />
        </>
      )}

      {/* Achievements Modal */}
      {achievements && (
        <AchievementsModal
          isOpen={activeModal === 'achievements'}
          onClose={closeModal}
          achievements={achievements.achievements}
          unlockedCount={achievements.unlockedCount}
          totalCount={achievements.totalCount}
        />
      )}
    </div>
  );
}
