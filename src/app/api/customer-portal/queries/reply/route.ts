import { NextResponse } from "next/server";
import { z } from "zod";
import { getPortalSession } from "@/modules/customer-portal/auth";
import { replyToPortalQuery } from "@/modules/customer-portal/service";

const schema = z.object({
  threadId: z.string().min(1),
  body: z.string().min(1),
});

export async function POST(request: Request) {
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
