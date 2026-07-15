import Link from "next/link";
import { PortalLoginForm } from "../_components/client-actions";

export default function CustomerPortalLoginPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-on-surface">
      <div className="mx-auto max-w-md rounded-2xl border border-outline-variant/60 bg-surface p-6 shadow-sm">
        <p className="ds-label">Monolith Customer Portal</p>
        <h1 className="ds-h2 mt-2">Sign In</h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          Access your CHA shipment tracking, documents, checklist approvals, and notifications.
        </p>
        <div className="mt-6">
          <PortalLoginForm />
        </div>
        <div className="mt-4 flex items-center justify-between text-sm">
          <Link href="/customer-portal/forgot-password" className="text-[#00cec4] hover:underline">
            Forgot password
          </Link>
        </div>
      </div>
    </main>
  );
}
