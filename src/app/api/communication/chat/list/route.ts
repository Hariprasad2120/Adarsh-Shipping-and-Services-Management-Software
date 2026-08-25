import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listSpaces } from "@/lib/google-chat-client";
import {
  getJobWorkspaceProfileSelect,
  normalizeJobWorkspaceProfile,
} from "@/lib/job-workspace-profile";

type GoogleChatSpace = Awaited<ReturnType<typeof listSpaces>>[number];
const GENERIC_DM_NAMES = new Set([
  "Adarsh Operations",
  "adarsh operations",
  "ADARSH OPERATIONS",
  "Adarsh Shipping",
  "adarsh shipping",
  "Google Chat DM",
  "Google User",
  "Direct message",
  "Chat Member",
]);

function isGenericDmName(value?: string | null) {
  return !value || GENERIC_DM_NAMES.has(value.trim());
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = session.user.orgId!;

  try {
    const workspaceProfileSelect = await getJobWorkspaceProfileSelect();
    // 1. Fetch Job Spaces (from JobWorkspaceProfile)
    const jobs = await db.chaJob.findMany({
      where: {
        orgId,
        deletedAt: null,
        workspaceProfile: {
          googleSpaceId: { not: null },
          provisioningStatus: "success"
        }
      },
      select: {
        id: true,
        jobNumber: true,
        title: true,
        workspaceProfile: {
          select: workspaceProfileSelect,
        },
      },
      orderBy: {
        jobNumber: "desc"
      }
    });

    const jobChannels = jobs.map((job) => ({
      id: job.id,
      jobNumber: job.jobNumber,
      title: job.title,
      spaceId: normalizeJobWorkspaceProfile(job.workspaceProfile)?.googleSpaceId,
      spaceUrl: normalizeJobWorkspaceProfile(job.workspaceProfile)?.googleSpaceUrl
    }));

    // 2. Fetch active employees for identity resolution, then derive the DM picker list.
    const allEmployees = await db.user.findMany({
      where: {
        orgId,
        active: true,
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

    const employees = allEmployees.filter((employee) => employee.id !== session.user.id);

    const employeesById = new Map(allEmployees.map((employee) => [employee.id, employee]));
    const employeesByGoogleId = new Map(
      allEmployees
        .filter((employee) => employee.workspaceConnection?.googleUserId)
        .map((employee) => [employee.workspaceConnection!.googleUserId!, employee]),
    );
    const employeesByEmail = new Map<string, (typeof allEmployees)[number]>();
    for (const employee of allEmployees) {
      if (employee.email) {
        employeesByEmail.set(employee.email.toLowerCase(), employee);
      }
      if (employee.workspaceConnection?.googleEmail) {
        employeesByEmail.set(employee.workspaceConnection.googleEmail.toLowerCase(), employee);
      }
    }

    // 3. Fetch real Google Chat spaces of the user
    let googleSpaces: GoogleChatSpace[] = [];
    try {
      googleSpaces = await listSpaces(session.user.id);
    } catch (err) {
      console.error("[ChatListAPI] Error listing Google Chat spaces:", err);
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

    const resolvedSpaces = googleSpaces.map((space) => {
      if (space.spaceType !== "DIRECT_MESSAGE") return space;

      if (space.participantUserId) {
        const emp = employeesById.get(space.participantUserId);
        if (emp) {
          employeesWithDMs.add(emp.id);
          return { ...space, displayName: emp.name, employeeId: emp.id };
        }
      }

      if (space.participantGoogleUserId) {
        const emp = employeesByGoogleId.get(space.participantGoogleUserId);
        if (emp) {
          employeesWithDMs.add(emp.id);
          return { ...space, displayName: emp.name, employeeId: emp.id };
        }
      }

      if (space.participantEmail) {
        const emp = employeesByEmail.get(space.participantEmail.toLowerCase());
        if (emp) {
          employeesWithDMs.add(emp.id);
          return { ...space, displayName: emp.name, employeeId: emp.id };
        }
      }

      const needsResolution = isGenericDmName(space.displayName);

      if (needsResolution) {
        // Try cached linked user first.
        const cached = cacheMap.get(space.name);
        if (cached?.linkedRecordId && cached.linkedRecordType === "User") {
          const emp = employeesById.get(cached.linkedRecordId);
          if (emp) {
            employeesWithDMs.add(emp.id);
            return { ...space, displayName: emp.name, employeeId: emp.id };
          }
        }

        if (cached?.linkedRecordId) {
          const emp =
            employeesByGoogleId.get(cached.linkedRecordId) ??
            employeesByEmail.get(cached.linkedRecordId.toLowerCase());
          if (emp) {
            employeesWithDMs.add(emp.id);
            return { ...space, displayName: emp.name, employeeId: emp.id };
          }
        }

        if (cached?.displayName && !isGenericDmName(cached.displayName)) {
          const matchedEmp = allEmployees.find((employee) =>
            employee.name.toLowerCase() === cached.displayName!.toLowerCase(),
          );
          if (matchedEmp && matchedEmp.id !== session.user.id) {
            employeesWithDMs.add(matchedEmp.id);
            return { ...space, displayName: matchedEmp.name, employeeId: matchedEmp.id };
          }
          return { ...space, displayName: cached.displayName };
        }

        return {
          ...space,
          displayName: undefined,
        };
      } else {
        // displayName is already resolved by Google/our sync path — preserve it.
        const matchedEmp = employees.find((employee) =>
          employee.name.toLowerCase() === space.displayName!.toLowerCase(),
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
  } catch (err: unknown) {
    console.error("[ChatListAPI] Error listing chat channels:", err);
    return NextResponse.json({ error: getErrorMessage(err, "Failed to list channels") }, { status: 500 });
  }
}
