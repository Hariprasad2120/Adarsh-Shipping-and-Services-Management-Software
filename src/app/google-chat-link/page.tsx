"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Link2,
  LoaderCircle,
  LogIn,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicActions, PublicBrand, PublicFooter, PublicHeader, PublicInset, PublicMonolithShell, PublicPanel, PublicStage, PublicStatus, PublicStatusBadge } from "@/modules/auth/components/public-workspace";

type Phase = "loading" | "confirm" | "submitting" | "success" | "error";
type TokenInfo = { googleEmail?: string; googleDisplayName?: string } | null;
type LinkErrorCode =
  | "GOOGLE_ACCOUNT_ALREADY_LINKED"
  | "USER_ALREADY_LINKED_OTHER_GOOGLE";

const STATUS_COPY = [
  "Verifying secure handoff",
  "Checking Google Chat identity",
  "Preparing Monolith account link",
];

async function readJsonSafe<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function LinkPageContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [errorCode, setErrorCode] = useState<LinkErrorCode | null>(null);
  const [canReplace, setCanReplace] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo>(null);
  const [attempt, setAttempt] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);

  const resolvedPhase: Phase = token ? phase : "error";
  const resolvedError =
    errorMsg ||
    "No linking token found. Go back to Google Chat and run /connect again.";

  useEffect(() => {
    if (resolvedPhase !== "loading" && resolvedPhase !== "submitting") return;
    const timer = window.setInterval(() => {
      setStatusIndex((current) => (current + 1) % STATUS_COPY.length);
    }, 1400);
    return () => window.clearInterval(timer);
  }, [resolvedPhase]);

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 9000);

    async function verifyToken() {
      setPhase("loading");
      setErrorMsg("");
      setErrorCode(null);
      setCanReplace(false);

      try {
        const response = await fetch(
          `/api/google-chat/link?token=${encodeURIComponent(token || "")}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const payload = await readJsonSafe<{
          valid?: boolean;
          error?: string;
          googleEmail?: string;
          googleDisplayName?: string;
        }>(response);

        if (!response.ok || !payload?.valid) {
          throw new Error(
            payload?.error ??
              "This link is invalid or expired. Run /connect in Google Chat for a fresh link.",
          );
        }

        setTokenInfo({
          googleEmail: payload.googleEmail,
          googleDisplayName: payload.googleDisplayName,
        });
        setPhase("confirm");
      } catch (error) {
        setErrorMsg(
          controller.signal.aborted
            ? "Verification took too long. The hosted app or database may be temporarily slow."
            : error instanceof Error
              ? error.message
              : "Could not verify the link token.",
        );
        setPhase("error");
      } finally {
        window.clearTimeout(timeout);
      }
    }

    void verifyToken();
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [token, attempt]);

  const loginUrl = `/login?callbackUrl=${encodeURIComponent(
    `/google-chat-link?token=${token ?? ""}`,
  )}`;

  async function submitLink(replaceExisting: boolean) {
    if (!token) return;

    setPhase("submitting");
    setErrorMsg("");
    setErrorCode(null);
    setCanReplace(false);

    try {
      const response = await fetch("/api/google-chat/link", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, replaceExisting }),
      });

      const payload = await readJsonSafe<{
        success?: boolean;
        error?: string;
        loginUrl?: string;
        code?: LinkErrorCode;
        canReplace?: boolean;
      }>(response);

      if (response.status === 401) {
        router.push(payload?.loginUrl ?? loginUrl);
        return;
      }

      if (!response.ok || !payload?.success) {
        setErrorCode(payload?.code ?? null);
        setCanReplace(payload?.canReplace === true);
        throw new Error(
          payload?.error ?? "Could not complete account linking.",
        );
      }

      setPhase("success");
    } catch (error) {
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "Could not complete account linking.",
      );
      setPhase("error");
    }
  }

  const phaseBadge =
    resolvedPhase === "loading"
      ? "Loading"
      : resolvedPhase === "confirm"
        ? "Ready"
        : resolvedPhase === "submitting"
          ? "Linking"
          : resolvedPhase === "success"
            ? "Linked"
            : "Attention";
  const phaseTone =
    resolvedPhase === "success"
      ? "success"
      : resolvedPhase === "error"
        ? "danger"
        : resolvedPhase === "confirm"
          ? "accent"
          : "neutral";

  return (
    <PublicMonolithShell data-public-route="google-chat-link">
      <PublicBrand subtitle="Google Chat identity bridge" />

      <PublicStage className="mnx-public-stage-narrow">
        <PublicPanel>
          <PublicHeader
            badge={
              <PublicStatusBadge tone={phaseTone}>
                {phaseBadge}
              </PublicStatusBadge>
            }
            eyebrow="Monolith AI assistant"
            icon={<Link2 />}
            title="Link your account"
            description="Connect your Google Chat identity to the signed-in Monolith account."
          />

          <div className="mnx-public-panel-content">
            {(resolvedPhase === "loading" ||
              resolvedPhase === "submitting") && (
              <PublicStatus
                tone="info"
                eyebrow={
                  resolvedPhase === "loading"
                    ? "Secure handoff"
                    : "Identity bridge"
                }
                icon={<LoaderCircle className="mnx-public-spinner" />}
                title={
                  resolvedPhase === "loading"
                    ? STATUS_COPY[statusIndex]
                    : "Finalising the identity link"
                }
                description="Keep this window open while the protected request completes."
              />
            )}

            {resolvedPhase === "confirm" && (
              <>
                <PublicInset className="mnx-public-identity">
                  <span className="mnx-public-inset-icon"><Link2 /></span>
                  <span>
                    <small>Google Chat identity</small>
                    <strong>
                      {tokenInfo?.googleDisplayName ??
                        tokenInfo?.googleEmail ??
                        "Your Google account"}
                    </strong>
                    {tokenInfo?.googleEmail ? (
                      <em>{tokenInfo.googleEmail}</em>
                    ) : null}
                  </span>
                </PublicInset>

                <PublicStatus
                  tone="info"
                  eyebrow="Privacy boundary"
                  icon={<ShieldCheck />}
                  title="Your Google password is never stored"
                  description="Only the Google Chat identity is linked to the Monolith user currently signed in on this browser."
                />

                <PublicActions>
                  <Button
                    className="mnx-public-primary-action"
                    onClick={() => void submitLink(false)}
                  >
                    Link my Monolith account
                    <ArrowRight />
                  </Button>
                  <Button
                    variant="outline"
                    className="mnx-public-primary-action"
                    onClick={() => router.push(loginUrl)}
                  >
                    <LogIn />
                    Sign in as a different user
                  </Button>
                </PublicActions>
              </>
            )}

            {resolvedPhase === "success" && (
              <>
                <PublicStatus
                  tone="success"
                  eyebrow="Identity bridge active"
                  icon={<CheckCircle2 />}
                  title="Accounts linked"
                  description="The assistant can now resolve your Google Chat identity using your Monolith permissions and context."
                />
                <PublicActions>
                  <Button
                    className="mnx-public-primary-action"
                    onClick={() => router.push("/")}
                  >
                    Open Monolith
                    <ArrowRight />
                  </Button>
                </PublicActions>
              </>
            )}

            {resolvedPhase === "error" && (
              <>
                <PublicStatus
                  tone="danger"
                  eyebrow="Link could not finish"
                  icon={<AlertCircle />}
                  title={resolvedError}
                  description="Request a fresh handoff from Google Chat if this link has expired."
                />
                <PublicActions>
                  {token ? (
                    <Button
                      className="mnx-public-primary-action"
                      onClick={() => setAttempt((current) => current + 1)}
                    >
                      <RefreshCw />
                      Retry verification
                    </Button>
                  ) : null}
                  {errorCode === "USER_ALREADY_LINKED_OTHER_GOOGLE" &&
                  canReplace ? (
                    <Button
                      className="mnx-public-primary-action"
                      onClick={() => void submitLink(true)}
                    >
                      <Link2 />
                      Replace existing Google link
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    className="mnx-public-primary-action"
                    onClick={() => router.push(loginUrl)}
                  >
                    <LogIn />
                    Open Monolith login
                  </Button>
                </PublicActions>
              </>
            )}
          </div>

          <PublicInset className="mnx-public-link-help">
            Need a fresh link? Return to Google Chat and run
            <code>/connect</code>.
          </PublicInset>
        </PublicPanel>
      </PublicStage>

      <PublicFooter>Secure link powered by Monolith Engine.</PublicFooter>
    </PublicMonolithShell>
  );
}

function GoogleChatLinkFallback() {
  return (
    <PublicMonolithShell data-public-route="google-chat-link" aria-busy="true">
      <PublicBrand subtitle="Google Chat identity bridge" />
      <PublicStage className="mnx-public-stage-narrow">
        <PublicPanel className="mnx-public-state-panel">
          <PublicStatus
            tone="info"
            eyebrow="Secure handoff"
            icon={<LoaderCircle className="mnx-public-spinner" />}
            title="Preparing identity link"
          />
        </PublicPanel>
      </PublicStage>
    </PublicMonolithShell>
  );
}

export default function GoogleChatLinkPage() {
  return (
    <Suspense fallback={<GoogleChatLinkFallback />}>
      <LinkPageContent />
    </Suspense>
  );
}
