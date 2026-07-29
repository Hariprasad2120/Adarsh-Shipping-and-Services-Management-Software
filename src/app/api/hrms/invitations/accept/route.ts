import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getClientIp, rateLimit } from "@/lib/security";
import {
  acceptEmployeeInvitation,
  getEmployeeInvitation,
} from "@/modules/hrms/employee-invitation";

const tokenSchema = z.string().trim().min(32).max(200);
const acceptSchema = z.object({
  token: tokenSchema,
  password: z.string().min(1).max(128),
});

function noStoreJson(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(request: NextRequest) {
  const limited = rateLimit(
    `employee-invitation-read:${getClientIp(request)}`,
    { limit: 30, windowMs: 60_000 },
  );
  if (!limited.ok) return limited.response;

  const parsed = tokenSchema.safeParse(request.nextUrl.searchParams.get("token"));
  if (!parsed.success) {
    return noStoreJson(
      { ok: false, error: "This invitation link is invalid or has expired" },
      400,
    );
  }

  try {
    return noStoreJson({
      ok: true,
      data: await getEmployeeInvitation(parsed.data),
    });
  } catch (error) {
    return noStoreJson(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "This invitation link is invalid or has expired",
      },
      400,
    );
  }
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(
    `employee-invitation-accept:${getClientIp(request)}`,
    { limit: 10, windowMs: 60_000 },
  );
  if (!limited.ok) return limited.response;

  const parsed = acceptSchema.safeParse(await request.json());
  if (!parsed.success) {
    return noStoreJson(
      {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid invitation request",
      },
      400,
    );
  }

  try {
    return noStoreJson({
      ok: true,
      data: await acceptEmployeeInvitation(parsed.data),
    });
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message
        : error instanceof Error
          ? error.message
          : "Unable to accept invitation";
    return noStoreJson({ ok: false, error: message }, 400);
  }
}
