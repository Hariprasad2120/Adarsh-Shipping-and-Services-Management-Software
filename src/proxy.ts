import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/setup", "/api/auth", "/api/setup", "/api/erp/ping", "/api/mobile", "/_next", "/favicon.ico", "/api/google-chat", "/api/cron", "/google-chat-link", "/verify"];

const MOBILE_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400",
};

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isMobileApi = pathname.startsWith("/api/mobile");

  // Handle CORS preflight for mobile API routes
  if (isMobileApi && req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: MOBILE_CORS_HEADERS });
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) {
    const response = NextResponse.next();
    // Attach CORS headers to all mobile API responses
    if (isMobileApi) {
      Object.entries(MOBILE_CORS_HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
    }
    return response;
  }

  // NextAuth v5 session cookie name
  const sessionCookie =
    req.cookies.get("__Secure-authjs.session-token") ??
    req.cookies.get("authjs.session-token");

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)"],
};
