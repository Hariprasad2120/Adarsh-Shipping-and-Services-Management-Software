import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { uploadLeaveAttachment, listLeaveAttachments } from "@/modules/leave/attachments";

/**
 * Authorizes access to a leave request's attachments beyond owner-only
 * (spec closure-pass item): an approver or HR/admin must be able to view
 * the supporting document (e.g. a medical certificate) to actually decide
 * the request — owner-only was a real functional gap, not just a security
 * over-restriction. Still enforces cross-org isolation: an approver in a
 * different org has no permission over this request regardless of their
 * attendance.leave.approve/manage grant elsewhere.
 */
async function authorizeAttachmentAccess(requestId: string, userId: string) {
  const request = await db.leaveRequest.findUnique({
    where: { id: requestId },
    select: { userId: true, approverId: true, user: { select: { orgId: true } } },
  });
  if (!request) return { request: null, allowed: false };

  if (request.userId === userId || request.approverId === userId) {
    return { request, allowed: true };
  }

  const actor = await db.user.findUnique({ where: { id: userId }, select: { orgId: true } });
  if (!actor || !request.user.orgId || actor.orgId !== request.user.orgId) {
    return { request, allowed: false };
  }

  const [canApprove, canManage] = await Promise.all([
    can(userId, "attendance.leave.approve"),
    can(userId, "attendance.leave.manage"),
  ]);
  return { request, allowed: canApprove || canManage };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  const { id } = await params;

  const { request, allowed } = await authorizeAttachmentAccess(id, session!.user.id);
  if (!request) return err("Leave request not found", 404);
  if (!allowed) return err("Forbidden", 403);

  return ok(await listLeaveAttachments(id));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  if (!session!.user.orgId) return err("User has no organisation", 400);

  const { id } = await params;
  // Upload stays owner-only (unchanged) — only an approver VIEWING evidence
  // to decide a request is the gap being closed here, not letting other
  // parties attach documents to someone else's request.
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
