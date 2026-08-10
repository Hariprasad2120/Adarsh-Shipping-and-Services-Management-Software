"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useCan } from "@/lib/caps-context";
import { devConsoleStore } from "./dev-console-store";
import { installDevConsoleNetworkInterceptor } from "./dev-console-network-interceptor";
import { installDevConsoleConsoleInterceptor } from "./dev-console-console-interceptor";
import { installDevConsoleActionTracker } from "./dev-console-action-tracker";
import { DevIcon } from "./dev-icon";
import { DevPanel } from "./dev-panel";

const OPEN_KEY = "devConsole.open";

function useErrorCount() {
  return useSyncExternalStore(
    (listener) => devConsoleStore.subscribe(listener),
    () => devConsoleStore.getErrors().length,
    () => 0,
  );
}

function installGlobalErrorListeners() {
  function handleError(event: ErrorEvent) {
    devConsoleStore.recordError({
      message: event.message,
      stack: event.error instanceof Error ? event.error.stack : undefined,
      source: "window.onerror",
    });
  }

  function handleRejection(event: PromiseRejectionEvent) {
    const reason = event.reason;
    devConsoleStore.recordError({
      message: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
      source: "unhandledrejection",
    });
  }

  window.addEventListener("error", handleError);
  window.addEventListener("unhandledrejection", handleRejection);

  return () => {
    window.removeEventListener("error", handleError);
    window.removeEventListener("unhandledrejection", handleRejection);
  };
}

export function DevConsole({
  userEmail,
  userRole,
}: {
  userEmail?: string;
  userRole?: string;
}) {
  const canAccess = useCan("system.dev_console.access");
  const [open, setOpen] = useState(false);
  const [openLoaded, setOpenLoaded] = useState(false);
  const errorCount = useErrorCount();
  const pathname = usePathname();

  useEffect(() => {
    if (!canAccess) return;
    const frameId = window.requestAnimationFrame(() => {
      setOpen(window.localStorage.getItem(OPEN_KEY) === "true");
      setOpenLoaded(true);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [canAccess]);

  useEffect(() => {
    if (!canAccess || !openLoaded) return;
    window.localStorage.setItem(OPEN_KEY, String(open));
  }, [canAccess, open, openLoaded]);

  useEffect(() => {
    if (!canAccess) return;
    const removeNetworkInterceptor = installDevConsoleNetworkInterceptor();
    const removeErrorListeners = installGlobalErrorListeners();
    const removeConsoleInterceptor = installDevConsoleConsoleInterceptor();
    const removeActionTracker = installDevConsoleActionTracker();
    return () => {
      removeNetworkInterceptor();
      removeErrorListeners();
      removeConsoleInterceptor();
      removeActionTracker();
    };
  }, [canAccess]);

  useEffect(() => {
    if (!canAccess) return;
    devConsoleStore.recordLog({
      kind: "route-change",
      level: "info",
      message: `Navigated to ${pathname}`,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only fire on pathname change, not canAccess flips
  }, [pathname]);

  if (!canAccess) return null;

  return (
    <>
      <DevIcon onToggle={() => setOpen((current) => !current)} badgeCount={errorCount} />
      {open ? (
        <DevPanel onClose={() => setOpen(false)} userEmail={userEmail} userRole={userRole} />
      ) : null}
    </>
  );
}

export default DevConsole;
