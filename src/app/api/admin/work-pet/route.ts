import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import {
  saveMonaGovernanceForOrg,
  type MonaGovernanceSettings,
} from "@/modules/mona/governance";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await requirePermission(session.user.id, "admin.org.manage");

  if (!session.user.orgId) {
    return NextResponse.json(
      { error: "Missing organisation configuration" },
      { status: 400 },
    );
  }

  const body = await request.json() as MonaGovernanceSettings;
  const settings = await saveMonaGovernanceForOrg({
    orgId: session.user.orgId,
    settings: body,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/work-pet");

  return NextResponse.json({
    ok: true,
    settings,
  });
}
