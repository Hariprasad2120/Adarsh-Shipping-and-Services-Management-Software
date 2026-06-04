import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok } from "@/lib/api-helpers";
import { listUserNotifications } from "@/modules/notifications/service";

export async function GET(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const notifications = await listUserNotifications(session!.user.id, {
    status: (searchParams.get("status") as "all" | "unread" | "read" | "acknowledged" | "dismissed" | null) ?? "all",
    requiresAck: (searchParams.get("requiresAck") as "all" | "yes" | "no" | null) ?? "all",
    kind: searchParams.get("kind") ?? undefined,
    source: searchParams.get("source") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });

  return ok(notifications);
}
