"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { LockKeyhole, X } from "lucide-react";

import { Button } from "@/components/monolith/button";
import { ChaDialogLayer } from "@/components/monolith/cha-workspace";

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
    <ChaDialogLayer
      open={isVisible}
      onClose={dismiss}
      size="compact"
      labelledBy="permission-denied-title"
    >
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0 }}
        animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
        transition={transition}
        aria-labelledby="permission-denied-title"
        aria-describedby="permission-denied-description"
        className="relative overflow-hidden px-6 py-7 text-center"
        >
          <Button
            type="button"
            aria-label="Close permission message"
            onClick={dismiss}
            className="absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-xl border mnx-border mnx-bg-surface mnx-text-muted shadow-sm transition-all mnx-hover-danger mnx-hover-danger mnx-shadow-panel"
          >
            <X className="size-4" />
          </Button>

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border mnx-border-danger mnx-bg-danger mnx-text-danger mnx-shadow-panel">
            <LockKeyhole className="size-7" strokeWidth={1.8} />
          </div>

          <h1
            id="permission-denied-title"
            className="mt-5 font-[var(--font-geist-sans)] text-xl uppercase tracking-[0.16em] mnx-text-primary"
          >
            Permission Denied
          </h1>
          <p id="permission-denied-description" className="mx-auto mt-3 max-w-sm text-sm mnx-text-muted">
            You do not have permission to perform this action. You will be returned to the previous page in 3 seconds.
          </p>
          <p className="mx-auto mt-2 max-w-sm text-xs mnx-text-muted">{message}</p>

          <div className="mt-6 flex justify-center">
            <Button onClick={dismiss} className="gap-2 uppercase tracking-[0.14em]">
              Close
            </Button>
          </div>
      </motion.div>
    </ChaDialogLayer>
  );
}
