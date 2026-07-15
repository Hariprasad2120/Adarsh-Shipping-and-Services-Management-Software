import { requirePortalSession } from "@/modules/customer-portal/auth";
import { listPortalNotifications } from "@/modules/customer-portal/service";
import { PortalMarkAllReadButton } from "../_components/client-actions";

export default async function CustomerPortalNotificationsPage() {
  const session = await requirePortalSession();
  const notifications = await listPortalNotifications(session.portalUserId);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-xl border border-outline-variant/60 bg-surface p-5 shadow-sm">
        <div>
          <h2 className="ds-h2">Notifications</h2>
          <p className="mt-2 text-sm text-on-surface-variant">Recent shipment, document, checklist, and query updates.</p>
        </div>
        <PortalMarkAllReadButton />
      </div>
      <div className="space-y-4">
        {notifications.map((notification) => (
          <div key={notification.id} className="rounded-xl border border-outline-variant/60 bg-surface p-5 shadow-sm">
            <p className="text-sm font-medium">{notification.title}</p>
            <p className="mt-1 text-xs text-on-surface-variant">{notification.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
