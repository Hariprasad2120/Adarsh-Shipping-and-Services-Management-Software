import Link from "next/link";
import { PortalActivationForm } from "@/modules/customer-portal/components/client-actions";

export default async function CustomerPortalActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <main className="monolith-app-body flex min-h-screen items-center justify-center px-4 py-12">
      <div className="monolith-card monolith-accent w-full max-w-md rounded-xl border border-mono-border/60 bg-mono-card p-6 font-sans shadow-sm space-y-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="monolith-brand-mark" aria-hidden="true" />
          <div>
            <h1 className="monolith-h1 text-mono-text">
              Activate Portal
            </h1>
            <p className="monolith-label mt-1">
              Create your secure credentials
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {token ? (
            <PortalActivationForm token={token} />
          ) : (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
              <p className="text-sm font-semibold text-red-500">Missing activation token.</p>
              <p className="text-xs text-mono-muted mt-1">Please use the secure link sent to your email.</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs pt-2 border-t border-mono-border/30">
          <Link href="/customer-portal/login" className="monolith-button-outline">
            Back to Sign In
          </Link>
          <span className="text-mono-muted">v1.2.0</span>
        </div>
      </div>
    </main>
  );
}
