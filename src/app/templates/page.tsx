'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  StarIcon,
  PlusCircleIcon,
  ArrowRightIcon,
  QuestionMarkCircleIcon,
  PlayCircleIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  XMarkIcon,
  ClockIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useTemplates } from '@/lib/hooks/useTemplates';
import { useScheduledSessions } from '@/lib/hooks/useScheduledSessions';
import { useToggleFavorite } from '@/lib/hooks/useMutations';
import { useProfile } from '@/lib/hooks/useProfile';
import { formatVolume } from '@/utils/formatters';
import { formatUTCDateToLocalDateFriendly } from '@/utils/dateUtils';
import { WorkoutTemplate } from '@/types/workout';
import {
  countUniqueExercises,
  getTotalSetsCount,
  getDifficultyColor,
  getWorkoutTypeColor
} from '@/utils/workoutDisplayUtils';

const springSnappy = { type: 'spring' as const, stiffness: 400, damping: 30, mass: 0.8 };
const springBouncy = { type: 'spring' as const, stiffness: 300, damping: 20, mass: 0.7 };
const springGentle = { type: 'spring' as const, stiffness: 200, damping: 25, mass: 0.9 };

// Schedule Modal Component
function ScheduleModal({
  isOpen,
  onClose,
  onSchedule,
  templateName,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (date: Date) => void;
  templateName: string;
}) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0 }}
            animate={prefersReducedMotion ? {} : { opacity: 1 }}
            exit={prefersReducedMotion ? {} : { opacity: 0 }}
            transition={springGentle}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Modal content */}
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, scale: 1 }}
            exit={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
            transition={springBouncy}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div
              className="forge-card shadow-2xl p-8 max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-display font-bold tracking-wide text-surface-800 dark:text-white">
                    Schedule Workout
                  </h3>
                  <p className="text-surface-500 dark:text-surface-600 mt-1">
                    Plan your workout session
                  </p>
                </div>
                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  transition={springSnappy}
                  className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-200 text-surface-500 dark:text-surface-600 transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </motion.button>
              </div>

              <div className="bg-forge-50 dark:bg-forge-900/20 rounded-xl p-4 mb-6">
                <p className="text-forge-800 dark:text-forge-200 font-medium">
                  Scheduling: <span className="font-bold">"{templateName}"</span>
                </p>
              </div>

              <div className="mb-8 flex justify-center">
                <DatePicker
                  selected={selectedDate}
                  onChange={(date) => setSelectedDate(date as Date)}
                  minDate={new Date()}
                  inline
                  className="rounded-xl border-0 shadow-lg"
                />
              </div>

              <div className="flex gap-4">
                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={springSnappy}
                  className="flex-1 px-6 py-3 border border-surface-300 dark:border-surface-400 text-surface-600 dark:text-surface-800 rounded-xl hover:bg-surface-950 dark:hover:bg-surface-200 transition-colors font-medium"
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={() => {
                    onSchedule(selectedDate);
                    onClose();
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  transition={springSnappy}
                  className="btn btn-primary flex-1 !py-3"
                >
                  Schedule Workout
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Delete Confirmation Modal Component
function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  templateName,
  isDeleting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  templateName: string;
  isDeleting: boolean;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0 }}
            animate={prefersReducedMotion ? {} : { opacity: 1 }}
            exit={prefersReducedMotion ? {} : { opacity: 0 }}
            transition={springGentle}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Modal content */}
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, scale: 1 }}
            exit={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
            transition={springBouncy}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div
              className="forge-card shadow-2xl p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                  <TrashIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl font-display font-bold tracking-wide text-surface-800 dark:text-white">
                    Delete Template
                  </h3>
                  <p className="text-surface-500 dark:text-surface-600 text-sm">
                    This action cannot be undone
                  </p>
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 mb-6">
                <p className="text-red-800 dark:text-red-200">
                  Are you sure you want to delete <span className="font-bold">"{templateName}"</span>?
                  This will also delete all associated workout sessions.
                </p>
              </div>

              <div className="flex gap-4">
                <motion.button
                  onClick={onClose}
                  disabled={isDeleting}
                  whileHover={isDeleting ? {} : { scale: 1.02 }}
                  whileTap={isDeleting ? {} : { scale: 0.98 }}
                  transition={springSnappy}
                  className="flex-1 px-6 py-3 border border-surface-300 dark:border-surface-400 text-surface-600 dark:text-surface-800 rounded-xl hover:bg-surface-950 dark:hover:bg-surface-200 transition-colors font-medium disabled:opacity-50"
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={onConfirm}
                  disabled={isDeleting}
                  whileHover={isDeleting ? {} : { scale: 1.03 }}
                  whileTap={isDeleting ? {} : { scale: 0.97 }}
                  transition={springSnappy}
                  className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Deleting...
                    </>
                  ) : (
                    'Delete Template'
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function TemplatesPage() {
  const router = useRouter();
  const { data: templates, isLoading, error, refetch } = useTemplates();
  const {
    sessions: scheduledSessions,
    isLoading: scheduledLoading,
    error: scheduledError,
  } = useScheduledSessions();
  const toggleFavoriteMutation = useToggleFavorite();
  const { profile } = useProfile();
  const prefersReducedMotion = useReducedMotion();

  // Search and modal state
  const [searchTerm, setSearchTerm] = useState('');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedTemplateName, setSelectedTemplateName] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter templates based on search and favorites
  const filteredTemplates = templates?.filter((template: WorkoutTemplate) =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const favoriteTemplates: WorkoutTemplate[] =
    filteredTemplates?.filter((t: WorkoutTemplate) => t.favorite) || [];
  const unscheduledTemplates: WorkoutTemplate[] =
    filteredTemplates?.filter((t: WorkoutTemplate) => !t.favorite) || [];

  const handleToggleFavorite = (templateId: string) => {
    toggleFavoriteMutation.mutate(templateId);
  };

  const handleScheduleTemplate = (templateId: string, templateName: string) => {
    setSelectedTemplateId(templateId);
    setSelectedTemplateName(templateName);
    setIsScheduleModalOpen(true);
  };

  const handleConfirmSchedule = async (date: Date) => {
    if (!selectedTemplateId) return;

    try {
      const response = await fetch('/api/session-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          scheduledAt: date.toISOString(),
          performance: {},
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || errorData.error || 'Failed to schedule session');
      }

      // Refresh the page to show the new scheduled session
      window.location.reload();
    } catch (error) {
      console.error('Error scheduling session:', error);
      // You could add error toast notification here
    }
  };

  const handleDeleteTemplate = (templateId: string, templateName: string) => {
    setSelectedTemplateId(templateId);
    setSelectedTemplateName(templateName);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedTemplateId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/template/${selectedTemplateId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to delete template');
      }

      // Refresh templates
      refetch();
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error('Error deleting template:', error);
      // You could add error toast notification here
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStartScheduledSession = async (
    scheduledSessionId: string,
    templateId: string,
  ) => {
    try {
      router.push(
        `/session/active/${templateId}?scheduledSessionId=${scheduledSessionId}`,
      );
    } catch (error) {
      console.error('Error starting scheduled session:', error);
    }
  };

  const isLoadingData = isLoading || scheduledLoading;
  const hasError = error || scheduledError;

  if (isLoadingData) {
    return (
      <div className="min-h-screen app-bg py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="forge-card overflow-hidden">
              <div className="bg-gradient-to-br from-surface-300 to-surface-400 dark:from-surface-400 dark:to-surface-500 px-8 py-8">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="h-8 w-48 bg-surface-200 dark:bg-surface-600 rounded-lg animate-pulse mb-2"></div>
                    <div className="h-4 w-64 bg-surface-200 dark:bg-surface-600 rounded animate-pulse"></div>
                  </div>
                  <div className="flex gap-3">
                    <div className="h-10 w-32 bg-surface-200 dark:bg-surface-600 rounded-lg animate-pulse"></div>
                    <div className="h-10 w-36 bg-surface-200 dark:bg-surface-600 rounded-lg animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Skeleton */}
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="forge-card p-6">
                  <div className="h-2 bg-surface-200 dark:bg-surface-200 rounded-full animate-pulse mb-4"></div>
                  <div className="h-6 bg-surface-200 dark:bg-surface-200 rounded animate-pulse mb-2"></div>
                  <div className="h-4 bg-surface-200 dark:bg-surface-200 rounded animate-pulse mb-4"></div>
                  <div className="h-10 bg-surface-200 dark:bg-surface-200 rounded-lg animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="min-h-screen app-bg py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="forge-card p-8 text-center">
            <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl">
              <h2 className="text-xl font-display font-bold tracking-wide text-red-600 dark:text-red-400 mb-2">
                Error Loading Templates
              </h2>
              <p className="text-red-500 dark:text-red-300 mb-4">{String(hasError)}</p>
              <motion.button
                onClick={() => refetch()}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={springSnappy}
                className="btn btn-danger"
              >
                Try Again
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-bg py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="forge-card overflow-hidden">
            <div className="greeting-gradient px-8 py-8 text-white">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div>
                  <h1 className="text-3xl font-display font-bold tracking-wide uppercase mb-2">Workout Templates</h1>
                  <p className="text-forge-100">
                    Create, organize, and start your perfect workouts
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <motion.button
                    onClick={() => router.push('/session/log')}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    transition={springSnappy}
                    className="btn bg-white/80 text-surface-700 hover:bg-white flex items-center gap-2"
                  >
                    <ClockIcon className="w-5 h-5" />
                    Log Past Workout
                  </motion.button>
                  <motion.button
                    onClick={() => router.push('/template/create')}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    transition={springSnappy}
                    className="btn btn-primary bg-white text-forge-600 hover:bg-forge-50 flex items-center gap-2"
                  >
                    <PlusCircleIcon className="w-5 h-5" />
                    Create Template
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="mb-8">
          <div className="forge-card p-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-surface-600" />
              </div>
              <motion.input
                type="text"
                placeholder="Search your workout templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                whileFocus={prefersReducedMotion ? {} : { scale: 1.02, boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.25)' }}
                transition={springSnappy}
                className="form-input !pl-10 !py-3"
              />
            </div>
          </div>
        </div>

        {/* Scheduled Sessions Section */}
        {scheduledSessions && scheduledSessions.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-forge-100 dark:bg-forge-900/30 rounded-xl">
                <ClockIcon className="w-6 h-6 text-forge-600 dark:text-forge-400" />
              </div>
              <h2 className="text-2xl font-display font-bold tracking-wide text-surface-800 dark:text-white">
                Scheduled Sessions
              </h2>
              <span className="px-3 py-1 bg-forge-100 dark:bg-forge-900/30 text-forge-600 dark:text-forge-400 rounded-full text-sm font-medium">
                {scheduledSessions.length} ready
              </span>
            </div>

            <div className="space-y-4">
              {scheduledSessions.map((session, index) => (
                <motion.div
                  key={session.id}
                  initial={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
                  animate={prefersReducedMotion ? {} : { opacity: 1, x: 0 }}
                  transition={{ ...springGentle, delay: prefersReducedMotion ? 0 : index * 0.1 }}
                  className="forge-card overflow-hidden"
                >
                  <div className="h-2 greeting-gradient-subtle"></div>
                  <div className="p-6">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <h3 className="text-lg font-display font-bold text-surface-800 dark:text-white mb-2">
                          {templates?.find(
                            (t: WorkoutTemplate) => t.id === session.workoutTemplateId,
                          )?.name || 'Unknown Template'}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-surface-500 dark:text-surface-600">
                          <CalendarDaysIcon className="w-4 h-4" />
                          <span>
                            Scheduled for {session.scheduledAt
                              ? formatUTCDateToLocalDateFriendly(session.scheduledAt)
                              : 'Unknown date'}
                          </span>
                        </div>
                      </div>
                      <motion.button
                        onClick={() =>
                          handleStartScheduledSession(
                            session.id,
                            session.workoutTemplateId,
                          )
                        }
                        className="btn btn-primary !py-3 flex items-center gap-2"
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        transition={springSnappy}
                        aria-label="Start scheduled session"
                      >
                        <PlayCircleIcon className="w-5 h-5" />
                        Start Now
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Favorites Section */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
              <StarIconSolid className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-2xl font-display font-bold tracking-wide text-surface-800 dark:text-white">
              Favorite Templates
            </h2>
          </div>

          {favoriteTemplates.length === 0 ? (
            <div className="forge-card p-8 text-center">
              <StarIcon className="w-16 h-16 text-surface-600 mx-auto mb-4" />
              <p className="text-surface-500 dark:text-surface-600 mb-2">
                No favorite templates yet
              </p>
              <p className="text-sm text-surface-600 dark:text-surface-500">
                Mark templates as favorites to see them here for quick access
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favoriteTemplates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
                  animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
                  transition={{ ...springGentle, delay: prefersReducedMotion ? 0 : index * 0.1 }}
                  whileHover={prefersReducedMotion ? {} : { scale: 1.02, y: -3 }}
                  className="forge-card rounded-lg shadow-lg overflow-hidden flex flex-col"
                >
                  <div className="h-1.5 greeting-gradient-subtle"></div>
                  <div className="p-4 pb-3 flex flex-col flex-1">
                    {/* Header: name + favorite + tags */}
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-display font-bold tracking-wide text-surface-800 dark:text-white truncate">
                          {template.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(template.difficulty)}`}>
                            {template.difficulty}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getWorkoutTypeColor(template.workoutType)}`}>
                            {template.workoutType}
                          </span>
                        </div>
                      </div>
                      <motion.button
                        onClick={() => handleToggleFavorite(template.id)}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.85 }}
                        transition={springSnappy}
                        className="p-1.5 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors shrink-0"
                      >
                        <StarIconSolid className="w-4 h-4" />
                      </motion.button>
                    </div>

                    {/* Compact stats row */}
                    <div className="flex items-center gap-2 text-sm mb-3">
                      <span className="text-surface-500 dark:text-surface-600">
                        <span className="font-display font-bold text-surface-800 dark:text-white">{countUniqueExercises(template)}</span> exercises
                      </span>
                      <span className="text-surface-400 dark:text-surface-500">&middot;</span>
                      <span className="text-surface-500 dark:text-surface-600">
                        <span className="font-display font-bold text-surface-800 dark:text-white">{getTotalSetsCount(template)}</span> sets
                      </span>
                      {template.totalVolume > 0 && (
                        <>
                          <span className="text-surface-400 dark:text-surface-500">&middot;</span>
                          <span className="text-forge-600 dark:text-forge-400 font-medium">
                            {formatVolume(template.totalVolume, profile?.useMetric)}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Actions - pushed to bottom */}
                    <div className="mt-auto pt-3 border-t border-surface-200 dark:border-surface-300/50 space-y-2">
                      <motion.button
                        onClick={() => router.push(`/session/active/${template.id}`)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        transition={springSnappy}
                        className="w-full btn btn-primary text-sm flex items-center justify-center gap-2 py-2.5"
                      >
                        <PlayCircleIcon className="w-4 h-4" />
                        Start Workout
                      </motion.button>
                      <div className="flex gap-2">
                        <motion.button
                          onClick={() => router.push(`/template/${template.id}`)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          transition={springSnappy}
                          className="flex-1 btn btn-secondary text-xs py-2"
                        >
                          Details
                        </motion.button>
                        <motion.button
                          onClick={() => handleScheduleTemplate(template.id, template.name)}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          transition={springSnappy}
                          className="flex-1 px-2 py-2 bg-forge-100 dark:bg-forge-900/30 text-forge-600 dark:text-forge-400 rounded-lg hover:bg-forge-200 dark:hover:bg-forge-900/50 transition-colors text-xs flex items-center justify-center gap-1"
                        >
                          <CalendarDaysIcon className="w-3.5 h-3.5" />
                          Schedule
                        </motion.button>
                        <motion.button
                          onClick={() => handleDeleteTemplate(template.id, template.name)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          transition={springSnappy}
                          className="px-2.5 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* All Templates Section */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-forge-100 dark:bg-forge-900/30 rounded-xl">
              <QuestionMarkCircleIcon className="w-6 h-6 text-forge-600 dark:text-forge-400" />
            </div>
            <h2 className="text-2xl font-display font-bold tracking-wide text-surface-800 dark:text-white">
              All Templates
            </h2>
          </div>

          {unscheduledTemplates.length === 0 ? (
            <div className="forge-card p-8 text-center">
              <PlusCircleIcon className="w-16 h-16 text-surface-600 mx-auto mb-4" />
              <p className="text-surface-500 dark:text-surface-600 mb-2">
                No templates created yet
              </p>
              <p className="text-sm text-surface-600 dark:text-surface-500 mb-4">
                Create your first workout template to get started
              </p>
              <motion.button
                onClick={() => router.push('/template/create')}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={springSnappy}
                className="btn btn-primary inline-flex items-center gap-2"
              >
                <PlusCircleIcon className="w-5 h-5" />
                Create Your First Template
              </motion.button>
            </div>
          ) : (
            <div className="space-y-3">
              {unscheduledTemplates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
                  animate={prefersReducedMotion ? {} : { opacity: 1, x: 0 }}
                  transition={{ ...springGentle, delay: prefersReducedMotion ? 0 : index * 0.05 }}
                  className="forge-card rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                >
                  <div className="h-1.5 greeting-gradient-subtle"></div>
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-4">
                      {/* Left: info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2.5 bg-forge-50 dark:bg-forge-900/30 rounded-lg shrink-0">
                          <QuestionMarkCircleIcon className="w-5 h-5 text-forge-600 dark:text-forge-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-display font-bold tracking-wide text-surface-800 dark:text-white truncate">
                            {template.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-sm">
                            <span className="text-surface-500 dark:text-surface-600">
                              <span className="font-display font-bold text-surface-700 dark:text-surface-800">{countUniqueExercises(template)}</span> exercises
                            </span>
                            <span className="text-surface-400 dark:text-surface-500">&middot;</span>
                            <span className="text-surface-500 dark:text-surface-600">
                              <span className="font-display font-bold text-surface-700 dark:text-surface-800">{getTotalSetsCount(template)}</span> sets
                            </span>
                            {template.totalVolume > 0 && (
                              <>
                                <span className="text-surface-400 dark:text-surface-500">&middot;</span>
                                <span className="text-forge-600 dark:text-forge-400 font-medium">
                                  {formatVolume(template.totalVolume, profile?.useMetric)}
                                </span>
                              </>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(template.difficulty)}`}>
                              {template.difficulty}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getWorkoutTypeColor(template.workoutType)}`}>
                              {template.workoutType}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: actions with proper spacing */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <motion.button
                          onClick={() => handleToggleFavorite(template.id)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          transition={springSnappy}
                          className={`p-2 rounded-lg transition-colors ${
                            template.favorite
                              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                              : 'bg-surface-100 dark:bg-surface-200 text-surface-600 hover:text-amber-500'
                          }`}
                        >
                          {template.favorite ? (
                            <StarIconSolid className="w-5 h-5" />
                          ) : (
                            <StarIcon className="w-5 h-5" />
                          )}
                        </motion.button>

                        <div className="w-px h-6 bg-surface-200 dark:bg-surface-300/50"></div>

                        <motion.button
                          onClick={() => router.push(`/template/${template.id}`)}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          transition={springSnappy}
                          className="btn btn-secondary text-sm py-2"
                        >
                          Details
                        </motion.button>
                        <motion.button
                          onClick={() => handleScheduleTemplate(template.id, template.name)}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          transition={springSnappy}
                          className="px-3 py-2 bg-forge-100 dark:bg-forge-900/30 text-forge-600 dark:text-forge-400 rounded-lg hover:bg-forge-200 dark:hover:bg-forge-900/50 transition-colors text-sm flex items-center gap-1.5"
                        >
                          <CalendarDaysIcon className="w-4 h-4" />
                          Schedule
                        </motion.button>
                        <motion.button
                          onClick={() => handleDeleteTemplate(template.id, template.name)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          transition={springSnappy}
                          className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </motion.button>

                        <div className="w-px h-6 bg-surface-200 dark:bg-surface-300/50"></div>

                        <motion.button
                          onClick={() => router.push(`/session/active/${template.id}`)}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          transition={springSnappy}
                          className="btn btn-primary text-sm flex items-center gap-1.5 py-2"
                        >
                          <PlayCircleIcon className="w-4 h-4" />
                          Start
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onSchedule={handleConfirmSchedule}
        templateName={selectedTemplateName}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        templateName={selectedTemplateName}
        isDeleting={isDeleting}
      />
    </div>
  );
}
