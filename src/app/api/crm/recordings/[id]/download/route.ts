import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { contentDisposition } from "@/lib/security";
import fs from "fs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Tenant scope: a recording id from another organisation must 404.
    const recording = await db.crmCallRecording.findFirst({
      where: { id, orgId: session.user.orgId },
    });

    if (!recording) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }

    // RBAC logic
    const userRoles = await db.userRole.findMany({
      where: { userId: session.user.id },
      include: { role: true },
    });
    const isManagerOrAdmin =
      session.user.isPlatformAdmin ||
      userRoles.some((ur) =>
        ["admin", "manager", "crm manager", "hr", "director", "management"].includes(
          ur.role.name.toLowerCase()
        )
      );

    if (!isManagerOrAdmin && recording.salespersonId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden: You cannot access this recording" }, { status: 403 });
    }

    // Try serving from database (Vercel/serverless) first, then filesystem (local dev)
    let fileBuffer: Buffer | null = null;

    if (recording.fileData) {
      fileBuffer = Buffer.from(recording.fileData, "base64");
    } else if (recording.filePath) {
      try {
        if (fs.existsSync(recording.filePath)) {
          fileBuffer = fs.readFileSync(recording.filePath);
        }
      } catch {
        // fs may not be available on serverless
      }
    }

    if (!fileBuffer) {
      return NextResponse.json({ error: "File not found in storage" }, { status: 404 });
    }

    return new Response(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Disposition": contentDisposition(recording.fileName, "attachment"),
        "Content-Type": recording.mimeType || "audio/mpeg",
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("download API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
