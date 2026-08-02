'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateTemplateData } from '@/lib/queryKeys';
import { useRouter } from 'next/navigation';
import {
  StarIcon,
  PlusCircleIcon,
  QuestionMarkCircleIcon,
  PlayCircleIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import type { ComponentType } from 'react';
import type { DatePickerProps } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ModalShell } from '@/components/ui/ModalShell';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { springSnappy, springGentle } from '@/lib/motion';

/**
 * The date picker only appears inside the scheduling modal, which most visits
 * to this page never open. Loading it lazily keeps react-datepicker and its
 * date library off the initial bundle for the templates list.
 */
const DatePicker = dynamic(
  // The cast works around react-datepicker's class-component `defaultProps`,
  // which next/dynamic's Loader type cannot narrow.
  () =>
    import('react-datepicker').then(
      (mod) => mod.default as unknown as ComponentType<DatePickerProps>
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[280px] w-[300px] animate-pulse rounded-xl bg-surface-200/50"
        aria-label="Loading calendar"
      />
    ),
  }
);

import { motion, useReducedMotion } from 'framer-motion';
import { useTemplates } from '@/lib/hooks/useTemplates';
import { useScheduledSessions } from '@/lib/hooks/useScheduledSessions';
import { useToggleFavorite } from '@/lib/hooks/useMutations';
import { useProfile } from '@/lib/hooks/useProfile';
import {
  civilDayToInstant,
  dayKeyOf,
  deviceTimeZone,
  formatCivilDayRelative,
} from '@/utils/datetime';
import { useTimeZone } from '@/lib/hooks/useTimeZone';
import { WorkoutTemplate } from '@/types/workout';
import { TemplateCard } from '@/components/ui/TemplateCard';


/*
 * Both modals below used to be hand-rolled `fixed inset-0 z-50` pairs. They
 * rendered inside AppShell's <main>, which is `relative z-10` — a stacking
 * context — so their z-50 was scoped to that layer and the header and bottom
 * nav (z-40, siblings of <main>) painted over them. Neither had a max-height
 * either, so on a short screen the action row simply fell off the bottom with
 * no way to scroll to it.
 *
 * ModalShell and ConfirmDialog both portal to <body> and handle the safe area,
 * focus trapping and Escape.
 */

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
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Schedule Workout"
      subtitle="Plan your workout session"
      maxWidth="max-w-lg"
      icon={
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 border border-accent-500/25">
          <CalendarDaysIcon className="h-5 w-5 text-accent-500" />
        </div>
      }
    >
      <div className="rounded-xl bg-accent-50 p-4 dark:bg-accent-900/20">
        <p className="font-medium text-accent-800 dark:text-accent-200">
          Scheduling: <span className="font-bold">&quot;{templateName}&quot;</span>
        </p>
      </div>

      {/* The calendar is a fixed-width widget; centring it lets the sheet be
          narrower than the widget without knocking it off-axis. */}
      <div className="datepicker-forge my-6 flex justify-center">
        <DatePicker
          selected={selectedDate}
          onChange={(date) => setSelectedDate(date as Date)}
          minDate={new Date()}
          inline
        />
      </div>

      <div className="flex gap-3">
        <button onClick={onClose} className="btn btn-tertiary flex-1 tap-control">
          Cancel
        </button>
        <button
          onClick={() => {
            onSchedule(selectedDate);
            onClose();
          }}
          className="btn btn-primary flex-1 tap-control"
        >
          Schedule
        </button>
      </div>
    </ModalShell>
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
    <ConfirmDialog
      open={isOpen}
      title="Delete Template"
      message={`Deleting "${templateName}" also deletes every workout session logged against it. This can't be undone.`}
      confirmLabel="Delete"
      busyLabel="Deleting…"
      cancelLabel="Keep it"
      destructive
      busy={isDeleting}
      onConfirm={onConfirm}
      onCancel={onClose}
    />
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
  const timeZone = useTimeZone();
  const prefersReducedMotion = useReducedMotion();
  const queryClient = useQueryClient();

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
      /*
       * The picker hands back a moment, not a day: react-datepicker copies the
       * previously selected time onto the clicked date, and the modal seeds
       * itself with `new Date()`. Scheduling at 8pm on the 1st for the 2nd
       * therefore produced 8pm on the 2nd, which is already the 3rd in UTC —
       * and the card then read the day off the UTC components. Two separate
       * mistakes that happened to compound into a two-day error.
       *
       * Reduce the moment to the civil day the user actually clicked, then
       * re-anchor it at local noon so no reader can round it to a neighbour.
       */
      const zone = deviceTimeZone();
      const scheduledDay = dayKeyOf(date, zone);

      const response = await fetch('/api/session-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          scheduledAt: civilDayToInstant(scheduledDay, zone).toISOString(),
          performance: {},
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || errorData.error || 'Failed to schedule session');
      }

      toast.success('Workout scheduled');
      // Was window.location.reload(): a full page reload to update one list,
      // because the scheduled-sessions hook had no cache to refresh. It does
      // now.
      void invalidateTemplateData(queryClient);
    } catch (error) {
      console.error('Error scheduling session:', error);
      toast.error(
        error instanceof Error ? error.message : 'Could not schedule that workout.'
      );
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
      toast.success('Template deleted');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error(
        error instanceof Error ? error.message : 'Could not delete that template.'
      );
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
      <div className="app-bg py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="forge-card overflow-hidden">
              <div className="bg-gradient-to-br from-surface-300 to-surface-400 dark:from-surface-400 dark:to-surface-500 px-8 py-8">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="h-8 w-48 bg-surface-900 dark:bg-surface-600 rounded-lg animate-pulse mb-2"></div>
                    <div className="h-4 w-64 bg-surface-900 dark:bg-surface-600 rounded animate-pulse"></div>
                  </div>
                  <div className="flex gap-3">
                    <div className="h-10 w-32 bg-surface-900 dark:bg-surface-600 rounded-lg animate-pulse"></div>
                    <div className="h-10 w-36 bg-surface-900 dark:bg-surface-600 rounded-lg animate-pulse"></div>
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
                  <div className="h-2 bg-surface-700 dark:bg-surface-200 rounded-full animate-pulse mb-4"></div>
                  <div className="h-6 bg-surface-700 dark:bg-surface-200 rounded animate-pulse mb-2"></div>
                  <div className="h-4 bg-surface-700 dark:bg-surface-200 rounded animate-pulse mb-4"></div>
                  <div className="h-10 bg-surface-700 dark:bg-surface-200 rounded-lg animate-pulse"></div>
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
      <div className="app-bg py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="forge-card p-8 text-center">
            <div className="bg-danger-50 dark:bg-danger-900/20 p-6 rounded-xl">
              <h2 className="text-xl font-display font-bold tracking-wide text-danger-600 dark:text-danger-400 mb-2">
                Error Loading Templates
              </h2>
              <p className="text-danger-500 dark:text-danger-300 mb-4">{String(hasError)}</p>
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
    <div className="app-bg py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="forge-card overflow-hidden">
            <div className="greeting-gradient px-5 py-6 sm:px-8 sm:py-8 text-white">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 lg:gap-6">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-wide uppercase mb-1.5">Workout Templates</h1>
                  <p className="text-accent-100 text-sm sm:text-base">
                    Create, organize, and start your perfect workouts
                  </p>
                </div>
                {/* Primary action first on mobile, and both full-height so the
                    labels stop wrapping mid-phrase. The secondary button was
                    white/80 with grey text on a saturated gradient, which read
                    as disabled; a translucent white fill sits on the gradient
                    without fighting it. */}
                <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:gap-3">
                  <motion.button
                    onClick={() => router.push('/session/log')}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    transition={springSnappy}
                    className="btn min-h-[46px] flex items-center justify-center gap-2 whitespace-nowrap border border-white/40 bg-white/10 text-white hover:bg-white/20 tap-control"
                  >
                    <ClockIcon className="w-5 h-5 shrink-0" />
                    Log Past Workout
                  </motion.button>
                  <motion.button
                    onClick={() => router.push('/template/create')}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    transition={springSnappy}
                    className="btn min-h-[46px] flex items-center justify-center gap-2 whitespace-nowrap bg-white text-accent-700 shadow-sm hover:bg-accent-50 tap-control"
                  >
                    <PlusCircleIcon className="w-5 h-5 shrink-0" />
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
                whileFocus={prefersReducedMotion ? {} : { scale: 1.02, boxShadow: '0 0 0 3px rgb(var(--accent-500) / 0.25)' }}
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
              <div className="p-2 bg-accent-100 dark:bg-accent-900/30 rounded-xl">
                <ClockIcon className="w-6 h-6 text-accent-600 dark:text-accent-400" />
              </div>
              <h2 className="text-2xl font-display font-bold tracking-wide text-surface-50 dark:text-white">
                Scheduled Sessions
              </h2>
              <span className="px-3 py-1 bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400 rounded-full text-sm font-medium">
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
                        <h3 className="text-lg font-display font-bold text-surface-50 dark:text-white mb-2">
                          {templates?.find(
                            (t: WorkoutTemplate) => t.id === session.workoutTemplateId,
                          )?.name || 'Unknown Template'}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-surface-500 dark:text-surface-600">
                          <CalendarDaysIcon className="w-4 h-4" />
                          <span>
                            Scheduled for {session.scheduledAt
                              ? formatCivilDayRelative(
                                  dayKeyOf(session.scheduledAt, timeZone),
                                  timeZone,
                                )
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
            <div className="p-2 bg-award-100 dark:bg-award-900/30 rounded-xl">
              <StarIconSolid className="w-6 h-6 text-award-600 dark:text-award-400" />
            </div>
            <h2 className="text-2xl font-display font-bold tracking-wide text-surface-50 dark:text-white">
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
                <TemplateCard
                  key={template.id}
                  template={template}
                  index={index}
                  useMetric={profile?.useMetric ?? false}
                  onToggleFavorite={handleToggleFavorite}
                  onSchedule={handleScheduleTemplate}
                  onDelete={handleDeleteTemplate}
                />
              ))}
            </div>
          )}
        </section>

        {/* All Templates Section */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-accent-100 dark:bg-accent-900/30 rounded-xl">
              <QuestionMarkCircleIcon className="w-6 h-6 text-accent-600 dark:text-accent-400" />
            </div>
            <h2 className="text-2xl font-display font-bold tracking-wide text-surface-50 dark:text-white">
              All Templates
            </h2>
          </div>

          {unscheduledTemplates.length === 0 ? (
            <div className="forge-card p-8 text-center">
              {/* A search that matches nothing is not the same as having no
                  templates — offering "create your first" to someone with a
                  library of twenty is just confusing. */}
              {searchTerm.trim() ? (
                <>
                  <MagnifyingGlassIcon className="w-16 h-16 text-surface-600 mx-auto mb-4" />
                  <p className="text-surface-500 dark:text-surface-600 mb-2">
                    No templates match “{searchTerm}”
                  </p>
                  <motion.button
                    onClick={() => setSearchTerm('')}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    transition={springSnappy}
                    className="btn btn-tertiary inline-flex items-center gap-2 mt-2"
                  >
                    Clear search
                  </motion.button>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {unscheduledTemplates.map((template, index) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  index={index}
                  useMetric={profile?.useMetric ?? false}
                  onToggleFavorite={handleToggleFavorite}
                  onSchedule={handleScheduleTemplate}
                  onDelete={handleDeleteTemplate}
                />
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
