import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { createApiHandler, createValidatedApiHandler } from '@/lib/api-utils';

// --- Zod Schema for PUT ---
const updateSessionSchema = z.object({
  duration: z.number().int().positive().optional(),
  notes: z.string().optional(),
  // completedAt should be a valid date string if provided
  completedAt: z.string().datetime({ offset: true }).optional(), // Expect ISO 8601 string
  // scheduledAt can be a date string or explicitly null to unschedule
  scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
});

// GET a specific session by ID
export const GET = createApiHandler(async (userId, request, params) => {
  const { sessionId } = params;

  const session = await prisma.workoutSession.findFirst({
    where: {
      id: sessionId,
      userId, // Ensure session belongs to the authenticated user
    },
    select: {
      id: true,
      completedAt: true,
      scheduledAt: true,
      duration: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      performanceData: true, // Include JSON performance data
      totalVolume: true,
      totalSets: true,
      totalExercises: true,
      personalRecords: true,
      workoutTemplate: {
        select: { id: true, name: true },
      },
    },
  });

  if (!session) {
    throw new Error('Session not found or access denied');
  }

  return session;
});

// PUT (update) a session
export const PUT = createValidatedApiHandler(
  updateSessionSchema,
  async (userId, validatedData, request, params) => {
    const { sessionId } = params;

    // Verify session exists and belongs to the user before update
    const existingSession = await prisma.workoutSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      select: { id: true }, // Only need to check existence
    });

    if (!existingSession) {
      throw new Error('Session not found or access denied');
    }

    // Construct the update data carefully
    const updatePayload: Prisma.WorkoutSessionUpdateInput = {};
    if (validatedData.duration !== undefined) {
      updatePayload.duration = validatedData.duration;
    }
    if (validatedData.notes !== undefined) {
      updatePayload.notes = validatedData.notes;
    }
    if (validatedData.completedAt) {
      // If completing, set completedAt and ensure scheduledAt is cleared
      updatePayload.completedAt = new Date(validatedData.completedAt);
      updatePayload.scheduledAt = null; // Ensure it's not also scheduled
    } else if (validatedData.scheduledAt !== undefined) {
      // If scheduling/rescheduling/unscheduling
      updatePayload.scheduledAt = validatedData.scheduledAt
        ? new Date(validatedData.scheduledAt)
        : null;
      if (updatePayload.scheduledAt) {
        updatePayload.completedAt = null; // Ensure it's not also completed
      }
    }

    // Update the session
    const updatedSession = await prisma.workoutSession.update({
      where: {
        id: sessionId,
        // We already verified ownership, no need for userId here
      },
      data: updatePayload,
      // Include data needed by the frontend after update
      include: {
        workoutTemplate: { select: { name: true } },
      },
    });

    return updatedSession;
  }
);

// DELETE a session
export const DELETE = createApiHandler(async (userId, request, params) => {
  const { sessionId } = params;

  // Use deleteMany for potentially better performance and simpler check
  // It returns a count of deleted records.
  const deleteResult = await prisma.workoutSession.deleteMany({
    where: {
      id: sessionId,
      userId, // Ensures only the owner can delete
    },
  });

  // Check if any record was actually deleted
  if (deleteResult.count === 0) {
    // This means the session either didn't exist or didn't belong to the user
    throw new Error('Session not found or access denied');
  }

  // Successfully deleted - return empty object for consistency
  return { deleted: true };
});
