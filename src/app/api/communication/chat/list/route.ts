import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = session.user.orgId!;

  try {
    // 1. Fetch Job Spaces (from JobWorkspaceProfile)
    const jobs = await db.chaJob.findMany({
      where: {
        orgId,
        workspaceProfile: {
          googleSpaceId: { not: null },
          provisioningStatus: "success"
        }
      },
      include: {
        workspaceProfile: true
      },
      orderBy: {
        jobNumber: "desc"
      }
    });

    const jobChannels = jobs.map((job) => ({
      id: job.id,
      jobNumber: job.jobNumber,
      title: job.title,
      spaceId: job.workspaceProfile?.googleSpaceId,
      spaceUrl: job.workspaceProfile?.googleSpaceUrl
    }));

    // 2. Fetch other active Employees for direct messaging mapping
    const employees = await db.user.findMany({
      where: {
        orgId,
        active: true,
        id: { not: session.user.id }
      },
      select: {
        id: true,
        name: true,
        email: true,
        designation: true,
        workspaceConnection: {
          select: {
            googleUserId: true,
            googleEmail: true
          }
        }
      },
      orderBy: {
        name: "asc"
      }
    });

    return NextResponse.json({
      jobs: jobChannels,
      employees
    });
  } catch (err: any) {
    console.error("[ChatListAPI] Error listing chat channels:", err);
    return NextResponse.json({ error: err.message || "Failed to list channels" }, { status: 500 });
  }
}
