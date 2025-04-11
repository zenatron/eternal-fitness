import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';

export async function GET() {
  try {
    // Get auth data
    const { userId } = await auth();
    const user = await currentUser();

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
        email: user?.emailAddresses?.[0]?.emailAddress || '',
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
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
