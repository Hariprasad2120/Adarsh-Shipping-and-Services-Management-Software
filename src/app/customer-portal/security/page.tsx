import { requirePortalSession } from "@/modules/customer-portal/auth";
import { PortalPlaceholder } from "@/modules/customer-portal/components/portal-placeholder";

export default async function CustomerPortalSecurityPage() {
  await requirePortalSession();

  return (
    <PortalPlaceholder
      title="Security"
      description="Password management and multi-session controls were removed with the old portal feature set. This route stays in place so the new security flow can be rebuilt intentionally."
    />
  );
}
