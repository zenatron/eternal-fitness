import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/verify-email', '/auth/confirm', '/signup']

export async function middleware(request: NextRequest) {
  try {
    const res = NextResponse.next()
    
    // Create client with both request and response
    const supabase = createMiddlewareClient({ 
      req: request, 
      res 
    })

    // Test the client with a simple query
    const { data: { session }, error } = await supabase.auth.getSession()
    console.log('Session check:', session ? 'Session exists' : 'No session', error || '')

    const path = request.nextUrl.pathname

    // Handle /login path first
    if (path === '/login') {
      if (session) {
        console.log('Redirecting to /workout because user is logged in')
        return NextResponse.redirect(new URL('/workout', request.url))
      }
      console.log('Showing login page, session:', session)
      return res
    }

    // Handle other public routes
    if (PUBLIC_ROUTES.includes(path)) {
      return res
    }

    // Redirect to login if not authenticated
    if (!session) {
      console.log('Redirecting to /login because user is NOT logged in')
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Allow access to profile setup
    if (path === '/profile/setup') {
      console.log('Showing profile setup page, session:', session)
      return res
    }
    
    return res
  } catch (e) {
    console.error('Middleware error:', e)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}