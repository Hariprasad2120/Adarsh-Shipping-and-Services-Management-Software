"use client";

import { useRouter } from "next/navigation";
import { DataTable, DataTableBody, DataTableCell, DataTableEmpty, DataTableHead, DataTableHeader, DataTableRow } from "@/components/data-table";
import { Button } from "@/components/ui/button-1";
import { useNotifications } from "@/components/notifications/notification-provider";

type AdminNotificationRow = {
  id: string;
  title: string;
  kind: string;
  source: string | null;
  user: { id: string; name: string; email: string };
  requiresAck: boolean;
  readAt: string | null;
  acknowledgedAt: string | null;
  dismissedAt: string | null;
  resentCount: number;
  createdAt: string;
  activities: Array<{
    id: string;
    event: string;
    createdAt: string;
    actor: { name: string; email: string } | null;
  }>;
};

export function AdminNotificationsClient({ notifications }: { notifications: AdminNotificationRow[] }) {
  const router = useRouter();
  const { success, error } = useNotifications();

  return (
    <DataTable>
      <DataTableHeader>
        <tr>
          {["Notification", "Recipient", "State", "Created", "History", "Actions"].map((header) => (
            <DataTableHead key={header}>{header}</DataTableHead>
          ))}
        </tr>
      </DataTableHeader>
      <DataTableBody>
        {notifications.length === 0 ? (
          <DataTableEmpty colSpan={6} message="No notifications matched the current filters." />
        ) : (
          notifications.map((notification) => (
            <DataTableRow key={notification.id}>
              <DataTableCell>
                <div className="space-y-1">
                  <p className="font-medium text-slate-900">{notification.title}</p>
                  <p className="text-xs text-slate-500">{notification.kind} · {notification.source ?? "System"}</p>
                </div>
              </DataTableCell>
              <DataTableCell>
                <div className="space-y-1">
                  <p className="font-medium text-slate-900">{notification.user.name}</p>
                  <p className="text-xs text-slate-500">{notification.user.email}</p>
                </div>
              </DataTableCell>
              <DataTableCell>
                <div className="space-y-1 text-xs text-slate-600">
                  <p>Read: {notification.readAt ? "Yes" : "No"}</p>
                  <p>Ack: {notification.acknowledgedAt ? "Yes" : "No"}</p>
                  <p>Dismissed: {notification.dismissedAt ? "Yes" : "No"}</p>
                  <p>Resent: {notification.resentCount}</p>
                </div>
              </DataTableCell>
              <DataTableCell>{new Date(notification.createdAt).toLocaleString("en-IN")}</DataTableCell>
              <DataTableCell>
                <div className="max-h-32 space-y-1 overflow-y-auto text-xs text-slate-500">
                  {notification.activities.slice(0, 6).map((activity) => (
                    <p key={activity.id}>
                      {activity.event} · {activity.actor?.name ?? "System"} · {new Date(activity.createdAt).toLocaleString("en-IN")}
                    </p>
                  ))}
                </div>
              </DataTableCell>
              <DataTableCell>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const res = await fetch(`/api/admin/notifications/${notification.id}/resend`, { method: "POST" });
                    if (!res.ok) {
                      error("Unable to resend notification");
                      return;
                    }
                    success("Notification resent");
                    router.refresh();
                  }}
                >
                  Resend
                </Button>
              </DataTableCell>
            </DataTableRow>
          ))
        )}
      </DataTableBody>
    </DataTable>
  );
}
