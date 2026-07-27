import Link from "next/link";
import { ArrowRight, Bell, CheckSquare, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;
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
    <div className="space-y-6 font-sans">
      <div className="rounded-xl border border-outline-variant/60 bg-surface p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="ds-label">Customer Portal</p>
            <h2 className="ds-h2 mt-2">Notifications</h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              Shipment updates, document requests, and checklist approvals that need your attention.
            </p>
          </div>
          {unreadCount > 0 ? <PortalMarkAllReadButton /> : null}
        </div>
      </div>

      {notificationRows.length === 0 ? (
        <div className="rounded-xl border border-outline-variant/40 bg-surface p-12 text-center">
          <Bell className="mx-auto size-10 text-primary opacity-50" />
          <h3 className="ds-h3 mt-4 text-on-surface">No Notifications</h3>
          <p className="mx-auto mt-2 max-w-sm text-xs text-on-surface-variant">
            There are no customer portal notifications for your account right now.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notificationRows.map((notification) => (
            <div
              key={notification.id}
              className="card-left-accent flex flex-col gap-4 rounded-xl border border-outline-variant/60 bg-surface p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex min-w-0 gap-3">
                <span className="ds-icon-badge shrink-0">
                  {notification.isActionable ? <CheckSquare size={18} /> : <Bell size={18} />}
                </span>
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-medium text-on-surface">{notification.title}</h3>
                    <Badge variant={notification.isActionable ? "warning" : notification.readAt ? "secondary" : "default"}>
                      {notification.isActionable ? "Action Required" : notification.readAt ? "Read" : "Unread"}
                    </Badge>
                  </div>
                  {notification.body ? (
                    <p className="text-sm text-on-surface-variant">{notification.body}</p>
                  ) : null}
                  <p className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <Clock size={14} />
                    <span>{formatDateTime(notification.createdAt)}</span>
                  </p>
                </div>
              </div>
              {notification.link ? (
                <Link href={notification.link} className="shrink-0">
                  <Button size="sm" variant={notification.isActionable ? "default" : "outline"} className="gap-2">
                    <span>{notification.isActionable ? "Review" : "Open"}</span>
                    <ArrowRight size={14} />
                  </Button>
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
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
