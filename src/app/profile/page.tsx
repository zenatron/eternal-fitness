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
import SavedWorkouts from '@/components/ui/FavoriteWorkouts';
import { useProfile } from '@/lib/hooks/useProfile';
import { useUserStats } from '@/lib/hooks/useUserStats';

import { StatsOverview } from '@/components/ui/profile/StatsOverview';
import { RecentActivity } from '@/components/ui/profile/RecentActivity';
import { PersonalRecords } from '@/components/ui/profile/PersonalRecords';
import { TopExercises } from '@/components/ui/profile/TopExercises';
import { Achievements } from '@/components/ui/profile/Achievements';
import { getLevel, getLevelTitle, getLevelProgress } from '@/utils/levels';

import { PersonalRecordsModal } from '@/components/modals/PersonalRecordsModal';
import { TopExercisesModal } from '@/components/modals/TopExercisesModal';
import { RecentActivityModal } from '@/components/modals/RecentActivityModal';
import { AchievementsModal } from '@/components/modals/AchievementsModal';
import { MonthlyProgress } from '@/components/ui/profile/MonthlyProgress';
import { ProfileSkeleton } from '@/components/ui/profile/ProfileSkeleton';
import { motion, useReducedMotion } from 'framer-motion';

const springSnappy = { type: 'spring' as const, stiffness: 400, damping: 30, mass: 0.8 };
const springBouncy = { type: 'spring' as const, stiffness: 300, damping: 20, mass: 0.7 };
const springGentle = { type: 'spring' as const, stiffness: 200, damping: 25, mass: 0.9 };

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
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-forge-500 via-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-forge-500/25 shrink-0">
              <span className="text-lg font-display font-black text-white">{level}</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-forge-100 font-display uppercase tracking-wider">Level {level}</p>
              <p className="text-sm font-display font-bold text-white truncate">{title}</p>
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-white/15 overflow-hidden mb-1">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-white to-forge-200"
              initial={prefersReducedMotion ? {} : { width: 0 }}
              animate={prefersReducedMotion ? {} : { width: `${p.percent}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-forge-100/80 font-display uppercase tracking-wider tabular-nums">
            <span>{levelRange > 0 ? `${p.progressInLevel.toLocaleString()} / ${levelRange.toLocaleString()} XP` : 'MAX'}</span>
            <span>{level === 100 ? 'MAX' : `${(p.nextLevelXP - points).toLocaleString()} to ${level + 1}`}</span>
          </div>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3 flex flex-col justify-center"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <p className="text-xs text-forge-100 font-display uppercase tracking-wider mb-1">Level {level} · {title}</p>
          <div className="space-y-1 text-xs text-white font-display">
            <div className="flex justify-between">
              <span className="text-forge-100">Total XP</span>
              <span className="font-bold tabular-nums">{points.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-forge-100">Level Progress</span>
              <span className="font-bold tabular-nums">{p.percent}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-forge-100">Next Level</span>
              <span className="font-bold tabular-nums">{level === 100 ? '—' : `${(p.nextLevelXP - points).toLocaleString()} XP`}</span>
            </div>
          </div>
          <p className="text-[9px] text-forge-100/60 text-center mt-2">tap to flip back</p>
        </div>
      </motion.div>
    </div>
  );
}

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  if (isLoading || statsLoading || profile === null) {
    return <ProfileSkeleton />;
  }

  if (error || statsError) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="form-error">
            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shrink-0">
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
      className="min-h-screen py-8 px-4"
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
            className="inline-flex items-center gap-2 text-sm text-surface-500 dark:text-surface-600 hover:text-forge-600 dark:hover:text-forge-400 transition-colors font-medium"
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
          <div className="greeting-gradient px-6 sm:px-8 py-10 text-white relative overflow-hidden">
            <div className="relative">
              {/* Top row: avatar + name + actions */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                <motion.div
                  className="relative shrink-0"
                  animate={prefersReducedMotion ? {} : { boxShadow: ['0 0 0 0 rgba(237, 123, 22, 0)', '0 0 12px 4px rgba(237, 123, 22, 0.3)', '0 0 0 0 rgba(237, 123, 22, 0)'] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div className="w-20 h-20 rounded-full bg-white/15 flex items-center justify-center">
                    <UserCircleIcon className="w-12 h-12" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-forge-500 rounded-full border-2 border-white dark:border-surface-0" />
                </motion.div>

                <div className="flex-1 min-w-0">
                  <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-wide uppercase truncate">{profile?.name}</h1>
                  <p className="text-forge-100 text-sm mt-1">
                    Member since{' '}
                    {new Date(profile?.joinDate || '').toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  {stats && (
                    <p className="text-forge-200 text-xs mt-2">
                      {stats.totalWorkouts} workouts &middot; {stats.currentStreak} day streak
                    </p>
                  )}
                </div>

                {/* Level + XP — flip card */}
                <div className="flex items-center gap-3 shrink-0">
                  <FlipLevelCard points={profile?.points || 0} totalWorkouts={stats?.totalWorkouts || 0} prefersReducedMotion={prefersReducedMotion ?? false} />

                  <motion.div
                    whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                    whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                    transition={springSnappy}
                  >
                    <Link
                      href="/profile/edit"
                      className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors backdrop-blur-sm inline-flex"
                      aria-label="Edit Profile"
                    >
                      <Cog6ToothIcon className="w-5 h-5" />
                    </Link>
                  </motion.div>
                </div>
              </div>

              {/* Stats pills */}
              <motion.div
                className="flex flex-wrap gap-2 mt-6"
                variants={staggerContainer}
                initial={prefersReducedMotion ? {} : 'hidden'}
                animate={prefersReducedMotion ? {} : 'visible'}
              >
                {profile?.age && (
                  <motion.div variants={fadeUpItem} className="bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm text-sm flex items-center gap-1.5">
                    <span className="text-forge-100">Age:</span>
                    <span className="font-medium">{profile.age} yrs</span>
                  </motion.div>
                )}
                {profile?.weight && (
                  <motion.div variants={fadeUpItem} className="bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm text-sm flex items-center gap-1.5">
                    <ScaleIcon className="w-3.5 h-3.5 text-forge-100" />
                    <span className="font-medium">
                      {getDisplayValue(profile.weight)} {getUnitLabel(false)}
                    </span>
                  </motion.div>
                )}
                {profile?.height && (
                  <motion.div variants={fadeUpItem} className="bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm text-sm flex items-center gap-1.5">
                    <SparklesIcon className="w-3.5 h-3.5 text-forge-100" />
                    <span className="font-medium">
                      {getDisplayValue(profile.height)} {getUnitLabel(true)}
                    </span>
                  </motion.div>
                )}
                {profile?.gender && (
                  <motion.div variants={fadeUpItem} className="bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm text-sm flex items-center gap-1.5">
                    <span className="text-forge-100">Gender:</span>
                    <span className="font-medium capitalize">{profile.gender}</span>
                  </motion.div>
                )}
              </motion.div>
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

        {/* Stats Overview */}
        {stats && (
          <motion.div
            className="mb-8"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ ...springGentle, delay: 0.1 }}
          >
            <h2 className="text-xl font-display font-bold tracking-wide text-surface-800 dark:text-white mb-5">Your Statistics</h2>
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
          <h2 className="text-xl font-display font-bold tracking-wide text-surface-800 dark:text-white mb-5">Favorite Templates</h2>
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
