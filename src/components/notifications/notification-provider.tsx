"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle2, Info, OctagonAlert, TriangleAlert } from "lucide-react";
import { Alert, AlertContent, AlertDescription, AlertIcon, AlertTitle, AlertToolbar } from "@/components/ui/alert";
import { Button } from "@/components/ui/button-1";

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

function getIcon(variant: ToastVariant | undefined) {
  if (variant === "success") return CheckCircle2;
  if (variant === "destructive") return OctagonAlert;
  if (variant === "warning") return TriangleAlert;
  if (variant === "info" || variant === "primary") return Info;
  return Bell;
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
      success: (title, body) => pushToast({ title, body, variant: "success", appearance: "light" }),
      error: (title, body) => pushToast({ title, body, variant: "destructive", appearance: "light", blocking: true }),
      info: (title, body) => pushToast({ title, body, variant: "info", appearance: "light" }),
    }),
    []
  );

  const totalVisible = localToasts.length + remoteToasts.length;

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}

      <div className="toaster pointer-events-none fixed bottom-4 right-4 z-[70] flex w-full max-w-sm flex-col gap-3 [--width:22rem]">
        {totalVisible > 1 && (
          <div className="pointer-events-auto flex justify-end">
            <Button
              size="sm"
              variant="outline"
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
          const Icon = getIcon(toast.variant);

          return (
            <div key={toast.id} className="pointer-events-auto">
              <Alert
                variant={toast.variant}
                appearance={toast.appearance}
                className="border border-slate-200 bg-white shadow-lg"
                close={toast.policy.allowDismiss}
                onClose={async () => {
                  await postAction(`/api/notifications/${toast.id}/dismiss`);
                  setRemoteToasts((current) => current.filter((entry) => entry.id !== toast.id));
                }}
              >
                <AlertIcon>
                  <Icon />
                </AlertIcon>
                <AlertContent>
                  <AlertTitle>{toast.title}</AlertTitle>
                  {toast.body ? <AlertDescription>{toast.body}</AlertDescription> : null}
                  <AlertToolbar className="flex flex-wrap gap-2 pt-1">
                    {toast.link ? (
                      <Button
                        size="sm"
                        variant="outline"
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
                        onClick={async () => {
                          await postAction(`/api/notifications/${toast.id}/ack`);
                          setRemoteToasts((current) => current.filter((entry) => entry.id !== toast.id));
                        }}
                      >
                        {toast.policy.labels?.acknowledge ?? "Acknowledge"}
                      </Button>
                    ) : null}
                  </AlertToolbar>
                </AlertContent>
              </Alert>
            </div>
          );
        })}

        {localToasts.map((toast) => {
          const Icon = getIcon(toast.variant);

          return (
            <div key={toast.id} className="pointer-events-auto">
              <Alert
                variant={toast.variant}
                appearance={toast.appearance}
                className="border border-slate-200 bg-white shadow-lg"
                close={true}
                onClose={() => setLocalToasts((current) => current.filter((entry) => entry.id !== toast.id))}
              >
                <AlertIcon>
                  <Icon />
                </AlertIcon>
                <AlertContent>
                  <AlertTitle>{toast.title}</AlertTitle>
                  {toast.body ? <AlertDescription>{toast.body}</AlertDescription> : null}
                  {toast.actionLabel && toast.onAction ? (
                    <AlertToolbar className="pt-1">
                      <Button size="sm" onClick={() => void toast.onAction?.()}>
                        {toast.actionLabel}
                      </Button>
                    </AlertToolbar>
                  ) : null}
                </AlertContent>
              </Alert>
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
