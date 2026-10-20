'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateTemplateData, queryKeys } from '@/lib/queryKeys';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PlusIcon, MagnifyingGlassIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import type { ComponentType } from 'react';
import type { DatePickerProps } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ModalShell } from '@/components/ui/ModalShell';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

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
        className="h-[280px] w-[300px] animate-pulse rounded-xl bg-black/[0.05] dark:bg-white/[0.05]"
        aria-label="Loading calendar"
      />
    ),
  }
);

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
      title={`Schedule ${templateName}`}
      subtitle="Pick a day. It shows up on your dashboard and here."
      maxWidth="max-w-lg"
    >
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
      title="Delete this workout?"
      message={`"${templateName}" will be removed, along with any sessions scheduled from it. Workouts you've already done stay in your history.`}
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

      // History keeps the template's sessions (now unlinked), and the dashboard
      // and scheduled list may have shown it — a bare refetch of this list left
      // those stale.
      void invalidateTemplateData(queryClient, selectedTemplateId);
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.history] });
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
  const useMetric = profile?.useMetric ?? false;
  const count = templates?.length ?? 0;

  const cardProps = {
    useMetric,
    onToggleFavorite: handleToggleFavorite,
    onSchedule: handleScheduleTemplate,
    onDelete: handleDeleteTemplate,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <PageHeader
        title="Workouts"
        description={count > 0 ? `${count} saved routine${count === 1 ? '' : 's'}` : undefined}
        actions={
          <>
            <Link href="/template/create" className="btn btn-primary min-h-[44px] flex-1 sm:flex-none">
              <PlusIcon className="h-4 w-4" />
              New template
            </Link>
            <Link href="/session/log" className="btn btn-tertiary min-h-[44px] flex-1 sm:flex-none">
              Log past workout
            </Link>
          </>
        }
      />

      {isLoadingData ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading workouts">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="forge-card h-[148px] animate-pulse p-4">
              <div className="mb-2 h-4 w-1/2 rounded bg-black/[0.06] dark:bg-white/[0.06]" />
              <div className="h-3 w-2/3 rounded bg-black/[0.05] dark:bg-white/[0.05]" />
            </div>
          ))}
        </div>
      ) : hasError ? (
        <ErrorState what="your workouts" onRetry={() => refetch()} />
      ) : (
        <>
          {count > 4 && (
            <div className="relative mb-6">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-500" />
              <input
                type="search"
                placeholder="Search workouts"
                aria-label="Search workouts"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input !pl-9"
              />
            </div>
          )}

          {scheduledSessions && scheduledSessions.length > 0 && (
            <section className="mb-8">
              <h2 className="section-title mb-2">Scheduled</h2>
              <ul className="forge-card divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                {scheduledSessions.map((session) => {
                  const name =
                    templates?.find((t: WorkoutTemplate) => t.id === session.workoutTemplateId)?.name ?? 'Workout';
                  return (
                    <li key={session.id} className="flex items-center gap-3 px-4 py-3">
                      <CalendarDaysIcon className="h-5 w-5 shrink-0 text-surface-500" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-surface-50 dark:text-white">{name}</p>
                        <p className="text-xs text-surface-500 dark:text-surface-600">
                          {session.scheduledAt
                            ? formatCivilDayRelative(dayKeyOf(session.scheduledAt, timeZone), timeZone)
                            : 'No date'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleStartScheduledSession(session.id, session.workoutTemplateId)}
                        className="btn btn-primary tap-control !px-3 !py-1.5 text-xs"
                        aria-label={`Start ${name}`}
                      >
                        Start
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {favoriteTemplates.length > 0 && (
            <section className="mb-8">
              <h2 className="section-title mb-2">Favorites</h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {favoriteTemplates.map((template) => (
                  <TemplateCard key={template.id} template={template} {...cardProps} />
                ))}
              </div>
            </section>
          )}

          <section>
            {favoriteTemplates.length > 0 && unscheduledTemplates.length > 0 && (
              <h2 className="section-title mb-2">Everything else</h2>
            )}
            {unscheduledTemplates.length === 0 && favoriteTemplates.length === 0 ? (
              <div className="forge-card px-6 py-10 text-center">
                {/* A search that matches nothing is not the same as having no
                    templates — offering "create your first" to someone with a
                    library of twenty is just confusing. */}
                {searchTerm.trim() ? (
                  <>
                    <p className="font-medium text-surface-50 dark:text-white">Nothing matches “{searchTerm}”</p>
                    <button onClick={() => setSearchTerm('')} className="btn btn-tertiary mt-4">
                      Clear search
                    </button>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-surface-50 dark:text-white">No workouts yet</p>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-surface-500 dark:text-surface-600">
                      Build a routine once — exercises, sets, targets — and start it in one tap every time after.
                    </p>
                    <Link href="/template/create" className="btn btn-primary mt-5">
                      <PlusIcon className="h-4 w-4" />
                      Create a workout
                    </Link>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {unscheduledTemplates.map((template) => (
                  <TemplateCard key={template.id} template={template} {...cardProps} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

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
