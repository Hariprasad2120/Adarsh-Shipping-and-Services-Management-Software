import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { extendLeaveRequest } from "@/modules/leave/request";

const BodySchema = z.object({
  newToDate: z.string().transform((s) => new Date(s)),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  const { id } = await params;
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  const request = await db.leaveRequest.findUnique({
    where: { id },
    select: { userId: true, user: { select: { orgId: true } } },
  });
  if (!request) return err("Leave request not found", 404);
  if (request.userId !== session!.user.id) return err("Forbidden", 403);
  if (!request.user.orgId) return err("User has no organisation", 400);

  const result = await extendLeaveRequest({
    requestId: id,
    userId: session!.user.id,
    orgId: request.user.orgId,
    newToDate: parsed.data.newToDate,
  });
  return ok(result);
}
