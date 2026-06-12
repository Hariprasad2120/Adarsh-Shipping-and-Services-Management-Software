"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle2, Info, OctagonAlert, TriangleAlert, X } from "lucide-react";
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

function getAccentClass(variant: ToastVariant | undefined) {
  if (variant === "warning") return "text-amber-500";
  if (variant === "destructive") return "text-rose-500";
  if (variant === "success") return "text-emerald-500";
  return "text-[#00cec4]";
}

function renderIcon(variant: ToastVariant | undefined, className: string) {
  if (variant === "success") return <CheckCircle2 className={className} strokeWidth={1.9} />;
  if (variant === "destructive") return <OctagonAlert className={className} strokeWidth={1.9} />;
  if (variant === "warning") return <TriangleAlert className={className} strokeWidth={1.9} />;
  if (variant === "info" || variant === "primary") return <Info className={className} strokeWidth={1.9} />;
  return <Bell className={className} strokeWidth={1.9} />;
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
  const accentClass = getAccentClass(variant);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[26px] border border-white/70 bg-white/82 p-5 backdrop-blur-xl transition-all duration-200",
        "shadow-[0_18px_36px_-30px_rgba(15,23,42,0.34)] hover:border-[#00cec4]/45 hover:shadow-[0_24px_50px_-34px_rgba(0,206,196,0.28)]",
      )}
    >
      <div className="absolute inset-x-0 top-0 h-16 bg-[linear-gradient(180deg,rgba(0,206,196,0.06),rgba(255,255,255,0))]" />
      <div className="relative flex gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#00cec4]/10">
          {renderIcon(variant, cn("size-5", accentClass))}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h3 className="ds-h3 text-primary">{title}</h3>
              {body ? <p className="text-sm leading-6 text-on-surface-variant">{body}</p> : null}
            </div>

            {dismissible ? (
              <button
                type="button"
                onClick={onClose}
                aria-label="Dismiss notification"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-outline-variant/45 bg-white/70 text-on-surface-variant transition hover:border-[#00cec4]/35 hover:text-[#00a99f]"
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

  async function refreshRemoteToasts() {
    const res = await fetch("/api/notifications/active", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as RemoteToast[];
    setRemoteToasts(data);
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refreshRemoteToasts();
    }, 0);
    const interval = setInterval(refreshRemoteToasts, 15000);
    return () => {
      window.clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

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
    router.refresh();
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
              className="rounded-full border-[#00cec4]/30 bg-white/82 px-4 text-[#00a99f] shadow-[0_10px_28px_-24px_rgba(15,23,42,0.32)] backdrop-blur-xl hover:bg-[#00cec4]/[0.06]"
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
                        className="rounded-full border-[#00cec4]/30 bg-white text-[#00a99f] hover:bg-[#00cec4]/[0.06]"
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
                        className="rounded-full border-0 bg-[#00cec4] text-white hover:bg-[#00b8af]"
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
                      <Button size="sm" className="rounded-full border-0 bg-[#00cec4] text-white hover:bg-[#00b8af]" onClick={() => void toast.onAction?.()}>
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
