import { getSessionOrUnauth, ok } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { resendNotification } from "@/modules/notifications/service";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "admin.org.manage");

  const { id } = await params;
  await resendNotification(session!.user.id, session!.user.orgId!, id);
  return ok({ resent: true });
}
