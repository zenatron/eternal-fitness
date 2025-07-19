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

import { motion, AnimatePresence } from 'framer-motion';
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Modal content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-lg w-full border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Schedule Workout
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Plan your workout session
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-6">
                <p className="text-blue-800 dark:text-blue-200 font-medium">
                  📅 Scheduling: <span className="font-bold">"{templateName}"</span>
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
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onSchedule(selectedDate);
                    onClose();
                  }}
                  className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors font-semibold"
                >
                  Schedule Workout
                </button>
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
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Modal content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                  <TrashIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Delete Template
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
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
                <button
                  onClick={onClose}
                  disabled={isDeleting}
                  className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isDeleting}
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
                </button>
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
    console.log(`TemplatesPage: Toggling favorite for ${templateId}`);
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
      const response = await fetch('/api/session', {
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 px-8 py-8">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="h-8 w-48 bg-gray-200 dark:bg-gray-600 rounded-lg animate-pulse mb-2"></div>
                    <div className="h-4 w-64 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                  </div>
                  <div className="flex gap-3">
                    <div className="h-10 w-32 bg-gray-200 dark:bg-gray-600 rounded-lg animate-pulse"></div>
                    <div className="h-10 w-36 bg-gray-200 dark:bg-gray-600 rounded-lg animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Skeleton */}
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse mb-4"></div>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4"></div>
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
            <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl">
              <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">
                Error Loading Templates
              </h2>
              <p className="text-red-500 dark:text-red-300 mb-4">{String(hasError)}</p>
              <button
                onClick={() => refetch()}
                className="btn btn-danger"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 px-8 py-8 text-white">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Workout Templates 💪</h1>
                  <p className="text-blue-100">
                    Create, organize, and start your perfect workouts
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => router.push('/template/create')}
                    className="btn btn-primary bg-white text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                  >
                    <PlusCircleIcon className="w-5 h-5" />
                    Create Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search your workout templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
              />
            </div>
          </div>
        </div>

        {/* Scheduled Sessions Section */}
        {scheduledSessions && scheduledSessions.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <ClockIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Scheduled Sessions
              </h2>
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium">
                {scheduledSessions.length} ready
              </span>
            </div>

            <div className="space-y-4">
              {scheduledSessions.map((session, index) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
                >
                  <div className="h-2 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
                  <div className="p-6">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                          {templates?.find(
                            (t: WorkoutTemplate) => t.id === session.workoutTemplateId,
                          )?.name || 'Unknown Template'}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
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
                        className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors flex items-center gap-2 font-semibold"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
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
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Favorite Templates
            </h2>
          </div>

          {favoriteTemplates.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
              <StarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 mb-2">
                No favorite templates yet
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Mark templates as favorites to see them here for quick access
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favoriteTemplates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <div className="h-2 bg-gradient-to-r from-amber-500 to-orange-500"></div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {template.name}
                      </h3>
                      <button
                        onClick={() => handleToggleFavorite(template.id)}
                        className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                      >
                        <StarIconSolid className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Exercises</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {countUniqueExercises(template)}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Sets</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {getTotalSetsCount(template)}
                        </p>
                      </div>
                    </div>

                    {template.totalVolume > 0 && (
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 mb-4">
                        <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">Total Volume</p>
                        <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                          {formatVolume(template.totalVolume, profile?.useMetric)}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(template.difficulty)}`}>
                        {template.difficulty}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getWorkoutTypeColor(template.workoutType)}`}>
                        {template.workoutType}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/template/${template.id}`)}
                        className="flex-1 btn btn-secondary text-sm"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handleScheduleTemplate(template.id, template.name)}
                        className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm flex items-center gap-1"
                      >
                        <CalendarDaysIcon className="w-4 h-4" />
                        Schedule
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id, template.name)}
                        className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm flex items-center gap-1"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => router.push(`/session/active/${template.id}`)}
                        className="flex-1 btn btn-primary text-sm flex items-center justify-center gap-1"
                      >
                        <PlayCircleIcon className="w-4 h-4" />
                        Start
                      </button>
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
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <QuestionMarkCircleIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              All Templates
            </h2>
          </div>

          {unscheduledTemplates.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
              <PlusCircleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 mb-2">
                No templates created yet
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                Create your first workout template to get started
              </p>
              <button
                onClick={() => router.push('/template/create')}
                className="btn btn-primary inline-flex items-center gap-2"
              >
                <PlusCircleIcon className="w-5 h-5" />
                Create Your First Template
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {unscheduledTemplates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
                >
                  <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                          <QuestionMarkCircleIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                            {template.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg">
                              <span className="text-gray-600 dark:text-gray-400">
                                {countUniqueExercises(template)} exercises
                              </span>
                            </div>
                            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg">
                              <span className="text-gray-600 dark:text-gray-400">
                                {getTotalSetsCount(template)} sets
                              </span>
                            </div>
                            {template.totalVolume > 0 && (
                              <div className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900/30 px-3 py-1 rounded-lg">
                                <span className="text-purple-600 dark:text-purple-400">
                                  {formatVolume(template.totalVolume, profile?.useMetric)}
                                </span>
                              </div>
                            )}
                            <span className={`px-3 py-1 rounded-lg text-xs font-medium ${getDifficultyColor(template.difficulty)}`}>
                              {template.difficulty}
                            </span>
                            <span className={`px-3 py-1 rounded-lg text-xs font-medium ${getWorkoutTypeColor(template.workoutType)}`}>
                              {template.workoutType}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleFavorite(template.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            template.favorite
                              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:text-amber-500'
                          }`}
                        >
                          {template.favorite ? (
                            <StarIconSolid className="w-5 h-5" />
                          ) : (
                            <StarIcon className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={() => router.push(`/template/${template.id}`)}
                          className="btn btn-secondary text-sm"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleScheduleTemplate(template.id, template.name)}
                          className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm flex items-center gap-1"
                        >
                          <CalendarDaysIcon className="w-4 h-4" />
                          Schedule
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template.id, template.name)}
                          className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm flex items-center gap-1"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/session/active/${template.id}`)}
                          className="btn btn-primary text-sm flex items-center gap-1"
                        >
                          <PlayCircleIcon className="w-4 h-4" />
                          Start
                        </button>
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
