import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getHRLetterRequestById,
  updateHRLetterRequest,
  updateHRLetterTemplate,
  approveHRLetterTemplateLegal,
  saveHRLetterTemplateEditorRevision,
} from "@/modules/hrms/letters-service";
import { requirePermission, apiError } from "@/lib/rbac";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const { id } = await params;
    const data = await getHRLetterRequestById(id, session.user.orgId!);
    if (!data) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Document request not found" } }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { target, details, content, previewHtml, variables, fieldSchema, editorDocument, sourceDocxPath, isActive, legalApprove, saveEditorRevision } = body;

    // 1. Update Template
    if (target === "template") {
      await requirePermission(session.user.id, "hrms.letters.settings");
      if (legalApprove) {
        // Legal review approval
        await requirePermission(session.user.id, "hrms.letters.legal_review");
        const data = await approveHRLetterTemplateLegal(id, session.user.orgId!, session.user.id);
        return NextResponse.json({ ok: true, data });
      }

      if (saveEditorRevision) {
        const data = await saveHRLetterTemplateEditorRevision(id, session.user.orgId!, previewHtml || editorDocument?.html || "");
        return NextResponse.json({ ok: true, data });
      }

      const data = await updateHRLetterTemplate(id, session.user.orgId!, {
        content,
        previewHtml,
        variables,
        fieldSchema,
        editorDocument,
        sourceDocxPath,
        isActive
      });
      return NextResponse.json({ ok: true, data });
    }

    // 2. Update Request (Draft)
    await requirePermission(session.user.id, "hrms.letters.manage");
    const data = await updateHRLetterRequest(id, session.user.orgId!, details);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    await requirePermission(session.user.id, "hrms.letters.manage");

    const { id } = await params;
    const request = await db.hRLetterRequest.findFirst({
      where: { id, orgId: session.user.orgId! }
    });

    if (!request) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Request not found" } }, { status: 404 });
    }

    // Immutable check: cannot delete issued or accepted documents
    if (request.status !== "DRAFT" && request.status !== "CANCELLED" && request.status !== "HR_REVIEW") {
      return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Only drafts or cancelled letters can be deleted" } }, { status: 400 });
    }

    await db.hRLetterRequest.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
