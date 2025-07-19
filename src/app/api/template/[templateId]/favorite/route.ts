import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client'; // Import Prisma types
import { createApiHandler } from '@/lib/api-utils';

// POST handler to toggle favorite status
export const POST = createApiHandler(async (userId, request, params) => {
  const { templateId } = params;

    // Use transaction for atomicity (fetch and update)
    const updatedTemplate = await prisma.$transaction(async (tx) => {
      // 1. Find the template, ensure it belongs to the user
      const currentTemplate = await tx.workoutTemplate.findUnique({
        where: {
          id: templateId,
          userId: userId,
        },
        select: { favorite: true }, // Only need current favorite status
      });

      if (!currentTemplate) {
        throw new Error('TemplateNotFound'); // Abort transaction
      }

      // 2. Toggle status and update
      const newFavoriteStatus = !currentTemplate.favorite;
      const result = await tx.workoutTemplate.update({
        where: {
          id: templateId,
        },
        data: {
          favorite: newFavoriteStatus,
        },
        // 🚀 Return JSON-based template data
        select: {
          id: true,
          name: true,
          favorite: true,
          createdAt: true,
          updatedAt: true,
          workoutData: true,
          totalVolume: true,
          estimatedDuration: true,
          exerciseCount: true,
          difficulty: true,
          workoutType: true,
          userId: true,
        },
      });
      console.log(
        `Toggled favorite for template ${templateId} to ${newFavoriteStatus}`,
      );
      return result;
    }); // End transaction

    return updatedTemplate;
});
