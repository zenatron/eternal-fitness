import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// POST handler to toggle favorite status
export async function POST(
  request: Request, // Request might not be used, but keep signature standard
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { templateId } = await params
    
    // Use a transaction to fetch and update atomically
    const updatedTemplate = await prisma.$transaction(async (tx) => {
      // 1. Find the current template and its favorite status
      const currentTemplate = await tx.workoutTemplate.findUnique({
        where: {
          id: templateId,
          userId: userId, // Ensure user owns the template
        },
        select: { favorite: true }, // Only select the favorite field initially
      })

      if (!currentTemplate) {
        console.log(`Favorite toggle failed: Template ${templateId} not found or unauthorized for user ${userId}`);
        // Throw an error to abort transaction and signal not found
        throw new Error('TemplateNotFound'); 
      }

      const newFavoriteStatus = !currentTemplate.favorite
      console.log(`Template ${templateId}: Current favorite: ${currentTemplate.favorite}, toggling to: ${newFavoriteStatus}`);

      // 2. Update the template with the new favorite status
      const result = await tx.workoutTemplate.update({
        where: {
          id: templateId,
          // userId: userId // Redundant check due to findUnique above, but safe
        },
        data: {
          favorite: newFavoriteStatus,
        },
        // Include related data in the final response to match hook expectations
        include: {
            sets: { include: { exercises: true } }
        }
      })
      console.log(`Successfully toggled favorite for template ${templateId} to ${newFavoriteStatus}`);
      return result;
    }) // End transaction

    // Return the updated template data
    return NextResponse.json(updatedTemplate)
  } catch (error) {
    // Handle specific not found error from transaction
    if (error instanceof Error && error.message === 'TemplateNotFound') {
      return new NextResponse(JSON.stringify({ error: 'Template not found or unauthorized' }), { status: 404 });
    }

    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
} 