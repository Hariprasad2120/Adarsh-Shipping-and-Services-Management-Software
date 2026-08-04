import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isBlockedApiPath, isBlockedRoutePath } from "@/lib/app-edition";
import { SESSION_COOKIE_NAME } from "@/lib/session-config";
import { PORTAL_COOKIE_NAME, PORTAL_LOGIN_PATH } from "@/modules/customer-portal/config";

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
  "/api/auth", // NextAuth endpoints
  "/api/setup",
  "/api/erp/ping",
  "/api/mobile",
  "/api/google-chat",
  "/api/cron",
  "/customer-portal",
  "/api/customer-portal",
  "/google-chat-link",
  "/verify",
  "/invite",
  "/api/hrms/invitations/accept",
];

// Static asset prefixes — always public
const STATIC_PREFIXES = ["/_next", "/favicon.ico", "/Logo", "/logo"];

const MOBILE_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400",
};

function isPublicPath(pathname: string): boolean {
  // Dev-only utilities (e.g. /api/dev/clear-auth-cookies) — never public in prod
  if (
    process.env.NODE_ENV !== "production" &&
    pathname.startsWith("/api/dev/")
  ) {
    return true;
  }

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

function isPortalProtectedPath(pathname: string): boolean {
  return pathname.startsWith("/customer-portal/") && pathname !== PORTAL_LOGIN_PATH;
}

function hasCookie(req: NextRequest, name: string): boolean {
  return Boolean(req.cookies.get(name)?.value);
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isHrLetterPreviewFile = pathname === "/api/hrms/letters/preview-file";
  const isMobileApi = pathname.startsWith("/api/mobile");
  const isPortalRequest = isPortalProtectedPath(pathname);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-current-pathname", pathname);

  if (isMobileApi && req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: MOBILE_CORS_HEADERS });
  }

  if (isBlockedApiPath(pathname)) {
    return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Not found" } }, { status: 404 });
  }

  if (isBlockedRoutePath(pathname)) {
    return NextResponse.rewrite(new URL("/404", req.url), { status: 404 });
  }

  // Public paths — pass through
  if (isPublicPath(pathname)) {
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    if (isMobileApi) {
      Object.entries(MOBILE_CORS_HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
    }

    return response;
  }

  // Protected path — check for session cookie
  const hasRequiredCookie = isPortalRequest
    ? hasCookie(req, PORTAL_COOKIE_NAME)
    : hasCookie(req, SESSION_COOKIE_NAME);

  if (!hasRequiredCookie) {
    const loginUrl = new URL(isPortalRequest ? PORTAL_LOGIN_PATH : "/login", req.url);
    // Preserve intended destination for post-login redirect
    if ((isPortalRequest && pathname !== "/customer-portal/dashboard") || (!isPortalRequest && pathname !== "/dashboard")) {
      loginUrl.searchParams.set("callbackUrl", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated request — add security and cache headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Prevent browser from caching authenticated pages (Back button protection)
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set(
    "X-Frame-Options",
    isHrLetterPreviewFile ? "SAMEORIGIN" : "DENY",
  );
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(self)",
  );
  if (isHrLetterPreviewFile) {
    response.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; frame-ancestors 'self';",
    );
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
