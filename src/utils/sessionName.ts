/** Current template name first (renames show up in history), then the snapshot. */
export function sessionDisplayName(session: {
  workoutTemplate?: { name: string | null } | null;
  snapshotName?: string | null;
}): string {
  return session.workoutTemplate?.name || session.snapshotName || 'Quick Workout';
}
