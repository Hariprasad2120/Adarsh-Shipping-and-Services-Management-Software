// ─── Google Chat Spaces Admin API ────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { loadUserPermissions } from "@/lib/rbac";
import { listOrgSpaces } from "@/modules/google-chat/space";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = await loadUserPermissions(session.user.id);
  if (!permissions.has("admin.org.manage") && !session.user.isPlatformAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.orgId;
  if (!orgId) {
    return NextResponse.json({ spaces: [] });
  }

  const spaces = await listOrgSpaces(orgId);
  return NextResponse.json({ spaces });
}
