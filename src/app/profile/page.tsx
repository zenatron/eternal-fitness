'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  Cog6ToothIcon,
  ArrowRightStartOnRectangleIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

import { signOut } from 'next-auth/react';
import { NotificationSettings } from '@/components/pwa/NotificationSettings';
import { AvatarUploader } from '@/components/ui/profile/AvatarUploader';
import SavedWorkouts from '@/components/ui/FavoriteWorkouts';
import { useProfile } from '@/lib/hooks/useProfile';
import { useHasMounted } from '@/lib/hooks/useHasMounted';
import { useUserStats } from '@/lib/hooks/useUserStats';
import { useAchievements } from '@/lib/hooks/useAchievements';

import { StatsOverview } from '@/components/ui/profile/StatsOverview';
import { RecentActivity } from '@/components/ui/profile/RecentActivity';
import { PersonalRecords } from '@/components/ui/profile/PersonalRecords';
import { TopExercises } from '@/components/ui/profile/TopExercises';
import { Achievements } from '@/components/ui/profile/Achievements';
import { getLevelTitle, getLevelProgress } from '@/utils/levels';

import dynamic from 'next/dynamic';

/**
 * These four modals are only reachable behind a tap on a stat card, and each
 * pulls in its own tables and charts. Splitting them out cuts what the profile
 * page has to download before it can render anything.
 */
const PersonalRecordsModal = dynamic(
  () => import('@/components/modals/PersonalRecordsModal').then((m) => m.PersonalRecordsModal),
  { ssr: false }
);
const TopExercisesModal = dynamic(
  () => import('@/components/modals/TopExercisesModal').then((m) => m.TopExercisesModal),
  { ssr: false }
);
const RecentActivityModal = dynamic(
  () => import('@/components/modals/RecentActivityModal').then((m) => m.RecentActivityModal),
  { ssr: false }
);
const AchievementsModal = dynamic(
  () => import('@/components/modals/AchievementsModal').then((m) => m.AchievementsModal),
  { ssr: false }
);
import { MonthlyProgress } from '@/components/ui/profile/MonthlyProgress';
import { ProfileSkeleton } from '@/components/ui/profile/ProfileSkeleton';


function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasMounted = useHasMounted();
  const { profile, isLoading, error } = useProfile();
  const { stats, isLoading: statsLoading, error: statsError } = useUserStats();
  // Cached via React Query (see useAchievements) — this used to be a bare
  // useEffect + fetch that refetched on every visit to the page.
  const { achievements, loading: achievementsLoading } = useAchievements();

  const [activeModal, setActiveModal] = useState<'records' | 'exercises' | 'activity' | 'achievements' | null>(null);

  useEffect(() => {
    const modal = searchParams.get('modal');
    if (modal === 'records' || modal === 'exercises' || modal === 'activity' || modal === 'achievements') {
      setActiveModal(modal);
    } else {
      // The param disappearing (browser Back, or closeModal's pushState) must
      // also close the modal state — one-directional sync left the modal open
      // over a URL that no longer mentioned it.
      setActiveModal((current) => (current !== null ? null : current));
    }
  }, [searchParams]);

  const openModal = (modalType: 'records' | 'exercises' | 'activity' | 'achievements') => {
    setActiveModal(modalType);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('modal', modalType);
    window.history.pushState({}, '', newUrl.toString());
  };

  const closeModal = () => {
    setActiveModal(null);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('modal');
    window.history.pushState({}, '', newUrl.toString());
  };

  useEffect(() => {
    if (!isLoading) {
      if (profile === null) {
        router.replace('/profile/setup');
        return;
      }
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
    return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
  };

  const getUnitLabel = (isHeight: boolean) => {
    return profile?.useMetric
      ? isHeight ? 'cm' : 'kg'
      : isHeight ? 'in' : 'lbs';
  };

  /*
   * Two separate problems were folded into this guard:
   *
   *  - `profile === null` missed `undefined`. During SSR no query runs, so
   *    React Query reports isLoading false (it is isPending && isFetching, and
   *    nothing is fetching) with data undefined — so the guard fell through and
   *    the server rendered the profile card with an empty name.
   *  - The persisted IndexedDB cache can be restored before this Suspense
   *    boundary hydrates, so the client had real data while the server HTML was
   *    a skeleton. `useHasMounted` forces the first client render to match.
   *
   * Errors are checked first when there is no data to fall back on: useProfile
   * leaves `profile` undefined on a failed fetch, so a `!profile` gate above
   * the error block turned every fetch failure into an endless skeleton.
   */
  if (!hasMounted || (error && !profile)) {
    if (isLoading || statsLoading) return <ProfileSkeleton />;
    return (
      <div className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="form-error">
            <div className="w-5 h-5 rounded-full bg-danger-500 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            {error?.message || 'Could not load your profile. Check your connection and try again.'}
          </div>
        </div>
      </div>
    );
  }

  if (!hasMounted || isLoading || statsLoading || !profile) {
    return <ProfileSkeleton />;
  }

  if (statsError) {
    return (
      <div className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="form-error">
            <div className="w-5 h-5 rounded-full bg-danger-500 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            {statsError?.message || 'Could not load your stats.'}
          </div>
        </div>
      </div>
    );
  }

  const level = getLevelProgress(profile?.points || 0);
  const bodyStats = [
    profile?.age ? { label: 'Age', value: `${profile.age}` } : null,
    profile?.weight ? { label: 'Weight', value: `${getDisplayValue(profile.weight)} ${getUnitLabel(false)}` } : null,
    profile?.weightGoal ? { label: 'Goal', value: `${getDisplayValue(profile.weightGoal)} ${getUnitLabel(false)}` } : null,
    profile?.height ? { label: 'Height', value: `${getDisplayValue(profile.height)} ${getUnitLabel(true)}` } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="pb-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Identity. Was an animated gradient banner holding a 3D flip-card for
            the level and translucent white stat pills; now the facts, plainly. */}
        <section className="flex items-start gap-4 pb-6 pt-6 sm:pt-8">
          <AvatarUploader
            avatarUrl={profile?.avatarUrl}
            imageUrl={profile?.image}
            name={profile?.name}
            email={profile?.email}
            size={72}
          />
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-[28px] font-semibold leading-tight tracking-tight text-surface-50 dark:text-white">
              {profile?.name}
            </h1>
            <p className="mt-0.5 text-sm text-surface-500 dark:text-surface-600 tabular">
              {stats ? `${stats.totalWorkouts} workouts` : null}
              {profile?.joinDate
                ? ` · since ${new Date(profile.joinDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`
                : null}
            </p>
          </div>
          <Link href="/profile/edit" className="btn btn-tertiary shrink-0 min-h-[40px]">
            <Cog6ToothIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Edit profile</span>
            <span className="sm:hidden">Edit</span>
          </Link>
        </section>

        <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="forge-card p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent-500 font-display text-lg font-semibold text-white tabular">
                {level.currentLevel}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-surface-50 dark:text-white">{getLevelTitle(level.currentLevel)}</p>
                <p className="text-xs text-surface-500 dark:text-surface-600 tabular">
                  {(profile?.points || 0).toLocaleString()} XP ·{' '}
                  {Math.max(0, level.nextLevelXP - (profile?.points || 0)).toLocaleString()} to level{' '}
                  {level.currentLevel + 1}
                </p>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
              <div className="h-full rounded-full bg-accent-500" style={{ width: `${level.percent}%` }} />
            </div>
          </div>

          {bodyStats.length > 0 && (
            <dl className="forge-card grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
              {bodyStats.map((stat) => (
                <div key={stat.label}>
                  <dt className="stat-label">{stat.label}</dt>
                  <dd className="mt-1 font-display text-lg font-semibold text-surface-50 dark:text-white tabular">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* Notification opt-in — renders nothing when push is unavailable
            (unsupported browser, or no VAPID keys configured). */}
        <div className="mb-8">
          <NotificationSettings />
        </div>

        {/* Stats Overview */}
        {stats && (
          <section className="mb-8">
            <h2 className="section-title mb-2">All time</h2>
            <StatsOverview stats={stats} useMetric={profile?.useMetric || false} />
          </section>
        )}

        {/* Content Grid — bento-box columns layout */}
        <div className="mb-8 columns-1 gap-4 lg:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
          {stats && (
            <div>
              <RecentActivity
                stats={stats}
                useMetric={profile?.useMetric || false}
                onViewAll={() => openModal('activity')}
              />
            </div>
          )}
          {stats && (
            <div>
              <PersonalRecords
                stats={stats}
                useMetric={profile?.useMetric || false}
                onViewAll={() => openModal('records')}
              />
            </div>
          )}
          {stats && (
            <div>
              <TopExercises
                stats={stats}
                useMetric={profile?.useMetric || false}
                onViewAll={() => openModal('exercises')}
              />
            </div>
          )}
          {stats && (
            <div>
              <MonthlyProgress stats={stats} useMetric={profile?.useMetric || false} />
            </div>
          )}
          {achievements && !achievementsLoading && (
            <div>
              <Achievements
                achievements={achievements.achievements}
                unlockedCount={achievements.unlockedCount}
                totalCount={achievements.totalCount}
                useMetric={profile?.useMetric || false}
                onViewAll={() => openModal('achievements')}
              />
            </div>
          )}
        </div>

        <section className="mb-8">
          <h2 className="section-title mb-2">Favorite workouts</h2>
          <SavedWorkouts />
        </section>

        {/* Account. Sign out used to be a solid red button in the hero, the
            loudest control on the page for the action people want least. */}
        <section className="forge-card divide-y divide-black/[0.06] dark:divide-white/[0.06]">
          {[
            { label: 'Workout history', onClick: () => router.push('/history'), icon: ChartBarIcon },
            { label: 'Export my data (JSON)', onClick: () => { window.location.href = '/api/user/export'; }, icon: ArrowDownTrayIcon },
            { label: 'Sign out', onClick: () => signOut({ callbackUrl: '/login' }), icon: ArrowRightStartOnRectangleIcon, danger: true },
          ].map((row) => (
            <button
              key={row.label}
              onClick={row.onClick}
              className={`flex min-h-[48px] w-full items-center gap-3 px-4 text-left text-sm transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.03] ${
                row.danger ? 'text-danger-600 dark:text-danger-400' : 'text-surface-100 dark:text-surface-950'
              }`}
            >
              <row.icon className="h-[18px] w-[18px] shrink-0 opacity-70" />
              {row.label}
            </button>
          ))}
        </section>
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

      {achievements && (
        <AchievementsModal
          isOpen={activeModal === 'achievements'}
          onClose={closeModal}
          achievements={achievements.achievements}
          unlockedCount={achievements.unlockedCount}
          totalCount={achievements.totalCount}
          useMetric={profile?.useMetric || false}
        />
      )}
    </div>
  );
}

export default function Profile() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent />
    </Suspense>
  );
}
