import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAuthorizationUrl } from "@/lib/workspace-oauth";
import { randomBytes } from "crypto";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const state = randomBytes(16).toString("hex");
  
  // Set redirect base from request headers to support proxy
  const protocol = req.nextUrl.protocol || "http:";
  const host = req.headers.get("host") || req.nextUrl.host;
  
  const response = NextResponse.redirect(getAuthorizationUrl(state));
  
  // Set state in a secure cookie
  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300 // 5 minutes
  });

  return response;
}
