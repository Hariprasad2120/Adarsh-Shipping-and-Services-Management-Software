import { getPortalSession } from "@/modules/customer-portal/auth";
import { db } from "@/lib/db";

function getDriveFileId(fileKey: string): string | null {
  const match = fileKey.match(/\/file\/d\/([^/]+)\//);
  return match ? match[1] : null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getPortalSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { id } = await params;
  const fileVersion = await db.chaChecklistFileVersion.findFirst({
    where: {
      id,
      checklist: {
        job: {
          orgId: session.portalUser.orgId,
          customerId: session.portalUser.customerId,
          deletedAt: null,
        },
      },
    },
  });
  if (!fileVersion) {
    return new Response("Not found", { status: 404 });
  }
  const fileId = getDriveFileId(fileVersion.fileKey);
  if (fileId) {
    return Response.redirect(`https://drive.google.com/file/d/${fileId}/preview`, 302);
  }
  const { searchParams } = new URL(request.url);
  if (searchParams.get("download") === "true") {
    return new Response("Download unavailable for this checklist file.", { status: 404 });
  }
  return new Response("Preview unavailable for this checklist file.", { status: 404 });
}
