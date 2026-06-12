import { db } from '@/lib/db';
import { users, workoutSessions, userStats, monthlyStats, workoutTemplates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function deleteUserById(userId: string) {
  if (!userId) throw new Error('User ID is required for deletion');

  const result = await db.transaction(async (tx) => {
    await tx.delete(userStats).where(eq(userStats.userId, userId));
    await tx.delete(monthlyStats).where(eq(monthlyStats.userId, userId));
    await tx.delete(workoutSessions).where(eq(workoutSessions.userId, userId));

    const deletedTemplates = await tx.delete(workoutTemplates).where(eq(workoutTemplates.userId, userId)).returning({ id: workoutTemplates.id });

    const [deletedUser] = await tx.delete(users).where(eq(users.id, userId)).returning({ id: users.id });

    if (!deletedUser) throw new Error('User not found');

    return {
      userId: deletedUser.id,
      templatesDeleted: deletedTemplates.length,
    };
  });

  return {
    success: true,
    message: 'User profile and associated data deleted successfully.',
    data: result,
  };
}
