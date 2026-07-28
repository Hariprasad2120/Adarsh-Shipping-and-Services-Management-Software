"use client";

import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Eye,
  Info,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import {
  WorkspaceAction,
  WorkspaceBadge,
  WorkspaceEmptyState,
  WorkspacePanel,
  WorkspacePanelHeader,
} from "@/components/monolith";
import { useNotifications } from "@/components/notifications/notification-provider";

type NotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  source: string | null;
  requiresAck: boolean;
  createdAt: string;
  readAt: string | null;
  acknowledgedAt: string | null;
  dismissedAt: string | null;
  labels: {
    open: string;
    acknowledge: string;
  };
};

function getNotificationIcon(notification: NotificationRow) {
  if (notification.dismissedAt) return Trash2;
  if (notification.acknowledgedAt) return CheckCircle2;
  if (notification.requiresAck) return TriangleAlert;
  if (!notification.readAt) return Bell;
  return Info;
}

function getNotificationStatus(notification: NotificationRow): {
  label: string;
  variant: "danger" | "neutral" | "success" | "warning" | "accent";
} {
  if (notification.dismissedAt) {
    return { label: "Dismissed", variant: "neutral" };
  }
  if (notification.acknowledgedAt) {
    return { label: "Acknowledged", variant: "success" };
  }
  if (notification.requiresAck && !notification.readAt) {
    return { label: "Action required", variant: "warning" };
  }
  if (notification.readAt) return { label: "Read", variant: "neutral" };
  return { label: "Unread", variant: "accent" };
}

export function NotificationsClient({
  notifications,
}: {
  notifications: NotificationRow[];
}) {
  const router = useRouter();
  const { success, error } = useNotifications();

  async function run(url: string, message: string) {
    const res = await fetch(url, { method: "POST" });
    if (!res.ok) {
      error("Action failed", "Please try again.");
      return;
    }
    success(message);
    router.refresh();
  }

  async function openNotification(notification: NotificationRow) {
    const res = await fetch(`/api/notifications/${notification.id}/open`, {
      method: "POST",
    });
    const data = (await res.json()) as { link?: string | null };
    if (!res.ok || !data.link) {
      error("Unable to open notification");
      return;
    }
    router.push(data.link);
    router.refresh();
  }

  return (
    <WorkspacePanel>
      <WorkspacePanelHeader
        eyebrow="Notification stream"
        title={`${notifications.length} result${notifications.length === 1 ? "" : "s"}`}
        description="Only notifications delivered to your account appear here."
        actions={
          <>
            <WorkspaceAction
              size="compact"
              variant="secondary"
              onClick={() => run("/api/notifications/read-all", "Marked all as read")}
            >
              <CheckCheck size={14} aria-hidden="true" />
              Mark all read
            </WorkspaceAction>
            <WorkspaceAction
              size="compact"
              variant="destructive"
              onClick={() =>
                run("/api/notifications/dismiss-all", "Dismissed all notifications")
              }
            >
              <Trash2 size={14} aria-hidden="true" />
              Dismiss all
            </WorkspaceAction>
          </>
        }
      />

      {notifications.length === 0 ? (
        <div className="mnx-panel-state">
          <WorkspaceEmptyState
            title="No notifications found"
            description="You’re all caught up for the selected filters."
          />
        </div>
      ) : (
        <div className="mnx-notification-list">
          {notifications.map((notification) => {
            const Icon = getNotificationIcon(notification);
            const status = getNotificationStatus(notification);

            return (
              <article className="mnx-notification-record" key={notification.id}>
                <div className="mnx-record-layout">
                  <span className="mnx-record-icon">
                    <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <div className="mnx-record-copy">
                    <div className="mnx-chip-row">
                      <WorkspaceBadge variant={status.variant}>
                        {status.label}
                      </WorkspaceBadge>
                      {notification.source ? (
                        <WorkspaceBadge variant="neutral">
                          {notification.source}
                        </WorkspaceBadge>
                      ) : null}
                    </div>
                    <h2>{notification.title}</h2>
                    {notification.body ? <p>{notification.body}</p> : null}
                    <div className="mnx-record-meta">
                      <span>
                        <Clock3 size={12} aria-hidden="true" />
                        {new Date(notification.createdAt).toLocaleString("en-IN")}
                      </span>
                      <span>{notification.kind.replaceAll("_", " ")}</span>
                    </div>
                  </div>
                  <div className="mnx-record-actions">
                    {!notification.readAt ? (
                      <WorkspaceAction
                        size="compact"
                        variant="secondary"
                        onClick={() =>
                          run(
                            `/api/notifications/${notification.id}/read`,
                            "Marked as read",
                          )
                        }
                      >
                        <Eye size={14} aria-hidden="true" />
                        Read
                      </WorkspaceAction>
                    ) : null}
                    {notification.requiresAck && !notification.acknowledgedAt ? (
                      <WorkspaceAction
                        size="compact"
                        onClick={() =>
                          run(
                            `/api/notifications/${notification.id}/ack`,
                            "Notification acknowledged",
                          )
                        }
                      >
                        <CheckCheck size={14} aria-hidden="true" />
                        {notification.labels.acknowledge}
                      </WorkspaceAction>
                    ) : null}
                    {notification.link ? (
                      <WorkspaceAction
                        size="compact"
                        variant="secondary"
                        onClick={() => openNotification(notification)}
                      >
                        <ExternalLink size={14} aria-hidden="true" />
                        {notification.labels.open}
                      </WorkspaceAction>
                    ) : null}
                    {!notification.dismissedAt ? (
                      <WorkspaceAction
                        size="compact"
                        variant="destructive"
                        onClick={() =>
                          run(
                            `/api/notifications/${notification.id}/dismiss`,
                            "Notification dismissed",
                          )
                        }
                      >
                        <Trash2 size={14} aria-hidden="true" />
                        Dismiss
                      </WorkspaceAction>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </WorkspacePanel>
  );
}
