'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTemplates } from '@/lib/hooks/useTemplates';
import { useScheduledSessions } from '@/lib/hooks/useScheduledSessions';
import { PlusCircleIcon, MagnifyingGlassIcon, PlayCircleIcon, CalendarDaysIcon, XMarkIcon, ClockIcon } from '@heroicons/react/24/outline';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { motion, AnimatePresence } from 'framer-motion';
import { formatVolume } from '@/utils/formatters';
import { useProfile } from '@/lib/hooks/useProfile';
import { formatUTCDateToLocalDateFriendly } from '@/utils/dateUtils';

// Modal component for scheduling
function ScheduleModal({ 
  isOpen, 
  onClose, 
  onSchedule, 
  templateName 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSchedule: (date: Date) => void; 
  templateName: string 
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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-heading">Schedule Workout</h3>
                <button 
                  onClick={onClose}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <p className="mb-4 text-secondary">{`Select a date to schedule "${templateName}"`}</p>
              
              <div className="mb-6 flex justify-center">
                <DatePicker
                  selected={selectedDate}
                  onChange={(date) => setSelectedDate(date as Date)}
                  minDate={new Date()}
                  inline
                  className="form-input"
                />
              </div>
              
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={onClose}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    onSchedule(selectedDate);
                    onClose();
                  }}
                  className="btn btn-primary"
                >
                  Schedule
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function StartSessionPage() {
  const router = useRouter();
  const { templates, isLoading: templatesLoading, error: templatesError } = useTemplates();
  const { sessions: scheduledSessions, isLoading: scheduledLoading, error: scheduledError } = useScheduledSessions();
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for schedule modal
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedTemplateName, setSelectedTemplateName] = useState('');

  const { profile } = useProfile();

  const filteredTemplates = templates?.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectTemplate = (templateId: string) => {
    // Navigate to the active session page, passing the templateId
    router.push(`/session/active/${templateId}`);
  };
  
  const handleScheduleTemplate = (templateId: string, templateName: string) => {
    setSelectedTemplateId(templateId);
    setSelectedTemplateName(templateName);
    setIsScheduleModalOpen(true);
  };
  
  const handleConfirmSchedule = async (date: Date) => {
    if (!selectedTemplateId) return;
    
    try {
      // Create a new session with scheduledAt date
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          scheduledAt: date.toISOString(),
          // We don't have performance data yet as the session hasn't been completed
          performance: [] 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to schedule session');
      }
      
      // Redirect to dashboard or activity page
      router.push('/');
      
    } catch (error) {
      console.error('Error scheduling session:', error);
      // You could add error toast notification here
    }
  };

  // Start a scheduled session - updates the session and navigates to active session
  const handleStartScheduledSession = async (scheduledSessionId: string, templateId: string) => {
    try {
      // We'll start the scheduled session using the template ID
      // The existing session will be updated when we complete the workout
      router.push(`/session/active/${templateId}?scheduledSessionId=${scheduledSessionId}`);
    } catch (error) {
      console.error('Error starting scheduled session:', error);
    }
  };

  const isLoading = templatesLoading || scheduledLoading;
  const error = templatesError || scheduledError;

  if (isLoading) {
    return (
        <div className="min-h-screen app-bg py-12 px-4">
            <div className="max-w-2xl mx-auto text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto"></div>
                <p className="mt-4 text-secondary">Loading...</p>
            </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="min-h-screen app-bg py-12 px-4">
            <div className="max-w-2xl mx-auto">
                 <div className="p-4 bg-red-100 text-red-700 rounded-lg text-center">
                    Error loading data: {String(error)}
                 </div>
            </div>
        </div>
    );
   }

  return (
    <div className="min-h-screen app-bg py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-8">
          Start a New Session
        </h1>

        {/* Scheduled Sessions Section */}
        {scheduledSessions && scheduledSessions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-heading mb-4 flex items-center">
              <ClockIcon className="w-5 h-5 mr-2" />
              Scheduled Sessions
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {scheduledSessions.map((session) => (
                  <li key={session.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-heading">{session.workoutTemplate?.name}</p>
                        <p className="text-sm text-secondary mt-1">
                          Scheduled for: {session.scheduledAt ? formatUTCDateToLocalDateFriendly(session.scheduledAt) : 'Unknown date'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleStartScheduledSession(session.id, session.workoutTemplateId)}
                        className="btn btn-quaternary btn-sm flex items-center gap-1"
                        aria-label="Start scheduled session"
                      >
                        <PlayCircleIcon className="w-4 h-4" />
                        Start
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Search and Create Buttons */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder="Search your templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pl-10 w-full"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
          <Link href="/template/create" className="btn btn-secondary flex items-center justify-center gap-2">
            <PlusCircleIcon className="w-5 h-5" />
            Create New Template
          </Link>
        </div>

        {/* Template List */}
        <div>
          <h2 className="text-xl font-semibold text-heading mb-4">Your Templates</h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTemplates && filteredTemplates.length > 0 ? (
                filteredTemplates.map((template) => (
                  <li key={template.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-heading">{template.name}</p>
                        <p className="text-sm text-secondary mt-1">
                          {template.sets?.length || 0} sets • {template.totalVolume > 0 ? `${formatVolume(template.totalVolume)} ${profile?.useMetric ? 'kg' : 'lbs'}` : 'No volume recorded'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleScheduleTemplate(template.id, template.name)}
                          className="btn btn-secondary btn-sm flex items-center gap-1"
                          aria-label="Schedule session"
                        >
                          <CalendarDaysIcon className="w-4 h-4" />
                          Schedule
                        </button>
                        <button
                          onClick={() => handleSelectTemplate(template.id)}
                          className="btn btn-quaternary btn-sm flex items-center gap-1"
                          aria-label="Start session"
                        >
                          <PlayCircleIcon className="w-4 h-4" />
                          Start
                        </button>
                      </div>
                    </div>
                  </li>
                ))
              ) : (
                <li className="p-6 text-center text-secondary">
                  {templates && templates.length === 0
                    ? "You haven't created any workout templates yet."
                    : "No templates match your search."}
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
      
      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onSchedule={handleConfirmSchedule}
        templateName={selectedTemplateName}
      />
    </div>
  );
} 