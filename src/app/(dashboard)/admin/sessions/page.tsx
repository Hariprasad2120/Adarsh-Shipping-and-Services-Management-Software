import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { SessionsDashboard } from "./sessions-dashboard";
import { Monitor } from "lucide-react";
import { requirePermission } from "@/lib/rbac";

export const metadata = {
  title: "Session Monitor | Admin | Adarsh Shipping",
};

export default async function SessionsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  await requirePermission(session.user.id, "admin.org.manage");
  const orgId = session.user.orgId;
  if (!orgId) {
    return (
      <div className="rounded-xl border border-outline-variant bg-surface p-8 text-center text-sm text-on-surface-variant">
        Organisation configuration missing.
      </div>
    );
  }

  const renderNow = new Date();

  // Active sessions: lastSeenAt within last 2 minutes
  const cutoff = new Date(renderNow);
  cutoff.setMinutes(cutoff.getMinutes() - 2);

  const [activeSessions, historySessions, securityEvents, timeoutSetting] = await Promise.all([
    db.userSession.findMany({
      where: { 
        status: "ACTIVE", 
        lastSeenAt: { gte: cutoff },
        user: { orgId }
      },
      include: { 
        user: { 
          select: { 
            id: true, 
            name: true, 
            email: true, 
            roles: { 
              include: { 
                role: true 
              } 
            } 
          } 
        } 
      },
      orderBy: { lastSeenAt: "desc" },
    }),
    db.userSession.findMany({
      where: { user: { orgId } },
      orderBy: { loginAt: "desc" },
      take: 100,
      include: { 
        user: { 
          select: { 
            id: true, 
            name: true, 
            email: true, 
            roles: { 
              include: { 
                role: true 
              } 
            } 
          } 
        } 
      },
    }),
    db.securityEvent.findMany({
      where: {
        OR: [
          { user: { orgId } },
          { userId: null }
        ]
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { 
        user: { 
          select: { 
            id: true, 
            name: true, 
            email: true, 
            roles: { 
              include: { 
                role: true 
              } 
            } 
          } 
        } 
      },
    }),
    db.systemSetting.findUnique({ where: { key: "SESSION_TIMEOUT_MINUTES" } }),
  ]);

  const timeoutMinutes = timeoutSetting ? parseInt(timeoutSetting.value, 10) : 10;

  const mapSession = (s: typeof activeSessions[0]) => ({
    id: s.id,
    userId: s.userId,
    userName: s.user.name,
    userEmail: s.user.email,
    userRole: s.user.roles[0]?.role.name ?? "Employee",
    loginAt: s.loginAt.toISOString(),
    lastSeenAt: s.lastSeenAt.toISOString(),
    ipAddress: s.ipAddress,
    location: s.location,
    durationMs: s.lastSeenAt.getTime() - s.loginAt.getTime(),
  });

  const mapHistory = (s: typeof historySessions[0]) => ({
    id: s.id,
    userId: s.userId,
    userName: s.user.name,
    userEmail: s.user.email,
    userRole: s.user.roles[0]?.role.name ?? "Employee",
    loginAt: s.loginAt.toISOString(),
    lastSeenAt: s.lastSeenAt.toISOString(),
    logoutAt: s.logoutAt?.toISOString() ?? null,
    status: s.status,
    ipAddress: s.ipAddress,
    location: s.location,
    durationMs: (s.logoutAt ?? s.lastSeenAt).getTime() - s.loginAt.getTime(),
  });

  const mapSecurityEvent = (event: typeof securityEvents[0]) => ({
    id: event.id,
    event: event.event,
    outcome: event.outcome,
    email: event.email,
    userName: event.user?.name ?? null,
    userEmail: event.user?.email ?? null,
    userRole: event.user?.roles[0]?.role.name ?? null,
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
    createdAt: event.createdAt.toISOString(),
  });

  return (
    <div className="max-w-7xl space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
          Real-time active sessions, session history, and security events logs.
        </p>
      </div>

      <SessionsDashboard
        initialActive={activeSessions.map(mapSession)}
        history={historySessions.map(mapHistory)}
        securityEvents={securityEvents.map(mapSecurityEvent)}
        renderedAt={renderNow.toISOString()}
        timeoutMinutes={timeoutMinutes}
      />
    </div>
  );
}
