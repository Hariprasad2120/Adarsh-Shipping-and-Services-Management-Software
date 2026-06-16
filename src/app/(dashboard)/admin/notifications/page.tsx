import { Button } from "@/components/ui/button-1";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Input } from "@/components/ui/input";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { listAdminNotifications } from "@/modules/notifications/service";
import { redirect } from "next/navigation";
import { AdminNotificationsClient } from "./admin-notifications-client";

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  const allowed = await can(session.user.id, "admin.org.manage");
  if (!allowed) redirect("/dashboard");

  const params = await searchParams;
  const [notifications, users] = await Promise.all([
    listAdminNotifications(session.user.orgId!, {
      userId: typeof params.userId === "string" ? params.userId : undefined,
      status: typeof params.status === "string" ? (params.status as "all" | "unread" | "read" | "acknowledged" | "dismissed") : "all",
      activity: typeof params.activity === "string" ? (params.activity as "all" | "active" | "expired" | "resent") : "all",
      link: typeof params.link === "string" ? (params.link as "all" | "yes" | "no") : "all",
      requiresAck: typeof params.requiresAck === "string" ? (params.requiresAck as "all" | "yes" | "no") : "all",
      kind: typeof params.kind === "string" ? params.kind : undefined,
      source: typeof params.source === "string" ? params.source : undefined,
      from: typeof params.from === "string" ? params.from : undefined,
      to: typeof params.to === "string" ? params.to : undefined,
    }),
    db.user.findMany({
      where: { orgId: session.user.orgId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows = notifications.map((notification) => ({
    id: notification.id,
    title: notification.title,
    kind: notification.kind,
    source: notification.source,
    user: notification.user,
    requiresAck: notification.requiresAck,
    readAt: notification.readAt?.toISOString() ?? null,
    acknowledgedAt: notification.acknowledgedAt?.toISOString() ?? null,
    dismissedAt: notification.dismissedAt?.toISOString() ?? null,
    resentCount: notification.resentCount,
    createdAt: notification.createdAt.toISOString(),
    activities: notification.activities.map((activity) => ({
      id: activity.id,
      event: activity.event,
      createdAt: activity.createdAt.toISOString(),
      actor: activity.actor ? { name: activity.actor.name, email: activity.actor.email } : null,
    })),
  }));

  return (
    <div className="space-y-4">
      <div>
        <p className="mt-1 text-sm text-slate-500">View all user notifications in your organisation, inspect lifecycle activity, and resend notifications.</p>
      </div>

      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <AdminNotificationFilters
          activity={typeof params.activity === "string" ? params.activity : "all"}
          link={typeof params.link === "string" ? params.link : "all"}
          requiresAck={typeof params.requiresAck === "string" ? params.requiresAck : "all"}
          source={typeof params.source === "string" ? params.source : ""}
          status={typeof params.status === "string" ? params.status : "all"}
          userId={typeof params.userId === "string" ? params.userId : ""}
          users={users}
        />
        <div className="flex gap-2">
          <Input name="kind" defaultValue={typeof params.kind === "string" ? params.kind : ""} placeholder="Notification kind" className="w-full" />
          <Button type="submit" size="sm">Filter</Button>
        </div>
        <Input name="from" type="date" defaultValue={typeof params.from === "string" ? params.from : ""} />
        <Input name="to" type="date" defaultValue={typeof params.to === "string" ? params.to : ""} />
      </form>

      <AdminNotificationsClient notifications={rows} />
    </div>
  );
}

function AdminNotificationFilters({
  activity,
  link,
  requiresAck,
  source,
  status,
  userId,
  users,
}: {
  activity: string;
  link: string;
  requiresAck: string;
  source: string;
  status: string;
  userId: string;
  users: { id: string; name: string }[];
}) {
  return (
    <>
      <DropdownSelect
        name="userId"
        defaultValue={userId}
        triggerClassName="border-slate-200"
        options={[
          { value: "", label: "All recipients" },
          ...users.map((user) => ({ value: user.id, label: user.name })),
        ]}
      />
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
        name="activity"
        defaultValue={activity}
        triggerClassName="border-slate-200"
        options={[
          { value: "all", label: "All activity states" },
          { value: "active", label: "Active" },
          { value: "expired", label: "Expired" },
          { value: "resent", label: "Resent" },
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
      <DropdownSelect
        name="source"
        defaultValue={source}
        triggerClassName="border-slate-200"
        options={[
          { value: "", label: "All sources" },
          { value: "AMS", label: "AMS" },
          { value: "Attendance", label: "Attendance" },
          { value: "HRMS", label: "HRMS" },
          { value: "Admin", label: "Admin" },
          { value: "System", label: "System" },
        ]}
      />
      <DropdownSelect
        name="link"
        defaultValue={link}
        triggerClassName="border-slate-200"
        options={[
          { value: "all", label: "Link or no link" },
          { value: "yes", label: "Has link" },
          { value: "no", label: "No link" },
        ]}
      />
    </>
  );
}
