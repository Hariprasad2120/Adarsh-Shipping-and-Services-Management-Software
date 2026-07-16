import { requirePortalSession } from "@/modules/customer-portal/auth";
import { PortalPlaceholder } from "../_components/portal-placeholder";

export default async function CustomerPortalNotificationsPage() {
  await requirePortalSession();

  return (
    <PortalPlaceholder
      title="Notifications"
      description="The notification feed and read-state logic were removed with the old portal implementation. This page is ready to be rebuilt with the new model."
    />
  );
}
