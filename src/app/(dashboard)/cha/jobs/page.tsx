import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";
import { listJobs, ensureSettingsAndDefaults } from "@/modules/cha/service";
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
  const page = typeof params.page === "string" ? parseInt(params.page, 10) : 1;
  const showCreateNew = params.new === "true";

  // Query jobs list
  const jobsData = await listJobs(session.user.id, orgId, {
    search,
    stage,
    status,
    priority,
    branchId,
    jobTypeId,
    assignedToMe,
    page,
    pageSize: 10,
  });

  await ensureSettingsAndDefaults(orgId);

  // Query options for new job modal & filter UI
  const [branches, customers, jobTypes, shipmentTypes, users, teamGroups, branchNumberingRules] = await Promise.all([
    db.branch.findMany({ where: { orgId }, select: { id: true, name: true, code: true } }),
    db.crmAccount.findMany({ where: { orgId, type: "Customer" }, select: { id: true, name: true } }),
    db.chaJobType.findMany({ where: { orgId }, select: { id: true, name: true } }),
    db.chaShipmentType.findMany({ where: { orgId, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.user.findMany({ where: { orgId, active: true }, select: { id: true, name: true, email: true } }),
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

  return (
    <JobsClient
      jobsData={{
        items: jobsData.items.map((j) => ({
          id: j.id,
          jobNumber: j.jobNumber,
          title: j.title,
          customerName: j.customer.name,
          jobTypeName: j.jobType.name,
          branchName: j.branch.name,
          stage: j.stage,
          status: j.status,
          priority: j.priority,
          primaryOwnerId: j.primaryOwner.id,
          ownerName: j.primaryOwner.name,
          assignedUserIds: j.assignments.map((assignment) => assignment.userId),
          hasActiveDeletionRequest: j.deletionRequests.length > 0,
          createdAt: j.createdAt.toISOString(),
        })),
        total: jobsData.total,
        page: jobsData.page,
        pageSize: jobsData.pageSize,
        totalPages: jobsData.totalPages,
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
        teamGroups,
        branchNumberingRules,
      }}
      showCreateNew={showCreateNew}
      currentUserId={session.user.id}
    />
  );
}
