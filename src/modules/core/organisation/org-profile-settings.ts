"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";

// General org profile (name, address, logo) — genuinely absent app-wide in
// this repository. The Organisation model only carries `name` and `slug`;
// Payroll's own settings/organization page covers the *tax* half (PAN/TAN,
// TDS circle — PayrollOrganisationTaxProfile), not general company identity.
// This module lives under core/organisation (not payroll) because the data
// is not payroll-specific, but the settings *page* is currently only wired
// under /payroll/settings — see the loan-custom-fields README note in the
// settings landing page for why: no app-level "Organisation Profile" surface
// exists yet to attach it to, and building one is out of this task's scope.
// Storage reuses the generic SystemSetting key-value table (no schema
// migration) rather than adding columns to Organisation, since this data may
// move to a first-class model once an app-level settings surface exists.
const SETTING_KEY_PREFIX = "org";
const SETTING_KEY_SUFFIX = "profile";

export type OrganisationProfile = {
  legalName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  logoUrl: string;
};

const DEFAULT_PROFILE: OrganisationProfile = {
  legalName: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  logoUrl: "",
};

function settingKey(orgId: string) {
  return `${SETTING_KEY_PREFIX}:${orgId}:${SETTING_KEY_SUFFIX}`;
}

function parseStored(value: string | null | undefined): OrganisationProfile {
  if (!value) return { ...DEFAULT_PROFILE };
  try {
    const parsed = JSON.parse(value) as Partial<OrganisationProfile>;
    return {
      legalName: String(parsed.legalName ?? ""),
      addressLine1: String(parsed.addressLine1 ?? ""),
      addressLine2: String(parsed.addressLine2 ?? ""),
      city: String(parsed.city ?? ""),
      state: String(parsed.state ?? ""),
      postalCode: String(parsed.postalCode ?? ""),
      country: String(parsed.country ?? ""),
      logoUrl: String(parsed.logoUrl ?? ""),
    };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export async function getOrganisationProfile(orgId: string): Promise<OrganisationProfile> {
  const [row, org] = await Promise.all([
    db.systemSetting.findUnique({ where: { key: settingKey(orgId) }, select: { value: true } }),
    db.organisation.findUnique({ where: { id: orgId }, select: { name: true } }),
  ]);
  const profile = parseStored(row?.value);
  if (!profile.legalName) profile.legalName = org?.name ?? "";
  return profile;
}

type ActionResponse = { ok: true } | { ok: false; error: string };

export async function saveOrganisationProfileAction(
  input: OrganisationProfile,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    const legalName = input.legalName.trim();
    if (!legalName) return { ok: false, error: "Organisation name is required" };

    const value = JSON.stringify({ ...input, legalName });
    await db.systemSetting.upsert({
      where: { key: settingKey(orgId) },
      update: { value },
      create: { key: settingKey(orgId), value },
    });

    revalidatePath("/payroll/settings/org-profile");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to save organisation profile",
    };
  }
}
