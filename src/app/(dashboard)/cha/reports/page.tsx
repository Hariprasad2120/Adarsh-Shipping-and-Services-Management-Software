import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";
import {
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Activity,
  FileText,
} from "lucide-react";

export default async function ChaReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) redirect("/setup");

  // Require audit view permission
  await requirePermission(session.user.id, "cha.audit.view");

  // 1. Stage Counts
  const stageCounts = await db.chaJob.groupBy({
    by: ["stage"],
    where: { orgId, deletedAt: null },
    _count: { id: true },
  });

  const stageMap: Record<string, number> = {
    DOCUMENT_COLLECTION: 0,
    CHECKLIST_PREPARATION: 0,
    CHECKLIST_APPROVAL: 0,
    FILING: 0,
    FILED: 0,
  };
  stageCounts.forEach((sc) => {
    stageMap[sc.stage] = sc._count.id;
  });

  // 2. Financial Summaries
  const advances = await db.chaCustomerAdvance.findMany({
    where: { job: { orgId, deletedAt: null } },
    include: { receipts: true },
  });

  const totalExpectedAdvance = advances.reduce(
    (sum, a) => sum + Number(a.expectedAmount || 0),
    0
  );
  const totalReceivedAdvance = advances.reduce(
    (sum, a) =>
      sum + a.receipts.reduce((tot, r) => tot + Number(r.amount), 0),
    0
  );

  const expenses = await db.chaExpensePayment.findMany({
    where: { request: { orgId, job: { deletedAt: null } } },
  });
  const totalDisbursedExpense = expenses.reduce(
    (sum, e) => sum + Number(e.amountPaid || 0),
    0
  );

  // 3. Delayed Filings
  const delayedFilings = await db.chaFiling.findMany({
    where: {
      job: { orgId, deletedAt: null },
      status: "FILED",
      delayReason: { not: null },
    },
    include: {
      job: { include: { customer: true } },
    },
    orderBy: { actualFilingDate: "desc" },
    take: 10,
  });

  // 4. Latest Audit Logs
  const auditLogsRaw = await db.chaAuditLog.findMany({
    where: { orgId },
    orderBy: { timestamp: "desc" },
    include: {
      job: { select: { jobNumber: true } },
    },
    take: 15,
  });

  const actorIds = Array.from(new Set(auditLogsRaw.map((l) => l.actorId)));
  const actors = await db.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, name: true },
  });
  const actorMap = new Map(actors.map((a) => [a.id, { name: a.name }]));

  const auditLogs = auditLogsRaw.map((l) => ({
    ...l,
    actor: actorMap.get(l.actorId) || { name: "System" },
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-outline-variant/30 pb-4">
        <h1 className="ds-h1 text-[#00cec4] flex items-center gap-2">
          <span className="ds-icon-badge bg-[#00cec4]/10 text-[#00cec4] p-1.5 rounded-xl">
            <Activity size={20} />
          </span>
          Clearance Analytics & Reports
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Perform timeline auditing, compile financial balances, and track workflow stage bottlenecks.
        </p>
      </div>

      {/* Grid: Financial & General Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card: Client Advances */}
        <div className="card-top-accent rounded-xl bg-surface border border-outline-variant/30 p-5 space-y-3 shadow-sm hover-cyan transition-all">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="ds-label">Client Advances Summary</span>
            <DollarSign size={18} className="text-[#00cec4]" />
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-on-surface-variant font-medium">Expected Billing:</span>
              <span className="font-bold ds-numeric text-on-surface">₹{totalExpectedAdvance.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-on-surface-variant font-medium">Total Collected:</span>
              <span className="font-bold ds-numeric text-green-600">₹{totalReceivedAdvance.toLocaleString("en-IN")}</span>
            </div>
            <div className="border-t border-outline-variant/20 pt-1.5 flex justify-between text-xs">
              <span className="text-on-surface-variant font-semibold">Outstanding Cash Flow:</span>
              <span className="font-bold ds-numeric text-[#fb923c]">
                ₹{Math.max(0, totalExpectedAdvance - totalReceivedAdvance).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* Card: Operational Disbursements */}
        <div className="card-top-accent rounded-xl bg-surface border border-outline-variant/30 p-5 space-y-3 shadow-sm hover-cyan transition-all">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="ds-label">Operational Disbursements</span>
            <DollarSign size={18} className="text-[#fb923c]" />
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-on-surface-variant font-medium">Total Paid Expenses:</span>
              <span className="font-bold ds-numeric text-on-surface">₹{totalDisbursedExpense.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-on-surface-variant font-medium">Net Financing Balances:</span>
              <span className="font-bold ds-numeric text-green-600">
                ₹{(totalReceivedAdvance - totalDisbursedExpense).toLocaleString("en-IN")}
              </span>
            </div>
            <p className="text-[10px] text-on-surface-variant italic border-t border-outline-variant/20 pt-1.5 leading-relaxed">
              Financial health metric mapping advanced client payments against cash outlays for clearance services.
            </p>
          </div>
        </div>

        {/* Card: Stage distributions */}
        <div className="card-top-accent rounded-xl bg-surface border border-outline-variant/30 p-5 space-y-3 shadow-sm hover-cyan transition-all">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="ds-label">Workflow Stage Breakdown</span>
            <TrendingUp size={18} className="text-[#00cec4]" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Doc Collection:</span>
              <span className="font-bold ds-numeric">{stageMap.DOCUMENT_COLLECTION}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Checklist Prep:</span>
              <span className="font-bold ds-numeric">{stageMap.CHECKLIST_PREPARATION}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Checklist Approval:</span>
              <span className="font-bold ds-numeric">{stageMap.CHECKLIST_APPROVAL}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Filing Stage:</span>
              <span className="font-bold ds-numeric">{stageMap.FILING}</span>
            </div>
            <div className="flex justify-between border-t border-outline-variant/20 pt-1">
              <span className="text-on-surface-variant font-semibold">Completed / Filed:</span>
              <span className="font-bold ds-numeric text-green-600">{stageMap.FILED}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Delayed filings reports */}
        <div className="lg:col-span-2 bg-surface border border-outline-variant/30 rounded-xl p-6 space-y-6 shadow-sm">
          <h2 className="ds-h2 text-on-surface flex items-center gap-2">
            <AlertTriangle size={18} className="text-[#fb923c]" /> Delay-Justified Customs Filings
          </h2>

          {delayedFilings.length === 0 ? (
            <p className="text-xs text-on-surface-variant italic p-4 border border-dashed rounded-lg">
              No filing delays reported in this organization. Excellent timeline compliance!
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Job Number</th>
                    <th>Customer Name</th>
                    <th>Actual Date Filed</th>
                    <th>BOE Ref Number</th>
                    <th>Justified Delay Reason Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {delayedFilings.map((f) => (
                    <tr key={f.id}>
                      <td className="font-semibold text-[#00cec4]">{f.job.jobNumber}</td>
                      <td>{f.job.customer.name}</td>
                      <td className="font-mono text-xs text-on-surface-variant">
                        {f.actualFilingDate ? new Date(f.actualFilingDate).toDateString() : "—"}
                      </td>
                      <td className="font-mono text-xs">{f.filingRef}</td>
                      <td className="text-xs text-red-600 leading-relaxed font-medium bg-red-50/10 max-w-xs truncate">
                        {f.delayReason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Full organization Audit Logs feed */}
        <div className="bg-surface border border-outline-variant/30 rounded-xl p-6 space-y-6 shadow-sm">
          <h2 className="ds-h2 text-on-surface flex items-center gap-2">
            <FileText size={18} className="text-[#00cec4]" /> Organization Audit Logs
          </h2>

          <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
            {auditLogs.map((log) => (
              <div key={log.id} className="text-xs p-3 bg-surface-container-low border border-outline-variant/40 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between border-b border-outline-variant/20 pb-1">
                  <span className="font-bold text-[#00cec4]">{log.job?.jobNumber || "System"}</span>
                  <span className="text-[9px] text-on-surface-variant font-mono">
                    {new Date(log.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <p className="font-semibold text-[11px] uppercase tracking-wide text-on-surface leading-tight">
                  {log.event.replace(/_/g, " ")}
                </p>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  "{log.remarks}"
                </p>
                <div className="flex justify-between items-center text-[9px] text-on-surface-variant">
                  <span>Actor: {log.actor.name}</span>
                  {log.newState && (
                    <span>NewState: {log.newState}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
