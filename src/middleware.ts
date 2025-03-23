import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/verify-email', '/auth/confirm', '/signup']
// Routes that should be completely bypassed by middleware
const BYPASS_ROUTES = ['/auth/sign-out']

export async function middleware(request: NextRequest) {

  // Skip middleware for certain routes
  if (BYPASS_ROUTES.some(route => request.nextUrl.pathname.startsWith(route))) {
    return NextResponse.next()
  }

  try {
    let response = NextResponse.next({ request })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            response = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    // Don't treat AuthSessionMissingError as an error
    if (userError && userError.status !== 400) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const path = request.nextUrl.pathname

    // Handle /login path first
    if (path === '/login') {
      if (user) {
        const redirectUrl = new URL('/workout', request.url)
        return NextResponse.redirect(redirectUrl)
      }
      return response
    }

    // Handle other public routes
    if (PUBLIC_ROUTES.includes(path)) {
      return response
    }

    // Redirect to login if not authenticated
    if (!user && !path.startsWith('/auth')) {
      const redirectUrl = new URL('/login', request.url)
      return NextResponse.redirect(redirectUrl)
    }

    // Check profile completion for non-setup pages
    if (user && path !== '/profile/setup') {
      const { data: profile } = await supabase
        .from('profiles')
        .select()
        .eq('id', user.id)
        .single()

      if (!profile) {
        const redirectUrl = new URL('/profile/setup', request.url)
        return NextResponse.redirect(redirectUrl)
      }
    }

    return response
  } catch (error) {
    return NextResponse.next({ request })
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 