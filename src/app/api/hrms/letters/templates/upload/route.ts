import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import { auth } from "@/lib/auth";
import { uploadHRLetterTemplateDocx } from "@/modules/hrms/letters-service";
import { requirePermission, apiError } from "@/lib/rbac";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.orgId) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    await requirePermission(session.user.id, "hrms.letters.settings");

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Missing DOCX file" } }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".docx")) {
      return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Only DOCX files are supported" } }, { status: 400 });
    }

    const tempDir = path.join(process.cwd(), "public", "import-output", "letters", "uploads");
    fs.mkdirSync(tempDir, { recursive: true });
    const tempPath = path.join(tempDir, `${Date.now()}-${file.name}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(tempPath, buffer);

    const data = await uploadHRLetterTemplateDocx(session.user.orgId, tempPath);
    fs.unlinkSync(tempPath);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiError(error);
  }
}
