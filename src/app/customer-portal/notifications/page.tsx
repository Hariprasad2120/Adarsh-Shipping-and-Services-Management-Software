import { ArrowRight, Bell, CheckSquare, Clock } from "lucide-react";
import {
  CustomerPortalPanel,
  CustomerPortalPage,
  CustomerPortalPageHeader,
  CustomerPortalSectionHeading,
} from "@/components/monolith/customer-portal-workspace";
import { WorkspaceEmptyState } from "@/components/feedback/workspace-states";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { requirePortalSession } from "@/modules/customer-portal/auth";
import { getCustomerPortalApprovalQueue } from "@/modules/customer-portal/shipments";
import { listPortalNotifications } from "@/modules/customer-portal/service";
import { PortalMarkAllReadButton } from "@/modules/customer-portal/components/client-actions";

export default async function CustomerPortalNotificationsPage() {
  const session = await requirePortalSession();
  const [notifications, pendingApprovals] = await Promise.all([
    listPortalNotifications(session.portalUserId),
    getCustomerPortalApprovalQueue(session),
  ]);
  const unreadCount = notifications.filter(
    (notification) => !notification.readAt,
  ).length;
  const notificationRows = [
    ...pendingApprovals.map((approval) => ({
      id: `approval-${approval.id}`,
      kind: "CHECKLIST_APPROVAL_REQUIRED",
      title: `Checklist approval required for ${approval.jobNumber}`,
      body: `${approval.checklistLabel}${approval.fileName ? ` (${approval.fileName})` : ""} is waiting for your approval or rejection.`,
      link: approval.href,
      createdAt: new Date(approval.visibleAt),
      readAt: null,
      isActionable: true,
    })),
    ...notifications.map((notification) => ({
      id: notification.id,
      kind: notification.kind,
      title: notification.title,
      body: notification.body,
      link: notification.link,
      createdAt: notification.createdAt,
      readAt: notification.readAt,
      isActionable: false,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <CustomerPortalPage>
      <CustomerPortalPageHeader
        eyebrow="Customer portal"
        title="Notifications"
        description="Shipment updates, document requests, and checklist approvals that need your attention."
        icon={<Bell size={22} />}
        actions={unreadCount > 0 ? <PortalMarkAllReadButton /> : undefined}
      />

      <CustomerPortalSectionHeading
        index="01"
        title="Activity feed"
        description="Portal alerts, checklist approvals, and customer-facing workflow notices in one queue."
      />

      {notificationRows.length === 0 ? (
        <CustomerPortalPanel className="mnx-customer-portal-empty">
          <div className="mnx-panel-state">
            <WorkspaceEmptyState
              title="No notifications"
              description="There are no customer portal notifications for this account right now."
            />
          </div>
        </CustomerPortalPanel>
      ) : (
        <div className="space-y-3">
          {notificationRows.map((notification) => (
            <CustomerPortalPanel
              key={notification.id}
              className="mnx-portal-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex min-w-0 gap-3">
                <span className="mnx-portal-leading-icon shrink-0">
                  {notification.isActionable ? (
                    <CheckSquare size={18} />
                  ) : (
                    <Bell size={18} />
                  )}
                </span>
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-medium text-mono-text">
                      {notification.title}
                    </h3>
                    <Badge
                      variant={
                        notification.isActionable
                          ? "warning"
                          : notification.readAt
                            ? "secondary"
                            : "default"
                      }
                    >
                      {notification.isActionable
                        ? "Action Required"
                        : notification.readAt
                          ? "Read"
                          : "Unread"}
                    </Badge>
                  </div>
                  {notification.body ? (
                    <p className="text-sm text-mono-muted">
                      {notification.body}
                    </p>
                  ) : null}
                  <p className="flex items-center gap-2 text-xs text-mono-muted">
                    <Clock size={14} />
                    <span>{formatDateTime(notification.createdAt)}</span>
                  </p>
                </div>
              </div>
              {notification.link ? (
                <ButtonLink
                  href={notification.link}
                  size="sm"
                  variant={notification.isActionable ? "default" : "outline"}
                  className="shrink-0 gap-2"
                >
                  <span>{notification.isActionable ? "Review" : "Open"}</span>
                  <ArrowRight size={14} />
                </ButtonLink>
              ) : null}
            </CustomerPortalPanel>
          ))}
        </div>
      )}
    </CustomerPortalPage>
  );
}

function formatDateTime(value: Date) {
  return value.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
