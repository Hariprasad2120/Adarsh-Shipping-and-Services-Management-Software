import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default function EmployeeWorkspaceReadyPage() {
  return (
    <main className="min-h-screen bg-mono-bg px-4 py-16 text-mono-text">
      <section className="mnx-panel mx-auto w-full max-w-xl p-8 text-center sm:p-12">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]">
          <CheckCircle2 className="size-8" aria-hidden="true" />
        </span>
        <p className="mnx-dashboard-spec-label mt-6">Invitation accepted</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight">
          Your workspace is ready
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-mono-muted">
          Thank you for joining. Sign in with your work email and the password
          you just created, then complete your employee profile from My
          Profile.
        </p>
        <Link
          className="mnx-button mnx-button-primary mt-8 inline-flex"
          href="/login"
        >
          Continue to sign in
        </Link>
      </section>
    </main>
  );
}
