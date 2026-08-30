import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { exchangeCodeForTokens, encryptToken, encryptAccessToken } from "@/lib/workspace-oauth";
import { db } from "@/lib/db";
import { getAppUrl } from "@/lib/app-url";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !session.user.orgId) {
    return NextResponse.redirect(`${getAppUrl()}/login?error=Unauthorized`);
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const baseUrl = getAppUrl();

  if (error) {
    return NextResponse.redirect(`${baseUrl}/communication?error=${encodeURIComponent(error)}`);
  }

  const cookieState = req.cookies.get("google_oauth_state")?.value;
  if (!state || state !== cookieState) {
    return NextResponse.redirect(`${baseUrl}/communication?error=state_mismatch`);
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/communication?error=missing_code`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    
    // Restrict connection to the approved workspace domain
    const domain = process.env.GOOGLE_WORKSPACE_DOMAIN || "adarshshipping.in";
    if (!tokens.googleEmail.endsWith(`@${domain}`)) {
      const response = NextResponse.redirect(
        `${baseUrl}/communication?error=invalid_domain&email=${encodeURIComponent(tokens.googleEmail)}`
      );
      response.cookies.delete("google_oauth_state");
      return response;
    }

    const encryptedRefresh = encryptToken(tokens.refreshToken);
    const encryptedAccess = encryptAccessToken(tokens.accessToken);

    // Upsert database record
    await db.googleWorkspaceConnection.upsert({
      where: { userId: session.user.id },
      create: {
        orgId: session.user.orgId,
        userId: session.user.id,
        googleEmail: tokens.googleEmail,
        googleUserId: tokens.googleUserId,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        tokenExpiresAt: tokens.expiresAt,
        scopes: tokens.scopes,
        status: "connected"
      },
      update: {
        googleEmail: tokens.googleEmail,
        googleUserId: tokens.googleUserId,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        tokenExpiresAt: tokens.expiresAt,
        scopes: tokens.scopes,
        status: "connected"
      }
    });

    // Create Audit Event
    await db.communicationAuditEvent.create({
      data: {
        orgId: session.user.orgId,
        userId: session.user.id,
        action: "OAUTH_CONNECT",
        details: `Connected Google Workspace account: ${tokens.googleEmail}`
      }
    });

    const response = NextResponse.redirect(`${baseUrl}/communication?success=true`);
    response.cookies.delete("google_oauth_state");
    return response;
  } catch (err: any) {
    console.error("[OAuthCallback] Connection error:", err);
    const response = NextResponse.redirect(
      `${baseUrl}/communication?error=${encodeURIComponent(err.message || "exchange_failed")}`
    );
    response.cookies.delete("google_oauth_state");
    return response;
  }
}
