import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const pathname = req.nextUrl.pathname;
  const isPublicPage = ["/login"].some((p) => pathname.startsWith(p));
  const isApiRoute = pathname.startsWith("/api/");
  const isAuthApi = pathname.startsWith("/api/auth/");

  if (isAuthApi) return NextResponse.next();

  if (!req.auth) {
    if (isApiRoute) return NextResponse.next();
    if (isPublicPage) return NextResponse.next();
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
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
