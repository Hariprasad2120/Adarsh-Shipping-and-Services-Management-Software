import { ClickableRow } from "@/components/clickable-row";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import Link from "next/link";
import { ensureSettingsAndDefaults } from "@/modules/cha/service";
import { DashboardCreateJob } from "@/components/cha/dashboard-create-job";
import {
  FileText,
  CheckSquare,
  DollarSign,
  AlertCircle,
  Plus,
  Briefcase,
  UserCheck,
  Settings,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
  DataTableToolbar,
} from "@/components/data-table";

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
    myJobs,
    branches,
    customers,
    jobTypes,
    shipmentTypes,
    users,
    teamGroups,
    settings,
    branchNumberingRules,
  ] = await Promise.all([
    db.chaJob.count({
      where: { orgId, stage: { not: "FILED" }, status: "ACTIVE" },
    }),
    db.chaChecklistImport.count({
      where: { status: "PENDING_APPROVAL", job: { orgId } },
    }),
    db.chaFiling.count({
      where: { status: "PENDING", job: { orgId } },
    }),
    db.chaExpenseRequest.count({
      where: { orgId, status: "URGENT_PAYMENT_REQUIRED" },
    }),
    db.chaJob.findMany({
      where: {
        orgId,
        status: "ACTIVE",
        assignments: { some: { userId: session.user.id } },
      },
      include: {
        customer: { select: { name: true } },
        jobType: { select: { name: true } },
        assignments: { select: { userId: true } },
        primaryOwner: { select: { id: true, name: true } },
        deletionRequests: {
          where: { status: { in: ["PENDING", "APPROVED"] } },
          select: { id: true },
          take: 1,
        },
      },
      take: 5,
      orderBy: { updatedAt: "desc" },
    }),
    db.branch.findMany({ where: { orgId }, select: { id: true, name: true, code: true } }),
    db.crmAccount.findMany({ where: { orgId, type: "Customer" }, select: { id: true, name: true } }),
    db.chaJobType.findMany({ where: { orgId }, select: { id: true, name: true } }),
    db.chaShipmentType.findMany({ where: { orgId, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.user.findMany({ where: { orgId, active: true }, select: { id: true, name: true, email: true } }),
    db.chaTeamGroup.findMany({ where: { orgId }, select: { id: true, name: true, memberIds: true } }),
    ensureSettingsAndDefaults(orgId),
    db.chaBranchNumberingRule.findMany({
      where: { orgId },
      select: {
        branchId: true,
        prefix: true,
        suffix: true,
        startingSequence: true,
        currentSequence: true,
        numberPadding: true,
        useFinancialYear: true,
        financialYearFormat: true,
        isActive: true,
      },
    }),
  ]);

  // Compute outstanding advances
  const pendingAdvances = await db.chaCustomerAdvance.findMany({
    where: {
      job: { orgId },
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
      <div className="grid grid-cols-1 gap-8">
        <div>
          <DataTable className="overflow-hidden">
            <DataTableToolbar className="bg-surface">
              <div className="flex items-center gap-2">
                <UserCheck size={18} className="text-[#00cec4]" />
                <div>
                  <h2 className="ds-h2 text-on-surface">My Assigned Jobs</h2>
                  <p className="text-xs text-on-surface-variant">Open or manage the jobs currently assigned to you.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DashboardCreateJob
                  currentUserId={session.user.id}
                  options={{
                    branches,
                    customers,
                    jobTypes,
                    shipmentTypes,
                    users,
                    teamGroups,
                    branchNumberingRules,
                  }}
                />
                <Link href="/cha/jobs">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    View All
                    <ArrowRight className="size-3.5" />
                  </Button>
                </Link>
                <Link href="/cha/settings">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Settings size={14} /> Settings
                  </Button>
                </Link>
              </div>
            </DataTableToolbar>
          {myJobs.length === 0 ? (
            <>
              <DataTableHeader>
                <tr>
                  <DataTableHead>Job Number</DataTableHead>
                  <DataTableHead>Customer</DataTableHead>
                  <DataTableHead>Job Type</DataTableHead>
                  <DataTableHead>Current Stage</DataTableHead>
                  <DataTableHead>Priority</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                <DataTableEmpty colSpan={5} message="You don't have any active job assignments yet." />
              </DataTableBody>
            </>
          ) : (
            <>
              <DataTableHeader>
                <tr>
                  <DataTableHead>Job Number</DataTableHead>
                  <DataTableHead>Customer</DataTableHead>
                  <DataTableHead>Job Type</DataTableHead>
                  <DataTableHead>Current Stage</DataTableHead>
                  <DataTableHead>Priority</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {myJobs.map((job) => (
                  <ClickableRow key={job.id} href={`/cha/jobs/${job.id}`}>
                    <DataTableCell className="font-medium text-[#00cec4]">
                      <Link href={`/cha/jobs/${job.id}`} className="transition-colors hover:text-[#00b5ad]">
                        {job.jobNumber}
                      </Link>
                    </DataTableCell>
                    <DataTableCell>{job.customer.name}</DataTableCell>
                    <DataTableCell className="ds-label">{job.jobType.name}</DataTableCell>
                    <DataTableCell>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                        job.stage === "FILING"
                          ? "border border-blue-200 bg-blue-50 text-blue-700"
                          : job.stage === "CHECKLIST_APPROVAL"
                            ? "border border-amber-200 bg-amber-50 text-amber-700"
                            : job.stage === "FILED"
                              ? "border border-green-200 bg-green-50 text-green-700"
                              : "border border-outline-variant bg-surface-container-low text-on-surface"
                      }`}>
                        {job.stage.replace(/_/g, " ")}
                      </span>
                    </DataTableCell>
                    <DataTableCell>
                      <span className={`text-xs font-semibold uppercase tracking-[0.12em] ${
                        job.priority === "HIGH"
                          ? "text-red-500"
                          : job.priority === "MEDIUM"
                            ? "text-[#fb923c]"
                            : "text-on-surface-variant"
                      }`}>
                        {job.priority}
                      </span>
                    </DataTableCell>
                  </ClickableRow>
                ))}
              </DataTableBody>
            </>
          )}
          </DataTable>
        </div>
      </div>
    </div>
  );
}
