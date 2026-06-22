import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getJobDetails } from "@/modules/cha/service";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { BreadcrumbLabel } from "@/components/breadcrumb-label";
import { JobWorkspaceClient } from "./job-workspace-client";

export default async function ChaJobWorkspacePage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) redirect("/setup");

  const { jobId } = await params;

  try {
    const [job, canDeleteJob, canApproveDeleteJob, canDeleteDoc, canManageSettings] = await Promise.all([
      getJobDetails(session.user.id, orgId, jobId),
      can(session.user.id, "cha.job.delete"),
      can(session.user.id, "cha.job.delete.approve"),
      can(session.user.id, "cha.document.delete"),
      can(session.user.id, "cha.settings.manage"),
    ]);
    
    // Fetch users for assignment selections and customer advance maps
    const users = await db.user.findMany({
      where: { orgId, active: true },
      select: { id: true, name: true, email: true },
    });

    const settings = await db.chaSettings.findUnique({
      where: { orgId },
    });

    const parsedExpenseCategories: string[] = settings?.expenseCategories
      ? JSON.parse(settings.expenseCategories as string)
      : ["Customs Duty", "Port Handling Charges", "Transportation", "Documentation charges", "Agent Commission", "Storage Fees", "Miscellaneous"];

    return (
      <>
        <BreadcrumbLabel segment={jobId} label={job.jobNumber} />
        <JobWorkspaceClient
          job={JSON.parse(JSON.stringify(job))}
          users={users}
          expenseCategories={parsedExpenseCategories}
          selfApprovalAllowed={settings?.selfApprovalAllowed ?? true}
          currentUserId={session.user.id}
          canDeleteJob={canDeleteJob}
          canApproveDeleteJob={canApproveDeleteJob}
          canDeleteDoc={canDeleteDoc}
          canManageSettings={canManageSettings}
        />
      </>
    );
  } catch (err: any) {
    console.error("Failed to load job workspace:", err);
    if (err.message.includes("Access Denied")) {
      return (
        <main className="max-w-4xl mx-auto p-12 text-center space-y-4">
          <div className="inline-flex p-3 rounded-full bg-red-50 text-red-500 border border-red-200">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h1 className="ds-h2 text-on-surface">Access Prohibited</h1>
          <p className="text-sm text-on-surface-variant max-w-md mx-auto">
            {err.message}
          </p>
          <div className="pt-4">
            <a href="/cha/jobs" className="bg-[#00cec4] text-white hover:bg-[#00b8af] px-4 py-2 rounded-xl text-sm uppercase tracking-wide transition-all font-semibold inline-block">
              Back to Catalog
            </a>
          </div>
        </main>
      );
    }
    return notFound();
  }
}
