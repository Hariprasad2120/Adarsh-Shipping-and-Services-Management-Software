"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LogIn,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";
import { signIn } from "next-auth/react";
import {
  Button,
  Input,
  PublicActions,
  PublicBrand,
  PublicFooter,
  PublicHeader,
  PublicInset,
  PublicMonolithShell,
  PublicPanel,
  PublicStage,
  PublicStatus,
  PublicStatusBadge,
  WorkspaceCheckbox,
  WorkspaceField,
} from "@/components/monolith";
import { clearStaleSessionData } from "@/lib/logout";
import { isRootControlEmail } from "@/lib/root-access";
import { DEFAULT_CALLBACK_URL, SUCCESS_TRANSITION_MS } from "./login-scene.config";

type SubmitState = "idle" | "loading" | "success";

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function getSafeCallbackUrl(identifier: string) {
  const requestedCallbackUrl = new URLSearchParams(window.location.search).get(
    "callbackUrl",
  );
  const fallbackTarget = isRootControlEmail(identifier)
    ? "/"
    : DEFAULT_CALLBACK_URL;
  return requestedCallbackUrl?.startsWith("/")
    ? requestedCallbackUrl
    : fallbackTarget;
}

function getSameOriginRedirectUrl(
  url: string | null | undefined,
  fallbackUrl: string,
) {
  if (!url) return fallbackUrl;
  if (url.startsWith("/")) return url;

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.origin === window.location.origin
      ? `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
      : fallbackUrl;
  } catch {
    return fallbackUrl;
  }
}

export function MonolithLogisticsLogin() {
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [message, setMessage] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const busy = submitState !== "idle";

  useEffect(() => {
    clearStaleSessionData();
  }, []);

  function resetSubmitState() {
    setMessage("");
    if (submitState !== "idle") setSubmitState("idle");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const normalizedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setMessage("Enter a valid work email.");
      emailInputRef.current?.focus({ preventScroll: true });
      return;
    }

    if (!password) {
      setMessage("Enter your password.");
      passwordInputRef.current?.focus({ preventScroll: true });
      return;
    }

    setMessage("");
    setSubmitState("loading");

    const callbackUrl = getSafeCallbackUrl(normalizedEmail);
    let result: Awaited<ReturnType<typeof signIn>> | undefined;

    try {
      result = await signIn("credentials", {
        email: normalizedEmail,
        password,
        rememberMe: remember ? "true" : "false",
        redirect: false,
        callbackUrl,
      });
    } catch {
      result = undefined;
    }

    if (!result || result.error) {
      setSubmitState("idle");
      passwordInputRef.current?.focus({ preventScroll: true });
      setMessage("Sign in failed. Check your credentials and try again.");
      return;
    }

    clearStaleSessionData();
    setSubmitState("success");
    await wait(SUCCESS_TRANSITION_MS);
    window.location.replace(getSameOriginRedirectUrl(result.url, callbackUrl));
  }

  return (
    <PublicMonolithShell data-public-route="login" data-monolith-login>
      <PublicBrand subtitle="Intelligent logistics" />

      <PublicStage className="mnx-auth-stage">
        <section className="mnx-auth-introduction" aria-label="Platform overview">
          <div className="mnx-auth-introduction-copy">
            <PublicStatusBadge tone="accent">Secure operations access</PublicStatusBadge>
            <h1>One command centre for every moving part.</h1>
            <p>
              Sign in to manage shipments, people, finance, communication, and
              customer operations with your assigned permissions.
            </p>
          </div>

          <div className="mnx-auth-graphic" aria-hidden="true">
            <span>
              <PackageCheck />
            </span>
            <i />
            <i />
            <i />
          </div>

          <div className="mnx-auth-assurance">
            <span><ShieldCheck /> Role-aware access</span>
            <span><KeyRound /> Protected sessions</span>
          </div>
        </section>

        <PublicPanel className="mnx-auth-form-panel">
          <PublicHeader
            eyebrow="Account access"
            icon={submitState === "success" ? <Check /> : <LogIn />}
            title={submitState === "success" ? "Access granted" : "Welcome back"}
            description={
              submitState === "success"
                ? "Your workspace is ready. Redirecting now."
                : "Enter your Monolith credentials to continue."
            }
          />

          <form className="mnx-public-form" onSubmit={handleSubmit} noValidate>
            <WorkspaceField htmlFor="login-email" label="Email address" required>
              <Input
                ref={emailInputRef}
                id="login-email"
                type="email"
                name="email"
                autoComplete="username"
                inputMode="email"
                placeholder="name@company.com"
                value={email}
                disabled={busy}
                aria-invalid={Boolean(message && !email.includes("@"))}
                aria-describedby={message ? "login-message" : undefined}
                onChange={(event) => {
                  setEmail(event.target.value);
                  resetSubmitState();
                }}
              />
            </WorkspaceField>

            <WorkspaceField htmlFor="login-password" label="Password" required>
              <div className="mnx-public-password-field">
                <Input
                  ref={passwordInputRef}
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  disabled={busy}
                  aria-invalid={Boolean(message && !password)}
                  aria-describedby={message ? "login-message" : undefined}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    resetSubmitState();
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  mode="icon"
                  className="mnx-public-password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((visible) => !visible)}
                  disabled={busy}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            </WorkspaceField>

            <div className="mnx-auth-options">
              <WorkspaceCheckbox
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                disabled={busy}
                label="Remember me"
              />
              <a href="/forgot-password" className="mnx-public-text-link">
                Forgot password?
              </a>
            </div>

            {message ? (
              <PublicStatus
                id="login-message"
                tone="danger"
                eyebrow="Sign-in error"
                icon={<KeyRound />}
                title={message}
              />
            ) : null}

            <PublicActions>
              <Button type="submit" disabled={busy} className="mnx-public-primary-action">
                {submitState === "loading" ? (
                  <>
                    <LoaderCircle className="mnx-public-spinner" />
                    Verifying access
                  </>
                ) : submitState === "success" ? (
                  <>
                    <Check />
                    Access granted
                  </>
                ) : (
                  <>
                    Log in
                    <ArrowRight />
                  </>
                )}
              </Button>
            </PublicActions>

            <div className="mnx-public-divider"><span>or continue with</span></div>

            <Button
              variant="outline"
              className="mnx-public-primary-action"
              type="button"
              disabled={busy}
              onClick={() =>
                void signIn("google", {
                  callbackUrl: getSafeCallbackUrl(email.trim()),
                })
              }
            >
              <span className="mnx-auth-sso-mark" aria-hidden="true">G</span>
              Log in with SSO
            </Button>

            <PublicInset className="mnx-auth-request-access">
              <span>Don&apos;t have access?</span>
              <a href="/request-access" className="mnx-public-text-link">
                Request access
              </a>
            </PublicInset>
          </form>
        </PublicPanel>
      </PublicStage>

      <PublicFooter>
        Protected by Monolith session security and organisation access controls.
      </PublicFooter>
    </PublicMonolithShell>
  );
}
