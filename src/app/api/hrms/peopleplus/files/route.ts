import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getFiles, createFolder, uploadFileAsset } from "@/modules/hrms/peopleplus/service";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.orgId) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scope = (searchParams.get("scope") || "personal") as "personal" | "organization" | "employee";

    const data = await getFiles(session.user.orgId, session.user.id, scope);
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: error.message } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.orgId) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const body = await request.json();
    const type = body.type || "file"; // file | folder

    if (type === "folder") {
      if (!body.name) {
        return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "Folder name is required" } }, { status: 400 });
      }
      const data = await createFolder(session.user.orgId, body.name, body.scope || "personal", session.user.id);
      return NextResponse.json({ ok: true, data });
    } else {
      if (!body.name || !body.fileKey) {
        return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "File name and key are required" } }, { status: 400 });
      }
      const data = await uploadFileAsset(
        session.user.orgId,
        body.name,
        body.fileKey,
        body.mimeType || "application/octet-stream",
        body.sizeBytes || 0,
        body.folderId || null,
        body.scope || "personal",
        session.user.id
      );
      return NextResponse.json({ ok: true, data });
    }
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: error.message } }, { status: 400 });
  }
}
