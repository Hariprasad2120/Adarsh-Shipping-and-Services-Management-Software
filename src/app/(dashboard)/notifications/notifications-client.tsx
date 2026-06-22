"use client";

import { useRouter } from "next/navigation";
import { Bell, CheckCheck, CheckCircle2, Clock3, ExternalLink, Eye, Info, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button-1";
import { useNotifications } from "@/components/notifications/notification-provider";
import { cn } from "@/lib/utils";

type NotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  source: string | null;
  requiresAck: boolean;
  createdAt: string;
  readAt: string | null;
  acknowledgedAt: string | null;
  dismissedAt: string | null;
  labels: {
    open: string;
    acknowledge: string;
  };
};

function getNotificationIcon(notification: NotificationRow) {
  if (notification.dismissedAt) return Trash2;
  if (notification.acknowledgedAt) return CheckCircle2;
  if (notification.requiresAck) return TriangleAlert;
  if (!notification.readAt) return Bell;
  return Info;
}

function getNotificationAccent(notification: NotificationRow) {
  if (notification.dismissedAt) return "text-on-surface-variant/50";
  if (notification.acknowledgedAt) return "text-emerald-500";
  if (notification.requiresAck) return "text-amber-500";
  return "text-[#00cec4]";
}

function getNotificationStatus(notification: NotificationRow) {
  if (notification.dismissedAt) return { label: "Dismissed", className: "border-outline-variant bg-surface-container-high text-on-surface-variant" };
  if (notification.acknowledgedAt) return { label: "Acknowledged", className: "border-emerald-200 bg-emerald-50 text-emerald-600" };
  if (notification.readAt) return { label: "Read", className: "border-[#00cec4]/20 bg-[#00cec4]/10 text-[#008f88]" };
  return { label: "Unread", className: "border-[#00cec4]/25 bg-[#00cec4]/12 text-[#008f88]" };
}

export function NotificationsClient({ notifications }: { notifications: NotificationRow[] }) {
  const router = useRouter();
  const { success, error } = useNotifications();

  async function run(url: string, message: string) {
    const res = await fetch(url, { method: "POST" });
    if (!res.ok) {
      error("Action failed", "Please try again.");
      return;
    }
    success(message);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="ds-shell-lg flex flex-col gap-4 border border-outline-variant/45 bg-surface/85 px-5 py-5 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.18)] backdrop-blur-xl sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-sm text-on-surface-variant">Only your notifications appear here.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="rounded-full border-[#00cec4]/30 bg-surface text-[#00a99f] hover:bg-[#00cec4]/[0.06]"
            onClick={() => run("/api/notifications/read-all", "Marked all as read")}
          >
            <CheckCheck className="mr-1.5 size-4" />
            Mark all read
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full border-[#00cec4]/30 bg-surface text-[#00a99f] hover:bg-[#00cec4]/[0.06]"
            onClick={() => run("/api/notifications/dismiss-all", "Dismissed all notifications")}
          >
            <Trash2 className="mr-1.5 size-4" />
            Dismiss all
          </Button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="ds-shell-lg border border-dashed border-outline-variant/60 bg-surface/70 px-6 py-14 text-center shadow-[0_18px_36px_-32px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00cec4]/10 text-[#00cec4]">
            <Bell className="size-6" />
          </div>
          <h2 className="ds-h2 text-primary">No notifications found</h2>
          <p className="mt-2 text-sm text-on-surface-variant">You are all caught up for the selected filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => {
            const Icon = getNotificationIcon(notification);
            const accentClass = getNotificationAccent(notification);
            const status = getNotificationStatus(notification);

            return (
              <article
                key={notification.id}
                className={cn(
                  "ds-shell-lg group border border-outline-variant/40 bg-surface/85 px-5 py-5 backdrop-blur-xl transition-all duration-200",
                  "shadow-[0_18px_36px_-30px_rgba(15,23,42,0.18)] hover:border-[#00cec4]/45 hover:shadow-[0_24px_50px_-36px_rgba(0,206,196,0.25)]",
                )}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#00cec4]/10">
                      <Icon className={cn("size-5", accentClass)} strokeWidth={1.9} />
                    </div>

                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em]", status.className)}>
                          {status.label}
                        </span>
                        {notification.source ? (
                          <span className="rounded-full border border-outline-variant/50 bg-surface/70 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-on-surface-variant">
                            {notification.source}
                          </span>
                        ) : null}
                      </div>

                      <div className="space-y-1.5">
                        <h2 className="ds-h3 text-primary">{notification.title}</h2>
                        {notification.body ? <p className="max-w-3xl text-sm leading-6 text-on-surface-variant">{notification.body}</p> : null}
                      </div>

                      <div className="flex flex-wrap gap-4 text-[11px] font-medium uppercase tracking-[0.16em] text-on-surface-variant">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="size-3.5 text-[#00cec4]" />
                          {new Date(notification.createdAt).toLocaleString("en-IN")}
                        </span>
                        <span>{notification.kind.replaceAll("_", " ")}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:max-w-[360px] lg:justify-end">
                    {!notification.readAt ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full border-[#00cec4]/30 bg-surface text-[#00a99f] hover:bg-[#00cec4]/[0.06]"
                        onClick={() => run(`/api/notifications/${notification.id}/read`, "Marked as read")}
                      >
                        <Eye className="mr-1.5 size-4" />
                        Read
                      </Button>
                    ) : null}
                    {notification.requiresAck && !notification.acknowledgedAt ? (
                      <Button
                        size="sm"
                        className="rounded-full border-0 bg-[#00cec4] text-white hover:bg-[#00b8af]"
                        onClick={() => run(`/api/notifications/${notification.id}/ack`, "Notification acknowledged")}
                      >
                        <CheckCheck className="mr-1.5 size-4" />
                        {notification.labels.acknowledge}
                      </Button>
                    ) : null}
                    {notification.link ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full border-[#00cec4]/30 bg-surface text-[#00a99f] hover:bg-[#00cec4]/[0.06]"
                        onClick={async () => {
                          const res = await fetch(`/api/notifications/${notification.id}/open`, { method: "POST" });
                          const data = (await res.json()) as { link?: string | null };
                          if (!res.ok || !data.link) {
                            error("Unable to open notification");
                            return;
                          }
                          router.push(data.link);
                          router.refresh();
                        }}
                      >
                        <ExternalLink className="mr-1.5 size-4" />
                        {notification.labels.open}
                      </Button>
                    ) : null}
                    {!notification.dismissedAt ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full border-[#00cec4]/30 bg-surface text-[#00a99f] hover:bg-[#00cec4]/[0.06]"
                        onClick={() => run(`/api/notifications/${notification.id}/dismiss`, "Notification dismissed")}
                      >
                        <Trash2 className="mr-1.5 size-4" />
                        Dismiss
                      </Button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
