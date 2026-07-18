import fs from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.orgId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const documentVersion = await db.customerDocumentVersion.findFirst({
    where: {
      id,
      submission: {
        orgId: session.user.orgId,
      },
    },
    include: {
      submission: {
        include: {
          job: {
            include: {
              assignments: true,
            },
          },
        },
      },
    },
  });

  if (!documentVersion) {
    return new Response("Document version not found", { status: 404 });
  }

  const actorId = session.user.id;
  const job = documentVersion.submission.job;
  const isConcernedUser = job.primaryOwnerId === actorId || job.assignments.some((assignment) => assignment.userId === actorId);
  const hasViewAll = await can(actorId, "cha.job.view_all");

  if (!isConcernedUser && !hasViewAll) {
    return new Response("Access Denied", { status: 403 });
  }

  const absolutePath = path.join(process.cwd(), "public", documentVersion.fileKey);
  const fileBuffer = await fs.readFile(absolutePath);
  const { searchParams } = new URL(request.url);
  const forceDownload = searchParams.get("download") === "true";

  return new Response(fileBuffer, {
    headers: {
      "Content-Type": documentVersion.mimeType || "application/octet-stream",
      "Content-Disposition": `${forceDownload ? "attachment" : "inline"}; filename="${documentVersion.fileName}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
