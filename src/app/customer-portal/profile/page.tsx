import { requirePortalSession } from "@/modules/customer-portal/auth";
import { getCustomerPortalProfile } from "@/modules/customer-portal/service";
import { PortalPreferenceForm } from "../_components/client-actions";

export default async function CustomerPortalProfilePage() {
  const session = await requirePortalSession();
  const profile = await getCustomerPortalProfile(session.portalUserId);
  const preferences = profile.notificationPreference ?? {
    shipmentUpdatesEmail: true,
    documentUpdatesEmail: true,
    checklistEmail: true,
    queryEmail: true,
    ratingEmail: true,
    pushEnabled: false,
  };
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="rounded-xl border border-outline-variant/60 bg-surface p-5 shadow-sm">
        <h2 className="ds-h2">Profile</h2>
        <div className="mt-4 space-y-3 text-sm">
          <p><span className="ds-label">Name</span><br />{profile.name}</p>
          <p><span className="ds-label">Email</span><br />{profile.email}</p>
          <p><span className="ds-label">Designation</span><br />{profile.designation ?? "Customer contact"}</p>
        </div>
      </div>
      <div className="rounded-xl border border-outline-variant/60 bg-surface p-5 shadow-sm">
        <h2 className="ds-h2">Notification Preferences</h2>
        <div className="mt-4">
          <PortalPreferenceForm initial={preferences} />
        </div>
      </div>
    </div>
  );
}
