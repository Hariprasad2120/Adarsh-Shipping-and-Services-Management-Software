import { ChaTable } from "@/components/monolith/cha-workspace";
import { Input } from "@/components/monolith/input";
import { Button } from "@/components/monolith/button";
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
        <div className="mnx-bg-surface mnx-border mnx-border-accent rounded-xl mnx-bg-surface border mnx-border p-5 space-y-3 shadow-sm hover:shadow-md transition-all mnx-border">
          <div className="flex items-center justify-between mnx-text-muted">
            <span className="mnx-label">Client Advances</span>
            <DollarSign size={18} className="mnx-text-accent" />
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="mnx-text-muted font-medium">Expected Billing:</span>
              <span className="mnx-numeric mnx-text-primary">₹{totalExpectedAdvance.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="mnx-text-muted font-medium">Collected:</span>
              <span className="mnx-numeric mnx-text-success mnx-text-success">₹{totalReceivedAdvance.toLocaleString("en-IN")}</span>
            </div>
            <div className="border-t mnx-border pt-1.5 flex justify-between text-xs mnx-border">
              <span className="mnx-text-muted font-semibold">Outstanding Balance:</span>
              <span className="mnx-numeric mnx-text-warning mnx-text-warning">
                ₹{Math.max(0, totalExpectedAdvance - totalReceivedAdvance).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* Card: Operational Disbursements */}
        <div className="mnx-bg-surface mnx-border mnx-border-warning rounded-xl mnx-bg-surface border mnx-border p-5 space-y-3 shadow-sm hover:shadow-md transition-all mnx-border">
          <div className="flex items-center justify-between mnx-text-muted">
            <span className="mnx-label">Operational Outlays</span>
            <DollarSign size={18} className="mnx-text-warning" />
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="mnx-text-muted font-medium">Total Paid Expenses:</span>
              <span className="mnx-numeric mnx-text-primary">₹{totalDisbursedExpense.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="mnx-text-muted font-medium">Net Financed Balance:</span>
              <span className="mnx-numeric mnx-text-success mnx-text-success">
                ₹{(totalReceivedAdvance - totalDisbursedExpense).toLocaleString("en-IN")}
              </span>
            </div>
            <p className="text-[10px] mnx-text-muted italic border-t mnx-border pt-1.5 leading-relaxed mnx-border">
              Financial health metric mapping advanced client payments against cash outlays for clearance services.
            </p>
          </div>
        </div>

        {/* Card: Stage distributions */}
        <div className="mnx-bg-surface mnx-border mnx-border-accent rounded-xl mnx-bg-surface border mnx-border p-5 space-y-3 shadow-sm hover:shadow-md transition-all mnx-border">
          <div className="flex items-center justify-between mnx-text-muted">
            <span className="mnx-label">Workflow Pipelines</span>
            <TrendingUp size={18} className="mnx-text-accent" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="mnx-text-muted">Doc Collection:</span>
              <span className="mnx-numeric mnx-text-primary">{stageMap.DOCUMENT_COLLECTION}</span>
            </div>
            <div className="flex justify-between">
              <span className="mnx-text-muted">Checklist Prep:</span>
              <span className="mnx-numeric mnx-text-primary">{stageMap.CHECKLIST_PREPARATION}</span>
            </div>
            <div className="flex justify-between">
              <span className="mnx-text-muted">Checklist Approval:</span>
              <span className="mnx-numeric mnx-text-primary">{stageMap.CHECKLIST_APPROVAL}</span>
            </div>
            <div className="flex justify-between">
              <span className="mnx-text-muted">Filing Stage:</span>
              <span className="mnx-numeric mnx-text-primary">{stageMap.FILING}</span>
            </div>
            <div className="flex justify-between border-t mnx-border pt-1 mnx-border">
              <span className="mnx-text-muted font-semibold">Completed / Filed:</span>
              <span className="mnx-numeric mnx-text-success mnx-text-success">{stageMap.FILED}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border mnx-border mnx-bg-surface p-6 shadow-sm mnx-border">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileText size={18} className="mnx-text-accent" />
              <h2 className="mnx-heading-2 mnx-text-primary">Completed Job MIS Reports</h2>
            </div>
            <p className="text-xs mnx-text-muted">
              Search by job number. Reports are generated only after the job reaches FILED / COMPLETE.
            </p>
          </div>
          <form className="flex w-full gap-2 lg:max-w-xl">
            <div className="relative min-w-0 flex-1">
              <span className="absolute inset-y-0 left-3 flex items-center mnx-text-muted">
                <Search size={16} />
              </span>
              <Input
                name="q"
                defaultValue={jobReportQuery}
                placeholder="Search completed job number..."
                className="h-11 w-full pl-10 text-sm"
              />
            </div>
            <Button className="rounded-xl mnx-bg-accent-soft px-5 text-xs font-medium uppercase tracking-wide mnx-text-muted transition-all mnx-hover-accent">
              Search
            </Button>
          </form>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border mnx-border mnx-border">
          <ChaTable className="mnx-cha-table">
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
                  <td colSpan={5} className="text-center text-xs italic mnx-text-muted">
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
                        <div className="font-medium mnx-text-accent">{job.jobNumber}</div>
                        <div className="text-[10px] mnx-text-muted">{job.title}</div>
                      </td>
                      <td>{job.customer.name}</td>
                      <td className="mnx-numeric">
                        {job.filing?.actualFilingDate
                          ? new Date(job.filing.actualFilingDate).toLocaleDateString("en-IN")
                          : new Date(job.updatedAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="mnx-numeric">
                        Requested INR {requested.toLocaleString("en-IN")} / Paid INR {paid.toLocaleString("en-IN")}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/api/cha/reports/jobs/${job.id}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 rounded-xl border mnx-border-accent mnx-bg-surface px-3 py-2 text-xs font-medium uppercase tracking-wide mnx-text-accent"
                          >
                            <ExternalLink size={13} /> View PDF
                          </Link>
                          <Link
                            href={`/api/cha/reports/jobs/${job.id}?download=true`}
                            className="inline-flex items-center gap-1 rounded-xl mnx-bg-accent-soft px-3 py-2 text-xs font-medium uppercase tracking-wide mnx-text-muted"
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
          </ChaTable>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Delayed filings reports */}
        <div className="lg:col-span-2 rounded-xl border mnx-border mnx-bg-surface p-6 space-y-6 shadow-sm mnx-border">
          <h2 className="text-base font-bold mnx-text-primary uppercase font-display flex items-center gap-2">
            <AlertTriangle size={18} className="mnx-text-warning" /> Delay-Justified Customs Filings
          </h2>

          {delayedFilings.length === 0 ? (
            <p className="text-xs mnx-text-muted italic p-4 border border-dashed mnx-border rounded-lg mnx-border">
              No filing delays reported in this organization. Excellent compliance timeline!
            </p>
          ) : (
            <div className="overflow-x-auto">
              <ChaTable className="mnx-cha-table">
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
                    <tr key={f.id} className="mnx-hover-accent transition-colors">
                      <td className="px-6 py-4 font-semibold mnx-text-accent mnx-text-info">
                        {f.job.jobNumber}
                      </td>
                      <td className="px-6 py-4 mnx-text-primary">{f.job.customer.name}</td>
                      <td className="px-6 py-4 mnx-numeric mnx-text-muted">
                        {f.actualFilingDate ? new Date(f.actualFilingDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }) : "—"}
                      </td>
                      <td className="px-6 py-4 mnx-numeric mnx-text-muted">{f.filingRef}</td>
                      <td className="px-6 py-4 text-xs mnx-text-danger mnx-text-danger leading-relaxed font-medium mnx-bg-danger max-w-xs truncate">
                        {f.delayReason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </ChaTable>
            </div>
          )}
        </div>

        {/* Right: Full organization Audit Logs feed */}
        <div className="rounded-xl border mnx-border mnx-bg-surface p-6 space-y-6 shadow-sm mnx-border">
          <h2 className="text-base font-bold mnx-text-primary uppercase font-display flex items-center gap-2">
            <FileText size={18} className="mnx-text-accent" /> Organization Audit Feed
          </h2>

          <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
            {auditLogs.map((log) => (
              <div key={log.id} className="text-xs p-3 mnx-bg-soft border mnx-border rounded-xl space-y-1.5 mnx-border">
                <div className="flex items-center justify-between border-b mnx-border pb-1 mnx-border">
                  <span className="font-bold mnx-text-accent mnx-text-info">{log.job?.jobNumber || "System"}</span>
                  <span className="text-[9px] mnx-text-muted mnx-numeric">
                    {new Date(log.timestamp).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                </div>
                <p className="font-semibold text-[11px] uppercase tracking-wide mnx-text-primary leading-tight">
                  {log.event.replace(/_/g, " ")}
                </p>
                <p className="text-[11px] mnx-text-muted leading-relaxed">
                  "{log.remarks}"
                </p>
                <div className="flex justify-between items-center text-[9px] mnx-text-muted">
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
