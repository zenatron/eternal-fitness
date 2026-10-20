import Link from 'next/link';
import { WorkoutSession } from '@/types/workout';
import { dayKeyOf, formatCivilDayRelative } from '@/utils/datetime';
import { useTimeZone } from '@/lib/hooks/useTimeZone';
import { DashboardCard } from './DashboardCard';

/** The dashboard query projects the template's name alongside each session. */
type UpcomingSession = WorkoutSession & { workoutTemplate?: { id: string; name: string } | null };

interface UpcomingWorkoutsCardProps {
  sessions: UpcomingSession[] | undefined;
}

export function UpcomingWorkoutsCard({ sessions }: UpcomingWorkoutsCardProps) {
  const timeZone = useTimeZone();
  const list = Array.isArray(sessions) ? sessions : [];

  return (
    <DashboardCard title="Scheduled" action={{ href: '/templates', label: 'Workouts' }} className="h-full">
      {list.length === 0 ? (
        <p className="py-4 text-sm text-surface-500 dark:text-surface-600">
          Nothing scheduled. Plan a session from any workout&apos;s menu.
        </p>
      ) : (
        <ul className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
          {list.map((session) => (
            <li key={session.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0">
                {/* The name comes with the dashboard payload; each row used to
                    fetch its whole template just to read it. */}
                <p className="truncate text-sm font-medium text-surface-50 dark:text-white">
                  {session.workoutTemplate?.name ?? 'Workout'}
                </p>
                <p className="text-xs text-surface-500 dark:text-surface-600">
                  {session.scheduledAt
                    ? formatCivilDayRelative(dayKeyOf(session.scheduledAt, timeZone), timeZone)
                    : 'Unscheduled'}
                </p>
              </div>
              {session.workoutTemplateId && (
                <Link
                  // `scheduledSessionId` is what the session page reads. This
                  // link sent `sessionId`, so a workout started from here was
                  // logged as a new session and the scheduled one stayed open.
                  href={`/session/active/${session.workoutTemplateId}?scheduledSessionId=${session.id}`}
                  className="btn btn-primary shrink-0 !px-3 !py-1.5 text-xs"
                >
                  Start
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}
