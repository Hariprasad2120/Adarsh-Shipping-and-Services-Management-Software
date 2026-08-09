import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  WorkspaceMetric,
  WorkspacePage,
  WorkspacePageHeader,
  WorkspacePanel,
  WorkspaceSectionHeading,
} from "@/components/layout/workspace";
import { WorkspaceEmptyState } from "@/components/feedback/workspace-states";
import { ChaTable } from "@/modules/cha/components/workspace/cha-workspace";
import {
  listManagerChecklistApprovals,
  listManagerJobDeletionRequests,
} from "@/modules/cha/service";

function QueueBadge({
  count,
  emptyLabel,
  activeLabel,
  variant,
}: {
  count: number;
  emptyLabel: string;
  activeLabel: string;
  variant: "secondary" | "warning";
}) {
  return (
    <Badge variant={count > 0 ? variant : "secondary"}>
      {count > 0 ? `${count} ${activeLabel}` : emptyLabel}
    </Badge>
  );
}

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
    <WorkspacePage className="mx-auto w-full max-w-[100rem]">
      <WorkspacePageHeader
        eyebrow="Controlled decisions"
        title="Checklist Approvals"
        description="Review checklist submissions and job deletion requests from one decision queue with clearer operational context."
        icon={<CheckCircle2 size={20} />}
      />

      <section className="mnx-workspace-metrics">
        <WorkspaceMetric
          label="Checklist audits"
          value={approvals.length}
          detail="Assigned checklist submissions awaiting your review."
          icon={<CheckSquare size={18} />}
        />
        <WorkspaceMetric
          label="Deletion requests"
          value={deletionRequests.length}
          detail="Destructive job removal requests requiring direct manager approval."
          icon={<Trash2 size={18} />}
        />
        <WorkspaceMetric
          label="Approval scope"
          value={canDeleteApprove ? "Full" : "Checklist"}
          detail={
            canDeleteApprove
              ? "You can approve checklist audits and CHA job deletion reviews."
              : "Your queue is limited to checklist audit sign-off."
          }
          icon={<ShieldCheck size={18} />}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <WorkspacePanel className="overflow-hidden">
          <div className="border-b mnx-border px-5 py-5">
            <WorkspaceSectionHeading
              index="01"
              title="Pending Approvals"
              description="Checklist audits routed to you for review, verification, and approval."
              badge={
                <QueueBadge
                  count={approvals.length}
                  emptyLabel="Queue clear"
                  activeLabel="awaiting review"
                  variant="warning"
                />
              }
            />
          </div>

          {approvals.length === 0 ? (
            <div className="mnx-panel-state">
              <WorkspaceEmptyState
                title="No checklist approvals are waiting"
                description="When a job checklist audit is submitted to your approval queue, it will appear here with the linked job and reviewer context."
              />
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
                        <td className="px-6 py-4 font-semibold mnx-text-accent">
                          {job.jobNumber}
                        </td>
                        <td className="px-6 py-4 max-w-xs truncate font-medium mnx-text-primary">
                          {job.title}
                        </td>
                        <td className="px-6 py-4 mnx-text-muted">{job.customer.name}</td>
                        <td className="px-6 py-4 mnx-text-muted">
                          {app.checklistImport.uploadedBy?.name || "System"}
                        </td>
                        <td className="px-6 py-4 mnx-numeric mnx-text-muted">
                          {new Date(app.checklistImport.uploadedAt).toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <ButtonLink
                            href={`/cha/jobs/${job.id}`}
                            size="sm"
                            className="inline-flex items-center gap-1"
                          >
                            Audit & Review <ArrowRight size={12} />
                          </ButtonLink>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </ChaTable>
            </div>
          )}
        </WorkspacePanel>

        <WorkspacePanel className="overflow-hidden">
          <div className="border-b mnx-border px-5 py-5">
            <WorkspaceSectionHeading
              index="02"
              title="Job Deletion Requests"
              description="High-risk CHA deletion approvals assigned to you as the controlling manager."
              badge={
                <QueueBadge
                  count={deletionRequests.length}
                  emptyLabel="No requests"
                  activeLabel="pending deletion reviews"
                  variant="warning"
                />
              }
            />
          </div>

          {deletionRequests.length === 0 ? (
            <div className="mnx-panel-state">
              <WorkspaceEmptyState
                title="No job deletion requests are waiting"
                description="If a destructive CHA job deletion request is routed to you, it will appear here with the requester, customer, and job reference."
              />
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
                        <Badge variant="warning" className="uppercase">
                          {request.status.replaceAll("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <ButtonLink
                          href={`/cha/jobs/${request.jobId}`}
                          size="sm"
                          variant="outline"
                          className="inline-flex items-center gap-1"
                        >
                          Review Request <ArrowRight size={12} />
                        </ButtonLink>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </ChaTable>
            </div>
          )}
        </WorkspacePanel>
      </section>
    </WorkspacePage>
  );
}
