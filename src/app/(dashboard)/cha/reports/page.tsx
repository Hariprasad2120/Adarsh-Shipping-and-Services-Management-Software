import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";
import { listCompletedChaJobsForReports } from "@/modules/cha/job-report";
import {
  TrendingUp,
  AlertTriangle,
  DollarSign,
  FileText,
  ChevronRight,
  BarChart2,
  Search,
  Download,
  ExternalLink,
} from "lucide-react";
import {
  ChaPageHeader,
  ChaMetricCard,
  ChaSectionShell,
} from "../_components/cha-operations-shared";

export default async function ChaReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) redirect("/setup");

  // Require audit view permission
  await requirePermission(session.user.id, "cha.audit.view");
  const resolvedSearchParams = await searchParams;
  const jobReportQuery = Array.isArray(resolvedSearchParams.q)
    ? resolvedSearchParams.q[0] || ""
    : resolvedSearchParams.q || "";

  // Parallelize all independent queries
  const [stageCounts, advances, expenses, delayedFilings, auditLogsRaw, completedReportJobs] = await Promise.all([
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
    listCompletedChaJobsForReports(orgId, jobReportQuery),
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
        <div className="monolith-card monolith-accent rounded-xl bg-cha-surface border border-cha-border p-5 space-y-3 shadow-sm hover:shadow-md transition-all dark:border-cha-border-strong">
          <div className="flex items-center justify-between text-cha-text-secondary">
            <span className="monolith-label">Client Advances</span>
            <DollarSign size={18} className="text-cha-primary" />
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-cha-text-secondary font-medium">Expected Billing:</span>
              <span className="monolith-numeric text-cha-text-mono-accent">₹{totalExpectedAdvance.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-cha-text-secondary font-medium">Collected:</span>
              <span className="monolith-numeric text-emerald-600 dark:text-emerald-400">₹{totalReceivedAdvance.toLocaleString("en-IN")}</span>
            </div>
            <div className="border-t border-cha-border/40 pt-1.5 flex justify-between text-xs dark:border-cha-border-strong">
              <span className="text-cha-text-secondary font-semibold">Outstanding Balance:</span>
              <span className="monolith-numeric text-amber-600 dark:text-amber-400">
                ₹{Math.max(0, totalExpectedAdvance - totalReceivedAdvance).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* Card: Operational Disbursements */}
        <div className="monolith-card monolith-accent-warning rounded-xl bg-cha-surface border border-cha-border p-5 space-y-3 shadow-sm hover:shadow-md transition-all dark:border-cha-border-strong">
          <div className="flex items-center justify-between text-cha-text-secondary">
            <span className="monolith-label">Operational Outlays</span>
            <DollarSign size={18} className="text-[#D88700]" />
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-cha-text-secondary font-medium">Total Paid Expenses:</span>
              <span className="monolith-numeric text-cha-text-mono-accent">₹{totalDisbursedExpense.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-cha-text-secondary font-medium">Net Financed Balance:</span>
              <span className="monolith-numeric text-emerald-600 dark:text-emerald-400">
                ₹{(totalReceivedAdvance - totalDisbursedExpense).toLocaleString("en-IN")}
              </span>
            </div>
            <p className="text-[10px] text-cha-text-muted italic border-t border-cha-border/40 pt-1.5 leading-relaxed dark:border-cha-border-strong">
              Financial health metric mapping advanced client payments against cash outlays for clearance services.
            </p>
          </div>
        </div>

        {/* Card: Stage distributions */}
        <div className="monolith-card monolith-accent rounded-xl bg-cha-surface border border-cha-border p-5 space-y-3 shadow-sm hover:shadow-md transition-all dark:border-cha-border-strong">
          <div className="flex items-center justify-between text-cha-text-secondary">
            <span className="monolith-label">Workflow Pipelines</span>
            <TrendingUp size={18} className="text-cha-primary" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-cha-text-secondary">Doc Collection:</span>
              <span className="monolith-numeric text-cha-text-mono-accent">{stageMap.DOCUMENT_COLLECTION}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-cha-text-secondary">Checklist Prep:</span>
              <span className="monolith-numeric text-cha-text-mono-accent">{stageMap.CHECKLIST_PREPARATION}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-cha-text-secondary">Checklist Approval:</span>
              <span className="monolith-numeric text-cha-text-mono-accent">{stageMap.CHECKLIST_APPROVAL}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-cha-text-secondary">Filing Stage:</span>
              <span className="monolith-numeric text-cha-text-mono-accent">{stageMap.FILING}</span>
            </div>
            <div className="flex justify-between border-t border-cha-border/40 pt-1 dark:border-cha-border-strong">
              <span className="text-cha-text-secondary font-semibold">Completed / Filed:</span>
              <span className="monolith-numeric text-emerald-600 dark:text-emerald-400">{stageMap.FILED}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-cha-border bg-cha-surface p-6 shadow-sm dark:border-cha-border-strong">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-cha-primary" />
              <h2 className="monolith-h2 text-cha-text-mono-accent">Completed Job MIS Reports</h2>
            </div>
            <p className="text-xs text-cha-text-secondary">
              Search by job number. Reports are generated only after the job reaches FILED / COMPLETE.
            </p>
          </div>
          <form className="flex w-full gap-2 lg:max-w-xl">
            <div className="relative min-w-0 flex-1">
              <span className="absolute inset-y-0 left-3 flex items-center text-cha-text-secondary">
                <Search size={16} />
              </span>
              <input
                name="q"
                defaultValue={jobReportQuery}
                placeholder="Search completed job number..."
                className="h-11 w-full pl-10 text-sm"
              />
            </div>
            <button className="rounded-xl bg-[#F9D972] px-5 text-xs font-medium uppercase tracking-wide text-white transition-all hover:bg-[#E8C85D]">
              Search
            </button>
          </form>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-cha-border dark:border-cha-border-strong">
          <table className="monolith-table">
            <thead>
              <tr>
                <th>Job Number</th>
                <th>Customer</th>
                <th>Filed On</th>
                <th>Expense MIS</th>
                <th>Report Actions</th>
              </tr>
            </thead>
            <tbody>
              {completedReportJobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-xs italic text-cha-text-secondary">
                    No completed jobs found for this report search.
                  </td>
                </tr>
              ) : (
                completedReportJobs.map((job) => {
                  const requested = job.expenseRequests.reduce(
                    (total, request) => total + request.lines.reduce((sum, line) => sum + Number(line.amount), 0),
                    0,
                  );
                  const paid = job.expenseRequests.reduce(
                    (total, request) => total + request.payments.reduce((sum, payment) => sum + Number(payment.amountPaid), 0),
                    0,
                  );
                  return (
                    <tr key={job.id}>
                      <td>
                        <div className="font-medium text-cha-primary">{job.jobNumber}</div>
                        <div className="text-[10px] text-cha-text-secondary">{job.title}</div>
                      </td>
                      <td>{job.customer.name}</td>
                      <td className="monolith-numeric">
                        {job.filing?.actualFilingDate
                          ? new Date(job.filing.actualFilingDate).toLocaleDateString("en-IN")
                          : new Date(job.updatedAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="monolith-numeric">
                        Requested INR {requested.toLocaleString("en-IN")} / Paid INR {paid.toLocaleString("en-IN")}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/api/cha/reports/jobs/${job.id}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 rounded-xl border border-cha-primary/45 bg-mono-card px-3 py-2 text-xs font-medium uppercase tracking-wide text-cha-primary"
                          >
                            <ExternalLink size={13} /> View PDF
                          </Link>
                          <Link
                            href={`/api/cha/reports/jobs/${job.id}?download=true`}
                            className="inline-flex items-center gap-1 rounded-xl bg-[#F9D972] px-3 py-2 text-xs font-medium uppercase tracking-wide text-white"
                          >
                            <Download size={13} /> Download
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Delayed filings reports */}
        <div className="lg:col-span-2 rounded-xl border border-cha-border bg-cha-surface p-6 space-y-6 shadow-sm dark:border-cha-border-strong">
          <h2 className="text-base font-bold text-cha-text-mono-accent uppercase font-display flex items-center gap-2">
            <AlertTriangle size={18} className="text-[#D88700]" /> Delay-Justified Customs Filings
          </h2>

          {delayedFilings.length === 0 ? (
            <p className="text-xs text-cha-text-secondary italic p-4 border border-dashed border-cha-border rounded-lg dark:border-cha-border-strong">
              No filing delays reported in this organization. Excellent compliance timeline!
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="monolith-table">
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
                      <td className="px-6 py-4 text-cha-text-mono-accent">{f.job.customer.name}</td>
                      <td className="px-6 py-4 monolith-numeric text-cha-text-secondary">
                        {f.actualFilingDate ? new Date(f.actualFilingDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }) : "—"}
                      </td>
                      <td className="px-6 py-4 monolith-numeric text-cha-text-secondary">{f.filingRef}</td>
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
          <h2 className="text-base font-bold text-cha-text-mono-accent uppercase font-display flex items-center gap-2">
            <FileText size={18} className="text-cha-primary" /> Organization Audit Feed
          </h2>

          <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
            {auditLogs.map((log) => (
              <div key={log.id} className="text-xs p-3 bg-cha-surface-subtle border border-cha-border rounded-xl space-y-1.5 dark:border-cha-border-strong">
                <div className="flex items-center justify-between border-b border-cha-border/40 pb-1 dark:border-cha-border-strong">
                  <span className="font-bold text-cha-primary dark:text-blue-400">{log.job?.jobNumber || "System"}</span>
                  <span className="text-[9px] text-cha-text-muted monolith-numeric">
                    {new Date(log.timestamp).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                </div>
                <p className="font-semibold text-[11px] uppercase tracking-wide text-cha-text-mono-accent leading-tight">
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
