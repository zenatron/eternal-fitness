import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { createValidatedApiHandler } from '@/lib/api-utils';
import { 
  ActiveWorkoutSessionData, 
  WorkoutTemplateData 
} from '@/types/workout';
import { z } from 'zod';

// Strongly-typed error for session recovery issues
class SessionRecoveryError extends Error {
  details: {
    issues: string[];
    canRecover: boolean;
    suggestion: string;
  };

  constructor(message: string, details: { issues: string[]; canRecover: boolean; suggestion: string }) {
    super(message);
    this.name = 'SessionRecoveryError';
    this.details = details;
  }
}

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

    // Local type for JSON shape where date-like fields may be strings
    type ActiveWorkoutSessionDataInput = Omit<ActiveWorkoutSessionData, 'startedAt' | 'lastPauseTime' | 'lastUpdated'> & {
      startedAt: string | Date;
      lastPauseTime?: string | Date;
      lastUpdated: string | Date;
    };

    // Type guard to validate active workout session JSON data (accepts string or Date for date fields)
    const isActiveWorkoutSessionDataInput = (data: any): data is ActiveWorkoutSessionDataInput => {
      if (!data || typeof data !== 'object') return false;
      if (typeof (data as any).templateId !== 'string') return false;
      if (typeof (data as any).templateName !== 'string') return false;
      const originalTemplate = (data as any).originalTemplate;
      if (!originalTemplate || typeof originalTemplate !== 'object') return false;
      const exercises = (originalTemplate as any).exercises;
      if (!Array.isArray(exercises)) return false;
      if (typeof (data as any).isTimerActive !== 'boolean') return false;
      if (typeof (data as any).performance !== 'object' || (data as any).performance == null) return false;
      if (typeof (data as any).exerciseProgress !== 'object' || (data as any).exerciseProgress == null) return false;
      if (typeof (data as any).version !== 'number') return false;
      if (!(typeof (data as any).startedAt === 'string' || (data as any).startedAt instanceof Date)) return false;
      return true;
    };

    const rawSessionData = userStats.activeWorkoutData;
    if (!isActiveWorkoutSessionDataInput(rawSessionData)) {
      throw new Error('Invalid active workout session data structure');
    }

    // Use the data as-is to avoid JSON date normalization issues
    const currentSessionData: ActiveWorkoutSessionDataInput = rawSessionData;

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
      throw new SessionRecoveryError('Session data integrity issues found', {
        issues,
        canRecover: !!template,
        suggestion: 'Use forceRecover=true to attempt recovery or clear the session',
      });
    }

    // Attempt recovery if template exists
    if (template && (issues.length === 0 || forceRecover)) {
      const templateData = (template as any).workoutData as WorkoutTemplateData;

      const toDate = (value: string | Date | undefined): Date | undefined => {
        if (!value) return undefined;
        return value instanceof Date ? value : new Date(value);
      };

      // Create a recovered session with corrected data
      const recoveredSessionData: ActiveWorkoutSessionData = {
        templateId: template.id,
        templateName: template.name,
        originalTemplate: templateData,
        startedAt: toDate(currentSessionData.startedAt) || new Date(),
        pausedTime: currentSessionData.pausedTime || 0,
        isTimerActive: currentSessionData.isTimerActive ?? true,
        lastPauseTime: toDate(currentSessionData.lastPauseTime),
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
        data: { activeSession: recoveredSessionData },
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
      data: { activeSession: null },
      recovered: false,
      issues,
      message: 'Active workout session cleared due to unrecoverable issues'
    };
  }
);
