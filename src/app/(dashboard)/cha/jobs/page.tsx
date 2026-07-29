import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can, requirePermission } from "@/lib/rbac";
import {
  getCreateJobOptions,
  getJobFilterOptions,
  listJobs,
} from "@/modules/cha/jobs/queries";
import {
  computeChaDueDateWarnings,
  listFilingQueryEscalationWarnings,
} from "@/modules/cha/warnings/queries";
import { JobsClient } from "./jobs-client";

function normalizeMovementDirection(value: string | null) {
  return ["IMPORT", "EXPORT", "BOTH", "OTHER"].includes(value ?? "")
    ? (value as "IMPORT" | "EXPORT" | "BOTH" | "OTHER")
    : null;
}

function serializeDueDateWarning(warning: Awaited<ReturnType<typeof computeChaDueDateWarnings>>[number]) {
  return {
    type: warning.type,
    severity: warning.severity,
    daysUntilExpiry: warning.daysUntilExpiry,
    validityDate: warning.validityDate.toISOString(),
    message: warning.message,
    notificationId: warning.notificationId,
    link: warning.link,
    actionLabel: warning.actionLabel,
    jobNumber: warning.jobNumber,
    jobId: warning.jobId,
  };
}

export default async function ChaJobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) redirect("/setup");

  // Check read permission
  await requirePermission(session.user.id, "cha.job.read");

  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : undefined;
  const stage = typeof params.stage === "string" ? params.stage : undefined;
  const status = typeof params.status === "string" ? params.status : undefined;
  const priority = typeof params.priority === "string" ? params.priority : undefined;
  const branchId = typeof params.branchId === "string" ? params.branchId : undefined;
  const jobTypeId = typeof params.jobTypeId === "string" ? params.jobTypeId : undefined;
  const assignedToMe = params.assignedToMe === "true";
  const activePage = typeof params.activePage === "string" ? parseInt(params.activePage, 10) : 1;
  const completedPage = typeof params.completedPage === "string" ? parseInt(params.completedPage, 10) : 1;
  const requestedCreateNew = params.new === "true";
  const canCreateJob = await can(session.user.id, "cha.job.create");
  const showCreateNew = requestedCreateNew && canCreateJob;

  // All queries are independent — run in parallel
  const [activeJobsData, completedJobsData, filterOptions] = await Promise.all([
    listJobs(session.user.id, orgId, {
      search,
      stage,
      status,
      priority,
      branchId,
      jobTypeId,
      assignedToMe,
      jobGroup: "ACTIVE",
      page: activePage,
      pageSize: 10,
    }),
    listJobs(session.user.id, orgId, {
      search,
      stage,
      status,
      priority,
      branchId,
      jobTypeId,
      assignedToMe,
      jobGroup: "COMPLETED",
      page: completedPage,
      pageSize: 10,
    }),
    getJobFilterOptions(orgId),
  ]);
  const visibleJobIds = [
    ...activeJobsData.items.map((job) => job.id),
    ...completedJobsData.items.map((job) => job.id),
  ];
  const [dueDateWarnings, filingQueryWarnings] = await Promise.all([
    computeChaDueDateWarnings(session.user.id, orgId, visibleJobIds),
    listFilingQueryEscalationWarnings(orgId, visibleJobIds),
  ]);
  const initialCreateOptions = showCreateNew
    ? await getCreateJobOptions(orgId)
    : null;

  const filingQueryWarningMap = new Map(
    filingQueryWarnings.map((warning) => [
      warning.jobId,
      {
        queryTitle: warning.queryTitle,
        overdueQueryCount: warning.overdueQueryCount,
        reminderTriggeredAt: warning.reminderTriggeredAt.toISOString(),
        warningTriggeredAt: warning.warningTriggeredAt.toISOString(),
        staleMinutes: warning.staleMinutes,
      },
    ]),
  );
  const dueDateWarningMap = new Map<string, ReturnType<typeof serializeDueDateWarning>[]>();
  for (const warning of dueDateWarnings) {
    const currentWarnings = dueDateWarningMap.get(warning.jobId) || [];
    currentWarnings.push(serializeDueDateWarning(warning));
    dueDateWarningMap.set(warning.jobId, currentWarnings);
  }

  return (
    <JobsClient
      activeJobsData={{
        items: activeJobsData.items.map((j) => ({
          id: j.id,
          jobNumber: j.jobNumber,
          title: j.title,
          customerName: j.customer.name,
          jobTypeName: j.jobType.name,
          movementDirection: normalizeMovementDirection(j.jobType.movementDirection),
          branchName: j.branch.name,
          stage: j.stage,
          status: j.status,
          priority: j.priority,
          primaryOwnerId: j.primaryOwner.id,
          ownerName: j.primaryOwner.name,
          billOfEntryNumber: j.filing?.billOfEntryNumber || null,
          shippingBillNumber: j.filing?.shippingBillNumber || null,
          assignedUserIds: j.assignments.map((assignment) => assignment.userId),
          hasActiveDeletionRequest: j.deletionRequests.length > 0,
          dueDateWarnings: dueDateWarningMap.get(j.id) || [],
          filingQueryWarning: filingQueryWarningMap.get(j.id) || null,
          createdAt: j.createdAt.toISOString(),
        })),
        total: activeJobsData.total,
        page: activeJobsData.page,
        pageSize: activeJobsData.pageSize,
        totalPages: activeJobsData.totalPages,
      }}
      completedJobsData={{
        items: completedJobsData.items.map((j) => ({
          id: j.id,
          jobNumber: j.jobNumber,
          title: j.title,
          customerName: j.customer.name,
          jobTypeName: j.jobType.name,
          movementDirection: normalizeMovementDirection(j.jobType.movementDirection),
          branchName: j.branch.name,
          stage: j.stage,
          status: j.status,
          priority: j.priority,
          primaryOwnerId: j.primaryOwner.id,
          ownerName: j.primaryOwner.name,
          billOfEntryNumber: j.filing?.billOfEntryNumber || null,
          shippingBillNumber: j.filing?.shippingBillNumber || null,
          assignedUserIds: j.assignments.map((assignment) => assignment.userId),
          hasActiveDeletionRequest: j.deletionRequests.length > 0,
          dueDateWarnings: dueDateWarningMap.get(j.id) || [],
          filingQueryWarning: filingQueryWarningMap.get(j.id) || null,
          createdAt: j.createdAt.toISOString(),
        })),
        total: completedJobsData.total,
        page: completedJobsData.page,
        pageSize: completedJobsData.pageSize,
        totalPages: completedJobsData.totalPages,
      }}
      filters={{
        search,
        stage,
        status,
        priority,
        branchId,
        jobTypeId,
        assignedToMe,
      }}
      options={{
        branches: filterOptions.branches,
        customers: [],
        jobTypes: filterOptions.jobTypes,
        shipmentTypes: [],
        users: [],
        managers: [],
        teamGroups: [],
        branchNumberingRules: [],
      }}
      initialCreateOptions={initialCreateOptions}
      showCreateNew={showCreateNew}
      showCreatePermissionDenied={requestedCreateNew && !canCreateJob}
      canCreateJob={canCreateJob}
      currentUserId={session.user.id}
    />
  );
}
