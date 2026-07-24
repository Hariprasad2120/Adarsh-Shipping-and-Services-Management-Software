import Link from "next/link";
import { PortalLoginForm } from "../_components/client-actions";

export default function CustomerPortalLoginPage() {
  return (
    <main className="ds-app-body flex min-h-screen items-center justify-center px-4 py-12">
      <div className="card-top-accent w-full max-w-md rounded-xl border border-outline-variant/60 bg-surface p-6 font-sans shadow-sm space-y-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="ds-brand-mark" aria-hidden="true" />
          <div>
            <h1 className="ds-h1 text-on-surface">
              Monolith Portal
            </h1>
            <p className="ds-label mt-1">
              Customer Secure Authentication
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <PortalLoginForm />
        </div>

        <div className="flex items-center justify-between text-xs pt-2 border-t border-outline-variant/30">
          <Link href="/customer-portal/forgot-password" className="ds-button-outline">
            Forgot Password?
          </Link>
          <span className="text-on-surface-variant">v1.2.0</span>
        </div>
      </div>
    </main>
  );
}
