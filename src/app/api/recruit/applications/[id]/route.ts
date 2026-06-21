import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { isRecruitEnabled } from "@/lib/recruit-flag";
import { getApplication } from "@/modules/recruit/employer-service";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isRecruitEnabled()) return err("Recruit module is not enabled", 404);
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "recruit.application.manage");

  const { id } = await params;
  const application = await getApplication(session!.user.orgId!, id);
  if (!application) return err("Application not found", 404);
  return ok(application);
}
