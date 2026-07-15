import { PortalActivationForm } from "../_components/client-actions";

export default async function CustomerPortalActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-on-surface">
      <div className="mx-auto max-w-md rounded-2xl border border-outline-variant/60 bg-surface p-6 shadow-sm">
        <p className="ds-label">Portal Activation</p>
        <h1 className="ds-h2 mt-2">Activate Account</h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          Create your password to complete portal access.
        </p>
        <div className="mt-6">
          {token ? <PortalActivationForm token={token} /> : <p className="text-sm text-red-500">Missing activation token.</p>}
        </div>
      </div>
    </main>
  );
}
