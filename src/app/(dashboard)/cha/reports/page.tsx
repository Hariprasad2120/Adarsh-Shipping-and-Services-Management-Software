import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";
import {
  TrendingUp,
  AlertTriangle,
  DollarSign,
  FileText,
  ChevronRight,
  BarChart2,
} from "lucide-react";
import {
  ChaPageHeader,
  ChaMetricCard,
  ChaSectionShell,
} from "../_components/cha-operations-shared";

export default async function ChaReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) redirect("/setup");

  // Require audit view permission
  await requirePermission(session.user.id, "cha.audit.view");

  // Parallelize all independent queries
  const [stageCounts, advances, expenses, delayedFilings, auditLogsRaw] = await Promise.all([
    db.chaJob.groupBy({
      by: ["stage"],
      where: { orgId, deletedAt: null },
      _count: { id: true },
    }),
    db.chaCustomerAdvance.findMany({
      where: { job: { orgId, deletedAt: null } },
      include: { receipts: true },
    }),
    db.chaExpensePayment.findMany({
      where: { request: { orgId, job: { deletedAt: null } } },
    }),
    db.chaFiling.findMany({
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
    }),
    db.chaAuditLog.findMany({
      where: { orgId },
      orderBy: { timestamp: "desc" },
      include: {
        job: { select: { jobNumber: true } },
      },
      take: 15,
    }),
  ]);

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

  const totalExpectedAdvance = advances.reduce(
    (sum, a) => sum + Number(a.expectedAmount || 0),
    0
  );
  const totalReceivedAdvance = advances.reduce(
    (sum, a) =>
      sum + a.receipts.reduce((tot, r) => tot + Number(r.amount), 0),
    0
  );

  const totalDisbursedExpense = expenses.reduce(
    (sum, e) => sum + Number(e.amountPaid || 0),
    0
  );

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
      {/* Page Header */}
      <ChaPageHeader
        eyebrow={
          <>
            <span>CHA</span>
            <ChevronRight size={14} />
            <span>Reports & Analytics</span>
          </>
        }
        title="Reports"
        description="Monitor clearance metrics, advance billings, outlays, and organizational compliance audits."
        icon={<BarChart2 size={20} />}
      />

      {/* Grid: Financial & General Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card: Client Advances */}
        <div className="card-top-accent rounded-xl bg-cha-surface border border-cha-border p-5 space-y-3 shadow-sm hover:shadow-md transition-all dark:border-cha-border-strong">
          <div className="flex items-center justify-between text-cha-text-secondary">
            <span className="ds-label">Client Advances</span>
            <DollarSign size={18} className="text-cha-primary" />
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-cha-text-secondary font-medium">Expected Billing:</span>
              <span className="ds-numeric text-cha-text-primary">₹{totalExpectedAdvance.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-cha-text-secondary font-medium">Collected:</span>
              <span className="ds-numeric text-emerald-600 dark:text-emerald-400">₹{totalReceivedAdvance.toLocaleString("en-IN")}</span>
            </div>
            <div className="border-t border-cha-border/40 pt-1.5 flex justify-between text-xs dark:border-cha-border-strong">
              <span className="text-cha-text-secondary font-semibold">Outstanding Balance:</span>
              <span className="ds-numeric text-amber-600 dark:text-amber-400">
                ₹{Math.max(0, totalExpectedAdvance - totalReceivedAdvance).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* Card: Operational Disbursements */}
        <div className="card-top-accent-orange rounded-xl bg-cha-surface border border-cha-border p-5 space-y-3 shadow-sm hover:shadow-md transition-all dark:border-cha-border-strong">
          <div className="flex items-center justify-between text-cha-text-secondary">
            <span className="ds-label">Operational Outlays</span>
            <DollarSign size={18} className="text-[#fb923c]" />
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-cha-text-secondary font-medium">Total Paid Expenses:</span>
              <span className="ds-numeric text-cha-text-primary">₹{totalDisbursedExpense.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-cha-text-secondary font-medium">Net Financed Balance:</span>
              <span className="ds-numeric text-emerald-600 dark:text-emerald-400">
                ₹{(totalReceivedAdvance - totalDisbursedExpense).toLocaleString("en-IN")}
              </span>
            </div>
            <p className="text-[10px] text-cha-text-muted italic border-t border-cha-border/40 pt-1.5 leading-relaxed dark:border-cha-border-strong">
              Financial health metric mapping advanced client payments against cash outlays for clearance services.
            </p>
          </div>
        </div>

        {/* Card: Stage distributions */}
        <div className="card-top-accent rounded-xl bg-cha-surface border border-cha-border p-5 space-y-3 shadow-sm hover:shadow-md transition-all dark:border-cha-border-strong">
          <div className="flex items-center justify-between text-cha-text-secondary">
            <span className="ds-label">Workflow Pipelines</span>
            <TrendingUp size={18} className="text-cha-primary" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-cha-text-secondary">Doc Collection:</span>
              <span className="ds-numeric text-cha-text-primary">{stageMap.DOCUMENT_COLLECTION}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-cha-text-secondary">Checklist Prep:</span>
              <span className="ds-numeric text-cha-text-primary">{stageMap.CHECKLIST_PREPARATION}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-cha-text-secondary">Checklist Approval:</span>
              <span className="ds-numeric text-cha-text-primary">{stageMap.CHECKLIST_APPROVAL}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-cha-text-secondary">Filing Stage:</span>
              <span className="ds-numeric text-cha-text-primary">{stageMap.FILING}</span>
            </div>
            <div className="flex justify-between border-t border-cha-border/40 pt-1 dark:border-cha-border-strong">
              <span className="text-cha-text-secondary font-semibold">Completed / Filed:</span>
              <span className="ds-numeric text-emerald-600 dark:text-emerald-400">{stageMap.FILED}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Delayed filings reports */}
        <div className="lg:col-span-2 rounded-xl border border-cha-border bg-cha-surface p-6 space-y-6 shadow-sm dark:border-cha-border-strong">
          <h2 className="text-base font-bold text-cha-text-primary uppercase font-display flex items-center gap-2">
            <AlertTriangle size={18} className="text-[#fb923c]" /> Delay-Justified Customs Filings
          </h2>

          {delayedFilings.length === 0 ? (
            <p className="text-xs text-cha-text-secondary italic p-4 border border-dashed border-cha-border rounded-lg dark:border-cha-border-strong">
              No filing delays reported in this organization. Excellent compliance timeline!
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th className="px-6 py-4">Job Number</th>
                    <th className="px-6 py-4">Customer Name</th>
                    <th className="px-6 py-4">Actual Date Filed</th>
                    <th className="px-6 py-4">BOE Ref Number</th>
                    <th className="px-6 py-4">Delay Reasons</th>
                  </tr>
                </thead>
                <tbody>
                  {delayedFilings.map((f) => (
                    <tr key={f.id} className="hover:bg-cha-primary-soft/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-cha-primary dark:text-blue-400">
                        {f.job.jobNumber}
                      </td>
                      <td className="px-6 py-4 text-cha-text-primary">{f.job.customer.name}</td>
                      <td className="px-6 py-4 ds-numeric text-cha-text-secondary">
                        {f.actualFilingDate ? new Date(f.actualFilingDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }) : "—"}
                      </td>
                      <td className="px-6 py-4 ds-numeric text-cha-text-secondary">{f.filingRef}</td>
                      <td className="px-6 py-4 text-xs text-red-600 dark:text-red-400 leading-relaxed font-medium bg-red-500/5 max-w-xs truncate">
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
        <div className="rounded-xl border border-cha-border bg-cha-surface p-6 space-y-6 shadow-sm dark:border-cha-border-strong">
          <h2 className="text-base font-bold text-cha-text-primary uppercase font-display flex items-center gap-2">
            <FileText size={18} className="text-cha-primary" /> Organization Audit Feed
          </h2>

          <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
            {auditLogs.map((log) => (
              <div key={log.id} className="text-xs p-3 bg-cha-surface-subtle border border-cha-border rounded-xl space-y-1.5 dark:border-cha-border-strong">
                <div className="flex items-center justify-between border-b border-cha-border/40 pb-1 dark:border-cha-border-strong">
                  <span className="font-bold text-cha-primary dark:text-blue-400">{log.job?.jobNumber || "System"}</span>
                  <span className="text-[9px] text-cha-text-muted ds-numeric">
                    {new Date(log.timestamp).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                </div>
                <p className="font-semibold text-[11px] uppercase tracking-wide text-cha-text-primary leading-tight">
                  {log.event.replace(/_/g, " ")}
                </p>
                <p className="text-[11px] text-cha-text-secondary leading-relaxed">
                  "{log.remarks}"
                </p>
                <div className="flex justify-between items-center text-[9px] text-cha-text-muted">
                  <span>Actor: {log.actor.name}</span>
                  {log.newState && (
                    <span>State: {log.newState}</span>
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
