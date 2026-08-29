import { requirePortalSession } from "@/modules/customer-portal/auth";
import { getCustomerPortalApprovalQueue } from "@/modules/customer-portal/shipments";
import {
  CustomerPortalPanel,
  CustomerPortalPage,
  CustomerPortalPageHeader,
  CustomerPortalSectionHeading,
} from "@/components/monolith";
import { WorkspaceEmptyState } from "@/components/feedback/workspace-states";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { CheckSquare, ArrowRight } from "lucide-react";

export default async function CustomerPortalApprovalsPage() {
  const session = await requirePortalSession();
  const pendingApprovals = await getCustomerPortalApprovalQueue(session);

  return (
    <CustomerPortalPage>
      <CustomerPortalPageHeader
        eyebrow="Customer decisions"
        title="Actionable Approvals"
        description="Review and approve draft customs checklists before filing submissions are sent to customs house agents."
        icon={<CheckSquare size={22} />}
      />

      <CustomerPortalSectionHeading
        index="01"
        title="Approval queue"
        description="Checklist confirmations assigned to this customer contact."
      />

      <div className="mnx-customer-portal-record-grid">
        {pendingApprovals.length === 0 ? (
          <CustomerPortalPanel className="mnx-customer-portal-empty md:col-span-2">
            <div className="mnx-panel-state">
              <WorkspaceEmptyState
                title="No pending approvals"
                description="You are all caught up. Draft checklists awaiting your confirmation will appear here."
              />
            </div>
          </CustomerPortalPanel>
        ) : (
          pendingApprovals.map((approval) => (
            <CustomerPortalPanel
              key={approval.id}
              className="mnx-portal-panel mnx-portal-panel-warning flex flex-col justify-between p-5"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="mnx-portal-eyebrow text-xs tracking-wider">
                    {approval.jobNumber}
                  </span>
                  <Badge variant="warning">Checklist Pending</Badge>
                </div>

                <h3 className="mnx-portal-title-3 text-mono-text">
                  {approval.customerRef ||
                    approval.jobTitle ||
                    approval.checklistLabel}
                </h3>
                <p className="text-xs text-mono-muted font-medium">
                  Stage: {approval.stageLabel} · Updated:{" "}
                  {formatDate(approval.updatedAt)}
                </p>
                {approval.fileName ? (
                  <p className="text-xs text-mono-muted">{approval.fileName}</p>
                ) : null}
              </div>

              <div className="border-t border-mono-border/20 mt-4 pt-4 flex justify-end">
                <ButtonLink href={approval.href} size="sm" className="gap-2">
                  <span>Review And Approve</span>
                  <ArrowRight size={14} />
                </ButtonLink>
              </div>
            </CustomerPortalPanel>
          ))
        )}
      </div>
    </CustomerPortalPage>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
