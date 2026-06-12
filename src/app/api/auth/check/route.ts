import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    // Get auth data
    const session = await auth();
    const userId = session?.user?.id ?? null;

    // Check if we have a userId (authenticated)
    if (!userId) {
      return NextResponse.json(
        {
          authenticated: false,
          message: 'Not authenticated',
        },
        { status: 200 },
      );
    }

    // Return authenticated status and basic user info
    return NextResponse.json(
      {
        authenticated: true,
        userId,
        email: session?.user?.email || '',
        firstName: '',
        lastName: '',
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        authenticated: false,
        message: 'Error checking authentication status',
        error: String(error),
      },
      { status: 500 },
    );
  }
}
