import { ChaTable } from "@/modules/cha/components/workspace/cha-workspace";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { listManagerChecklistApprovals, listManagerJobDeletionRequests } from "@/modules/cha/service";
import Link from "next/link";
import { CheckSquare, ArrowRight, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ChaPageHeader,
  ChaSectionShell,
} from "@/modules/cha/components/workspace/cha-operations-shared";
import { Badge } from "@/components/ui/badge";

export default async function ChaApprovalsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) redirect("/setup");

  const [approvals, canDeleteApprove] = await Promise.all([
    listManagerChecklistApprovals(session.user.id, orgId),
    can(session.user.id, "cha.job.delete.approve"),
  ]);

  if (approvals.length === 0 && !canDeleteApprove) {
    redirect("/cha");
  }

  const deletionRequests = canDeleteApprove
    ? await listManagerJobDeletionRequests(session.user.id, orgId)
    : [];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <ChaPageHeader
        eyebrow={null}
        title="Checklist Approvals"
        description="Audit, check, and sign off on pending job checklist audits and job deletion reviews."
        icon={<CheckCircle2 size={20} />}
      />

      {/* Checklist Queue */}
      <ChaSectionShell
        index="01"
        title="Pending Approvals"
        description="Pending job checklist audits assigned to you for review and approval."
        count={approvals.length}
        accent="blue"
      >
        <div className="overflow-hidden rounded-b-[20px]">
          {approvals.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center mnx-text-muted">
              <CheckSquare size={48} className="mnx-text-muted mb-3" />
              <p className="text-sm font-semibold">Your review approvals queue is clear!</p>
              <p className="text-xs mt-1">Pending job checklist audits assigned to you will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <ChaTable className="mnx-cha-table">
                <thead>
                  <tr>
                    <th className="px-6 py-4">Job Number</th>
                    <th className="px-6 py-4">Job Scope / Title</th>
                    <th className="px-6 py-4">Customer Account</th>
                    <th className="px-6 py-4">Uploaded By</th>
                    <th className="px-6 py-4">Date Submitted</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {approvals.map((app) => {
                    const job = app.checklistImport.job;
                    return (
                      <tr key={app.id} className="mnx-hover-accent transition-colors">
                        <td className="px-6 py-4 font-semibold mnx-text-accent mnx-text-info">
                          {job.jobNumber}
                        </td>
                        <td className="px-6 py-4 font-medium max-w-xs truncate mnx-text-primary">
                          {job.title}
                        </td>
                        <td className="px-6 py-4 mnx-text-muted">{job.customer.name}</td>
                        <td className="px-6 py-4 mnx-text-muted">
                          {app.checklistImport.uploadedBy?.name || "System"}
                        </td>
                        <td className="px-6 py-4 mnx-numeric mnx-text-muted">
                          {new Date(app.checklistImport.uploadedAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/cha/jobs/${job.id}`}>
                            <Button className="flex items-center gap-1 mnx-bg-accent mnx-text-muted mnx-hover-accent px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-sm">
                              Audit & Review <ArrowRight size={12} />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </ChaTable>
            </div>
          )}
        </div>
      </ChaSectionShell>

      {/* Deletion Queue */}
      <ChaSectionShell
        index="02"
        title="Job Deletion Requests"
        description="Direct manager review queue for destructive CHA job deletion requests."
        count={deletionRequests.length}
        accent="orange"
      >
        <div className="overflow-hidden rounded-b-[20px]">
          {deletionRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center mnx-text-muted">
              <Trash2 size={48} className="mnx-text-muted mb-3" />
              <p className="text-sm font-semibold">No pending CHA deletion requests.</p>
              <p className="text-xs mt-1">Deletion approvals assigned to you will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <ChaTable className="mnx-cha-table">
                <thead>
                  <tr>
                    <th className="px-6 py-4">Job Number</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Requested By</th>
                    <th className="px-6 py-4">Requested At</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deletionRequests.map((request) => (
                    <tr key={request.id} className="mnx-hover-accent transition-colors">
                      <td className="px-6 py-4 font-semibold mnx-text-danger">
                        {request.jobNumberSnapshot}
                      </td>
                      <td className="px-6 py-4 mnx-text-muted">{request.job.customer.name}</td>
                      <td className="px-6 py-4 mnx-text-muted">{request.requestedBy.name}</td>
                      <td className="px-6 py-4 mnx-numeric mnx-text-muted">
                        {new Date(request.requestedAt).toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-4">
                        <Badge className="mnx-bg-warning mnx-text-warning border mnx-border-warning uppercase text-[9px] font-bold">
                          {request.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/cha/jobs/${request.jobId}`}>
                          <Button className="flex items-center gap-1 mnx-bg-accent mnx-text-muted mnx-hover-accent px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-sm">
                            Review Request <ArrowRight size={12} />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </ChaTable>
            </div>
          )}
        </div>
      </ChaSectionShell>
    </div>
  );
}
