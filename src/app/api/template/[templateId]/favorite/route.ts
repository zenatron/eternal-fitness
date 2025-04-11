import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client"; // Import Prisma types

// --- Standard Response Helpers ---
const successResponse = (data: any, status = 200) => {
  return NextResponse.json({ data }, { status });
};

const errorResponse = (message: string, status = 500, details?: any) => {
  console.error(`API Error (${status}) [template/{id}/favorite]:`, message, details ? JSON.stringify(details) : '');
  return NextResponse.json({ error: { message, ...(details && { details }) } }, { status });
};

// POST handler to toggle favorite status
export async function POST(request: Request, { params }: { params: { templateId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

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
        // Include necessary data for the response (frontend might need full template)
        include: {
          sets: { 
            orderBy: { createdAt: 'asc' },
            include: { exercise: true }
          },
        },
      });
      console.log(`Toggled favorite for template ${templateId} to ${newFavoriteStatus}`);
      return result;
    }); // End transaction

    return successResponse(updatedTemplate);

  } catch (error: any) {
    if (error.message === 'TemplateNotFound') {
      return errorResponse('Template not found or access denied', 404, { templateId: params.templateId });
    }

    console.error(`Error toggling favorite for template ${params.templateId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error("Prisma Error Code:", error.code);
    }
    return errorResponse('Internal Server Error toggling favorite', 500, {
      templateId: params.templateId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
