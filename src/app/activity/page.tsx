'use client';

import { useQuery } from '@tanstack/react-query';
import { WorkoutSession, WorkoutTemplate } from '@/types/workout'; // Adjust if needed
import { ArrowLeftIcon, CalendarDaysIcon, ClockIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { formatUTCDateToLocalDateFriendly } from '@/utils/dateUtils';
import { formatVolume } from '@/utils/formatters';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

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

export default function ActivityPage() {
    const router = useRouter();
    const { data: sessions, isLoading, error, refetch } = useQuery<SessionWithTemplateName[]>({ 
        queryKey: ['sessions'],
        queryFn: fetchSessions,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const formatDuration = (minutes?: number): string => {
        if (minutes === undefined || minutes === null || minutes <= 0) return '-';
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    };

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
                        <p className="mt-4 text-secondary">Loading your activity history...</p>
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
                                                    {formatUTCDateToLocalDateFriendly(session.completedAt)}
                                                </span>
                                                <span className="flex items-center gap-1 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-lg">
                                                     <ClockIcon className="h-4 w-4" />
                                                     {formatDuration(session.duration)}
                                                </span>
                                                <span className="bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-lg">
                                                    {formatVolume(session.totalVolume)} Vol.
                                                </span>
                                            </div>
                                        </div>
                                        {/* Optional: Link to view session details? */} 
                                         {/* <Link href={`/session/${session.id}`} className="btn btn-secondary text-sm">View</Link> */} 
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
                                <p className="text-secondary mb-4">No completed sessions found.</p>
                                <Link href="/session/start" className="btn btn-quaternary inline-flex items-center justify-center">
                                    Start a Session
                                </Link>
                            </motion.div>
                        )}
                         {/* TODO: Add Pagination Controls */} 
                    </div>
                )}
            </div>
        </div>
    );
} 