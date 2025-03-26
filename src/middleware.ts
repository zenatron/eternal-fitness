import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Protect all routes except for signup and login and webhooks
const isPublicRoute = createRouteMatcher([
  '/signup(.*)',
  '/login(.*)',
  '/api/webhooks(.*)'
])

export default clerkMiddleware(
  async (auth, req) => {
    if (!isPublicRoute(req)) {
      await auth.protect()
    }
  },
)

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}