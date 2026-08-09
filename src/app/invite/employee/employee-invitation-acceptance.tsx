"use client";

import {
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  MailCheck,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PublicActions,
  PublicBrand,
  PublicFooter,
  PublicHeader,
  PublicInset,
  PublicMonolithShell,
  PublicPanel,
  PublicStage,
  PublicStatus,
  WorkspaceBadge,
  WorkspaceField,
} from "@/components/monolith";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
      setError(
        "Complete the password requirements and make sure both passwords match.",
      );
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
    <PublicMonolithShell data-public-route="employee-invitation">
      <PublicBrand subtitle="Employee onboarding" />
      <PublicStage className="mnx-public-stage-compact">
        <PublicPanel className="mnx-public-form-panel">
          <PublicHeader
            eyebrow="Workspace invitation"
            icon={<MailCheck />}
            title="Join your organisation"
            description="Validate your secure invitation and create the password for your employee workspace."
          />

          {loading ? (
            <div className="mnx-public-panel-content">
              <PublicStatus
                tone="info"
                eyebrow="Invitation validation"
                icon={<LoaderCircle className="mnx-public-spinner" />}
                title="Checking your secure invitation"
                description="Monolith is confirming the invitation and organisation assignment."
              />
            </div>
          ) : details ? (
            <form className="mnx-public-form" onSubmit={acceptInvitation}>
              <PublicInset>
                <p>
                  Hello <strong>{details.employeeName}</strong>, you have been
                  invited to join <strong>{details.organisationName}</strong> on
                  Monolith.
                </p>
                <small>{details.email}</small>
              </PublicInset>

              <div className="mnx-public-form-grid">
                <WorkspaceField
                  htmlFor="password"
                  label="Create password"
                  required
                >
                  <div className="mnx-public-password-field">
                    <Input
                      autoComplete="new-password"
                      id="password"
                      onChange={(event) => setPassword(event.target.value)}
                      type={showPassword ? "text" : "password"}
                      value={password}
                    />
                    <Button
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="mnx-public-password-toggle"
                      mode="icon"
                      onClick={() => setShowPassword((current) => !current)}
                      type="button"
                      variant="outline"
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </Button>
                  </div>
                </WorkspaceField>

                <WorkspaceField
                  htmlFor="confirm-password"
                  label="Confirm password"
                  required
                >
                  <Input
                    autoComplete="new-password"
                    id="confirm-password"
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                  />
                </WorkspaceField>
              </div>

              <div
                className="mnx-public-form-grid"
                aria-label="Password requirements"
              >
                {passwordChecks.map((check) => (
                  <WorkspaceBadge
                    key={check.label}
                    variant={check.valid ? "success" : "neutral"}
                  >
                    <Check aria-hidden="true" />
                    {check.label}
                  </WorkspaceBadge>
                ))}
                <WorkspaceBadge
                  variant={
                    confirmPassword && password === confirmPassword
                      ? "success"
                      : "neutral"
                  }
                >
                  <Check aria-hidden="true" />
                  Passwords match
                </WorkspaceBadge>
              </div>

              {error ? (
                <PublicStatus
                  tone="danger"
                  eyebrow="Invitation error"
                  icon={<ShieldCheck />}
                  title={error}
                />
              ) : null}

              <PublicActions>
                <Button
                  className="mnx-public-primary-action"
                  disabled={submitting || !passwordValid}
                  type="submit"
                >
                  <ShieldCheck aria-hidden="true" />
                  {submitting ? "Preparing workspace…" : "Accept and join"}
                </Button>
              </PublicActions>
            </form>
          ) : (
            <div className="mnx-public-panel-content">
              <PublicStatus
                tone="danger"
                eyebrow="Invitation unavailable"
                icon={<ShieldCheck />}
                title={error}
                description="Ask your HR team to send a new invitation."
              />
            </div>
          )}
        </PublicPanel>
      </PublicStage>
      <PublicFooter>
        Secure employee onboarding · Monolith identity services
      </PublicFooter>
    </PublicMonolithShell>
  );
}
