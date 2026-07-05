import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";
import { listJobs, ensureSettingsAndDefaults, getEligibleManagers, listJobTypesForSelection, listDeliveryOrderValidityWarnings, listFilingQueryEscalationWarnings, listSection49ValidityWarnings } from "@/modules/cha/service";
import { JobsClient } from "./jobs-client";

export default async function ChaJobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
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
  const showCreateNew = params.new === "true";

  // All queries are independent — run in parallel
  const [
    activeJobsData,
    completedJobsData,
    validityWarnings,
    section49Warnings,
    filingQueryWarnings,
    ,
    branches,
    customers,
    jobTypes,
    shipmentTypes,
    users,
    eligibleManagers,
    teamGroups,
    branchNumberingRules,
  ] = await Promise.all([
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
    listDeliveryOrderValidityWarnings(session.user.id, orgId),
    listSection49ValidityWarnings(session.user.id, orgId),
    listFilingQueryEscalationWarnings(session.user.id, orgId),
    ensureSettingsAndDefaults(orgId),
    db.branch.findMany({ where: { orgId }, select: { id: true, name: true, code: true } }),
    db.crmAccount.findMany({ where: { orgId, type: "Customer" }, select: { id: true, name: true } }),
    listJobTypesForSelection(orgId),
    db.chaShipmentType.findMany({ where: { orgId, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.user.findMany({ where: { orgId, active: true }, select: { id: true, name: true, email: true } }),
    getEligibleManagers(orgId),
    db.chaTeamGroup.findMany({ where: { orgId }, select: { id: true, name: true, memberIds: true } }),
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

  const validityWarningMap = new Map(
    validityWarnings.map((warning) => [
      warning.jobId,
      {
        severity: warning.severity as "expired" | "expiring",
        daysUntilExpiry: warning.daysUntilExpiry,
        deliveryOrderValidity: warning.deliveryOrderValidity.toISOString(),
        message:
          warning.severity === "expired"
            ? `Delivery Order Validity expired on ${warning.deliveryOrderValidity.toLocaleDateString("en-IN")}.`
            : `Delivery Order Validity is expiring in ${warning.daysUntilExpiry} day(s) on ${warning.deliveryOrderValidity.toLocaleDateString("en-IN")}.`,
      },
    ]),
  );
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
  const section49WarningMap = new Map(
    section49Warnings.map((warning) => [
      warning.jobId,
      {
        severity: warning.severity as "expired" | "expiring",
        daysUntilExpiry: warning.daysUntilExpiry,
        validityDate: warning.validityDate.toISOString(),
        message:
          warning.severity === "expired"
            ? `Section 49 validity expired on ${warning.validityDate.toLocaleDateString("en-IN")}.`
            : `Section 49 validity is expiring in ${warning.daysUntilExpiry} day(s) on ${warning.validityDate.toLocaleDateString("en-IN")}.`,
      },
    ]),
  );

  return (
    <JobsClient
      activeJobsData={{
        items: activeJobsData.items.map((j) => ({
          id: j.id,
          jobNumber: j.jobNumber,
          title: j.title,
          customerName: j.customer.name,
          jobTypeName: j.jobType.name,
          movementDirection: j.jobType.movementDirection,
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
          deliveryOrderWarning: validityWarningMap.get(j.id) || null,
          section49Warning: section49WarningMap.get(j.id) || null,
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
          movementDirection: j.jobType.movementDirection,
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
          deliveryOrderWarning: validityWarningMap.get(j.id) || null,
          section49Warning: section49WarningMap.get(j.id) || null,
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
        branches,
        customers,
        jobTypes,
        shipmentTypes,
        users,
        managers: eligibleManagers,
        teamGroups,
        branchNumberingRules,
      }}
      showCreateNew={showCreateNew}
      currentUserId={session.user.id}
    />
  );
}
