import { Button } from "@/components/ui/button-1";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { auth } from "@/lib/auth";
import { getNotificationPolicy } from "@/modules/notifications/policy";
import { listUserNotifications } from "@/modules/notifications/service";
import { redirect } from "next/navigation";
import { NotificationsClient } from "./notifications-client";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;
  const notifications = await listUserNotifications(session.user.id, {
    status: typeof params.status === "string" ? (params.status as "all" | "unread" | "read" | "acknowledged" | "dismissed") : "all",
    requiresAck: typeof params.requiresAck === "string" ? (params.requiresAck as "all" | "yes" | "no") : "all",
    kind: typeof params.kind === "string" ? params.kind : undefined,
    source: typeof params.source === "string" ? params.source : undefined,
    from: typeof params.from === "string" ? params.from : undefined,
    to: typeof params.to === "string" ? params.to : undefined,
  });

  const rows = notifications.map((notification) => {
    const policy = getNotificationPolicy(notification.kind);
    return {
      id: notification.id,
      kind: notification.kind,
      title: notification.title,
      body: notification.body,
      link: notification.link,
      source: notification.source,
      requiresAck: notification.requiresAck,
      createdAt: notification.createdAt.toISOString(),
      readAt: notification.readAt?.toISOString() ?? null,
      acknowledgedAt: notification.acknowledgedAt?.toISOString() ?? null,
      dismissedAt: notification.dismissedAt?.toISOString() ?? null,
      labels: {
        open: policy.labels?.open ?? "Open",
        acknowledge: policy.labels?.acknowledge ?? "Acknowledge",
      },
    };
  });

  return (
    <div className="space-y-4">
      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <NotificationFilters
          requiresAck={typeof params.requiresAck === "string" ? params.requiresAck : "all"}
          status={typeof params.status === "string" ? params.status : "all"}
        />
        <input name="kind" defaultValue={typeof params.kind === "string" ? params.kind : ""} placeholder="Notification kind" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <input name="from" type="date" defaultValue={typeof params.from === "string" ? params.from : ""} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <div className="flex gap-2">
          <input name="to" type="date" defaultValue={typeof params.to === "string" ? params.to : ""} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <Button type="submit" size="sm">Filter</Button>
        </div>
      </form>

      <NotificationsClient notifications={rows} />
    </div>
  );
}

function NotificationFilters({
  status,
  requiresAck,
}: {
  status: string;
  requiresAck: string;
}) {
  return (
    <>
      <DropdownSelect
        name="status"
        defaultValue={status}
        triggerClassName="border-slate-200"
        options={[
          { value: "all", label: "All statuses" },
          { value: "unread", label: "Unread" },
          { value: "read", label: "Read" },
          { value: "acknowledged", label: "Acknowledged" },
          { value: "dismissed", label: "Dismissed" },
        ]}
      />
      <DropdownSelect
        name="requiresAck"
        defaultValue={requiresAck}
        triggerClassName="border-slate-200"
        options={[
          { value: "all", label: "Ack required or not" },
          { value: "yes", label: "Ack required" },
          { value: "no", label: "No ack required" },
        ]}
      />
    </>
  );
}
