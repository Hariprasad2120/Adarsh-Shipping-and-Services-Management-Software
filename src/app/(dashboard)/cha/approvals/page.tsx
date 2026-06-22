import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { listManagerChecklistApprovals } from "@/modules/cha/service";
import Link from "next/link";
import { CheckSquare, ArrowRight, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function ChaApprovalsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) redirect("/setup");

  // Check approval permission
  await requirePermission(session.user.id, "cha.checklist.manager_approve");

  const approvals = await listManagerChecklistApprovals(session.user.id, orgId);

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="border-b border-outline-variant/30 pb-4">
        <h1 className="ds-h1 text-[#00cec4] flex items-center gap-2">
          <span className="ds-icon-badge bg-[#00cec4]/10 text-[#00cec4] p-1.5 rounded-xl">
            <ClipboardCheck size={20} />
          </span>
          Checklist Approvals Queue
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Review and audit questionnaire responses parsed from client clearance Excel templates before custom filings.
        </p>
      </div>

      {/* Grid List */}
      <div className="bg-surface border border-outline-variant/30 rounded-xl shadow-sm overflow-hidden">
        {approvals.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-on-surface-variant">
            <CheckSquare size={48} className="text-outline-variant mb-3" />
            <p className="text-sm font-semibold">Your review approvals queue is clear!</p>
            <p className="text-xs mt-1">Pending job checklist audits assigned to you will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Job Number</th>
                  <th>Job Scope / Title</th>
                  <th>Customer Account</th>
                  <th>Uploaded By</th>
                  <th>Date Submitted</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {approvals.map((app) => {
                  const job = app.checklistImport.job;
                  return (
                    <tr key={app.id} className="ds-row-link">
                      <td className="font-semibold text-[#00cec4]">{job.jobNumber}</td>
                      <td className="font-medium max-w-xs truncate">{job.title}</td>
                      <td>{job.customer.name}</td>
                      <td>{app.checklistImport.uploadedBy?.name || "System"}</td>
                      <td className="font-mono text-xs text-on-surface-variant">
                        {new Date(app.checklistImport.uploadedAt).toDateString()}
                      </td>
                      <td className="text-right">
                        <Link href={`/cha/jobs/${job.id}`}>
                          <Button size="sm" className="h-8 text-xs py-1 inline-flex items-center gap-1.5 bg-[#00cec4] hover:bg-[#00b8af]">
                            Audit & Review <ArrowRight size={12} />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
