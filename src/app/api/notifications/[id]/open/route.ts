import { getSessionOrUnauth, ok } from "@/lib/api-helpers";
import { openNotificationLink } from "@/modules/notifications/service";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  const { id } = await params;
  const link = await openNotificationLink(session!.user.id, id);
  return ok({ link });
}
