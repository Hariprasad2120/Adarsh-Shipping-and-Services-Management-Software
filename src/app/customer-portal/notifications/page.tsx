import Link from "next/link";
import { ArrowRight, Bell, CheckSquare, Clock } from "lucide-react";
import { Badge } from "@/components/monolith/badge";
import { Button } from "@/components/monolith/button";
import {
  CustomerPortalPage,
  CustomerPortalPageHeader,
} from "@/components/monolith/customer-portal-workspace";
import { requirePortalSession } from "@/modules/customer-portal/auth";
import { getCustomerPortalApprovalQueue } from "@/modules/customer-portal/shipments";
import { listPortalNotifications } from "@/modules/customer-portal/service";
import { PortalMarkAllReadButton } from "../_components/client-actions";

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

      {notificationRows.length === 0 ? (
        <div className="rounded-xl border border-mono-border/40 bg-mono-card p-12 text-center">
          <Bell className="mx-auto size-10 text-mono-accent opacity-50" />
          <h3 className="mnx-portal-title-3 mt-4 text-mono-text">
            No Notifications
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-xs text-mono-muted">
            There are no customer portal notifications for your account right
            now.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notificationRows.map((notification) => (
            <div
              key={notification.id}
              className="mnx-portal-panel flex flex-col gap-4 rounded-xl border border-mono-border/60 bg-mono-card p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between"
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
                <Link href={notification.link} className="shrink-0">
                  <Button
                    size="sm"
                    variant={notification.isActionable ? "default" : "outline"}
                    className="gap-2"
                  >
                    <span>{notification.isActionable ? "Review" : "Open"}</span>
                    <ArrowRight size={14} />
                  </Button>
                </Link>
              ) : null}
            </div>
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
