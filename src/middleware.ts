import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * In-memory token buckets. Middleware runs once per instance, and this app is
 * deployed as a single container, so process memory is the right place: no
 * extra moving parts, and a restart merely resets the counters.
 */
const buckets = new Map<string, { tokens: number; updated: number }>();

interface RateLimitRule {
  /** Bucket refill rate, tokens per second. */
  refillPerSecond: number;
  capacity: number;
}

const GENERAL_LIMIT: RateLimitRule = { refillPerSecond: 10, capacity: 120 };
// Sends real Web Push messages to third-party services on every call.
const PUSH_TEST_LIMIT: RateLimitRule = { refillPerSecond: 1 / 60, capacity: 3 };
// Unauthenticated auth checks are a brute-force surface.
const AUTH_CHECK_LIMIT: RateLimitRule = { refillPerSecond: 1 / 6, capacity: 20 };

function allow(key: string, rule: RateLimitRule): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket) {
    buckets.set(key, { tokens: rule.capacity - 1, updated: now });
    return true;
  }
  const refilled = Math.min(
    rule.capacity,
    bucket.tokens + ((now - bucket.updated) / 1000) * rule.refillPerSecond
  );
  if (refilled < 1) {
    buckets.set(key, { tokens: refilled, updated: now });
    return false;
  }
  buckets.set(key, { tokens: refilled - 1, updated: now });
  return true;
}

// Opportunistic pruning so the map cannot grow without bound under address
// spoofing or a large user base.
function pruneBuckets() {
  if (buckets.size < 10_000) return;
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [key, bucket] of buckets) {
    if (bucket.updated < cutoff) buckets.delete(key);
  }
}

export default auth((req) => {
  const pathname = req.nextUrl.pathname;
  const isPublicPage = ["/login"].some((p) => pathname.startsWith(p));
  const isApiRoute = pathname.startsWith("/api/");
  const isAuthApi = pathname.startsWith("/api/auth/");

  if (isAuthApi && !pathname.startsWith("/api/auth/check")) return NextResponse.next();

  if (isApiRoute) {
    pruneBuckets();
    const identity = req.auth?.user?.id ?? req.headers.get("x-forwarded-for") ?? "anonymous";
    const rule = pathname.startsWith("/api/push/test")
      ? PUSH_TEST_LIMIT
      : pathname.startsWith("/api/auth/check")
        ? AUTH_CHECK_LIMIT
        : GENERAL_LIMIT;
    if (!allow(`${identity}:${pathname.startsWith("/api/push") ? pathname : "/api"}`, rule)) {
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
