"use client";

import { useRouter } from "next/navigation";
import { DataTable, DataTableBody, DataTableCell, DataTableEmpty, DataTableHead, DataTableHeader, DataTableRow, DataTableToolbar } from "@/components/data-table";
import { Button } from "@/components/ui/button-1";
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

export function NotificationsClient({ notifications }: { notifications: NotificationRow[] }) {
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

  return (
    <div className="space-y-6">
      <DataTable>
        <DataTableToolbar>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Notifications</h1>
            <p className="text-sm text-slate-500">Only your notifications appear here.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => run("/api/notifications/read-all", "Marked all as read")}>
            Mark all read
          </Button>
        </DataTableToolbar>
        <DataTableHeader>
          <tr>
            {["Title", "Source", "Status", "Received", "Actions"].map((header) => (
              <DataTableHead key={header}>{header}</DataTableHead>
            ))}
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {notifications.length === 0 ? (
            <DataTableEmpty colSpan={5} message="No notifications found." />
          ) : (
            notifications.map((notification) => {
              const status = notification.dismissedAt
                ? "Dismissed"
                : notification.acknowledgedAt
                  ? "Acknowledged"
                  : notification.readAt
                    ? "Read"
                    : "Unread";

              return (
                <DataTableRow key={notification.id}>
                  <DataTableCell>
                    <div className="space-y-1">
                      <p className="font-medium text-slate-900">{notification.title}</p>
                      {notification.body ? <p className="text-xs text-slate-500">{notification.body}</p> : null}
                    </div>
                  </DataTableCell>
                  <DataTableCell>{notification.source ?? "-"}</DataTableCell>
                  <DataTableCell>{status}</DataTableCell>
                  <DataTableCell>{new Date(notification.createdAt).toLocaleString("en-IN")}</DataTableCell>
                  <DataTableCell>
                    <div className="flex flex-wrap gap-2">
                      {!notification.readAt ? (
                        <Button size="sm" variant="outline" onClick={() => run(`/api/notifications/${notification.id}/read`, "Marked as read")}>
                          Read
                        </Button>
                      ) : null}
                      {notification.requiresAck && !notification.acknowledgedAt ? (
                        <Button size="sm" onClick={() => run(`/api/notifications/${notification.id}/ack`, "Notification acknowledged")}>
                          {notification.labels.acknowledge}
                        </Button>
                      ) : null}
                      {notification.link ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const res = await fetch(`/api/notifications/${notification.id}/open`, { method: "POST" });
                            const data = (await res.json()) as { link?: string | null };
                            if (!res.ok || !data.link) {
                              error("Unable to open notification");
                              return;
                            }
                            router.push(data.link);
                            router.refresh();
                          }}
                        >
                          {notification.labels.open}
                        </Button>
                      ) : null}
                      {!notification.dismissedAt ? (
                        <Button size="sm" variant="outline" onClick={() => run(`/api/notifications/${notification.id}/dismiss`, "Notification dismissed")}>
                          Dismiss
                        </Button>
                      ) : null}
                    </div>
                  </DataTableCell>
                </DataTableRow>
              );
            })
          )}
        </DataTableBody>
      </DataTable>
    </div>
  );
}
