import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET function to fetch ONLY scheduled sessions
export async function GET(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const scheduledSessions = await prisma.workoutSession.findMany({
            where: { 
                userId,
                // Only get sessions where completedAt is undefined (not completed yet)
                // AND scheduledAt is not null (it's scheduled)
                completedAt: undefined,
                scheduledAt: {
                    not: null,
                }
            },
            orderBy: { scheduledAt: 'asc' }, // Sort by upcoming date
            include: {
                // Include template details for display
                workoutTemplate: {
                    select: { 
                        id: true,
                        name: true 
                    }
                }
            }
        });

        return NextResponse.json(scheduledSessions);

    } catch (error) {
        console.error('Error in GET /api/session/scheduled:', error);
        return new NextResponse(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
} 