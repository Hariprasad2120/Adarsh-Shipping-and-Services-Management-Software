"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SESSION_COOKIE_NAME } from "@/lib/session-config";
import { dispatchMonaPetNotification } from "@/modules/mona/pet-events";
import {
  getRemoteToastShownStorageKey,
  mergeRemoteNotifications,
  NORMAL_NOTIFICATION_DURATION_MS,
  shouldAutoDismissRemoteNotification,
  shouldPersistRemoteNotification,
  shouldShowFetchedRemoteNotification,
} from "@/modules/notifications/client-state";
import type { MonolithNotificationPayload } from "@/modules/notifications/realtime";

type ToastVariant =
  | "secondary"
  | "primary"
  | "destructive"
  | "success"
  | "info"
  | "mono"
  | "warning";
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

type RemoteToast = MonolithNotificationPayload;

type UpcomingReminder = {
  id: string;
  title: string;
  alertAt: string | null;
};

type RuntimeUpdates = {
  notifications: RemoteToast[];
  upcomingTodoReminders: UpcomingReminder[];
};

type NotificationContextValue = {
  pushToast: (toast: Omit<LocalToast, "id">) => void;
  success: (title: string, body?: string) => void;
  error: (title: string, body?: string) => void;
  info: (title: string, body?: string) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);
const NOTIFICATION_ACTION_CLASS =
  "!text-sm !font-medium uppercase";
const RUNTIME_POLL_INTERVAL_MS = 15_000;
const RUNTIME_MAX_BACKOFF_MS = 10 * 60_000;

function hasShownRemoteToast(notificationId: string) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return (
      window.sessionStorage.getItem(
        getRemoteToastShownStorageKey(notificationId),
      ) === "shown"
    );
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
      window.sessionStorage.setItem(
        getRemoteToastShownStorageKey(notificationId),
        "shown",
      );
    }
  } catch {
    // sessionStorage unavailable
  }
}

function hasSessionCookie() {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((cookie) =>
    cookie.startsWith(`${SESSION_COOKIE_NAME}=`),
  );
}

function getNotificationCardTone(variant: ToastVariant | undefined) {
  if (variant === "warning") {
    return {
      border: "mnx-notification-tone-warning",
      closeBorder: "mnx-notification-action-warning",
      closeText: "",
    };
  }
  if (variant === "destructive") {
    return {
      border: "mnx-notification-tone-danger",
      closeBorder: "mnx-notification-action-danger",
      closeText: "",
    };
  }
  if (variant === "success") {
    return {
      border: "mnx-notification-tone-success",
      closeBorder: "mnx-notification-action-success",
      closeText: "",
    };
  }

  return {
    border: "mnx-notification-tone-info",
    closeBorder: "mnx-notification-action-info",
    closeText: "",
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
      role={variant === "destructive" ? "alert" : "status"}
      aria-live={variant === "destructive" ? "assertive" : "polite"}
      className={cn(
        "mnx-notification-card",
        tone.border,
      )}
    >
      <div className="relative flex gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-sm font-medium uppercase leading-5 tracking-[0.08em] text-mono-text">
                {title}
              </h3>
              {body ? (
                <p className="text-sm leading-6 text-mono-muted">{body}</p>
              ) : null}
            </div>

            {dismissible ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Dismiss notification"
                className={cn(
                  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-mono-soft/70",
                  "transition-all duration-200 active:scale-95",
                  tone.closeBorder,
                  tone.closeText,
                )}
              >
                <X className="size-4" />
              </Button>
            ) : null}
          </div>

          {actions ? (
            <div className="flex flex-wrap gap-2 pt-1">{actions}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [localToasts, setLocalToasts] = useState<LocalToast[]>([]);
  const [remoteToasts, setRemoteToasts] = useState<RemoteToast[]>([]);
  const seenLocalToastIdsRef = useRef<Set<string>>(new Set());
  const seenRemoteToastIdsRef = useRef<Set<string>>(new Set());
  const refreshInFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const etagRef = useRef<string | null>(null);
  const failureCountRef = useRef(0);

  const refreshRemoteToasts = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) return true;
    if (refreshInFlightRef.current) return true;
    if (!hasSessionCookie()) {
      setRemoteToasts([]);
      failureCountRef.current = 0;
      return false;
    }

    refreshInFlightRef.current = true;
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/runtime/updates", {
        cache: "no-store",
        headers: etagRef.current
          ? { "If-None-Match": etagRef.current }
          : undefined,
        signal: controller.signal,
      });
      if (res.status === 304) {
        failureCountRef.current = 0;
        return true;
      }
      if (res.status === 401) {
        setRemoteToasts([]);
        failureCountRef.current = 5;
        return false;
      }
      if (!res.ok) {
        failureCountRef.current += 1;
        return false;
      }

      etagRef.current = res.headers.get("etag");
      const data = (await res.json()) as RuntimeUpdates;
      const nextToasts = data.notifications.filter((notification) =>
        shouldShowFetchedRemoteNotification(notification, hasShownRemoteToast),
      );
      markRemoteToastsShown(
        nextToasts
          .filter((notification) => !shouldPersistRemoteNotification(notification))
          .map((toast) => toast.id),
      );
      setRemoteToasts((current) =>
        mergeRemoteNotifications(current, nextToasts),
      );

      if (data.notifications.length > 0) {
        const ids = data.notifications.map((notification) => notification.id);
        await fetch("/api/notifications/presented", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
          signal: controller.signal,
        }).catch((err) =>
          console.error("Failed to mark notifications presented", err),
        );
      }
      failureCountRef.current = 0;
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError")
        return true;
      failureCountRef.current += 1;
      return false;
    } finally {
      refreshInFlightRef.current = false;
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !hasSessionCookie()) return;

    let active = true;
    const es = new EventSource("/api/notifications/stream");
    eventSourceRef.current = es;

    es.addEventListener("sync", (event) => {
      if (!active) return;
      const notifications = JSON.parse(
        (event as MessageEvent<string>).data,
      ) as RemoteToast[];
      const nextToasts = notifications.filter((notification) =>
        shouldShowFetchedRemoteNotification(notification, hasShownRemoteToast),
      );
      markRemoteToastsShown(
        nextToasts
          .filter((notification) => !shouldPersistRemoteNotification(notification))
          .map((notification) => notification.id),
      );
      setRemoteToasts((current) =>
        mergeRemoteNotifications(current, nextToasts),
      );
    });

    es.addEventListener("notification", (event) => {
      if (!active) return;
      const notification = JSON.parse(
        (event as MessageEvent<string>).data,
      ) as RemoteToast;
      if (
        !shouldShowFetchedRemoteNotification(
          notification,
          hasShownRemoteToast,
        )
      ) {
        return;
      }
      if (!shouldPersistRemoteNotification(notification)) {
        markRemoteToastsShown([notification.id]);
      }
      setRemoteToasts((current) =>
        mergeRemoteNotifications(current, [notification]),
      );
    });

    es.onerror = () => {
      void refreshRemoteToasts();
    };

    return () => {
      active = false;
      es.close();
      if (eventSourceRef.current === es) eventSourceRef.current = null;
    };
  }, [refreshRemoteToasts]);

  useEffect(() => {
    let timer: number | null = null;
    let active = true;

    const clearTimer = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
    };

    const schedule = (delay: number) => {
      clearTimer();
      if (!active || document.hidden || !hasSessionCookie()) return;
      timer = window.setTimeout(async () => {
        await refreshRemoteToasts();
        const backoff = Math.min(
          RUNTIME_POLL_INTERVAL_MS * 2 ** failureCountRef.current,
          RUNTIME_MAX_BACKOFF_MS,
        );
        schedule(backoff);
      }, delay);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearTimer();
        abortRef.current?.abort();
      } else {
        schedule(0);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    schedule(1800);
    return () => {
      active = false;
      clearTimer();
      abortRef.current?.abort();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshRemoteToasts]);

  useEffect(() => {
    const timers = localToasts
      .filter((toast) => !toast.blocking)
      .map((toast) =>
        window.setTimeout(() => {
          setLocalToasts((current) =>
            current.filter((entry) => entry.id !== toast.id),
          );
        }, NORMAL_NOTIFICATION_DURATION_MS),
      );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [localToasts]);

  useEffect(() => {
    const unseen = localToasts.filter((toast) => !seenLocalToastIdsRef.current.has(toast.id));
    if (unseen.length === 0) return;

    unseen.forEach((toast) => seenLocalToastIdsRef.current.add(toast.id));
    const latest = unseen.at(-1);
    if (!latest) return;

    dispatchMonaPetNotification({
      count: unseen.length,
      title: latest.title,
      variant: latest.variant,
    });
  }, [localToasts]);

  useEffect(() => {
    const timers = remoteToasts
      .filter(shouldAutoDismissRemoteNotification)
      .map((toast) =>
        window.setTimeout(() => {
          setRemoteToasts((current) =>
            current.filter((entry) => entry.id !== toast.id),
          );
        }, toast.policy.autoFadeMs ?? NORMAL_NOTIFICATION_DURATION_MS),
      );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [remoteToasts]);

  useEffect(() => {
    const unseen = remoteToasts.filter((toast) => !seenRemoteToastIdsRef.current.has(toast.id));
    if (unseen.length === 0) return;

    unseen.forEach((toast) => seenRemoteToastIdsRef.current.add(toast.id));
    const latest = unseen.at(-1);
    if (!latest) return;

    dispatchMonaPetNotification({
      count: unseen.length,
      title: latest.title,
      variant: latest.variant,
    });
  }, [remoteToasts]);

  function pushToast(toast: Omit<LocalToast, "id">) {
    setLocalToasts((current) => [
      ...current,
      { ...toast, id: crypto.randomUUID() },
    ]);
  }

  async function postAction(url: string) {
    await fetch(url, { method: "POST" });
    await refreshRemoteToasts();
  }

  const contextValue = useMemo<NotificationContextValue>(
    () => ({
      pushToast,
      success: (title, body) => {
        pushToast({ title, body, variant: "success", appearance: "light" });
      },
      error: (title, body) =>
        pushToast({
          title,
          body,
          variant: "destructive",
          appearance: "light",
          blocking: true,
        }),
      info: (title, body) =>
        pushToast({ title, body, variant: "info", appearance: "light" }),
    }),
    [],
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
              className={cn(
                NOTIFICATION_ACTION_CLASS,
                "mnx-shadow-panel backdrop-blur-xl",
              )}
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
                dismissible={toast.policy.allowDismiss && !toast.requiresAck}
                onClose={async () => {
                  await postAction(`/api/notifications/${toast.id}/dismiss`);
                  setRemoteToasts((current) =>
                    current.filter((entry) => entry.id !== toast.id),
                  );
                }}
                actions={
                  <>
                    {toast.link ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className={NOTIFICATION_ACTION_CLASS}
                        onClick={async () => {
                          const res = await fetch(
                            `/api/notifications/${toast.id}/open`,
                            { method: "POST" },
                          );
                          const data = (await res.json()) as {
                            link?: string | null;
                          };
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
                          await postAction(
                            `/api/notifications/${toast.id}/ack`,
                          );
                          setRemoteToasts((current) =>
                            current.filter((entry) => entry.id !== toast.id),
                          );
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
                onClose={() =>
                  setLocalToasts((current) =>
                    current.filter((entry) => entry.id !== toast.id),
                  )
                }
                actions={
                  toast.actionLabel && toast.onAction ? (
                    <Button
                      size="sm"
                      className={NOTIFICATION_ACTION_CLASS}
                      onClick={() => void toast.onAction?.()}
                    >
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
    throw new Error(
      "useNotifications must be used within NotificationProvider",
    );
  }
  return context;
}
