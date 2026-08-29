import Link from "next/link";
import { CustomerPortalAuth } from "@/components/monolith";
import {
  PortalActivationForm,
  PortalForgotPasswordRequestForm,
} from "@/modules/customer-portal/components/client-actions";

export default async function CustomerPortalForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <CustomerPortalAuth
      eyebrow={token ? "Password reset" : "Access recovery"}
      title={token ? "Choose a new password" : "Recover portal access"}
      description={
        token
          ? "Enter a new password to finish the secure recovery flow."
          : "Request a password reset link for an activated customer contact."
      }
      footer={
        <>
          <Link
            href="/customer-portal/login"
            className="mnx-button mnx-button-outline"
          >
            Back to Sign In
          </Link>
          <span>Privacy-preserving recovery</span>
        </>
      }
    >
      {token ? (
        <PortalActivationForm token={token} reset />
      ) : (
        <PortalForgotPasswordRequestForm />
      )}
    </CustomerPortalAuth>
  );
}
