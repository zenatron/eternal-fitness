'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
} from '@heroicons/react/24/outline';

import { SignedIn } from '@clerk/nextjs';
import SavedWorkouts from '@/components/ui/FavoriteWorkouts';
import { useProfile } from '@/lib/hooks/useProfile';
import { SignOutButton } from '@clerk/nextjs';

export default function Profile() {
  const router = useRouter();
  const { profile, isLoading, error } = useProfile();

  useEffect(() => {
    // Only perform checks and redirects after the initial loading is done.
    if (!isLoading) {
      if (
        profile.name == null ||
        profile.age == null ||
        profile.weight == null ||
        profile.height == null
      ) {
        router.push('/profile/setup');
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen app-bg py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl">
            <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">
              Error
            </h2>
            <p className="text-red-500 dark:text-red-300">{String(error)}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
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

        {/* Profile Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden mb-6">
          <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-12 text-white">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative flex flex-col space-y-4">
              {/* Top row with name and points */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <UserCircleIcon className="w-24 h-24" />
                  <div>
                    <h1 className="text-3xl font-bold">{profile?.name}</h1>
                    <p className="text-blue-100 mt-1">
                      Member since{' '}
                      {new Date(profile?.joinDate || '').toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
                  <TrophyIcon className="w-8 h-8 text-yellow-300" />
                  <div>
                    <p className="text-sm text-blue-100">Total Points</p>
                    <p className="text-2xl font-bold">{profile?.points || 0}</p>
                  </div>
                </div>
              </div>

              {/* Bottom row with user parameters */}
              <div className="flex items-center justify-between mt-6">
                <div className="flex items-center gap-6">
                  <div className="flex flex-wrap gap-4">
                    {profile?.age && (
                      <div className="bg-white/10 px-3 py-2 rounded-lg backdrop-blur-sm flex items-center gap-2">
                        <span className="text-blue-100 text-sm">Age:</span>
                        <span className="font-medium">{profile.age} yrs</span>
                      </div>
                    )}
                    {profile?.weight && (
                      <div className="bg-white/10 px-3 py-2 rounded-lg backdrop-blur-sm flex items-center gap-2">
                        <ScaleIcon className="w-4 h-4 text-blue-100" />
                        <span className="font-medium">
                          {getDisplayValue(profile.weight)}{' '}
                          {getUnitLabel(false)}
                        </span>
                      </div>
                    )}
                    {profile?.height && (
                      <div className="bg-white/10 px-3 py-2 rounded-lg backdrop-blur-sm flex items-center gap-2">
                        <SparklesIcon className="w-4 h-4 text-blue-100" />
                        <span className="font-medium">
                          {getDisplayValue(profile.height)} {getUnitLabel(true)}
                        </span>
                      </div>
                    )}
                    {profile?.gender && (
                      <div className="bg-white/10 px-3 py-2 rounded-lg backdrop-blur-sm flex items-center gap-2">
                        <span className="text-blue-100 text-sm">Gender:</span>
                        <span className="font-medium">{profile.gender}</span>
                      </div>
                    )}
                  </div>
                </div>
                <Link
                  href="/profile/edit"
                  className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                  aria-label="Edit Profile"
                >
                  <Cog6ToothIcon className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Stats Grid - Now only shows workouts completed */}
          <div className="p-4">
            {/* Action Buttons - Removed the Edit Profile button */}
            <div className="flex flex-col sm:flex-row gap-4">
              <SignedIn>
                <Link
                  href="/template/create"
                  className="btn btn-primary flex-1 inline-flex items-center justify-center gap-2"
                >
                  <CalendarDaysIcon className="w-5 h-5" />
                  Create Template
                </Link>
                <Link
                  href="/templates"
                  className="btn btn-primary flex-1 inline-flex items-center justify-center gap-2"
                >
                  <CalendarDaysIcon className="w-5 h-5" />
                  View Templates
                </Link>
                <Link
                  href="/activity"
                  className="btn btn-tertiary flex-1 inline-flex items-center justify-center gap-2"
                >
                  <BoltIcon className="w-5 h-5" />
                  View Activity
                </Link>
                <Link
                  href="/account"
                  className="btn btn-secondary flex-1 inline-flex items-center justify-center gap-2"
                >
                  <UserCircleIcon className="w-5 h-5" />
                  Manage Account
                </Link>
                <SignOutButton redirectUrl="/login">
                  <button className="btn btn-danger flex-1 inline-flex items-center justify-center gap-2">
                    Sign Out
                    <ArrowRightStartOnRectangleIcon className="w-5 h-5" />
                  </button>
                </SignOutButton>
              </SignedIn>
            </div>
          </div>
        </div>
      </div>

      {/* Saved Workouts Section */}
      <div className="max-w-4xl mx-auto mt-6">
        <SavedWorkouts />
      </div>
    </div>
  );
}
