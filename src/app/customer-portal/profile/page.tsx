import { requirePortalSession } from "@/modules/customer-portal/auth";
import { PortalPlaceholder } from "@/modules/customer-portal/components/portal-placeholder";

export default async function CustomerPortalProfilePage() {
  await requirePortalSession();

  return (
    <PortalPlaceholder
      title="Profile"
      description="Customer profile preferences and account detail views were removed as part of the portal reset. This page now serves as a clean rebuild target."
    />
  );
}
