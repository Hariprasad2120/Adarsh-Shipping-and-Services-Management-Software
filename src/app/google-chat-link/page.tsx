"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Link2,
  Loader2,
  LogIn,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fonts } from "@/lib/design-tokens";

type Phase = "loading" | "confirm" | "submitting" | "success" | "error";
type TokenInfo = { googleEmail?: string; googleDisplayName?: string } | null;

const STATUS_COPY = [
  "Verifying secure handoff...",
  "Checking Google Chat identity...",
  "Preparing Monolith account link...",
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

function BrandMark() {
  return (
    <div className="space-y-4 text-center">
      <motion.div
        className="relative mx-auto flex h-18 w-18 items-center justify-center rounded-[28px] border border-white/10 bg-white/[0.04] shadow-2xl"
        animate={{
          boxShadow: [
            "0 18px 40px -26px rgba(0,0,0,0.65)",
            "0 24px 52px -22px rgba(0,206,196,0.22)",
            "0 18px 40px -26px rgba(0,0,0,0.65)",
          ],
          y: [0, -5, 0],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_top,rgba(0,206,196,0.18),transparent_60%)]" />
        <div className="absolute inset-2 rounded-[22px] border border-white/8 bg-white/[0.03]" />
        <Sparkles className="relative z-10 size-8 text-[#00cec4]" />
      </motion.div>

      <div className="space-y-1">
        <h1
          className="text-[2.6rem] font-bold uppercase tracking-[-0.05em] text-white"
          style={{ fontFamily: fonts.display }}
        >
          monolith
        </h1>
        <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">
          Google Chat Identity Link
        </p>
      </div>
    </div>
  );
}

function StatusPill({ phase }: { phase: Phase }) {
  const label =
    phase === "loading"
      ? "Loading"
      : phase === "confirm"
        ? "Ready"
        : phase === "submitting"
          ? "Linking"
          : phase === "success"
            ? "Linked"
            : "Error";

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
      <span
        className={`h-2 w-2 rounded-full ${
          phase === "error"
            ? "bg-[#fb923c]"
            : phase === "success"
              ? "bg-[#00cec4]"
              : "bg-[#38bdf8]"
        }`}
      />
      {label}
    </div>
  );
}

function LinkPageContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");

  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [tokenInfo, setTokenInfo] = useState<TokenInfo>(null);
  const [attempt, setAttempt] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);

  const resolvedPhase: Phase = token ? phase : "error";
  const resolvedError =
    errorMsg || "No linking token found. Go back to Google Chat and run /connect again.";

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

      try {
        const response = await fetch(
          `/api/google-chat/link?token=${encodeURIComponent(token)}`,
          {
            cache: "no-store",
            signal: controller.signal,
            headers: { "ngrok-skip-browser-warning": "true" },
          }
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
              "This link is invalid or expired. Run /connect in Google Chat for a fresh link."
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
            ? "Verification took too long. The ngrok tunnel or local app may be asleep."
            : error instanceof Error
              ? error.message
              : "Could not verify the link token."
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
    `/google-chat-link?token=${token ?? ""}`
  )}`;

  const handleConfirm = async () => {
    if (!token) return;

    setPhase("submitting");
    setErrorMsg("");

    try {
      const response = await fetch("/api/google-chat/link", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ token }),
      });

      const payload = await readJsonSafe<{
        success?: boolean;
        error?: string;
        loginUrl?: string;
      }>(response);

      if (response.status === 401) {
        router.push(payload?.loginUrl ?? loginUrl);
        return;
      }

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? "Could not complete account linking.");
      }

      setPhase("success");
    } catch (error) {
      setErrorMsg(
        error instanceof Error ? error.message : "Could not complete account linking."
      );
      setPhase("error");
    }
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: "#151515" }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,206,196,0.09),transparent_28%),radial-gradient(circle_at_bottom,rgba(56,189,248,0.08),transparent_24%)]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)", backgroundSize: "28px 28px" }} />
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-6 py-10">
        <div className="w-full max-w-[600px] space-y-8">
          <BrandMark />

          <div className="relative">
            <div className="absolute -inset-[1px] rounded-[28px] bg-[linear-gradient(135deg,rgba(255,255,255,0.12),rgba(0,206,196,0.18),rgba(255,255,255,0.06))] opacity-70" />
            <Card className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#1b1b1b] text-white shadow-[0_28px_64px_-30px_rgba(0,0,0,0.72)]">
              <div className="border-b border-white/8 px-6 py-5 sm:px-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                      Monolith AI Assistant
                    </p>
                    <h2
                      className="text-[2rem] font-semibold tracking-[-0.04em] text-white"
                      style={{ fontFamily: fonts.display }}
                    >
                      LINK YOUR ACCOUNT
                    </h2>
                    <p className="max-w-md text-sm leading-6 text-white/55">
                      Connect your Google Chat identity to Monolith so the assistant
                      can act with your permissions and your context.
                    </p>
                  </div>
                  <StatusPill phase={resolvedPhase} />
                </div>
              </div>

              <CardContent className="space-y-6 px-6 py-6 sm:px-8 sm:py-7">
                <AnimatePresence mode="wait">
                  {resolvedPhase === "loading" && (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-4"
                    >
                      <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex items-center gap-3">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
                            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
                          >
                            <Loader2 size={18} className="text-[#00cec4]" />
                          </motion.div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                              Secure Handoff
                            </p>
                            <p className="mt-1 text-sm text-white/78">
                              {STATUS_COPY[statusIndex]}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {[0, 1, 2].map((line) => (
                          <motion.div
                            key={line}
                            className="h-14 rounded-[18px] bg-white/[0.04]"
                            animate={{ opacity: [0.3, 0.75, 0.3] }}
                            transition={{ duration: 1.25, delay: line * 0.08, repeat: Infinity }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {resolvedPhase === "confirm" && (
                    <motion.div
                      key="confirm"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-5"
                    >
                      <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                            <Link2 size={18} className="text-[#00cec4]" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                              Google Chat identity
                            </p>
                            <p className="text-base font-medium text-white">
                              {tokenInfo?.googleDisplayName ?? tokenInfo?.googleEmail ?? "Your Google account"}
                            </p>
                            {tokenInfo?.googleEmail ? (
                              <p className="text-sm text-white/55">{tokenInfo.googleEmail}</p>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[20px] border border-[rgba(0,206,196,0.22)] bg-[rgba(0,206,196,0.07)] p-4">
                        <div className="flex items-start gap-3">
                          <ShieldCheck size={18} className="mt-0.5 text-[#00cec4]" />
                          <div className="space-y-1 text-sm leading-6 text-white/72">
                            <p>
                              This does not store your Google password. It only links your
                              Google Chat identity to the Monolith account currently signed in
                              on this browser.
                            </p>
                            <p>
                              If the wrong Monolith user is active, switch accounts first.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3">
                        <Button
                          size="lg"
                          onClick={handleConfirm}
                          className="h-13 w-full rounded-[16px] bg-white text-[#151515] hover:bg-white/90"
                        >
                          Link My Monolith Account
                        </Button>
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => router.push(loginUrl)}
                          className="h-13 w-full rounded-[16px] border-white/12 bg-transparent text-white hover:bg-white/[0.04]"
                        >
                          <LogIn size={16} />
                          Sign In As Different User
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {resolvedPhase === "submitting" && (
                    <motion.div
                      key="submitting"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-4"
                    >
                      <div className="rounded-[20px] border border-[rgba(0,206,196,0.22)] bg-[rgba(0,206,196,0.07)] p-5">
                        <div className="flex items-center gap-3">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
                          >
                            <Loader2 size={18} className="text-[#00cec4]" />
                          </motion.div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                              Linking
                            </p>
                            <p className="mt-1 text-sm text-white/78">
                              Finalising the identity bridge...
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {resolvedPhase === "success" && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-5"
                    >
                      <div className="flex justify-center">
                        <div className="flex h-18 w-18 items-center justify-center rounded-[24px] bg-[rgba(0,206,196,0.12)]">
                          <CheckCircle2 size={34} className="text-[#00cec4]" />
                        </div>
                      </div>

                      <div className="space-y-2 text-center">
                        <h3
                          className="text-[1.8rem] font-semibold tracking-[-0.04em] text-white"
                          style={{ fontFamily: fonts.display }}
                        >
                          ACCOUNTS LINKED
                        </h3>
                        <p className="text-sm leading-6 text-white/60">
                          The assistant now knows who you are in Google Chat. Return there
                          and start with `/help` or ask your first question.
                        </p>
                      </div>

                      <div className="flex flex-col gap-3">
                        <Button
                          size="lg"
                          onClick={() => router.push("/")}
                          className="h-13 w-full rounded-[16px] bg-white text-[#151515] hover:bg-white/90"
                        >
                          Open Monolith
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {resolvedPhase === "error" && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-5"
                    >
                      <div className="flex justify-center">
                        <div className="flex h-18 w-18 items-center justify-center rounded-[24px] bg-[rgba(251,146,60,0.12)]">
                          <AlertCircle size={34} className="text-[#fb923c]" />
                        </div>
                      </div>

                      <div className="space-y-2 text-center">
                        <h3
                          className="text-[1.8rem] font-semibold tracking-[-0.04em] text-white"
                          style={{ fontFamily: fonts.display }}
                        >
                          LINK COULD NOT FINISH
                        </h3>
                        <p className="text-sm leading-6 text-white/60">{resolvedError}</p>
                      </div>

                      <div className="flex flex-col gap-3">
                        <Button
                          size="lg"
                          onClick={() => setAttempt((current) => current + 1)}
                          className="h-13 w-full rounded-[16px] bg-white text-[#151515] hover:bg-white/90"
                        >
                          <RefreshCw size={16} />
                          Retry Verification
                        </Button>
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => router.push(loginUrl)}
                          className="h-13 w-full rounded-[16px] border-white/12 bg-transparent text-white hover:bg-white/[0.04]"
                        >
                          <LogIn size={16} />
                          Open Monolith Login
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>

              <div className="border-t border-white/8 px-6 py-5 text-center text-sm text-white/52 sm:px-8">
                Need a fresh link? Go back to Google Chat and run <span className="font-medium text-[#00cec4]">/connect</span>.
              </div>
            </Card>
          </div>

          <p className="text-center text-sm text-white/30">
            Secure link powered by Monolith Engine
          </p>
        </div>
      </div>
    </div>
  );
}

export default function GoogleChatLinkPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#151515]">
          <Loader2 className="animate-spin text-[#00cec4]" size={28} />
        </div>
      }
    >
      <LinkPageContent />
    </Suspense>
  );
}
