"use client";

import { Check, Eye, EyeOff, MailCheck, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MonolithAction } from "@/components/monolith/foundation";
import { Input } from "@/components/monolith/input";

type InvitationDetails = {
  employeeName: string;
  email: string;
  organisationName: string;
  expiresAt: string;
};

export function EmployeeInvitationAcceptance({ token }: { token: string }) {
  const router = useRouter();
  const [details, setDetails] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadInvitation() {
      if (!token) {
        setError("This invitation link is invalid or has expired");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/hrms/invitations/accept?token=${encodeURIComponent(token)}`,
          { cache: "no-store" },
        );
        const result = await response.json();
        if (!response.ok || !result.ok) {
          throw new Error(result.error || "Unable to load invitation");
        }
        if (active) setDetails(result.data);
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "This invitation link is invalid or has expired",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadInvitation();
    return () => {
      active = false;
    };
  }, [token]);

  const passwordChecks = useMemo(
    () => [
      { label: "12 or more characters", valid: password.length >= 12 },
      { label: "One uppercase letter", valid: /[A-Z]/.test(password) },
      { label: "One lowercase letter", valid: /[a-z]/.test(password) },
      { label: "One number", valid: /[0-9]/.test(password) },
    ],
    [password],
  );
  const passwordValid =
    passwordChecks.every((check) => check.valid) &&
    password === confirmPassword;

  async function acceptInvitation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordValid) {
      setError("Complete the password requirements and make sure both passwords match.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/hrms/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Unable to accept invitation");
      }

      router.replace("/invite/employee/ready");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to accept invitation",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-mono-bg px-4 py-10 text-mono-text sm:py-16">
      <section className="mnx-panel mx-auto w-full max-w-xl overflow-hidden">
        <div className="border-b border-mono-border bg-mono-soft px-6 py-6 sm:px-8">
          <div className="flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--mnx-accent)] text-[var(--mnx-text)]">
              <MailCheck className="size-6" aria-hidden="true" />
            </span>
            <div>
              <p className="mnx-dashboard-spec-label">Workspace invitation</p>
              <h1 className="mt-1 text-2xl font-medium tracking-tight">
                Join your organisation
              </h1>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {loading ? (
            <div className="py-14 text-center text-sm text-mono-muted">
              Validating your secure invitation…
            </div>
          ) : details ? (
            <form className="space-y-6" onSubmit={acceptInvitation}>
              <div className="rounded-2xl border border-mono-border bg-mono-soft p-5">
                <p className="text-sm leading-relaxed text-mono-muted">
                  Hello{" "}
                  <strong className="font-medium text-mono-text">
                    {details.employeeName}
                  </strong>
                  , you have been invited to join{" "}
                  <strong className="font-medium text-mono-text">
                    {details.organisationName}
                  </strong>{" "}
                  on Monolith.
                </p>
                <p className="mt-3 text-xs text-mono-muted">{details.email}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="password">
                  Create password
                </label>
                <div className="relative">
                  <Input
                    autoComplete="new-password"
                    className="pr-12"
                    id="password"
                    onChange={(event) => setPassword(event.target.value)}
                    type={showPassword ? "text" : "password"}
                    value={password}
                  />
                  <button
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-mono-muted transition hover:text-mono-text"
                    onClick={() => setShowPassword((current) => !current)}
                    type="button"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="confirm-password"
                >
                  Confirm password
                </label>
                <Input
                  autoComplete="new-password"
                  id="confirm-password"
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {passwordChecks.map((check) => (
                  <span
                    className={
                      check.valid
                        ? "flex items-center gap-2 text-xs text-[var(--mnx-success)]"
                        : "flex items-center gap-2 text-xs text-mono-muted"
                    }
                    key={check.label}
                  >
                    <Check className="size-3.5" aria-hidden="true" />
                    {check.label}
                  </span>
                ))}
                <span
                  className={
                    confirmPassword && password === confirmPassword
                      ? "flex items-center gap-2 text-xs text-[var(--mnx-success)]"
                      : "flex items-center gap-2 text-xs text-mono-muted"
                  }
                >
                  <Check className="size-3.5" aria-hidden="true" />
                  Passwords match
                </span>
              </div>

              {error ? (
                <p
                  className="rounded-2xl border border-[var(--mnx-danger)]/30 bg-[var(--mnx-danger-bg)] px-4 py-3 text-sm text-[var(--mnx-danger)]"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}

              <MonolithAction
                className="w-full justify-center"
                disabled={submitting || !passwordValid}
                type="submit"
                variant="primary"
              >
                <ShieldCheck className="size-4" aria-hidden="true" />
                {submitting ? "Preparing workspace…" : "Accept and join"}
              </MonolithAction>
            </form>
          ) : (
            <div className="py-10 text-center">
              <p className="text-base font-medium">Invitation unavailable</p>
              <p className="mt-2 text-sm text-mono-muted">{error}</p>
              <p className="mt-5 text-xs text-mono-muted">
                Ask your HR team to send a new invitation.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
