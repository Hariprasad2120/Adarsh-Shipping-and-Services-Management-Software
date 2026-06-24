import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listSpaces } from "@/lib/google-chat-client";

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

    // 3. Fetch real Google Chat spaces of the user
    let googleSpaces: any[] = [];
    try {
      googleSpaces = await listSpaces(session.user.id);
    } catch (err) {
      console.error("[ChatListAPI] Error listing Google Chat spaces:", err);
    }

    // 4. Resolve DM display names by cross-referencing with employees
    // Build employee lookup by email for matching
    const employeeByEmail = new Map<string, { id: string; name: string }>();
    for (const emp of employees) {
      if (emp.email) {
        employeeByEmail.set(emp.email.toLowerCase(), { id: emp.id, name: emp.name });
      }
      if (emp.workspaceConnection?.googleEmail) {
        employeeByEmail.set(emp.workspaceConnection.googleEmail.toLowerCase(), { id: emp.id, name: emp.name });
      }
    }

    // Build employee lookup by Google User ID
    const employeeByGoogleId = new Map<string, { id: string; name: string }>();
    for (const emp of employees) {
      if (emp.workspaceConnection?.googleUserId) {
        employeeByGoogleId.set(emp.workspaceConnection.googleUserId, { id: emp.id, name: emp.name });
      }
    }

    // For DM spaces with "Adarsh Operations" display name, try to resolve from GoogleChatSpace cache
    const dmSpaceNames = googleSpaces
      .filter(s => s.spaceType === "DIRECT_MESSAGE")
      .map(s => s.name);

    const cachedSpaces = dmSpaceNames.length > 0
      ? await db.googleChatSpace.findMany({
          where: { spaceResourceName: { in: dmSpaceNames } },
          select: { spaceResourceName: true, displayName: true, linkedRecordId: true, linkedRecordType: true }
        })
      : [];

    const cacheMap = new Map(cachedSpaces.map(c => [c.spaceResourceName, c]));
    
    // Track which employees have existing DM spaces
    const employeesWithDMs = new Set<string>();

    const resolvedSpaces = googleSpaces.map(space => {
      if (space.spaceType !== "DIRECT_MESSAGE") return space;

      const badNames = ["Adarsh Operations", "adarsh operations", "Google Chat DM", "Google User"];
      const needsResolution = !space.displayName || badNames.includes(space.displayName);

      if (needsResolution) {
        // Try cache
        const cached = cacheMap.get(space.name);
        if (cached?.linkedRecordId && cached.linkedRecordType === "User") {
          const emp = employees.find(e => e.id === cached.linkedRecordId);
          if (emp) {
            employeesWithDMs.add(emp.id);
            return { ...space, displayName: emp.name, employeeId: emp.id };
          }
        }
        if (cached?.displayName && !badNames.includes(cached.displayName)) {
          return { ...space, displayName: cached.displayName };
        }
      } else {
        // displayName is good — check if it matches an employee
        const matchedEmp = employees.find(e => 
          e.name.toLowerCase() === space.displayName?.toLowerCase()
        );
        if (matchedEmp) {
          employeesWithDMs.add(matchedEmp.id);
          return { ...space, employeeId: matchedEmp.id };
        }
      }

      return space;
    });

    return NextResponse.json({
      jobs: jobChannels,
      employees,
      googleSpaces: resolvedSpaces,
      employeesWithDMs: Array.from(employeesWithDMs)
    });
  } catch (err: any) {
    console.error("[ChatListAPI] Error listing chat channels:", err);
    return NextResponse.json({ error: err.message || "Failed to list channels" }, { status: 500 });
  }
}
