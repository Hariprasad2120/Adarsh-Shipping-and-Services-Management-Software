import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getJobDetails, getChecklistInternalApproverIds, getEligibleManagers } from "@/modules/cha/service";
import { db } from "@/lib/db";
import { can, ForbiddenError } from "@/lib/rbac";
import { BreadcrumbLabel } from "@/components/breadcrumb-label";
import { JobWorkspaceClient } from "./job-workspace-client";
import Link from "next/link";

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
  users: { id: string; name: string; email: string }[];
  managers: { id: string; name: string; email: string; branchId: string | null }[];
  parsedExpenseCategories: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: any;
  internalApproversCount: number;
}

export default async function ChaJobWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ tab?: string; focus?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) redirect("/setup");

  const { jobId } = await params;
  const { tab, focus } = await searchParams;

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

    data = {
      job,
      canDeleteJob,
      canApproveDeleteJob,
      canDeleteDoc,
      canManageSettings,
      canInternalApproveChecklist,
      canCustomerApproveChecklist,
      canUpdateJob,
      users,
      managers: eligibleManagers,
      parsedExpenseCategories,
      settings,
      internalApproversCount: internalApproverIds.length,
    };
  } catch (err: unknown) {
    error = err;
  }

  if (error) {
    console.error("Failed to load job workspace:", error);
    if (
      error instanceof ForbiddenError ||
      (error instanceof Error && error.message.includes("Access Denied"))
    ) {
      return (
        <main className="max-w-4xl mx-auto p-12 text-center space-y-4">
          <div className="inline-flex p-3 rounded-full bg-red-50 text-red-500 border border-red-200">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h1 className="ds-h2 text-on-surface">Access Prohibited</h1>
          <p className="text-sm text-on-surface-variant max-w-md mx-auto">
            {(error as Error).message}
          </p>
          <div className="pt-4">
            <Link href="/cha/jobs" className="bg-[#00cec4] text-white hover:bg-[#00b8af] px-4 py-2 rounded-xl text-sm uppercase tracking-wide transition-all font-semibold inline-block">
              Back to Catalog
            </Link>
          </div>
        </main>
      );
    }

    if (error instanceof Error && error.message === "Job not found.") {
      return notFound();
    }

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
        internalApproversCount={data.internalApproversCount}
        initialTab={tab}
        focusField={focus}
      />
    </>
  );
}
