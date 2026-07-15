import { PortalSecurityForm } from "../_components/client-actions";

export default function CustomerPortalSecurityPage() {
  return (
    <div className="rounded-xl border border-outline-variant/60 bg-surface p-5 shadow-sm">
      <h2 className="ds-h2">Security</h2>
      <p className="mt-2 text-sm text-on-surface-variant">
        Change your password and revoke other active sessions.
      </p>
      <div className="mt-4">
        <PortalSecurityForm />
      </div>
    </div>
  );
}
