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
    // A 500 here means the auth layer itself is broken; log the detail server
    // side, but don't reflect raw error strings back to the client.
    console.error('Auth check failed:', error);
    return NextResponse.json(
      {
        authenticated: false,
        message: 'Error checking authentication status',
      },
      { status: 500 },
    );
  }
}
