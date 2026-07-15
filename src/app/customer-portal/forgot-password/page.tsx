import { PortalActivationForm, PortalForgotPasswordRequestForm } from "../_components/client-actions";

export default async function CustomerPortalForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-on-surface">
      <div className="mx-auto max-w-md rounded-2xl border border-outline-variant/60 bg-surface p-6 shadow-sm">
        <p className="ds-label">Portal Security</p>
        <h1 className="ds-h2 mt-2">{token ? "Reset Password" : "Forgot Password"}</h1>
        <div className="mt-6">
          {token ? <PortalActivationForm token={token} reset /> : <PortalForgotPasswordRequestForm />}
        </div>
      </div>
    </main>
  );
}
