import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isBlockedApiPath, isBlockedRoutePath } from "@/lib/app-edition";

/**
 * Next.js 16 Proxy — runs before every matched request.
 * 
 * Responsibilities:
 * 1. Allow public paths through without auth check
 * 2. Redirect unauthenticated requests on protected paths to /login
 * 3. Set Cache-Control + security headers on authenticated responses
 *    (prevents Back-button content exposure after logout)
 */

// Paths that do NOT require authentication
const PUBLIC_PATHS = [
  "/login",
  "/setup",
  "/api/auth",      // NextAuth endpoints
  "/api/setup",
  "/api/erp/ping",
  "/api/google-chat",
  "/api/cron",
  "/google-chat-link",
  "/verify",
];

// Static asset prefixes — always public
const STATIC_PREFIXES = ["/_next", "/favicon.ico", "/Logo", "/logo"];

// NextAuth v5 cookie names (varies by secure/non-secure context)
const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

function isPublicPath(pathname: string): boolean {
  // Root landing page is public
  if (pathname === "/") return true;

  for (const pub of PUBLIC_PATHS) {
    if (pathname === pub || pathname.startsWith(pub + "/")) return true;
  }

  for (const prefix of STATIC_PREFIXES) {
    if (pathname.startsWith(prefix)) return true;
  }

  // Public file extensions (fonts, images, etc.)
  if (/\.(png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|css|js|map)$/i.test(pathname)) {
    return true;
  }

  return false;
}

function hasSessionCookie(req: NextRequest): boolean {
  for (const name of SESSION_COOKIE_NAMES) {
    if (req.cookies.get(name)?.value) return true;
  }
  return false;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isBlockedApiPath(pathname)) {
    return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Not found" } }, { status: 404 });
  }

  if (isBlockedRoutePath(pathname)) {
    return NextResponse.rewrite(new URL("/404", req.url), { status: 404 });
  }

  // Public paths — pass through
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Protected path — check for session cookie
  if (!hasSessionCookie(req)) {
    const loginUrl = new URL("/login", req.url);
    // Preserve intended destination for post-login redirect
    if (pathname !== "/dashboard") {
      loginUrl.searchParams.set("callbackUrl", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated request — add security and cache headers
  const response = NextResponse.next();

  // Prevent browser from caching authenticated pages (Back button protection)
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
