import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { uploadLeaveAttachment, listLeaveAttachments } from "@/modules/leave/attachments";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  const { id } = await params;

  const request = await db.leaveRequest.findUnique({ where: { id }, select: { userId: true } });
  if (!request) return err("Leave request not found", 404);
  if (request.userId !== session!.user.id) return err("Forbidden", 403);

  return ok(await listLeaveAttachments(id));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  if (!session!.user.orgId) return err("User has no organisation", 400);

  const { id } = await params;
  const request = await db.leaveRequest.findUnique({ where: { id }, select: { userId: true } });
  if (!request) return err("Leave request not found", 404);
  if (request.userId !== session!.user.id) return err("Forbidden", 403);

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return err("No file provided");

  const buffer = Buffer.from(await file.arrayBuffer());
  const attachment = await uploadLeaveAttachment({
    orgId: session!.user.orgId,
    requestId: id,
    uploadedById: session!.user.id,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    fileBuffer: buffer,
  });

  return ok(attachment, 201);
}
