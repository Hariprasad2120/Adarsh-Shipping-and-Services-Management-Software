import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientIp, rateLimit, sanitizedString } from "@/lib/security";
import { getPortalSession } from "@/modules/customer-portal/auth";
import { replyToPortalQuery } from "@/modules/customer-portal/service";

const schema = z.object({
  threadId: z.string().min(1),
  body: sanitizedString(2000).pipe(z.string().min(1)),
});

export async function POST(request: Request) {
  const limited = rateLimit(`portal-query-reply:${getClientIp(request)}`, {
    limit: 60,
    windowMs: 60_000,
  });
  if (!limited.ok) return limited.response;

  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = schema.parse(await request.json());
    const result = await replyToPortalQuery({
      portalUserId: session.portalUserId,
      threadId: body.threadId,
      body: body.body,
    });
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reply failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
