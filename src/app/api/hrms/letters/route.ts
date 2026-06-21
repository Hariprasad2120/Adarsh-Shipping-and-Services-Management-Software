/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  getHRLetterTemplates,
  getHRLetterRequests,
  createHRLetterRequest,
  getEmployeePrepopulatedDetails,
  createHRLetterTemplate,
  importBundledHRLetterTemplates,
} from "@/modules/hrms/letters-service";
import { requirePermission, apiError } from "@/lib/rbac";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    // 1. Get templates
    if (type === "templates") {
      const data = await getHRLetterTemplates(session.user.orgId!);
      return NextResponse.json({ ok: true, data });
    }

    // 1b. Get active employees list
    if (type === "employees") {
      await requirePermission(session.user.id, "hrms.letters.manage");
      const data = await db.user.findMany({
        where: { orgId: session.user.orgId!, active: true },
        select: { id: true, name: true, email: true, employeeNumber: true }
      });
      return NextResponse.json({ ok: true, data });
    }

    // 2. Prepopulate details
    if (type === "prepopulate") {
      await requirePermission(session.user.id, "hrms.letters.manage");
      const userId = searchParams.get("userId");
      const templateId = searchParams.get("templateId") || undefined;
      if (!userId) {
        return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Missing userId" } }, { status: 400 });
      }
      const data = await getEmployeePrepopulatedDetails(userId, session.user.orgId!, templateId);
      return NextResponse.json({ ok: true, data });
    }

    // 3. Default: List request letters
    const userRoles = await db.userRole.findMany({
      where: { userId: session.user.id },
      include: { role: true }
    });
    const roleKeys = userRoles.map((ur: any) => ur.role.name);
    const data = await getHRLetterRequests(session.user.orgId!, session.user.id, roleKeys);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // 1. Create Template
    if (action === "create_template") {
      await requirePermission(session.user.id, "hrms.letters.settings");
      const { name, type, content, variables, sourceDocxPath, previewHtml, fieldSchema, editorDocument, sourceFileName } = body;
      if (!name || !type || !content) {
        return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Missing required fields" } }, { status: 400 });
      }
      const data = await createHRLetterTemplate(session.user.orgId!, {
        name,
        type,
        content,
        variables: variables || [],
        sourceDocxPath,
        previewHtml,
        fieldSchema,
        editorDocument,
        sourceFileName,
      });
      return NextResponse.json({ ok: true, data });
    }

    if (action === "import_docx_templates") {
      await requirePermission(session.user.id, "hrms.letters.settings");
      const data = await importBundledHRLetterTemplates(session.user.orgId!);
      return NextResponse.json({ ok: true, data });
    }

    // 2. Create Request (Apply Letter)
    await requirePermission(session.user.id, "hrms.letters.manage");
    const { templateId, userId, details } = body;
    if (!templateId || !userId) {
      return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Missing templateId or userId" } }, { status: 400 });
    }

    const data = await createHRLetterRequest(session.user.orgId!, templateId, userId, session.user.id, details || {});
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiError(error);
  }
}
