import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { createValidatedApiHandler } from '@/lib/api-utils';
import { 
  ActiveWorkoutSessionData, 
  WorkoutTemplateData 
} from '@/types/workout';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const recoverSessionSchema = z.object({
  templateId: z.string(),
  forceRecover: z.boolean().optional().default(false),
});

// ============================================================================
// POST: Recover or reset active workout session
// ============================================================================

export const POST = createValidatedApiHandler(
  recoverSessionSchema,
  async (userId, { templateId, forceRecover }) => {

    // Get current active session
    const userStats = await prisma.userStats.findUnique({
      where: { userId },
      select: {
        activeWorkoutId: true,
        activeWorkoutData: true,
        activeWorkoutStartedAt: true,
      },
    });

    if (!userStats?.activeWorkoutId || !userStats.activeWorkoutData) {
      throw new Error('No active workout session found to recover');
    }

    const currentSessionData = userStats.activeWorkoutData as unknown as ActiveWorkoutSessionData;

    // Validate session data integrity
    const issues: string[] = [];
    
    if (!currentSessionData.templateId) {
      issues.push('Missing template ID');
    }
    
    if (!currentSessionData.originalTemplate) {
      issues.push('Missing original template data');
    }
    
    if (!currentSessionData.startedAt) {
      issues.push('Missing start time');
    }
    
    if (currentSessionData.templateId !== templateId) {
      issues.push(`Template ID mismatch: expected ${templateId}, found ${currentSessionData.templateId}`);
    }

    // Check if template still exists
    const template = await prisma.workoutTemplate.findFirst({
      where: { id: templateId, userId },
    });

    if (!template) {
      issues.push('Template no longer exists or is not accessible');
    }

    // If there are issues and force recover is not enabled, throw error with details
    if (issues.length > 0 && !forceRecover) {
      const error = new Error('Session data integrity issues found');
      (error as any).details = {
        issues,
        canRecover: !!template,
        suggestion: 'Use forceRecover=true to attempt recovery or clear the session',
      };
      throw error;
    }

    // Attempt recovery if template exists
    if (template && (issues.length === 0 || forceRecover)) {
      const templateData = (template as any).workoutData as WorkoutTemplateData;
      
      // Create a recovered session with corrected data
      const recoveredSessionData: ActiveWorkoutSessionData = {
        templateId: template.id,
        templateName: template.name,
        originalTemplate: templateData,
        startedAt: currentSessionData.startedAt || new Date(),
        pausedTime: currentSessionData.pausedTime || 0,
        isTimerActive: currentSessionData.isTimerActive ?? true,
        lastPauseTime: currentSessionData.lastPauseTime,
        modifiedTemplate: currentSessionData.modifiedTemplate || templateData,
        performance: currentSessionData.performance || {},
        exerciseProgress: currentSessionData.exerciseProgress || {},
        sessionNotes: currentSessionData.sessionNotes || '',
        version: (currentSessionData.version || 0) + 1,
        lastUpdated: new Date(),
      };

      // Update UserStats with recovered session data
      await prisma.userStats.update({
        where: { userId },
        data: {
          activeWorkoutId: template.id,
          activeWorkoutData: recoveredSessionData as any,
          activeWorkoutStartedAt: recoveredSessionData.startedAt,
        },
      });

      return {
        activeSession: recoveredSessionData,
        recovered: true,
        issues: issues.length > 0 ? issues : undefined,
        message: 'Active workout session recovered successfully'
      };
    }

    // If we can't recover, clear the session
    await prisma.userStats.update({
      where: { userId },
      data: {
        activeWorkoutId: null,
        activeWorkoutData: null as any,
        activeWorkoutStartedAt: null,
      },
    });

    return {
      activeSession: null,
      recovered: false,
      issues,
      message: 'Active workout session cleared due to unrecoverable issues'
    };
  }
);
