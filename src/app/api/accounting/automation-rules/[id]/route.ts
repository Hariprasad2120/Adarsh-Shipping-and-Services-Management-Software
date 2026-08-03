import { NextRequest } from "next/server";
import { err, getSessionOrUnauth, ok } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import {
  accountingAutomationRuleInputSchema,
  deleteAccountingAutomationRule,
  updateAccountingAutomationRule,
} from "@/modules/accounting/customization";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "accounting.settings.manage");
  const parsed = accountingAutomationRuleInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid accounting automation rule", 400);
  }
  try {
    const { id } = await params;
    return ok(
      await updateAccountingAutomationRule(session!.user.orgId!, id, parsed.data),
    );
  } catch (error) {
    return err(error instanceof Error ? error.message : "Unable to update rule", 404);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "accounting.settings.manage");
  try {
    const { id } = await params;
    await deleteAccountingAutomationRule(session!.user.orgId!, id);
    return ok({ deleted: true });
  } catch (error) {
    return err(error instanceof Error ? error.message : "Unable to delete rule", 404);
  }
}
