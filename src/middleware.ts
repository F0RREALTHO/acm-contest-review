import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "acm_admin_session";

// Paths that are always public — no auth required
const PUBLIC_PATHS = [
  "/public",        // public leaderboard
  "/api/public",    // public API routes
  "/api/keep-alive", // Supabase keep-alive cron
  "/api/health",    // health check
  "/spiderman",     // the login page itself
  "/api/auth",      // auth endpoint
  "/_next",         // Next.js internals
  "/favicon.ico",
  "/icon.svg",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((prefix) => pathname.startsWith(prefix));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public paths
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // Check for valid session cookie
  const session = request.cookies.get(SESSION_COOKIE);
  if (session?.value === "authenticated") {
    return NextResponse.next();
  }

  // Redirect unauthenticated requests to the login page
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/spiderman";
  return NextResponse.redirect(loginUrl);
}

export const config = {
  /*
   * Match every route EXCEPT Next.js static files.
   * The isPublic() check inside the middleware handles fine-grained exceptions.
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
