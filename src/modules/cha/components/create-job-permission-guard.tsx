"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { LockKeyhole, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ChaDialogLayer } from "@/modules/cha/components/workspace/cha-workspace";

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

  if (!open) return null;

  return (
    <ChaDialogLayer
      open={open}
      onClose={dismiss}
      size="compact"
      labelledBy="create-job-permission-title"
    >
      <motion.div
        aria-labelledby="create-job-permission-title"
        aria-describedby="create-job-permission-description"
        initial={shouldReduceMotion ? false : { opacity: 0, y: 14, scale: 0.985 }}
        animate={visible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 8, scale: 0.985 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.24, ease: "easeOut" }}
        className="relative px-6 py-7 text-center"
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

        <h2
          id="create-job-permission-title"
          className="mt-5 font-[family:var(--mn-font-sans)] text-xl uppercase tracking-[0.16em] mnx-text-primary"
        >
          Permission Denied
        </h2>
        <p id="create-job-permission-description" className="mx-auto mt-3 max-w-sm text-sm mnx-text-muted">
          You do not have permission to create CHA jobs. You will be returned to the previous page in 3 seconds.
        </p>

        <div className="mt-6 flex justify-center">
          <Button onClick={dismiss} className="uppercase tracking-[0.14em]">
            Close
          </Button>
        </div>
      </motion.div>
    </ChaDialogLayer>
  );
}
