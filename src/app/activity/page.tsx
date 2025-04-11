'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { WorkoutSession } from '@/types/workout'; // Adjust if needed
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  ClockIcon,
  DocumentTextIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { formatUTCDateToLocalDateFriendly } from '@/utils/dateUtils';
import { formatVolume } from '@/utils/formatters';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfile } from '@/lib/hooks/useProfile';
// Define a type for the session data returned by the API (includes template name)
type SessionWithTemplateName = WorkoutSession & {
  workoutTemplate: { name: string } | null;
};

// Fetch function for sessions
const fetchSessions = async (): Promise<SessionWithTemplateName[]> => {
  const response = await fetch('/api/session');
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || 'Failed to fetch sessions');
  }
  return response.json();
};

// Delete modal component
function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  sessionName,
  isDeleting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  sessionName: string;
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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full border border-gray-200 dark:border-gray-700">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-heading">
                  Delete Session
                </h3>
                <p className="text-secondary mt-2">
                  {`Are you sure you want to delete the "${sessionName}" session? This action cannot be undone.`}
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={onClose}
                  className="btn btn-secondary"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  className="btn btn-danger flex items-center"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <TrashIcon className="h-4 w-4 mr-1" />
                      Delete
                    </>
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

// Edit modal component
function EditSessionModal({
  isOpen,
  onClose,
  onSave,
  session,
  isSaving,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { notes: string; duration: number }) => void;
  session: SessionWithTemplateName;
  isSaving: boolean;
}) {
  const [notes, setNotes] = useState(session.notes || '');
  const [duration, setDuration] = useState(session.duration || 0);

  // Reset state when session changes
  useEffect(() => {
    if (session) {
      setNotes(session.notes || '');
      setDuration(session.duration || 0);
    }
  }, [session]);

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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-heading">Edit Session</h3>
                <button
                  onClick={onClose}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label htmlFor="duration" className="form-item-heading mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    id="duration"
                    type="number"
                    min="1"
                    value={duration}
                    onChange={(e) =>
                      setDuration(Math.max(1, parseInt(e.target.value) || 0))
                    }
                    className="form-input"
                  />
                </div>

                <div>
                  <label htmlFor="notes" className="form-item-heading mb-1">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="form-input min-h-[100px]"
                    placeholder="Add session notes here..."
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={onClose}
                  className="btn btn-secondary"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={() => onSave({ notes, duration })}
                  className="btn btn-primary flex items-center"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <PencilIcon className="h-4 w-4 mr-1" />
                      Save Changes
                    </>
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

export default function ActivityPage() {
  const router = useRouter();
  const {
    data: sessions,
    isLoading,
    error,
    refetch,
  } = useQuery<SessionWithTemplateName[]>({
    queryKey: ['sessions'],
    queryFn: fetchSessions,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // State for delete modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [selectedSessionName, setSelectedSessionName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // State for edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSession, setEditingSession] =
    useState<SessionWithTemplateName | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const formatDuration = (minutes?: number): string => {
    if (minutes === undefined || minutes === null || minutes <= 0) return '-';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  // Handle opening delete confirmation modal
  const handleDeleteClick = (session: SessionWithTemplateName) => {
    setSelectedSessionId(session.id);
    setSelectedSessionName(session.workoutTemplate?.name || 'Untitled Workout');
    setIsDeleteModalOpen(true);
  };

  // Handle opening edit modal
  const handleEditClick = (session: SessionWithTemplateName) => {
    setEditingSession(session);
    setIsEditModalOpen(true);
  };

  // Handle confirm deletion
  const handleConfirmDelete = async () => {
    if (!selectedSessionId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/session/${selectedSessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Failed to delete session' }));
        throw new Error(errorData.error || 'Failed to delete session');
      }

      // Close modal and refresh sessions
      setIsDeleteModalOpen(false);
      refetch();
    } catch (error) {
      console.error('Error deleting session:', error);
      // You could add error toast notification here
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle save edits
  const handleSaveEdit = async (data: { notes: string; duration: number }) => {
    if (!editingSession) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/session/${editingSession.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: data.notes,
          duration: data.duration,
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Failed to update session' }));
        throw new Error(errorData.error || 'Failed to update session');
      }

      // Close modal and refresh sessions
      setIsEditModalOpen(false);
      refetch();
    } catch (error) {
      console.error('Error updating session:', error);
      // You could add error toast notification here
    } finally {
      setIsSaving(false);
    }
  };

  const { profile } = useProfile();

  return (
    <div className="min-h-screen app-bg py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-heading flex-1">
            Activity History
          </h1>
          {/* Optional: Add filtering controls here later */}
        </motion.div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent mx-auto"></div>
            <p className="mt-4 text-secondary">
              Loading your activity history...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 mb-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl shadow-lg text-center"
          >
            <h2 className="text-xl font-bold mb-2">Error</h2>
            <p className="mb-4">{String(error)}</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Try Again
            </button>
          </motion.div>
        )}

        {/* Session List */}
        {!isLoading && !error && (
          <div className="space-y-4">
            {sessions && sessions.length > 0 ? (
              sessions.map((session, index) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-5 hover:shadow-xl transition-shadow"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="font-semibold text-lg text-heading">
                        {session.workoutTemplate?.name || 'Untitled Workout'}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-secondary mt-2 flex-wrap">
                        <span className="flex items-center gap-1 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-lg">
                          <CalendarDaysIcon className="h-4 w-4" />
                          {formatUTCDateToLocalDateFriendly(
                            session.completedAt,
                          )}
                        </span>
                        <span className="flex items-center gap-1 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-lg">
                          <ClockIcon className="h-4 w-4" />
                          {formatDuration(session.duration)}
                        </span>
                        <span className="bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-lg">
                          {formatVolume(
                            session.totalVolume,
                            profile?.useMetric,
                          )}{' '}
                          Vol.
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditClick(session)}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                        aria-label="Edit session"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(session)}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                        aria-label="Delete session"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  {session.notes && (
                    <div className="mt-4 pt-4 border-t dark:border-gray-700 text-sm text-secondary flex items-start gap-2">
                      <DocumentTextIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <p className="whitespace-pre-wrap">{session.notes}</p>
                    </div>
                  )}
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700"
              >
                <p className="text-secondary mb-4">
                  No completed sessions found.
                </p>
                <Link
                  href="/session/start"
                  className="btn btn-quaternary inline-flex items-center justify-center"
                >
                  Start a Session
                </Link>
              </motion.div>
            )}
            {/* TODO: Add Pagination Controls */}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        sessionName={selectedSessionName}
        isDeleting={isDeleting}
      />

      {/* Edit Session Modal */}
      {editingSession && (
        <EditSessionModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveEdit}
          session={editingSession}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
