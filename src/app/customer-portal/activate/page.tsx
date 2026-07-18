import Link from "next/link";
import { PortalActivationForm } from "../_components/client-actions";
import "../portal-styles.css";

export default async function CustomerPortalActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <main className="portal-body flex min-h-screen items-center justify-center px-4 py-12">
      <div className="portal-card w-full max-w-md p-8 relative overflow-hidden font-sans space-y-6">
        <div className="card-top-accent absolute inset-x-0 top-0 h-1 bg-[#00cec4]"></div>
        
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="portal-brand-mark">
            <span></span>
          </div>
          <div>
            <h1 className="text-xl font-bold uppercase font-display tracking-wider text-on-surface">
              Activate Portal
            </h1>
            <p className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold mt-1">
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
              <p className="text-xs text-on-surface-variant mt-1">Please use the secure link sent to your email.</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs pt-2 border-t border-outline-variant/30">
          <Link href="/customer-portal/login" className="text-[#00cec4] hover:underline font-semibold uppercase tracking-wider">
            Back to Sign In
          </Link>
          <span className="text-on-surface-variant">v1.2.0</span>
        </div>
      </div>
    </main>
  );
}
