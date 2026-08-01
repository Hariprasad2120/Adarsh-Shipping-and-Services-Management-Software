import Link from "next/link";
import { CustomerPortalAuth } from "@/components/monolith/customer-portal-workspace";
import { PublicStatus } from "@/modules/auth/components/public-workspace";
import { TriangleAlert } from "lucide-react";
import { PortalActivationForm } from "@/modules/customer-portal/components/client-actions";

export default async function CustomerPortalActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <CustomerPortalAuth
      eyebrow="Portal activation"
      title="Create your credentials"
      description="Activate the invited customer contact and protect this workspace with a strong password."
      footer={
        <>
          <Link
            href="/customer-portal/login"
            className="mnx-button mnx-button-outline"
          >
            Back to Sign In
          </Link>
          <span>Single-use secure link</span>
        </>
      }
    >
      {token ? (
        <PortalActivationForm token={token} />
      ) : (
        <PublicStatus
          tone="danger"
          eyebrow="Activation unavailable"
          title="Missing activation token"
          description="Use the complete secure link sent to your email."
          icon={<TriangleAlert size={18} />}
        />
      )}
    </CustomerPortalAuth>
  );
}
