import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  allow,
  pruneBuckets,
  AUTH_CHECK_LIMIT,
  AUTH_CHECK_GLOBAL_LIMIT,
  GENERAL_LIMIT,
  PUSH_TEST_LIMIT,
  type BucketMap,
} from "@/lib/rateLimit";

/**
 * Per-identity buckets, plus a shared one for the unauthenticated auth check —
 * x-forwarded-for is attacker-mintable behind no trusted proxy, so per-identity
 * buckets alone did not bound the total attempt rate.
 */
const buckets: BucketMap = new Map();
const authCheckGlobalBuckets: BucketMap = new Map();

function allowRequest(key: string, rule: typeof GENERAL_LIMIT, now: number): boolean {
  return allow(buckets, key, rule, now);
}

export default auth((req) => {
  const pathname = req.nextUrl.pathname;
  const isPublicPage = ["/login"].some((p) => pathname.startsWith(p));
  const isApiRoute = pathname.startsWith("/api/");
  const isAuthApi = pathname.startsWith("/api/auth/");

  if (isAuthApi && !pathname.startsWith("/api/auth/check")) return NextResponse.next();

  if (isApiRoute) {
    pruneBuckets(buckets);
    const now = Date.now();
    const identity = req.auth?.user?.id ?? req.headers.get("x-forwarded-for") ?? "anonymous";
    const isPushTest = pathname.startsWith("/api/push/test");
    const isAuthCheck = pathname.startsWith("/api/auth/check");
    const rule = isPushTest
      ? PUSH_TEST_LIMIT
      : isAuthCheck
        ? AUTH_CHECK_LIMIT
        : GENERAL_LIMIT;
    const bucketKey = `${identity}:${isPushTest ? pathname : "/api"}`;
    if (!allowRequest(bucketKey, rule, now)) {
      return NextResponse.json(
        { error: { message: "Too many requests. Please slow down." } },
        { status: 429, headers: { "Retry-After": "30" } }
      );
    }
    // Shared ceiling across all identities for the brute-force surface.
    if (isAuthCheck && !allow(authCheckGlobalBuckets, "auth-check:global", AUTH_CHECK_GLOBAL_LIMIT, now)) {
      return NextResponse.json(
        { error: { message: "Too many requests. Please slow down." } },
        { status: 429, headers: { "Retry-After": "30" } }
      );
    }

    /*
     * Default-deny for API routes. Each route still checks auth itself, but a
     * route that forgets used to be silently public — this closes that class of
     * bug. /api/auth/* (handled above) and the check endpoint must stay open.
     */
    if (!req.auth && pathname !== "/api/auth/check") {
      return NextResponse.json(
        { error: { message: "Unauthorized" } },
        { status: 401 }
      );
    }
  }

  if (!req.auth) {
    if (isPublicPage) return NextResponse.next();
    if (!isApiRoute) {
      const url = new URL("/login", req.url);
      url.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // PWA assets must stay reachable unauthenticated. The browser requests the
    // manifest and the service worker without credentials, and it fetches the
    // offline fallback from a context that may have no session at all — an auth
    // redirect on any of these makes the app quietly non-installable and breaks
    // offline boot. Icons and splash images are matched by extension below.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline|icons/|splash/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest|js\\.map)$).*)",
  ],
};
