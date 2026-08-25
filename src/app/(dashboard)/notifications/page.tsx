import { Bell, Filter } from "lucide-react";
import { WorkspaceAction, WorkspaceField, WorkspaceInput, WorkspacePage, WorkspacePageHeader, WorkspacePanel, WorkspaceSelect } from "@/components/layout/workspace";
import { getSession } from "@/lib/auth";
import { getNotificationPolicy } from "@/modules/notifications/policy";
import { listUserNotifications } from "@/modules/notifications/service";
import { redirect } from "next/navigation";
import { NotificationsClient } from "./notifications-client";

export const metadata = {
  title: "Notifications | Adarsh Shipping",
};

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const status = stringParam(params.status, "all");
  const requiresAck = stringParam(params.requiresAck, "all");
  const notifications = await listUserNotifications(session.user.id, {
    status: status as "all" | "unread" | "read" | "acknowledged" | "dismissed",
    requiresAck: requiresAck as "all" | "yes" | "no",
    kind: stringParam(params.kind),
    source: stringParam(params.source),
    from: stringParam(params.from),
    to: stringParam(params.to),
  });

  const rows = notifications.map((notification) => {
    const policy = getNotificationPolicy(notification.kind);
    return {
      id: notification.id,
      kind: notification.kind,
      title: notification.title,
      body: notification.body,
      link: notification.link,
      source: notification.source,
      requiresAck: notification.requiresAck,
      createdAt: notification.createdAt.toISOString(),
      readAt: notification.readAt?.toISOString() ?? null,
      acknowledgedAt: notification.acknowledgedAt?.toISOString() ?? null,
      dismissedAt: notification.dismissedAt?.toISOString() ?? null,
      labels: {
        open: policy.labels?.open ?? "Open",
        acknowledge: policy.labels?.acknowledge ?? "Acknowledge",
      },
    };
  });

  return (
    <WorkspacePage>
      <WorkspacePageHeader
        eyebrow="Personal inbox"
        title="Notifications"
        icon={<Bell size={21} aria-hidden="true" />}
        description="Review updates, reminders, and acknowledgements."
      />

      <WorkspacePanel>
        <form className="mnx-notification-filters">
          <div className="mnx-toolbar">
            <div className="mnx-toolbar-copy">
              <h2>Filter notification history</h2>
              <p>Use one or more fields to narrow your personal notification stream.</p>
            </div>
            <WorkspaceAction type="submit" size="compact">
              <Filter size={14} aria-hidden="true" />
              Apply filters
            </WorkspaceAction>
          </div>
          <div className="mnx-filter-grid mnx-filter-grid-wide">
            <WorkspaceField label="Status" htmlFor="notification-status">
              <WorkspaceSelect id="notification-status" name="status" defaultValue={status}>
                <option value="all">All statuses</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="dismissed">Dismissed</option>
              </WorkspaceSelect>
            </WorkspaceField>
            <WorkspaceField label="Acknowledgement" htmlFor="notification-ack">
              <WorkspaceSelect id="notification-ack" name="requiresAck" defaultValue={requiresAck}>
                <option value="all">Required or not</option>
                <option value="yes">Required</option>
                <option value="no">Not required</option>
              </WorkspaceSelect>
            </WorkspaceField>
            <WorkspaceField label="Kind" htmlFor="notification-kind">
              <WorkspaceInput
                id="notification-kind"
                name="kind"
                defaultValue={stringParam(params.kind)}
                placeholder="e.g. TODO_REMINDER"
              />
            </WorkspaceField>
            <WorkspaceField label="Source" htmlFor="notification-source">
              <WorkspaceInput
                id="notification-source"
                name="source"
                defaultValue={stringParam(params.source)}
                placeholder="e.g. HRMS"
              />
            </WorkspaceField>
            <WorkspaceField label="From" htmlFor="notification-from">
              <WorkspaceInput
                id="notification-from"
                name="from"
                type="date"
                defaultValue={stringParam(params.from)}
              />
            </WorkspaceField>
            <WorkspaceField label="To" htmlFor="notification-to">
              <WorkspaceInput
                id="notification-to"
                name="to"
                type="date"
                defaultValue={stringParam(params.to)}
              />
            </WorkspaceField>
          </div>
        </form>
      </WorkspacePanel>

      <NotificationsClient notifications={rows} />
    </WorkspacePage>
  );
}

function stringParam(
  value: string | string[] | undefined,
  fallback = "",
) {
  return typeof value === "string" ? value : fallback;
}
