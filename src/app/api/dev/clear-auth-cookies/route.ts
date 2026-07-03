import { NextResponse } from "next/server";
import {
  LEGACY_COOKIE_NAMES,
  MONOLITH_COOKIE_NAMES,
} from "@/lib/session-config";

/**
 * DEVELOPMENT-ONLY utility: clears every known auth cookie (Monolith,
 * legacy next-auth/authjs defaults, AMS) from the browser for localhost
 * debugging of cross-app cookie collisions.
 *
 * Hard-disabled in production — returns 404. Never link to this from UI.
 *
 * Usage: open http://localhost:3000/api/dev/clear-auth-cookies
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const names = [...MONOLITH_COOKIE_NAMES, ...LEGACY_COOKIE_NAMES];
  const response = NextResponse.json({
    ok: true,
    cleared: names,
    note: "All known auth cookies expired. Log in again.",
  });

  for (const name of names) {
    response.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
    });
  }

  return response;
}
