import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/verify-email', '/auth/confirm', '/signup']
// Routes that should be completely bypassed by middleware
const BYPASS_ROUTES = ['/auth/sign-out']

export async function middleware(request: NextRequest) {
  console.log('\n🚀 Middleware executing for path:', request.nextUrl.pathname)

  // Skip middleware for certain routes
  if (BYPASS_ROUTES.some(route => request.nextUrl.pathname.startsWith(route))) {
    console.log('⏭️ Bypassing middleware for auth route')
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
            console.log('📝 Getting cookies')
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            console.log('📝 Setting cookies')
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
    console.log('🔑 User:', user ? 'Authenticated' : 'Not authenticated')

    // Don't treat AuthSessionMissingError as an error
    if (userError && userError.status !== 400) {
      console.error('❌ Auth error:', userError)
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const path = request.nextUrl.pathname

    // Handle /login path first
    if (path === '/login') {
      if (user) {
        console.log('👉 Redirecting authenticated user from /login to /workout')
        const redirectUrl = new URL('/workout', request.url)
        return NextResponse.redirect(redirectUrl)
      }
      console.log('✅ Allowing access to login page')
      return response
    }

    // Handle other public routes
    if (PUBLIC_ROUTES.includes(path)) {
      console.log('✅ Allowing access to public route')
      return response
    }

    // Redirect to login if not authenticated
    if (!user && !path.startsWith('/auth')) {
      console.log('👉 Redirecting unauthenticated user to /login')
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
        console.log('👉 Redirecting to profile setup - no profile found')
        const redirectUrl = new URL('/profile/setup', request.url)
        return NextResponse.redirect(redirectUrl)
      }
    }

    console.log('✅ Allowing access to protected route')
    return response
  } catch (error) {
    console.error('❌ Error in middleware:', error)
    return NextResponse.next({ request })
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 