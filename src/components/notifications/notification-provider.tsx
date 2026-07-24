"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button-1";
import { cn } from "@/lib/utils";

type ToastVariant = "secondary" | "primary" | "destructive" | "success" | "info" | "mono" | "warning";
type ToastAppearance = "solid" | "outline" | "light" | "stroke";

type LocalToast = {
  id: string;
  title: string;
  body?: string;
  variant?: ToastVariant;
  appearance?: ToastAppearance;
  blocking?: boolean;
  actionLabel?: string;
  onAction?: () => Promise<void> | void;
};

type RemoteToast = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  variant: ToastVariant;
  appearance: ToastAppearance;
  priority: "normal" | "important";
  requiresAck: boolean;
  policy: {
    allowDismiss: boolean;
    labels?: { open?: string; acknowledge?: string };
  };
};

type NotificationContextValue = {
  pushToast: (toast: Omit<LocalToast, "id">) => void;
  success: (title: string, body?: string) => void;
  error: (title: string, body?: string) => void;
  info: (title: string, body?: string) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);
const REMOTE_TOAST_SHOWN_PREFIX = "remote-toast-shown:";
const NOTIFICATION_ACTION_CLASS = "!text-sm !font-medium uppercase tracking-[0.14em]";

function getRemoteToastShownStorageKey(notificationId: string) {
  return `${REMOTE_TOAST_SHOWN_PREFIX}${notificationId}`;
}

function hasShownRemoteToast(notificationId: string) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.sessionStorage.getItem(getRemoteToastShownStorageKey(notificationId)) === "shown";
  } catch {
    return false;
  }
}

function markRemoteToastsShown(notificationIds: string[]) {
  if (typeof window === "undefined" || notificationIds.length === 0) {
    return;
  }

  try {
    for (const notificationId of notificationIds) {
      window.sessionStorage.setItem(getRemoteToastShownStorageKey(notificationId), "shown");
    }
  } catch {
    // sessionStorage unavailable
  }
}

function getNotificationCardTone(variant: ToastVariant | undefined) {
  if (variant === "warning") {
    return {
      border: "border-[#fb923c]/40 hover:border-[#fb923c]/70",
      glow: "hover:shadow-[0_18px_36px_-28px_rgba(251,146,60,0.34)]",
      closeBorder: "border-[#fb923c]/30 hover:border-[#fb923c]/65",
      closeText: "text-[#fb923c] hover:text-[#ea580c]",
    };
  }
  if (variant === "destructive") {
    return {
      border: "border-rose-400/40 hover:border-rose-500/70",
      glow: "hover:shadow-[0_18px_36px_-28px_rgba(244,63,94,0.28)]",
      closeBorder: "border-rose-400/30 hover:border-rose-500/65",
      closeText: "text-rose-500 hover:text-rose-600",
    };
  }
  if (variant === "success") {
    return {
      border: "border-emerald-400/40 hover:border-emerald-500/70",
      glow: "hover:shadow-[0_18px_36px_-28px_rgba(16,185,129,0.26)]",
      closeBorder: "border-emerald-400/30 hover:border-emerald-500/65",
      closeText: "text-emerald-500 hover:text-emerald-600",
    };
  }

  return {
    border: "border-[#00cec4]/35 hover:border-[#00cec4]/65",
    glow: "hover:shadow-[0_18px_36px_-28px_rgba(0,206,196,0.28)]",
    closeBorder: "border-[#00cec4]/30 hover:border-[#00cec4]/60",
    closeText: "text-[#00a99f] hover:text-[#00857e]",
  };
}

function NotificationToastCard({
  title,
  body,
  variant,
  dismissible,
  onClose,
  actions,
}: {
  title: string;
  body?: string | null;
  variant?: ToastVariant;
  dismissible?: boolean;
  onClose?: () => void;
  actions?: React.ReactNode;
}) {
  const tone = getNotificationCardTone(variant);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-surface/95 p-5 backdrop-blur-xl transition-all duration-200",
        "shadow-[var(--shadow-ambient)] hover:-translate-y-px hover:shadow-[var(--shadow-ambient-hover)]",
        tone.border,
        tone.glow,
      )}
    >
      <div className="relative flex gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-sm font-medium uppercase leading-5 tracking-[0.08em] text-on-surface">
                {title}
              </h3>
              {body ? <p className="text-sm leading-6 text-on-surface-variant">{body}</p> : null}
            </div>

            {dismissible ? (
              <button
                type="button"
                onClick={onClose}
                aria-label="Dismiss notification"
                className={cn(
                  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-surface-container-low/70",
                  "transition-all duration-200 hover:-translate-y-0.5 hover:rotate-90 hover:scale-105 active:translate-y-0 active:rotate-0 active:scale-95",
                  tone.closeBorder,
                  tone.closeText,
                )}
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          {actions ? <div className="flex flex-wrap gap-2 pt-1">{actions}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [localToasts, setLocalToasts] = useState<LocalToast[]>([]);
  const [remoteToasts, setRemoteToasts] = useState<RemoteToast[]>([]);
  const refreshInFlightRef = useRef(false);

  const refreshRemoteToasts = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) return;
    if (refreshInFlightRef.current) return;

    refreshInFlightRef.current = true;
    try {
      const res = await fetch("/api/notifications/active", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as RemoteToast[];
      const unseenToasts = data.filter((toast) => !hasShownRemoteToast(toast.id));
      markRemoteToastsShown(unseenToasts.map((toast) => toast.id));
      setRemoteToasts(unseenToasts);

      if (data.length > 0) {
        const ids = data.map((n) => n.id);
        await fetch("/api/notifications/presented", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        }).catch((err) => console.error("Failed to mark notifications presented", err));
      }
    } finally {
      refreshInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refreshRemoteToasts();
    }, 1800);

    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        void refreshRemoteToasts();
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    const interval = setInterval(refreshRemoteToasts, 30000); // 30 seconds
    return () => {
      window.clearTimeout(timeout);
      clearInterval(interval);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [refreshRemoteToasts]);

  useEffect(() => {
    const timers = localToasts
      .filter((toast) => !toast.blocking)
      .map((toast) =>
        window.setTimeout(() => {
          setLocalToasts((current) => current.filter((entry) => entry.id !== toast.id));
        }, 5000)
      );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [localToasts]);

  useEffect(() => {
    const timers = remoteToasts
      .filter((toast) => toast.priority !== "important")
      .map((toast) =>
        window.setTimeout(() => {
          setRemoteToasts((current) => current.filter((entry) => entry.id !== toast.id));
        }, 5000)
      );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [remoteToasts]);

  function pushToast(toast: Omit<LocalToast, "id">) {
    setLocalToasts((current) => [...current, { ...toast, id: crypto.randomUUID() }]);
  }

  async function postAction(url: string) {
    await fetch(url, { method: "POST" });
    await refreshRemoteToasts();
  }

  const contextValue = useMemo<NotificationContextValue>(
    () => ({
      pushToast,
      success: (title, body) => {
        if (title === "Action completed") {
          toast.success(title, {
            description: body,
            duration: 4000,
            position: "top-center",
          });
          return;
        }
        pushToast({ title, body, variant: "success", appearance: "light" });
      },
      error: (title, body) => pushToast({ title, body, variant: "destructive", appearance: "light", blocking: true }),
      info: (title, body) => pushToast({ title, body, variant: "info", appearance: "light" }),
    }),
    []
  );

  const totalVisible = localToasts.length + remoteToasts.length;

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}

      <div className="toaster pointer-events-none fixed bottom-4 right-4 z-[70] flex w-full max-w-md flex-col gap-3 px-3 [--width:24rem]">
        {totalVisible > 1 && (
          <div className="pointer-events-auto flex justify-end">
            <Button
              size="sm"
              variant="outline"
              className={cn(NOTIFICATION_ACTION_CLASS, "shadow-[var(--shadow-ambient)] backdrop-blur-xl")}
              onClick={async () => {
                setLocalToasts([]);
                await postAction("/api/notifications/dismiss-all");
              }}
            >
              Dismiss all
            </Button>
          </div>
        )}

        {remoteToasts.map((toast) => {
          return (
            <div key={toast.id} className="pointer-events-auto">
              <NotificationToastCard
                title={toast.title}
                body={toast.body}
                variant={toast.variant}
                dismissible={toast.policy.allowDismiss}
                onClose={async () => {
                  await postAction(`/api/notifications/${toast.id}/dismiss`);
                  setRemoteToasts((current) => current.filter((entry) => entry.id !== toast.id));
                }}
                actions={
                  <>
                    {toast.link ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className={NOTIFICATION_ACTION_CLASS}
                        onClick={async () => {
                          const res = await fetch(`/api/notifications/${toast.id}/open`, { method: "POST" });
                          const data = (await res.json()) as { link?: string | null };
                          if (data.link) router.push(data.link);
                          await refreshRemoteToasts();
                        }}
                      >
                        {toast.policy.labels?.open ?? "Open"}
                      </Button>
                    ) : null}
                    {toast.requiresAck ? (
                      <Button
                        size="sm"
                        variant="default"
                        className={NOTIFICATION_ACTION_CLASS}
                        onClick={async () => {
                          await postAction(`/api/notifications/${toast.id}/ack`);
                          setRemoteToasts((current) => current.filter((entry) => entry.id !== toast.id));
                        }}
                      >
                        {toast.policy.labels?.acknowledge ?? "Acknowledge"}
                      </Button>
                    ) : null}
                  </>
                }
              />
            </div>
          );
        })}

        {localToasts.map((toast) => {
          return (
            <div key={toast.id} className="pointer-events-auto">
              <NotificationToastCard
                title={toast.title}
                body={toast.body}
                variant={toast.variant}
                dismissible={true}
                onClose={() => setLocalToasts((current) => current.filter((entry) => entry.id !== toast.id))}
                actions={
                  toast.actionLabel && toast.onAction ? (
                      <Button size="sm" className={NOTIFICATION_ACTION_CLASS} onClick={() => void toast.onAction?.()}>
                        {toast.actionLabel}
                      </Button>
                  ) : null
                }
              />
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}
