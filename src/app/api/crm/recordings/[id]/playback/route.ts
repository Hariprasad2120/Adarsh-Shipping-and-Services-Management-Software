import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import fs from "fs";
import { Readable } from "stream";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const recording = await db.crmCallRecording.findUnique({
      where: { id },
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

    // Write audit log
    await db.crmCallRecordingAuditLog.create({
      data: {
        orgId: recording.orgId,
        recordingId: recording.id,
        userId: session.user.id,
        action: "VIEW",
        ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
        userAgent: request.headers.get("user-agent") ?? undefined,
      },
    });

    // Try loading from database (Vercel/serverless) first, then filesystem (local dev)
    let fileBuffer: Buffer | null = null;

    if (recording.fileData) {
      fileBuffer = Buffer.from(recording.fileData, "base64");
    } else if (recording.filePath) {
      try {
        if (fs.existsSync(recording.filePath)) {
          // For filesystem, use streaming for range requests
          const stat = fs.statSync(recording.filePath);
          const fileSize = stat.size;
          const range = request.headers.get("range");

          if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            if (start >= fileSize || end >= fileSize) {
              return new Response("Requested range not satisfiable", {
                status: 416,
                headers: { "Content-Range": `bytes */${fileSize}` },
              });
            }

            const chunksize = end - start + 1;
            const fileStream = fs.createReadStream(recording.filePath, { start, end });
            const webStream = Readable.toWeb(fileStream);

            return new Response(webStream as any, {
              status: 206,
              headers: {
                "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                "Accept-Ranges": "bytes",
                "Content-Length": chunksize.toString(),
                "Content-Type": recording.mimeType || "audio/mpeg",
              },
            });
          } else {
            const fileStream = fs.createReadStream(recording.filePath);
            const webStream = Readable.toWeb(fileStream);

            return new Response(webStream as any, {
              status: 200,
              headers: {
                "Accept-Ranges": "bytes",
                "Content-Length": fileSize.toString(),
                "Content-Type": recording.mimeType || "audio/mpeg",
              },
            });
          }
        }
      } catch {
        // fs may not be available on serverless
      }
    }

    if (!fileBuffer) {
      return NextResponse.json({ error: "File not found in storage" }, { status: 404 });
    }

    // Serve from in-memory buffer (Vercel) with range request support
    const fileSize = fileBuffer.length;
    const range = request.headers.get("range");

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        return new Response("Requested range not satisfiable", {
          status: 416,
          headers: { "Content-Range": `bytes */${fileSize}` },
        });
      }

      const chunk = fileBuffer.subarray(start, end + 1);
      return new Response(new Uint8Array(chunk), {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunk.length.toString(),
          "Content-Type": recording.mimeType || "audio/mpeg",
        },
      });
    }

    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Accept-Ranges": "bytes",
        "Content-Length": fileSize.toString(),
        "Content-Type": recording.mimeType || "audio/mpeg",
      },
    });
  } catch (error: any) {
    console.error("playback API error:", error);
    return NextResponse.json({ error: error.message ?? "Internal Server Error" }, { status: 500 });
  }
}
