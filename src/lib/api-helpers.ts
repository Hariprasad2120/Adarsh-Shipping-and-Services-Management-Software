import { auth } from "@/lib/auth";
import { timeBlock } from "@/lib/performance";
import { SESSION_COOKIE_NAME } from "@/lib/session-config";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function getSessionOrUnauth() {
  return timeBlock("auth:getSessionOrUnauth", async () => {
    if (!(await cookies()).get(SESSION_COOKIE_NAME)?.value) {
      return {
        session: null,
        error: NextResponse.json({ error: "Unauthorized" }, {
          status: 401,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "X-Content-Type-Options": "nosniff",
          },
        }),
      };
    }

    const session = await auth();
    if (!session) {
      return {
        session: null,
        error: NextResponse.json({ error: "Unauthorized" }, {
          status: 401,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "X-Content-Type-Options": "nosniff",
          },
        }),
      };
    }
    return { session, error: null };
  });
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
