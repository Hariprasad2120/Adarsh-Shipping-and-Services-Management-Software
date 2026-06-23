// ─── Identity Linking — verify token & show confirmation ─────────────────────
// GET /api/google-chat/link?token=<token>
// Called after user authenticated to Monolith and confirmed linking.

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { verifyLinkToken, completeLinking } from "@/modules/google-chat/identity";

export const dynamic = "force-dynamic";

const LINK_TIMEOUT_MS = 8000;

async function withTimeout<T>(promise: Promise<T>, label: string, timeoutMs = LINK_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`${label} timed out. Please retry.`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeout);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ success: false, valid: false, error: "Missing token" }, {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const tokenData = await withTimeout(
      verifyLinkToken(token),
      "Token verification"
    );

    if (!tokenData.valid) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error:
            "This link is invalid or has expired. Please go back to Google Chat and type /connect to generate a new link.",
        },
        {
          status: 400,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        valid: true,
        googleEmail: tokenData.googleEmail,
        googleDisplayName: tokenData.googleDisplayName,
        token,
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        valid: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to verify the link token right now.",
      },
      {
        status: 504,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const payload = (await req.json()) as {
      token?: string;
      replaceExisting?: boolean;
    };
    const token = payload.token;

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated",
          loginUrl: `/login?callbackUrl=${encodeURIComponent(
            `/google-chat-link?token=${token ?? ""}`
          )}`,
        },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    if (!token) {
      return NextResponse.json({ success: false, error: "Missing token" }, {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const result = await withTimeout(
      completeLinking({
        token,
        monolithUserId: session.user.id,
        replaceExisting: payload.replaceExisting === true,
      }),
      "Account linking",
      12000
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          code: result.code,
          canReplace: result.canReplace,
        },
        {
          status: result.code === "USER_ALREADY_LINKED_OTHER_GOOGLE" ? 409 : 400,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    return NextResponse.json(
      { success: true },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to complete the account link right now.",
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
