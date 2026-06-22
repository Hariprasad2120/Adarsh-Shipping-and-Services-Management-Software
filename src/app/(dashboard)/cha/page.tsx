import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import Link from "next/link";
import {
  Ship,
  FileText,
  CheckSquare,
  DollarSign,
  AlertCircle,
  Plus,
  Briefcase,
  UserCheck,
  Settings,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function ChaDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) redirect("/setup");

  // Require CHA module access
  await requirePermission(session.user.id, "cha.access");

  // Fetch KPI data
  const [
    activeJobsCount,
    pendingChecklistsCount,
    pendingFilingsCount,
    urgentExpensesCount,
    recentAuditLogsRaw,
    myJobs,
  ] = await Promise.all([
    db.chaJob.count({
      where: { orgId, deletedAt: null, stage: { not: "FILED" }, status: "ACTIVE" },
    }),
    db.chaChecklistImport.count({
      where: { status: "PENDING_APPROVAL", job: { orgId, deletedAt: null } },
    }),
    db.chaFiling.count({
      where: { status: "PENDING", job: { orgId, deletedAt: null } },
    }),
    db.chaExpenseRequest.count({
      where: { orgId, status: "URGENT_PAYMENT_REQUIRED", job: { deletedAt: null } },
    }),
    db.chaAuditLog.findMany({
      where: { orgId },
      take: 6,
      orderBy: { timestamp: "desc" },
      include: {
        job: { select: { jobNumber: true, title: true } },
      },
    }),
    db.chaJob.findMany({
      where: {
        orgId,
        deletedAt: null,
        status: "ACTIVE",
        assignments: { some: { userId: session.user.id } },
      },
      include: {
        customer: { select: { name: true } },
        jobType: { select: { name: true } },
      },
      take: 5,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  // Resolve actor names manually
  const actorIds = Array.from(new Set(recentAuditLogsRaw.map((l) => l.actorId)));
  const actors = await db.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, name: true },
  });
  const actorMap = new Map(actors.map((a) => [a.id, { name: a.name }]));

  const recentAuditLogs = recentAuditLogsRaw.map((l) => ({
    ...l,
    actor: actorMap.get(l.actorId) || { name: "System" },
  }));

  // Compute outstanding advances
  const pendingAdvances = await db.chaCustomerAdvance.findMany({
    where: {
      job: { orgId, deletedAt: null },
      status: { in: ["FOLLOW_UP", "PARTIALLY_RECEIVED"] },
    },
    include: { receipts: true },
  });

  const totalOutstandingAdvance = pendingAdvances.reduce((sum, adv) => {
    const expected = Number(adv.expectedAmount || 0);
    const received = adv.receipts.reduce((tot, r) => tot + Number(r.amount), 0);
    return sum + Math.max(0, expected - received);
  }, 0);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-outline-variant/30 pb-6">
        <div>
          <h1 className="ds-h1 text-[#00cec4] flex items-center gap-3">
            <span className="ds-icon-badge bg-[#00cec4]/10 text-[#00cec4] p-2 rounded-xl">
              <Ship size={24} />
            </span>
            Customs House Agent (CHA) Dashboard
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Real-time stage tracking, document gates compliance, checklist manager audits, and advance/expense accounting.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/cha/jobs?new=true">
            <Button className="flex items-center gap-2">
              <Plus size={16} /> New Clearance Job
            </Button>
          </Link>
          <Link href="/cha/settings">
            <Button variant="outline" className="flex items-center gap-2">
              <Settings size={16} /> Workflow Configuration
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* KPI: Active Jobs */}
        <div className="card-top-accent rounded-xl bg-surface border border-outline-variant/30 p-5 space-y-2 hover-cyan transition-all">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="ds-label">Active Clearance Jobs</span>
            <span className="ds-icon-badge">
              <Briefcase size={16} />
            </span>
          </div>
          <p className="text-3xl font-bold ds-numeric text-on-surface">{activeJobsCount}</p>
          <span className="text-[10px] text-on-surface-variant">Jobs currently in operations</span>
        </div>

        {/* KPI: Checklist Approvals */}
        <div className="card-top-accent rounded-xl bg-surface border border-outline-variant/30 p-5 space-y-2 hover-cyan transition-all">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="ds-label">Checklists Pending</span>
            <span className="ds-icon-badge" style={{ background: pendingChecklistsCount > 0 ? "rgba(251,146,60,0.1)" : undefined, color: pendingChecklistsCount > 0 ? "#fb923c" : undefined }}>
              <CheckSquare size={16} />
            </span>
          </div>
          <p className={`text-3xl font-bold ds-numeric ${pendingChecklistsCount > 0 ? "text-[#fb923c]" : "text-on-surface"}`}>{pendingChecklistsCount}</p>
          <span className="text-[10px] text-on-surface-variant">Awaiting manager review decision</span>
        </div>

        {/* KPI: Pending Filings */}
        <div className="card-top-accent rounded-xl bg-surface border border-outline-variant/30 p-5 space-y-2 hover-cyan transition-all">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="ds-label">Pending Filings</span>
            <span className="ds-icon-badge">
              <FileText size={16} />
            </span>
          </div>
          <p className="text-3xl font-bold ds-numeric text-on-surface">{pendingFilingsCount}</p>
          <span className="text-[10px] text-on-surface-variant">Awaiting custom BOE/SB submissions</span>
        </div>

        {/* KPI: Urgent Expenses */}
        <div className="card-top-accent rounded-xl bg-surface border border-outline-variant/30 p-5 space-y-2 hover-cyan transition-all">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="ds-label">Urgent Expenses</span>
            <span className="ds-icon-badge" style={{ background: urgentExpensesCount > 0 ? "rgba(251,146,60,0.1)" : undefined, color: urgentExpensesCount > 0 ? "#fb923c" : undefined }}>
              <AlertCircle size={16} />
            </span>
          </div>
          <p className={`text-3xl font-bold ds-numeric ${urgentExpensesCount > 0 ? "text-[#fb923c]" : "text-on-surface"}`}>{urgentExpensesCount}</p>
          <span className="text-[10px] text-on-surface-variant">Immediate payouts required</span>
        </div>

        {/* KPI: Customer Advances */}
        <div className="card-top-accent rounded-xl bg-surface border border-outline-variant/30 p-5 space-y-2 hover-cyan transition-all">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="ds-label">Outstanding Advances</span>
            <span className="ds-icon-badge">
              <DollarSign size={16} />
            </span>
          </div>
          <p className="text-2xl font-bold ds-numeric text-on-surface">
            ₹{totalOutstandingAdvance.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-on-surface-variant">Expected follow-up collections</span>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Assigned to Me Jobs */}
        <div className="lg:col-span-2 bg-[var(--color-surface)] border border-outline-variant/30 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
            <h2 className="ds-h2 text-on-surface flex items-center gap-2">
              <UserCheck size={18} className="text-[#00cec4]" /> My Assigned Jobs
            </h2>
            <Link href="/cha/jobs" className="text-xs text-[#00cec4] hover:underline uppercase tracking-wider font-semibold">
              View All
            </Link>
          </div>

          {myJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-on-surface-variant border border-dashed border-outline-variant/50 rounded-xl">
              <p className="text-sm font-medium">You don't have any active job assignments.</p>
              <p className="text-xs mt-1">Operational assignments will appear here once you are mapped to a job.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Job Number</th>
                    <th>Customer</th>
                    <th>Job Type</th>
                    <th>Current Stage</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {myJobs.map((job) => (
                    <tr
                      key={job.id}
                      className="ds-row-link"
                      // Wrap in simple routing
                    >
                      <td className="font-semibold text-[#00cec4]">
                        <Link href={`/cha/jobs/${job.id}`}>{job.jobNumber}</Link>
                      </td>
                      <td>{job.customer.name}</td>
                      <td className="ds-label">{job.jobType.name}</td>
                      <td>
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                          job.stage === "FILING"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : job.stage === "CHECKLIST_APPROVAL"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : job.stage === "FILED"
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-surface-container-high text-on-surface border border-outline-variant"
                        }`}>
                          {job.stage.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td>
                        <span className={`font-semibold text-xs ${
                          job.priority === "HIGH" ? "text-red-500" : job.priority === "MEDIUM" ? "text-orange-400" : "text-on-surface-variant"
                        }`}>
                          {job.priority}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Col: Timeline/Audit Feed */}
        <div className="bg-[var(--color-surface)] border border-outline-variant/30 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
            <h2 className="ds-h2 text-on-surface flex items-center gap-2">
              <TrendingUp size={18} className="text-[#00cec4]" /> Recent Milestones
            </h2>
            <Link href="/cha/reports" className="text-xs text-[#00cec4] hover:underline uppercase tracking-wider font-semibold">
              Full Logs
            </Link>
          </div>

          {recentAuditLogs.length === 0 ? (
            <div className="text-center p-8 text-on-surface-variant">
              <p className="text-sm">No recent activity logged.</p>
            </div>
          ) : (
            <div className="relative pl-4 space-y-6 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[2px] before:bg-outline-variant/40">
              {recentAuditLogs.map((log) => (
                <div key={log.id} className="relative space-y-1">
                  {/* Timeline Dot */}
                  <span className="absolute -left-[13px] top-1.5 w-[10px] h-[10px] rounded-full bg-[#00cec4] border-2 border-surface shadow-[0_0_0_2px_rgba(0,206,196,0.15)]" />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#00cec4] hover:underline">
                      <Link href={`/cha/jobs/${log.jobId}`}>{log.job?.jobNumber || "N/A"}</Link>
                    </span>
                    <span className="text-[10px] text-on-surface-variant">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-on-surface block">
                    {log.event.replace(/_/g, " ")}
                  </p>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    {log.remarks}
                  </p>
                  <span className="text-[9px] text-on-surface-variant block">
                    by {log.actor.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
