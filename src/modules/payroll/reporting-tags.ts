"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";

// Payroll Settings — Advanced Reporting Tags (Zoho reference
// settings_advanced-reportingtags). AccountingReportingTag is already the
// org-wide reporting-tag registry (code/name/description, no
// module-specific discriminator) — this reuses that same table rather than
// creating a second, payroll-only tag registry, following the delegation
// pattern this codebase already uses for work locations/banking/branding.
// Tags created here are visible to Accounting too, by design: a "reporting
// tag" is meant to be one shared vocabulary across posting modules.

export async function listPayrollReportingTags(orgId: string) {
  return db.accountingReportingTag.findMany({
    where: { orgId },
    orderBy: [{ isActive: "desc" }, { code: "asc" }],
  });
}

type ActionResponse = { ok: true } | { ok: false; error: string };

function tagCode(code: string) {
  return code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

export async function createPayrollReportingTagAction(input: {
  code: string;
  name: string;
  description?: string;
  active: boolean;
}): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    const code = tagCode(input.code);
    const name = input.name.trim();
    if (!code) return { ok: false, error: "Tag code is required" };
    if (!name) return { ok: false, error: "Tag name is required" };

    const existing = await db.accountingReportingTag.findFirst({
      where: { orgId, code },
      select: { id: true },
    });
    if (existing) return { ok: false, error: `A tag with code "${code}" already exists` };

    await db.accountingReportingTag.create({
      data: {
        orgId,
        code,
        name,
        description: input.description?.trim() || null,
        isActive: input.active,
      },
    });

    revalidatePath("/payroll/settings/reporting-tags");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create reporting tag",
    };
  }
}

export async function toggleReportingTagActiveAction(
  id: string,
  active: boolean,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    const result = await db.accountingReportingTag.updateMany({
      where: { id, orgId },
      data: { isActive: active, rowVersion: { increment: 1 } },
    });
    if (result.count === 0) return { ok: false, error: "Reporting tag not found" };

    revalidatePath("/payroll/settings/reporting-tags");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to update reporting tag",
    };
  }
}
