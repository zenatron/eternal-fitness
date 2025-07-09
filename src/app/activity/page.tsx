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

// 🚀 Fetch function for JSON-based sessions
const fetchSessions = async (): Promise<SessionWithTemplateName[]> => {
  const response = await fetch('/api/session-json');
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || 'Failed to fetch sessions');
  }
  const result = await response.json();
  return result.data || [];
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
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700">
              <div className="text-center mb-6">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full w-16 h-16 mx-auto mb-4">
                  <TrashIcon className="w-10 h-10 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Delete Session
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Are you sure you want to delete{' '}
                  <span className="font-semibold text-gray-900 dark:text-white">"{sessionName}"</span>?
                </p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                  This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="btn btn-secondary flex-1"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  className="btn btn-danger flex-1"
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
                      Delete Session
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
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700">
              <div className="text-center mb-6">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full w-16 h-16 mx-auto mb-4">
                  <PencilIcon className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Edit Session</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Update your workout session details
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label htmlFor="duration" className="form-item-heading mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    id="duration"
                    type="number"
                    value={duration}
                    onChange={(e) =>
                      setDuration(parseInt(e.target.value) || 0)
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
                  onClick={() => {
                    if (duration <= 0) {
                      alert('Duration must be greater than 0 minutes');
                      return;
                    }
                    onSave({ notes, duration });
                  }}
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
  const { profile } = useProfile();
  const {
    data: sessions,
    isLoading,
    error,
    refetch,
  } = useQuery<SessionWithTemplateName[]>({
    queryKey: ['json-sessions'],
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
  const [editingSession, setEditingSession] = useState<SessionWithTemplateName | null>(null);
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-br from-green-600 via-emerald-600 to-green-800 px-8 py-8 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => router.back()}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                    aria-label="Go back"
                  >
                    <ArrowLeftIcon className="h-6 w-6" />
                  </button>
                  <div>
                    <h1 className="text-3xl font-bold mb-2">Activity History 📊</h1>
                    <p className="text-green-100">
                      Track your fitness journey and celebrate your progress
                    </p>
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="text-right">
                    <p className="text-green-100 text-sm">Total Sessions</p>
                    <p className="text-2xl font-bold">
                      {sessions?.length || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Loading your activity history...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center"
          >
            <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl">
              <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">
                Error Loading Activity
              </h2>
              <p className="text-red-500 dark:text-red-300 mb-4">{String(error)}</p>
              <button
                onClick={() => refetch()}
                className="btn btn-danger"
              >
                Try Again
              </button>
            </div>
          </motion.div>
        )}

        {/* Session List */}
        {!isLoading && !error && (
          <div className="space-y-6">
            {sessions && sessions.length > 0 ? (
              sessions.map((session, index) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-500"></div>
                  <div className="p-6">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
                            <CalendarDaysIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                              {session.workoutTemplate?.name || 'Untitled Workout'}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {formatUTCDateToLocalDateFriendly(session.completedAt)}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                            <ClockIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                              {formatDuration(session.duration)}
                            </p>
                            <p className="text-xs text-blue-500 dark:text-blue-500">Duration</p>
                          </div>

                          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                            <div className="h-5 w-5 bg-purple-600 dark:bg-purple-400 rounded mx-auto mb-1"></div>
                            <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                              {formatVolume(session.totalVolume, profile?.useMetric)}
                            </p>
                            <p className="text-xs text-purple-500 dark:text-purple-500">Volume</p>
                          </div>

                          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center">
                            <div className="h-5 w-5 bg-orange-600 dark:bg-orange-400 rounded mx-auto mb-1"></div>
                            <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                              {session.totalSets || 0}
                            </p>
                            <p className="text-xs text-orange-500 dark:text-orange-500">Sets</p>
                          </div>

                          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                            <div className="h-5 w-5 bg-green-600 dark:bg-green-400 rounded mx-auto mb-1"></div>
                            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                              {session.totalExercises || 0}
                            </p>
                            <p className="text-xs text-green-500 dark:text-green-500">Exercises</p>
                          </div>
                        </div>

                        {session.notes && (
                          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              <span className="font-medium">Notes: </span>
                              {session.notes}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleEditClick(session)}
                          className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                          aria-label="Edit session"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(session)}
                          className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                          aria-label="Delete session"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center"
              >
                <CalendarDaysIcon className="w-20 h-20 text-gray-400 mx-auto mb-6" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  No Activity Yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Start your first workout to see your activity history here!
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => router.push('/templates')}
                    className="btn btn-primary inline-flex items-center gap-2"
                  >
                    <CalendarDaysIcon className="w-5 h-5" />
                    Browse Templates
                  </button>
                  <Link
                    href="/session/start"
                    className="btn btn-quaternary inline-flex items-center justify-center"
                  >
                    Start a Session
                  </Link>
                </div>
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
