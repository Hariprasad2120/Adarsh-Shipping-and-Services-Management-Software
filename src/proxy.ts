import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/setup", "/api/auth", "/api/setup", "/api/erp/ping", "/_next", "/favicon.ico", "/api/google-chat", "/api/cron", "/google-chat-link", "/verify"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

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
