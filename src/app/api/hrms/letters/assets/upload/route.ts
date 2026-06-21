import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import { auth } from "@/lib/auth";
import { requirePermission, apiError } from "@/lib/rbac";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    await requirePermission(session.user.id, "hrms.letters.settings");

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Missing image file" } }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    if (![".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext)) {
      return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Unsupported image format" } }, { status: 400 });
    }

    const relativeDir = path.join("import-output", "letters", "template-assets");
    const fullDir = path.join(process.cwd(), "public", relativeDir);
    fs.mkdirSync(fullDir, { recursive: true });

    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const fullPath = path.join(fullDir, fileName);
    fs.writeFileSync(fullPath, Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({
      ok: true,
      data: {
        path: `${relativeDir.replace(/\\/g, "/")}/${fileName}`,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
