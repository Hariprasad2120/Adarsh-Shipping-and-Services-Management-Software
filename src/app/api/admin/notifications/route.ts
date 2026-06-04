import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { listAdminNotifications } from "@/modules/notifications/service";

export async function GET(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "admin.org.manage");

  const { searchParams } = new URL(req.url);
  const notifications = await listAdminNotifications(session!.user.orgId!, {
    userId: searchParams.get("userId") ?? undefined,
    status: (searchParams.get("status") as "all" | "unread" | "read" | "acknowledged" | "dismissed" | null) ?? "all",
    activity: (searchParams.get("activity") as "all" | "active" | "expired" | "resent" | null) ?? "all",
    link: (searchParams.get("link") as "all" | "yes" | "no" | null) ?? "all",
    requiresAck: (searchParams.get("requiresAck") as "all" | "yes" | "no" | null) ?? "all",
    kind: searchParams.get("kind") ?? undefined,
    source: searchParams.get("source") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });

  return ok(notifications);
}
