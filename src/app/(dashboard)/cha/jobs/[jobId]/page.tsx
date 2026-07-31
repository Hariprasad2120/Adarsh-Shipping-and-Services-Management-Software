import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getJobDetails, getChecklistInternalApproverIds, getEligibleManagers } from "@/modules/cha/service";
import { db } from "@/lib/db";
import { can, ForbiddenError } from "@/lib/rbac";
import { BreadcrumbLabel } from "@/components/breadcrumb-label";
import { JobWorkspaceClient } from "./job-workspace-client";
import { AccessProhibitedCard } from "./access-prohibited-card";
import { getChaCustomsFeatureFlags } from "@/modules/cha/customs/feature-flags";
import {
  getCustomsFilingWorkspaceAccess,
  type ChaCustomsFilingWorkspaceAccess,
} from "@/modules/cha/customs/filing/workspace";

interface WorkspaceData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  job: any;
  canDeleteJob: boolean;
  canApproveDeleteJob: boolean;
  canDeleteDoc: boolean;
  canManageSettings: boolean;
  canInternalApproveChecklist: boolean;
  canCustomerApproveChecklist: boolean;
  canUpdateJob: boolean;
  canRequestExpenses: boolean;
  canManageExpenses: boolean;
  canPayExpenses: boolean;
  users: { id: string; name: string; email: string }[];
  managers: { id: string; name: string; email: string; branchId: string | null }[];
  parsedExpenseCategories: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: any;
  internalApproversCount: number;
  customsFilingAccess: ChaCustomsFilingWorkspaceAccess;
}

export default async function ChaJobWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ tab?: string; focus?: string; customsSubtab?: string }>;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) redirect("/setup");

  const { jobId } = await params;
  const { tab, focus, customsSubtab } = await searchParams;

  let data: WorkspaceData | null = null;
  let error: unknown = null;

  try {
    // dbUsers, settings, eligibleManagers don't depend on job — run everything in parallel
    const [
      job,
      canDeleteJob,
      canApproveDeleteJob,
      canDeleteDoc,
      canManageSettings,
      canInternalApproveChecklist,
      canCustomerApproveChecklist,
      canUpdateJob,
      canRequestExpenses,
      canManageExpenses,
      canPayExpenses,
      customsFlags,
      canViewCustomsFiling,
      canEditCustomsFilingDraft,
      dbUsers,
      settings,
      eligibleManagers,
    ] = await Promise.all([
      getJobDetails(session.user.id, orgId, jobId),
      can(session.user.id, "cha.job.delete"),
      can(session.user.id, "cha.job.delete.approve"),
      can(session.user.id, "cha.document.delete"),
      can(session.user.id, "cha.settings.manage"),
      can(session.user.id, "cha.checklist.internal_approve"),
      can(session.user.id, "cha.checklist.customer_approve"),
      can(session.user.id, "cha.job.update"),
      can(session.user.id, "cha.expense.request"),
      can(session.user.id, "cha.expense.manage"),
      can(session.user.id, "cha.expense.pay"),
      getChaCustomsFeatureFlags(orgId),
      can(session.user.id, "cha.customs.filing.view"),
      can(session.user.id, "cha.customs.filing.edit_draft"),
      db.user.findMany({ where: { orgId, active: true }, select: { id: true, name: true, email: true } }),
      db.chaSettings.findUnique({ where: { orgId } }),
      getEligibleManagers(orgId),
    ]);

    const users = dbUsers.map((u) => ({
      id: u.id,
      name: u.name ?? "Unknown",
      email: u.email ?? "",
    }));

    const parsedExpenseCategories: string[] = Array.isArray(settings?.expenseCategories)
      ? settings.expenseCategories.filter((item): item is string => typeof item === "string")
      : typeof settings?.expenseCategories === "string"
        ? JSON.parse(settings.expenseCategories as string)
        : ["Customs Duty", "Port Handling Charges", "Transportation", "Documentation charges", "Agent Commission", "Storage Fees", "Miscellaneous"];

    // internalApproverIds depends on job — runs after getJobDetails resolves
    const internalApproverIds = await getChecklistInternalApproverIds(orgId, job);
    const customsFilingAccess = await getCustomsFilingWorkspaceAccess({
      orgId,
      jobId,
      movementDirection: job.jobType?.movementDirection,
      flags: customsFlags,
      canView: canViewCustomsFiling,
      canEditDraft: canEditCustomsFilingDraft,
    });

    data = {
      job,
      canDeleteJob,
      canApproveDeleteJob,
      canDeleteDoc,
      canManageSettings,
      canInternalApproveChecklist,
      canCustomerApproveChecklist,
      canUpdateJob,
      canRequestExpenses,
      canManageExpenses,
      canPayExpenses,
      users,
      managers: eligibleManagers,
      parsedExpenseCategories,
      settings,
      internalApproversCount: internalApproverIds.length,
      customsFilingAccess,
    };
  } catch (err: unknown) {
    error = err;
  }

  if (error) {
    if (error instanceof Error && error.message === "Job not found.") {
      return notFound();
    }

    if (
      error instanceof ForbiddenError ||
      (error instanceof Error && error.message.includes("Access Denied"))
    ) {
      return <AccessProhibitedCard message={(error as Error).message} />;
    }

    console.error("Failed to load job workspace:", error);
    throw error;
  }

  if (!data) {
    return notFound();
  }

  return (
    <>
      <BreadcrumbLabel segment={jobId} label={data.job.jobNumber} />
      <JobWorkspaceClient
        job={JSON.parse(JSON.stringify(data.job))}
        users={data.users}
        managers={data.managers}
        expenseCategories={data.parsedExpenseCategories}
        selfApprovalAllowed={data.settings?.selfApprovalAllowed ?? true}
        currentUserId={session.user.id}
        canDeleteJob={data.canDeleteJob}
        canApproveDeleteJob={data.canApproveDeleteJob}
        canDeleteDoc={data.canDeleteDoc}
        canManageSettings={data.canManageSettings}
        canInternalApproveChecklist={data.canInternalApproveChecklist}
        canCustomerApproveChecklist={data.canCustomerApproveChecklist}
        canUpdateJob={data.canUpdateJob}
        canRequestExpenses={data.canRequestExpenses}
        canManageExpenses={data.canManageExpenses}
        canPayExpenses={data.canPayExpenses}
        internalApproversCount={data.internalApproversCount}
        initialTab={tab}
        focusField={focus}
        initialCustomsSubtab={tab === "customsFiling" ? customsSubtab : undefined}
        customsFilingAccess={data.customsFilingAccess}
      />
    </>
  );
}
