"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";

// Payroll Settings — Portal Preferences (Zoho reference
// settings_portal_preferences). This repository has no Employee Portal route
// (no /payroll/my) yet, so these toggles do not gate anything today — they
// are stored so the setting exists and is ready to be read by a future
// portal, following the generic SystemSetting key-value table already used
// for org module/feature toggles (src/modules/core/organisation/module-settings.ts)
// rather than adding a dedicated model for a feature that doesn't exist yet.
const SETTING_KEY_PREFIX = "payroll";
const SETTING_KEY_SUFFIX = "portal_preferences";

export type PayrollPortalPreferences = {
  showPayslips: boolean;
  showLoanRequests: boolean;
  showInvestmentDeclarations: boolean;
  showAttendance: boolean;
  allowProfileEdits: boolean;
};

const DEFAULT_PREFERENCES: PayrollPortalPreferences = {
  showPayslips: true,
  showLoanRequests: false,
  showInvestmentDeclarations: true,
  showAttendance: true,
  allowProfileEdits: false,
};

function settingKey(orgId: string) {
  return `${SETTING_KEY_PREFIX}:${orgId}:${SETTING_KEY_SUFFIX}`;
}

function parseStored(value: string | null | undefined): PayrollPortalPreferences {
  if (!value) return { ...DEFAULT_PREFERENCES };
  try {
    const parsed = JSON.parse(value) as Partial<PayrollPortalPreferences>;
    return {
      showPayslips: Boolean(parsed.showPayslips ?? DEFAULT_PREFERENCES.showPayslips),
      showLoanRequests: Boolean(parsed.showLoanRequests ?? DEFAULT_PREFERENCES.showLoanRequests),
      showInvestmentDeclarations: Boolean(
        parsed.showInvestmentDeclarations ?? DEFAULT_PREFERENCES.showInvestmentDeclarations,
      ),
      showAttendance: Boolean(parsed.showAttendance ?? DEFAULT_PREFERENCES.showAttendance),
      allowProfileEdits: Boolean(parsed.allowProfileEdits ?? DEFAULT_PREFERENCES.allowProfileEdits),
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export async function getPayrollPortalPreferences(
  orgId: string,
): Promise<PayrollPortalPreferences> {
  const row = await db.systemSetting.findUnique({
    where: { key: settingKey(orgId) },
    select: { value: true },
  });
  return parseStored(row?.value);
}

type ActionResponse = { ok: true } | { ok: false; error: string };

export async function savePayrollPortalPreferencesAction(
  input: PayrollPortalPreferences,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    const value = JSON.stringify(input);
    await db.systemSetting.upsert({
      where: { key: settingKey(orgId) },
      update: { value },
      create: { key: settingKey(orgId), value },
    });

    revalidatePath("/payroll/settings/portal-preferences");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to save portal preferences",
    };
  }
}
