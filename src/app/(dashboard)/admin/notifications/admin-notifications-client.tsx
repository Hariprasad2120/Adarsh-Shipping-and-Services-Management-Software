"use client";

import { useRouter } from "next/navigation";
import {
  AdminButton,
  AdminEmptyTableRow,
  AdminPanel,
  AdminTable,
} from "@/components/monolith";
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

export function AdminNotificationsClient({
  notifications,
}: {
  notifications: AdminNotificationRow[];
}) {
  const router = useRouter();
  const { success, error } = useNotifications();

  return (
    <AdminPanel>
      <AdminTable>
        <thead>
          <tr>
            {[
              "Notification",
              "Recipient",
              "State",
              "Created",
              "History",
              "Actions",
            ].map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {notifications.length === 0 ? (
            <AdminEmptyTableRow colSpan={6}>
              No notifications matched the current filters.
            </AdminEmptyTableRow>
          ) : (
            notifications.map((notification) => (
              <tr key={notification.id}>
                <td>
                  <strong>{notification.title}</strong>
                  <small>
                    {notification.kind} · {notification.source ?? "System"}
                  </small>
                </td>
                <td>
                  <strong>{notification.user.name}</strong>
                  <small>{notification.user.email}</small>
                </td>
                <td>
                  <small>
                    Read: {notification.readAt ? "Yes" : "No"}
                    <br />
                    Acknowledged:{" "}
                    {notification.acknowledgedAt ? "Yes" : "No"}
                    <br />
                    Dismissed: {notification.dismissedAt ? "Yes" : "No"}
                    <br />
                    Resent: {notification.resentCount}
                  </small>
                </td>
                <td>
                  {new Date(notification.createdAt).toLocaleString("en-IN")}
                </td>
                <td>
                  <div className="mnx-admin-activity-list">
                    {notification.activities.slice(0, 6).map((activity) => (
                      <small key={activity.id}>
                        {activity.event} · {activity.actor?.name ?? "System"} ·{" "}
                        {new Date(activity.createdAt).toLocaleString("en-IN")}
                      </small>
                    ))}
                  </div>
                </td>
                <td>
                  <AdminButton
                    size="compact"
                    onClick={async () => {
                      const response = await fetch(
                        `/api/admin/notifications/${notification.id}/resend`,
                        { method: "POST" },
                      );
                      if (!response.ok) {
                        error("Unable to resend notification");
                        return;
                      }
                      success("Notification resent");
                      router.refresh();
                    }}
                  >
                    Resend
                  </AdminButton>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </AdminTable>
    </AdminPanel>
  );
}
