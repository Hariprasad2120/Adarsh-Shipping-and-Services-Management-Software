import Link from "next/link";
import { CustomerPortalAuth } from "@/components/monolith/customer-portal-workspace";
import { PortalLoginForm } from "@/modules/customer-portal/components/client-actions";

export default function CustomerPortalLoginPage() {
  return (
    <CustomerPortalAuth
      eyebrow="Customer secure authentication"
      title="Welcome back"
      description="Sign in to review shipments, documents, approvals, and customer-safe CHA updates."
      footer={
        <>
          <Link
            href="/customer-portal/forgot-password"
            className="mnx-button mnx-button-outline"
          >
            Forgot Password?
          </Link>
          <span>Protected customer access</span>
        </>
      }
    >
      <PortalLoginForm />
    </CustomerPortalAuth>
  );
}
