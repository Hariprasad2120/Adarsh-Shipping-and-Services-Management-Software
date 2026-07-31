"use server";

import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import * as accService from "./service";
import { mapAccountingError } from "./operational-helpers";

type ActionResponse = { ok: true; data?: unknown } | { ok: false; error: string };

function safeAccountingActionError(error: unknown) {
  return mapAccountingError(error).message;
}

export async function createUnitAction(name: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.item.create");
    const unit = await accService.createUnit(orgId, name);
    return { ok: true, data: unit };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}
