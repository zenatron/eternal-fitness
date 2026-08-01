'use client';

import { useEffect, useState, Suspense } from 'react';
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
  SparklesIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

import { signOut } from 'next-auth/react';
import { NotificationSettings } from '@/components/pwa/NotificationSettings';
import { AvatarUploader } from '@/components/ui/profile/AvatarUploader';
import SavedWorkouts from '@/components/ui/FavoriteWorkouts';
import { useProfile } from '@/lib/hooks/useProfile';
import { useHasMounted } from '@/lib/hooks/useHasMounted';
import { useUserStats } from '@/lib/hooks/useUserStats';

import { StatsOverview } from '@/components/ui/profile/StatsOverview';
import { RecentActivity } from '@/components/ui/profile/RecentActivity';
import { PersonalRecords } from '@/components/ui/profile/PersonalRecords';
import { TopExercises } from '@/components/ui/profile/TopExercises';
import { Achievements } from '@/components/ui/profile/Achievements';
import { getLevel, getLevelTitle, getLevelProgress } from '@/utils/levels';

import dynamic from 'next/dynamic';
import { springSnappy, springGentle } from '@/lib/motion';

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
import { motion, useReducedMotion } from 'framer-motion';


const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const fadeUpItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: springSnappy },
};

function FlipLevelCard({ points, totalWorkouts, prefersReducedMotion }: { points: number; totalWorkouts: number; prefersReducedMotion: boolean }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const level = getLevel(points);
  const p = getLevelProgress(points);
  const title = getLevelTitle(level);
  const levelRange = p.nextLevelXP - p.currentLevelXP;

  return (
    <div className="perspective-[600px]" style={{ perspective: '600px' }}>
      <motion.div
        className="relative w-[200px] h-[110px] cursor-pointer"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        onClick={() => setIsFlipped(!isFlipped)}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3 flex flex-col justify-center"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-400 via-accent-500 to-accent-600 flex items-center justify-center shadow-lg shadow-accent-500/25 shrink-0">
              <span className="text-lg font-display font-black text-white">{level}</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-accent-100 font-display uppercase tracking-wider">Level {level}</p>
              <p className="text-sm font-display font-bold text-white truncate">{title}</p>
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-white/15 overflow-hidden mb-1">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-white to-accent-200"
              initial={prefersReducedMotion ? {} : { width: 0 }}
              animate={prefersReducedMotion ? {} : { width: `${p.percent}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
            />
          </div>
          {/* Uppercased, "725 to 18" read as a nonsense range. Naming the unit
              and the level makes it parseable at a glance. */}
          <div className="flex justify-between gap-2 text-[10px] text-accent-100/80 font-display uppercase tracking-wider tabular-nums">
            <span className="whitespace-nowrap">
              {levelRange > 0
                ? `${p.progressInLevel.toLocaleString()} / ${levelRange.toLocaleString()} XP`
                : 'MAX'}
            </span>
            <span className="whitespace-nowrap">
              {level === 100
                ? 'MAX'
                : `${(p.nextLevelXP - points).toLocaleString()} XP → LV ${level + 1}`}
            </span>
          </div>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3 flex flex-col justify-center"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <p className="text-xs text-accent-100 font-display uppercase tracking-wider mb-1">Level {level} · {title}</p>
          <div className="space-y-1 text-xs text-white font-display">
            <div className="flex justify-between">
              <span className="text-accent-100">Total XP</span>
              <span className="font-bold tabular-nums">{points.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-accent-100">Level Progress</span>
              <span className="font-bold tabular-nums">{p.percent}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-accent-100">Next Level</span>
              <span className="font-bold tabular-nums">{level === 100 ? '—' : `${(p.nextLevelXP - points).toLocaleString()} XP`}</span>
            </div>
          </div>
          <p className="text-[9px] text-accent-100/60 text-center mt-2">tap to flip back</p>
        </div>
      </motion.div>
    </div>
  );
}

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasMounted = useHasMounted();
  const { profile, isLoading, error } = useProfile();
  const { stats, isLoading: statsLoading, error: statsError } = useUserStats();
  const prefersReducedMotion = useReducedMotion();

  const [activeModal, setActiveModal] = useState<'records' | 'exercises' | 'activity' | 'achievements' | null>(null);
  const [achievements, setAchievements] = useState<any>(null);
  const [achievementsLoading, setAchievementsLoading] = useState(true);

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

  useEffect(() => {
    const modal = searchParams.get('modal');
    if (modal === 'records' || modal === 'exercises' || modal === 'activity' || modal === 'achievements') {
      setActiveModal(modal);
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
    return value.toFixed(1);
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
   */
  if (!hasMounted || isLoading || statsLoading || !profile) {
    return <ProfileSkeleton />;
  }

  if (error || statsError) {
    return (
      <div className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="form-error">
            <div className="w-5 h-5 rounded-full bg-danger-500 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            {String(error || statsError)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 24 }}
      animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
      transition={springGentle}
      className="py-8 px-4"
    >
      <div className="max-w-7xl mx-auto">
        {/* Back link */}
        <motion.div
          className="mb-5"
          initial={prefersReducedMotion ? {} : { opacity: 0, x: -12 }}
          animate={prefersReducedMotion ? {} : { opacity: 1, x: 0 }}
          transition={springSnappy}
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-surface-500 dark:text-surface-600 hover:text-accent-600 dark:hover:text-accent-400 transition-colors font-medium"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </motion.div>

        {/* Profile Hero */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
          transition={springGentle}
          className="forge-card overflow-hidden mb-8"
        >
          {/* Hero.
              Avatar, name, level card and settings all shared one row, so on a
              phone the level card was squeezed against the name and the stat
              pills wrapped into a ragged block. Now: identity row, then the
              level card full-width, then the body stats as a tidy grid. */}
          <div className="greeting-gradient relative overflow-hidden px-5 py-6 text-white sm:px-8 sm:py-8">
            <div className="relative">
              <div className="flex items-start gap-4">
                <AvatarUploader
                  avatarUrl={profile?.avatarUrl}
                  imageUrl={profile?.image}
                  name={profile?.name}
                  email={profile?.email}
                  size={80}
                />

                <div className="min-w-0 flex-1">
                  <h1 className="truncate font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
                    {profile?.name}
                  </h1>
                  {stats && (
                    <p className="mt-1 truncate text-sm text-accent-100 tabular">
                      {stats.totalWorkouts} workouts · {stats.currentStreak}d streak
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-accent-200">
                    {`Member since ${new Date(profile?.joinDate || '').toLocaleDateString(
                      'en-US',
                      { month: 'short', year: 'numeric' }
                    )}`}
                  </p>
                </div>

                <motion.div
                  whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                  transition={springSnappy}
                  className="shrink-0"
                >
                  <Link
                    href="/profile/edit"
                    className="touch-target flex items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm transition-colors hover:bg-white/20 tap-control"
                    aria-label="Edit profile"
                  >
                    <Cog6ToothIcon className="h-5 w-5" />
                  </Link>
                </motion.div>
              </div>

              <div className="mt-5">
                <FlipLevelCard
                  points={profile?.points || 0}
                  totalWorkouts={stats?.totalWorkouts || 0}
                  prefersReducedMotion={prefersReducedMotion ?? false}
                />
              </div>

              {/* Body stats as an even grid rather than free-wrapping pills. */}
              {(profile?.age || profile?.weight || profile?.height || profile?.gender || profile?.weightGoal) && (
                <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {profile?.age ? (
                    <div className="rounded-lg bg-white/10 px-3 py-2 backdrop-blur-sm">
                      <dt className="text-[10px] uppercase tracking-wider text-accent-100">Age</dt>
                      <dd className="font-display text-sm font-bold tabular">{profile.age} yrs</dd>
                    </div>
                  ) : null}
                  {profile?.weight ? (
                    <div className="rounded-lg bg-white/10 px-3 py-2 backdrop-blur-sm">
                      <dt className="text-[10px] uppercase tracking-wider text-accent-100">Weight</dt>
                      <dd className="font-display text-sm font-bold tabular">
                        {getDisplayValue(profile.weight)} {getUnitLabel(false)}
                      </dd>
                    </div>
                  ) : null}
                  {profile?.weightGoal ? (
                    <div className="rounded-lg bg-white/10 px-3 py-2 backdrop-blur-sm ring-1 ring-inset ring-white/20">
                      <dt className="text-[10px] uppercase tracking-wider text-accent-100">Goal</dt>
                      <dd className="font-display text-sm font-bold tabular">
                        {getDisplayValue(profile.weightGoal)} {getUnitLabel(false)}
                      </dd>
                    </div>
                  ) : null}
                  {profile?.height ? (
                    <div className="rounded-lg bg-white/10 px-3 py-2 backdrop-blur-sm">
                      <dt className="text-[10px] uppercase tracking-wider text-accent-100">Height</dt>
                      <dd className="font-display text-sm font-bold tabular">
                        {getDisplayValue(profile.height)} {getUnitLabel(true)}
                      </dd>
                    </div>
                  ) : null}
                  {profile?.gender ? (
                    <div className="rounded-lg bg-white/10 px-3 py-2 backdrop-blur-sm">
                      <dt className="text-[10px] uppercase tracking-wider text-accent-100">Gender</dt>
                      <dd className="font-display text-sm font-bold capitalize">{profile.gender}</dd>
                    </div>
                  ) : null}
                </dl>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-4 sm:p-6 border-t border-surface-100 dark:border-surface-300">
            <div className="flex flex-wrap gap-2.5">
              <motion.div whileHover={prefersReducedMotion ? {} : { scale: 1.03 }} whileTap={prefersReducedMotion ? {} : { scale: 0.97 }} transition={springSnappy}>
                <Link href="/template/create" className="btn btn-primary text-sm inline-flex items-center gap-2">
                  <CalendarDaysIcon className="w-4 h-4" />
                  Create Template
                </Link>
              </motion.div>
              <motion.div whileHover={prefersReducedMotion ? {} : { scale: 1.03 }} whileTap={prefersReducedMotion ? {} : { scale: 0.97 }} transition={springSnappy}>
                <Link href="/templates" className="btn btn-secondary text-sm inline-flex items-center gap-2">
                  <CalendarDaysIcon className="w-4 h-4" />
                  Templates
                </Link>
              </motion.div>
              <motion.div whileHover={prefersReducedMotion ? {} : { scale: 1.03 }} whileTap={prefersReducedMotion ? {} : { scale: 0.97 }} transition={springSnappy}>
                <button onClick={() => openModal('activity')} className="btn btn-tertiary text-sm inline-flex items-center gap-2">
                  <ChartBarIcon className="w-4 h-4" />
                  Activity
                </button>
              </motion.div>
              <motion.div whileHover={prefersReducedMotion ? {} : { scale: 1.03 }} whileTap={prefersReducedMotion ? {} : { scale: 0.97 }} transition={springSnappy}>
                <button onClick={() => signOut({ callbackUrl: '/login' })} className="btn btn-danger text-sm inline-flex items-center gap-2">
                  <ArrowRightStartOnRectangleIcon className="w-4 h-4" />
                  Sign Out
                </button>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Notification opt-in — renders nothing when push is unavailable
            (unsupported browser, or no VAPID keys configured). */}
        <motion.div
          className="mb-8"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
          animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ ...springGentle, delay: 0.05 }}
        >
          <NotificationSettings />
        </motion.div>

        {/* Stats Overview */}
        {stats && (
          <motion.div
            className="mb-8"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ ...springGentle, delay: 0.1 }}
          >
            <h2 className="text-xl font-display font-bold tracking-wide text-surface-50 dark:text-white mb-5">Your Statistics</h2>
            <StatsOverview stats={stats} useMetric={profile?.useMetric || false} />
          </motion.div>
        )}

        {/* Content Grid — bento-box columns layout */}
        <motion.div
          className="columns-1 lg:columns-2 gap-6 mb-8 [&>*]:break-inside-avoid [&>*]:mb-6"
          variants={staggerContainer}
          initial={prefersReducedMotion ? {} : 'hidden'}
          animate={prefersReducedMotion ? {} : 'visible'}
        >
          {stats && (
            <motion.div variants={fadeUpItem}>
              <RecentActivity
                stats={stats}
                useMetric={profile?.useMetric || false}
                onViewAll={() => openModal('activity')}
              />
            </motion.div>
          )}
          {stats && (
            <motion.div variants={fadeUpItem}>
              <PersonalRecords
                stats={stats}
                useMetric={profile?.useMetric || false}
                onViewAll={() => openModal('records')}
              />
            </motion.div>
          )}
          {stats && (
            <motion.div variants={fadeUpItem}>
              <TopExercises
                stats={stats}
                useMetric={profile?.useMetric || false}
                onViewAll={() => openModal('exercises')}
              />
            </motion.div>
          )}
          {stats && (
            <motion.div variants={fadeUpItem}>
              <MonthlyProgress stats={stats} useMetric={profile?.useMetric || false} />
            </motion.div>
          )}
          {achievements && !achievementsLoading && (
            <motion.div variants={fadeUpItem}>
              <Achievements
                achievements={achievements.achievements}
                unlockedCount={achievements.unlockedCount}
                totalCount={achievements.totalCount}
                useMetric={profile?.useMetric || false}
                onViewAll={() => openModal('achievements')}
              />
            </motion.div>
          )}
        </motion.div>

        {/* Favorite Templates */}
        <motion.div
          className="mb-8"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
          animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ ...springGentle, delay: 0.2 }}
        >
          <h2 className="text-xl font-display font-bold tracking-wide text-surface-50 dark:text-white mb-5">Favorite Templates</h2>
          <SavedWorkouts />
        </motion.div>
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
    </motion.div>
  );
}

export default function Profile() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent />
    </Suspense>
  );
}
