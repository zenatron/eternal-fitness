import {NextRequest} from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { userStats, workoutTemplates } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { ActiveWorkoutSessionData, WorkoutTemplateData } from '@/types/workout';
import { z } from 'zod';
import { errorResponse, successResponse } from '@/lib/api/response';

const recoverSessionSchema = z.object({
  templateId: z.string(),
  forceRecover: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const validationResult = recoverSessionSchema.safeParse(body);
    if (!validationResult.success) {
      return errorResponse('Invalid recovery data', 400, validationResult.error.errors);
    }

    const { templateId, forceRecover } = validationResult.data;

    const [stats] = await db
      .select({
        activeWorkoutId: userStats.activeWorkoutId,
        activeWorkoutData: userStats.activeWorkoutData,
        activeWorkoutStartedAt: userStats.activeWorkoutStartedAt,
      })
      .from(userStats)
      .where(eq(userStats.userId, userId));

    if (!stats?.activeWorkoutId || !stats.activeWorkoutData) {
      return errorResponse('No active workout session found to recover', 404);
    }

    const currentSessionData = stats.activeWorkoutData as ActiveWorkoutSessionData;

    const issues: string[] = [];
    if (!currentSessionData.templateId) issues.push('Missing template ID');
    if (!currentSessionData.originalTemplate) issues.push('Missing original template data');
    if (!currentSessionData.startedAt) issues.push('Missing start time');
    if (currentSessionData.templateId !== templateId) {
      issues.push(`Template ID mismatch: expected ${templateId}, found ${currentSessionData.templateId}`);
    }

    const [template] = await db
      .select()
      .from(workoutTemplates)
      .where(and(eq(workoutTemplates.id, templateId), eq(workoutTemplates.userId, userId)));

    if (!template) issues.push('Template no longer exists or is not accessible');

    if (issues.length > 0 && !forceRecover) {
      return errorResponse('Session data integrity issues found', 400, {
        issues,
        canRecover: !!template,
        suggestion: 'Use forceRecover=true to attempt recovery or clear the session',
      });
    }

    if (template && (issues.length === 0 || forceRecover)) {
      const templateData = template.workoutData as WorkoutTemplateData;

      // Exercise IDs are positional ('exercise-1', 'set-1'), so performance
      // logged under a DIFFERENT template cannot be re-labelled onto this one:
      // its bench-press sets would be adopted as this template's exercise-1,
      // whatever that is. Re-attaching logged sets only makes sense when the
      // template matches; a cross-template recover (force) starts clean.
      const sameTemplate = currentSessionData.templateId === templateId;
      // Dates round-trip as JSON strings; the timestamp columns need real
      // Date objects or the update throws and recovery 500s forever.
      const startedAt = currentSessionData.startedAt
        ? new Date(currentSessionData.startedAt)
        : new Date();
      const lastPauseTime = currentSessionData.lastPauseTime
        ? new Date(currentSessionData.lastPauseTime)
        : undefined;
      const recoveredSessionData: ActiveWorkoutSessionData = {
        templateId: template.id,
        templateName: template.name,
        originalTemplate: templateData,
        startedAt,
        pausedTime: currentSessionData.pausedTime || 0,
        isTimerActive: currentSessionData.isTimerActive ?? true,
        lastPauseTime,
        modifiedTemplate: sameTemplate
          ? currentSessionData.modifiedTemplate || templateData
          : templateData,
        performance: sameTemplate ? currentSessionData.performance || {} : {},
        exerciseProgress: sameTemplate ? currentSessionData.exerciseProgress || {} : {},
        sessionNotes: sameTemplate ? currentSessionData.sessionNotes || '' : '',
        version: (currentSessionData.version || 0) + 1,
        lastUpdated: new Date(),
      };

      await db
        .update(userStats)
        .set({
          activeWorkoutId: template.id,
          activeWorkoutData: recoveredSessionData,
          activeWorkoutStartedAt: recoveredSessionData.startedAt,
        })
        .where(eq(userStats.userId, userId));

      return successResponse({
        activeSession: recoveredSessionData,
        recovered: true,
        issues: issues.length > 0 ? issues : undefined,
        message: 'Active workout session recovered successfully',
      });
    }

    await db
      .update(userStats)
      .set({
        activeWorkoutId: null,
        activeWorkoutData: null,
        activeWorkoutStartedAt: null,
      })
      .where(eq(userStats.userId, userId));

    return successResponse({
      activeSession: null,
      recovered: false,
      issues,
      message: 'Active workout session cleared due to unrecoverable issues',
    });
  } catch (error) {
    console.error('Failed to recover active session:', error);
    return errorResponse('Failed to recover active session', 500);
  }
}
