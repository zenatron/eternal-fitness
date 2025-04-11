import { useEffect, useState } from 'react';
import { WorkoutSession } from '@/types/workout';

export function useScheduledSessions() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchScheduledSessions() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/session/scheduled');

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();
        setSessions(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error('Failed to fetch scheduled sessions'),
        );
        console.error('Error fetching scheduled sessions:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchScheduledSessions();
  }, []);

  return { sessions, isLoading, error };
}
