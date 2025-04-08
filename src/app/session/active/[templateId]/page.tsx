'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTemplate } from '@/lib/hooks/useTemplate';
import { Set as WorkoutSet } from '@/types/workout';
import { useProfile } from '@/lib/hooks/useProfile';
import { ArrowLeftIcon, ClockIcon, CheckCircleIcon, PlayIcon, PauseIcon, DocumentTextIcon, CalendarIcon } from '@heroicons/react/24/outline';

// Type for storing session performance data
type SessionSetPerformance = {
    setId: string; // Original set ID from template
    reps: number | null;
    weight: number | null;
};

type SessionExercisePerformance = {
    exerciseName: string; // Name for display
    sets: SessionSetPerformance[];
};

export default function ActiveSessionPage({ params }: { params: Promise<{ templateId: string }> }) {
    const { templateId } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const scheduledSessionId = searchParams.get('scheduledSessionId');

    const { template, isLoading: templateLoading, error: templateError } = useTemplate(templateId);
    const { profile, isLoading: profileLoading } = useProfile();

    // State to hold the actual performance data entered by the user
    const [sessionPerformance, setSessionPerformance] = useState<SessionExercisePerformance[]>([]);
    const [sessionNotes, setSessionNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    // Timer state
    const [timer, setTimer] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [startTime, setStartTime] = useState<number | null>(null);

    // Initialize session performance state when template data loads
    useEffect(() => {
        if (template?.sets) {
            const initialPerformance: SessionExercisePerformance[] = [];
            const exerciseMap: Record<string, SessionSetPerformance[]> = {};

            template.sets.forEach((set: WorkoutSet) => {
                const exercise = set.exercises?.[0];
                if (!exercise) return;

                if (!exerciseMap[exercise.name]) {
                    exerciseMap[exercise.name] = [];
                }
                // Auto-populate with template values instead of null
                exerciseMap[exercise.name].push({ 
                    setId: set.id, 
                    reps: set.reps, 
                    weight: set.weight 
                });
            });

            for (const name in exerciseMap) {
                initialPerformance.push({ exerciseName: name, sets: exerciseMap[name] });
            }
            setSessionPerformance(initialPerformance);
             // Start timer automatically when template loads? Or require manual start? Manual for now.
             // setIsActive(true);
        }
    }, [template]);

    // Timer effect
     useEffect(() => {
         let interval: NodeJS.Timeout | null = null;
         if (isActive) {
           if (startTime === null) {
             setStartTime(Date.now() - timer * 1000); // Adjust start time if resuming
           }
           interval = setInterval(() => {
             setTimer(prevTimer => prevTimer + 1);
           }, 1000);
         } else if (!isActive && timer !== 0) {
           if (interval) clearInterval(interval);
           setStartTime(null); // Reset start time when paused
         }
         return () => {
           if (interval) clearInterval(interval);
         };
       }, [isActive, timer, startTime]);

    const formatTime = (timeInSeconds: number): string => {
        const hours = Math.floor(timeInSeconds / 3600);
        const minutes = Math.floor((timeInSeconds % 3600) / 60);
        const seconds = timeInSeconds % 60;
        const parts: string[] = [];
        if (hours > 0) parts.push(hours.toString().padStart(2, '0'));
        parts.push(minutes.toString().padStart(2, '0'));
        parts.push(seconds.toString().padStart(2, '0'));
        return parts.join(':');
    };

     const toggleTimer = () => {
         setIsActive(!isActive);
     };

     const stopTimerAndSave = async () => {
         setIsActive(false);
         const finalDurationMinutes = Math.max(1, Math.round(timer / 60)); // Duration in minutes, ensure at least 1

         // --- Call API to save session ---
         setIsSaving(true);
         setSaveMessage('');

         // Prepare data for API
         const sessionData = {
             templateId: template?.id,
             duration: finalDurationMinutes,
             notes: sessionNotes,
             performance: sessionPerformance, // Send the detailed performance data
             // If we have a scheduled session ID, include it to update that session
             scheduledSessionId: scheduledSessionId || undefined
         };
          
         // Basic validation: Check if templateId exists
         if (!sessionData.templateId) {
            setSaveMessage('Error: Template ID is missing. Cannot save session.');
            setIsSaving(false);
            return;
         }
         
         // Optional: Add validation for performance data if needed

         try {
             const response = await fetch('/api/session', { // New API endpoint
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify(sessionData),
             });

             if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
                 throw new Error(errorData.error || 'Failed to save session');
             }

             setSaveMessage('Session saved successfully!');
             // Redirect to activity/history page or dashboard after save
             setTimeout(() => {
                 router.push('/activity'); // Go back to activity page
             }, 1000);

         } catch (error) {
             console.error('Error saving session:', error);
             setSaveMessage(`Error: ${error instanceof Error ? error.message : 'Failed to save session'}`);
             setIsSaving(false); // Allow retry on error
         }
         // No finally block for setIsSaving(false) here, handled in error case or success redirect
     };

    // Handler to update performance state
    const handlePerformanceChange = (
        exerciseIndex: number,
        setIndex: number,
        field: 'reps' | 'weight',
        value: string
    ) => {
        const updatedPerformance = [...sessionPerformance];
        const exercisePerf = updatedPerformance[exerciseIndex];
        if (!exercisePerf || !exercisePerf.sets[setIndex]) return;

        const numericValue = value === '' ? null : parseFloat(value); // Allow clearing and floats for weight

        // Basic validation: Allow null (empty), or non-negative numbers
        if (value !== '' && (isNaN(numericValue as number) || (numericValue as number) < 0)) {
            // Ignore invalid input (e.g., negative numbers, text)
            return; 
        }

        exercisePerf.sets[setIndex][field] = numericValue;
        setSessionPerformance(updatedPerformance);
    };


    const isLoading = templateLoading || profileLoading;

    if (isLoading) {
         return (
             <div className="min-h-screen app-bg py-12 px-4">
                 <div className="max-w-2xl mx-auto text-center">
                     <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto"></div>
                     <p className="mt-4 text-secondary">Loading session...</p>
                 </div>
             </div>
         );
    }

    if (templateError || !template) {
         return (
             <div className="min-h-screen app-bg py-12 px-4">
                 <div className="max-w-2xl mx-auto">
                      <div className="p-4 bg-red-100 text-red-700 rounded-lg text-center">
                         Error loading template: {String(templateError || 'Template not found')}
                      </div>
                 </div>
             </div>
         );
    }

    return (
        <div className="min-h-screen app-bg py-8 px-4">
            <div className="max-w-3xl mx-auto">
                 {/* Header */}
                 <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => router.back()} // Go back to start page or template detail
                        className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                        aria-label="Go back"
                    >
                        <ArrowLeftIcon className="h-5 w-5" />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex-1">
                         Active Session: {template.name}
                    </h1>
                 </div>

                 {/* Session Type Indicator (Scheduled vs New) */}
                 {scheduledSessionId && (
                     <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4 flex items-center gap-2 text-blue-700 dark:text-blue-300">
                         <CalendarIcon className="h-5 w-5" />
                         <span>You are completing a scheduled workout</span>
                     </div>
                 )}

                 {/* Timer Display and Controls */}
                 <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 mb-6 flex items-center justify-between flex-wrap gap-2">
                     <div className="flex items-center gap-2">
                        <ClockIcon className="h-6 w-6 text-primary" />
                        <span className="text-2xl font-mono font-semibold text-heading">{formatTime(timer)}</span>
                     </div>
                     <div className="flex items-center gap-2">
                         <button onClick={toggleTimer} className={`btn btn-sm ${isActive ? 'btn-warning' : 'btn-success'}`}>
                            {isActive ? <PauseIcon className="h-5 w-5 mr-1" /> : <PlayIcon className="h-5 w-5 mr-1" />} 
                            {isActive ? 'Pause' : 'Start'}
                         </button>
                         <button
                             onClick={stopTimerAndSave}
                             disabled={isSaving}
                             className="btn btn-sm btn-danger flex items-center"
                         >
                             {isSaving ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                            ) : (
                                 <CheckCircleIcon className="h-5 w-5 mr-1" />
                            )}
                             Finish & Save
                         </button>
                     </div>
                 </div>
                 {saveMessage && (
                   <p className={`mb-4 text-sm text-center ${saveMessage.startsWith('Error:') ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      {saveMessage}
                   </p>
                 )}


                 {/* Exercises and Sets Input */} 
                 <div className="space-y-6">
                     {sessionPerformance.map((exercisePerf, exerciseIndex) => (
                         <div key={exerciseIndex} className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden border dark:border-gray-700">
                              <h3 className="text-lg font-semibold p-4 bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700 text-heading">
                                 {exercisePerf.exerciseName}
                              </h3>
                              <div className="p-4 overflow-x-auto">
                                 <table className="w-full text-sm min-w-[400px]">
                                     <thead>
                                         <tr className="text-secondary border-b dark:border-gray-600">
                                             <th className="px-2 py-2 text-left w-[10%]">Set</th>
                                             <th className="px-2 py-2 text-center w-[30%]">Target</th> {/* Show template target */}
                                             <th className="px-2 py-2 text-right w-[30%]">Actual Reps</th>
                                             <th className="px-2 py-2 text-right w-[30%]">Actual Weight ({profile?.useMetric ? 'kg' : 'lbs'})</th>
                                         </tr>
                                     </thead>
                                     <tbody>
                                         {exercisePerf.sets.map((setPerf, setIndex) => {
                                            // Find original set from template for target info
                                            const originalSet = template.sets.find(s => s.id === setPerf.setId);
                                            return (
                                                 <tr key={setIndex} className="border-b dark:border-gray-700 last:border-0">
                                                     <td className="px-2 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                                                         {setIndex + 1}
                                                     </td>
                                                      <td className="px-2 py-2 text-center text-gray-500 dark:text-gray-400">
                                                         {originalSet ? `${originalSet.reps}r @ ${originalSet.weight}${profile?.useMetric ? 'kg' : 'lbs'}` : '-'}
                                                     </td>
                                                     <td className="px-2 py-2">
                                                         <input
                                                             type="number"
                                                             min="0"
                                                             value={setPerf.reps ?? ''} // Use ?? '' to handle null
                                                             onChange={(e) => handlePerformanceChange(exerciseIndex, setIndex, 'reps', e.target.value)}
                                                             className="form-input-sm text-right"
                                                             placeholder="-"
                                                             disabled={isSaving}
                                                         />
                                                     </td>
                                                     <td className="px-2 py-2">
                                                         <input
                                                             type="number"
                                                             min="0"
                                                             step="0.5" // Allow decimals for weight
                                                             value={setPerf.weight ?? ''} // Use ?? '' to handle null
                                                             onChange={(e) => handlePerformanceChange(exerciseIndex, setIndex, 'weight', e.target.value)}
                                                             className="form-input-sm text-right"
                                                             placeholder="-"
                                                             disabled={isSaving}
                                                         />
                                                     </td>
                                                 </tr>
                                             );
                                         })}
                                     </tbody>
                                 </table>
                              </div>
                         </div>
                     ))}
                 </div>

                 {/* Session Notes */} 
                 <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow p-4">
                     <label htmlFor="sessionNotes" className="flex items-center gap-2 text-lg font-semibold text-heading mb-2">
                         <DocumentTextIcon className="w-5 h-5" /> Session Notes
                     </label>
                     <textarea
                         id="sessionNotes"
                         rows={3}
                         value={sessionNotes}
                         onChange={(e) => setSessionNotes(e.target.value)}
                         className="form-input w-full"
                         placeholder="How did the session go? Any PRs?"
                         disabled={isSaving}
                     />
                 </div>

                 {/* Bottom Save Button (redundant with top one, maybe remove or keep based on UX pref) */}
                 <div className="mt-8 text-center">
                      <button
                          onClick={stopTimerAndSave}
                          disabled={isSaving}
                          className="btn btn-danger btn-lg flex items-center mx-auto"
                      >
                           {isSaving ? (
                               <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                           ) : (
                                <CheckCircleIcon className="h-6 w-6 mr-1" />
                           )}
                           Finish & Save Session
                      </button>
                 </div>
            </div>
        </div>
    );
} 