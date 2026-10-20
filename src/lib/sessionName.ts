import { sql } from 'drizzle-orm';
import { workoutSessions } from '@/lib/db/schema';

/**
 * The name a session was logged under, read from its template snapshot.
 *
 * Sessions outlive their template link: ad-hoc logs never had one, and deleting
 * a template keeps its history but clears the link. Every list used to render
 * those as "Quick Workout" — including ad-hoc workouts the user had named.
 * Projected in SQL so lists never pull the snapshot itself.
 */
export const snapshotNameSql = sql<string | null>`${workoutSessions.performanceData} #>> '{templateSnapshot,metadata,name}'`;

export { sessionDisplayName } from '@/utils/sessionName';
