"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { LockKeyhole, X } from "lucide-react";

import { Button } from "@/components/monolith/button";

interface AccessProhibitedCardProps {
  message: string;
  fallbackHref?: string;
}

export function AccessProhibitedCard({ message, fallbackHref = "/cha/jobs" }: AccessProhibitedCardProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(true);
  const shouldReduceMotion = useReducedMotion();
  const transition = shouldReduceMotion ? { duration: 0 } : { duration: 0.24, ease: "easeOut" as const };

  const returnToPreviousPage = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.replace(fallbackHref);
  }, [fallbackHref, router]);

  const dismiss = useCallback(() => {
    setIsVisible(false);
    window.setTimeout(returnToPreviousPage, shouldReduceMotion ? 0 : 180);
  }, [returnToPreviousPage, shouldReduceMotion]);

  useEffect(() => {
    const hideTimer = window.setTimeout(() => setIsVisible(false), 2800);
    const redirectTimer = window.setTimeout(returnToPreviousPage, 3000);

    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(redirectTimer);
    };
  }, [returnToPreviousPage]);

  return (
    <section className="flex min-h-[calc(100vh-11rem)] w-full items-center justify-center">
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0 }}
        animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
        transition={transition}
        className="fixed inset-0 z-50 flex items-center justify-center bg-mono-page/70 px-4 backdrop-blur-sm"
      >
        <motion.div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="permission-denied-title"
          aria-describedby="permission-denied-description"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 14, scale: 0.985 }}
          animate={isVisible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 8, scale: 0.985 }}
          transition={transition}
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-mono-border/70 bg-mono-card px-6 py-7 text-center shadow-[var(--shadow-ambient-hover)]"
        >
          <button
            type="button"
            aria-label="Close permission message"
            onClick={dismiss}
            className="absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-xl border border-mono-border bg-mono-card text-mono-muted shadow-sm transition-all hover:border-red-500/45 hover:text-red-500 hover:shadow-[0_0_12px_rgba(239,68,68,0.18)]"
          >
            <X className="size-4" />
          </button>

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-red-500/35 bg-red-500/10 text-red-500 shadow-[0_0_18px_rgba(239,68,68,0.18)]">
            <LockKeyhole className="size-7" strokeWidth={1.8} />
          </div>

          <h1
            id="permission-denied-title"
            className="mt-5 text-xl uppercase tracking-[0.16em] text-mono-text"
          >
            Permission Denied
          </h1>
          <p id="permission-denied-description" className="mx-auto mt-3 max-w-sm text-sm text-mono-muted">
            You do not have permission to perform this action. You will be returned to the previous page in 3 seconds.
          </p>
          <p className="mx-auto mt-2 max-w-sm text-xs text-mono-muted/75">{message}</p>

          <div className="mt-6 flex justify-center">
            <Button onClick={dismiss} className="gap-2 uppercase tracking-[0.14em]">
              Close
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
