"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { LockKeyhole, X } from "lucide-react";

import { Button } from "@/components/monolith/button";

interface CreateJobPermissionGuardProps {
  open: boolean;
  fallbackHref: string;
}

export function CreateJobPermissionGuard({ open, fallbackHref }: CreateJobPermissionGuardProps) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(open);

  const returnToPreviousPage = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.replace(fallbackHref);
  }, [fallbackHref, router]);

  const dismiss = useCallback(() => {
    setVisible(false);
    window.setTimeout(returnToPreviousPage, shouldReduceMotion ? 0 : 180);
  }, [returnToPreviousPage, shouldReduceMotion]);

  useEffect(() => {
    if (!open) return;

    const hideTimer = window.setTimeout(() => setVisible(false), 2800);
    const redirectTimer = window.setTimeout(returnToPreviousPage, 3000);

    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(redirectTimer);
    };
  }, [open, returnToPreviousPage]);

  if (typeof document === "undefined" || !open) return null;

  return createPortal(
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={visible ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.22, ease: "easeOut" }}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-mono-page/70 px-4 backdrop-blur-sm"
    >
      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="create-job-permission-title"
        aria-describedby="create-job-permission-description"
        initial={shouldReduceMotion ? false : { opacity: 0, y: 14, scale: 0.985 }}
        animate={visible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 8, scale: 0.985 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.24, ease: "easeOut" }}
        className="relative w-full max-w-md rounded-2xl border border-mono-border/70 bg-mono-card px-6 py-7 text-center shadow-[var(--shadow-ambient-hover)]"
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

        <h2
          id="create-job-permission-title"
          className="mt-5 font-[var(--font-geist-sans)] text-xl uppercase tracking-[0.16em] text-mono-text"
        >
          Permission Denied
        </h2>
        <p id="create-job-permission-description" className="mx-auto mt-3 max-w-sm text-sm text-mono-muted">
          You do not have permission to create CHA jobs. You will be returned to the previous page in 3 seconds.
        </p>

        <div className="mt-6 flex justify-center">
          <Button onClick={dismiss} className="uppercase tracking-[0.14em]">
            Close
          </Button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
