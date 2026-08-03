import { NextRequest } from "next/server";
import { err, getSessionOrUnauth, ok } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import {
  accountingAutomationRuleInputSchema,
  createAccountingAutomationRule,
  listAccountingAutomationRules,
} from "@/modules/accounting/customization";

export async function GET() {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "accounting.settings.manage");
  return ok(await listAccountingAutomationRules(session!.user.orgId!));
}

export async function POST(request: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "accounting.settings.manage");
  const parsed = accountingAutomationRuleInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid accounting automation rule", 400);
  }
  return ok(
    await createAccountingAutomationRule(session!.user.orgId!, parsed.data),
    201,
  );
}
