import { db } from "@/lib/db";
import { cache } from "react";
import { revalidateTag, unstable_cache } from "next/cache";
import { NextResponse } from "next/server";

import { timeBlock } from "./performance";

export type Caps = Record<string, boolean>;

const RBAC_PERMISSIONS_TAG = "rbac:user-permissions";

// Accounting permissions were expanded from older coarse grants into more
// granular operational capabilities. Keep those older grants usable so
// long-lived roles can continue working across the migrated module.
const PERMISSION_COMPATIBILITY: Record<string, readonly string[]> = {
  "crm.quote.submit": ["crm.invoice.manage"],
  "crm.quote.approve": ["crm.invoice.manage"],
  "crm.quote.send": ["crm.invoice.manage"],
  "crm.quote.manage": ["crm.invoice.manage"],
  "crm.invoice.submit": ["crm.invoice.manage"],
  "crm.invoice.approve": ["crm.invoice.manage"],
  "crm.sales_order.submit": ["crm.invoice.manage"],
  "crm.sales_order.approve": ["crm.invoice.manage"],
  "crm.sales_order.manage": ["crm.invoice.manage"],
  "accounting.dashboard.view": ["accounting.read"],
  "accounting.account.read": ["accounting.read"],
  "accounting.account.create": ["accounting.create"],
  "accounting.account.update": ["accounting.create"],
  "accounting.journal.read": ["accounting.read"],
  "accounting.journal.prepare": [
    "accounting.create",
    "accounting.draft.create",
    "accounting.journal.create",
    "accounting.journal.submit",
  ],
  "accounting.journal.approve": ["accounting.approve"],
  "accounting.post": ["accounting.approve"],
  "accounting.reverse": [
    "accounting.journal.cancel",
    "accounting.invoice.cancel",
  ],
  "accounting.ledger.read": ["accounting.read"],
  "accounting.audit.read": ["accounting.read"],
  "accounting.document.read": ["accounting.read", "accounting.invoice.read"],
  "accounting.document.approve": ["accounting.approve"],
  "accounting.invoice.read": ["accounting.read"],
  "accounting.invoice.create": ["accounting.create"],
  "accounting.invoice.update": ["accounting.create"],
  "accounting.sales-invoice.prepare": [
    "accounting.create",
    "accounting.invoice.create",
    "accounting.invoice.submit",
  ],
  "accounting.sales-invoice.approve": ["accounting.approve"],
  "accounting.purchase-invoice.prepare": [
    "accounting.create",
    "accounting.invoice.create",
    "accounting.invoice.submit",
  ],
  "accounting.purchase-invoice.approve": ["accounting.approve"],
  "accounting.credit-note.prepare": [
    "accounting.create",
    "accounting.invoice.create",
    "accounting.invoice.submit",
  ],
  "accounting.debit-note.prepare": [
    "accounting.create",
    "accounting.invoice.create",
    "accounting.invoice.submit",
  ],
  "accounting.correction.approve": ["accounting.approve"],
  "accounting.payment.read": ["accounting.read"],
  "accounting.payment.create": ["accounting.create"],
  "accounting.payment.prepare": [
    "accounting.create",
    "accounting.payment.create",
    "accounting.payment.submit",
  ],
  "accounting.payment.approve": ["accounting.approve"],
  "accounting.payment.post": ["accounting.approve"],
  "accounting.payment.allocate": ["accounting.create", "accounting.payment.submit"],
  "accounting.payment.reverse": ["accounting.reverse"],
  "accounting.receipt.prepare": [
    "accounting.create",
    "accounting.payment.create",
    "accounting.payment.submit",
  ],
  "accounting.reports.view": ["accounting.read"],
};

const ACCOUNTING_READ_PERMISSION_BUNDLE = [
  "accounting.dashboard.view",
  "accounting.account.read",
  "accounting.audit.read",
  "accounting.document.read",
  "accounting.invoice.read",
  "accounting.journal.read",
  "accounting.ledger.read",
  "accounting.payment.read",
  "accounting.reports.view",
] as const;

const ACCOUNTING_FULL_PERMISSION_BUNDLE = [
  ...ACCOUNTING_READ_PERMISSION_BUNDLE,
  "crm.invoice.manage",
  "accounting.account.create",
  "accounting.account.update",
  "accounting.approval_policy.admin",
  "accounting.capability-policy.approve",
  "accounting.capability-policy.manage",
  "accounting.capability-policy.read",
  "accounting.correction.approve",
  "accounting.credit-note.prepare",
  "accounting.debit-note.prepare",
  "accounting.depreciation.integrate",
  "accounting.document.approve",
  "accounting.draft.create",
  "accounting.exchange_rate.maintain",
  "accounting.integration.manual-review",
  "accounting.integration.post",
  "accounting.integration.retry",
  "accounting.invoice.cancel",
  "accounting.invoice.create",
  "accounting.invoice.submit",
  "accounting.invoice.update",
  "accounting.journal.approve",
  "accounting.journal.cancel",
  "accounting.journal.create",
  "accounting.journal.prepare",
  "accounting.journal.submit",
  "accounting.number_series.admin",
  "accounting.outbox.manual-review",
  "accounting.outbox.retry",
  "accounting.partner-transaction.prepare",
  "accounting.payment.allocate",
  "accounting.payment.approve",
  "accounting.payment.create",
  "accounting.payment.post",
  "accounting.payment.prepare",
  "accounting.payment.reverse",
  "accounting.payment.submit",
  "accounting.period_lock.approve",
  "accounting.period_lock.request",
  "accounting.post",
  "accounting.purchase-invoice.approve",
  "accounting.purchase-invoice.prepare",
  "accounting.readiness.read",
  "accounting.receipt.prepare",
  "accounting.recurring-occurrence.process",
  "accounting.recurring-template.admin",
  "accounting.replace",
  "accounting.reverse",
  "accounting.rounding_policy.admin",
  "accounting.sales-invoice.approve",
  "accounting.sales-invoice.prepare",
  "accounting.settings.manage",
] as const;

type AccountingDepartmentAccessContext = {
  departmentCode: string | null;
  departmentName: string | null;
  roleNames: string[];
};

type PermissionBundle = {
  keys: string[];
  departmentContext: AccountingDepartmentAccessContext;
};

function normalizeDepartmentIdentifier(value: string | null | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z]/g, "");
}

function isAccountsDepartment(context: AccountingDepartmentAccessContext) {
  const identifiers = [
    normalizeDepartmentIdentifier(context.departmentCode),
    normalizeDepartmentIdentifier(context.departmentName),
  ].filter(Boolean);
  return identifiers.some((identifier) =>
    ["accounts", "accounting", "acccounts"].includes(identifier),
  );
}

function normalizeRoleName(value: string) {
  return value.trim().toLowerCase();
}

export function getDepartmentScopedPermissionKeys(
  context: AccountingDepartmentAccessContext,
  existingKeys: Iterable<string> = [],
) {
  if (!isAccountsDepartment(context)) return new Set<string>();

  const existingKeySet = new Set(existingKeys);
  const roleNames = context.roleNames.map(normalizeRoleName);

  if (roleNames.some((roleName) => roleName === "manager" || roleName === "director")) {
    return new Set(ACCOUNTING_FULL_PERMISSION_BUNDLE);
  }

  if (roleNames.includes("management")) {
    return new Set(ACCOUNTING_READ_PERMISSION_BUNDLE);
  }

  if (roleNames.some((roleName) => roleName === "employee" || roleName === "tl")) {
    return new Set(ACCOUNTING_READ_PERMISSION_BUNDLE);
  }

  if (Array.from(existingKeySet).some((key) => key.startsWith("accounting."))) {
    return new Set<string>();
  }

  return new Set(ACCOUNTING_READ_PERMISSION_BUNDLE);
}

// Process-level in-memory cache — shared across all concurrent requests in the same
// Node process. Eliminates thundering herd when unstable_cache TTL expires and multiple
// simultaneous requests (page + API routes) all miss the cross-request cache at once.
const permMemCache = new Map<string, { bundle: PermissionBundle; expiresAt: number }>();
const PERM_MEM_TTL = 5 * 60 * 1000; // 5 minutes, matches unstable_cache revalidate

async function loadPermissionBundleFromDb(userId: string): Promise<PermissionBundle> {
  const [rows, user] = await Promise.all([
    db.$queryRaw<{ key: string }[]>`
      SELECT DISTINCT p."key"
      FROM "UserRole" ur
      INNER JOIN "RolePermission" rp ON rp."roleId" = ur."roleId"
      INNER JOIN "Permission" p ON p."id" = rp."permissionId"
      WHERE ur."userId" = ${userId}
    `,
    db.user.findUnique({
      where: { id: userId },
      select: {
        department: {
          select: {
            code: true,
            name: true,
          },
        },
        roles: {
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    keys: rows.map((row) => row.key),
    departmentContext: {
      departmentCode: user?.department?.code ?? null,
      departmentName: user?.department?.name ?? null,
      roleNames: user?.roles.map((assignment) => assignment.role.name) ?? [],
    },
  };
}

export class ForbiddenError extends Error {
  constructor(key: string) {
    super(`Forbidden: missing permission ${key}`);
    this.name = "ForbiddenError";
  }
}

export function apiError(error: unknown) {
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: error.message } }, { status: 403 });
  }
  const msg = error instanceof Error ? error.message : "Internal error";
  return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: msg } }, { status: 500 });
}

const loadCachedPermissionBundle = unstable_cache(
  loadPermissionBundleFromDb,
  ["rbac:user-permission-bundle"],
  {
    tags: [RBAC_PERMISSIONS_TAG],
    revalidate: 300,
  },
);

async function loadPermissionBundle(userId: string): Promise<PermissionBundle> {
  const now = Date.now();
  const hit = permMemCache.get(userId);
  if (hit && hit.expiresAt > now) return hit.bundle;

  let bundle: PermissionBundle;
  try {
    bundle = await loadCachedPermissionBundle(userId);
  } catch (error) {
    if (error instanceof Error && error.message.includes("incrementalCache missing")) {
      bundle = await loadPermissionBundleFromDb(userId);
    } else {
      throw error;
    }
  }

  permMemCache.set(userId, { bundle, expiresAt: now + PERM_MEM_TTL });
  return bundle;
}

function loadDepartmentScopedPermissionKeys(
  departmentContext: AccountingDepartmentAccessContext,
  existingKeys: Iterable<string>,
) {
  return getDepartmentScopedPermissionKeys(departmentContext, existingKeys);
}

export function expandPermissionKeys(keys: Iterable<string>): Set<string> {
  const expanded = new Set(keys);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [permission, compatibleKeys] of Object.entries(
      PERMISSION_COMPATIBILITY,
    )) {
      if (expanded.has(permission)) continue;
      if (compatibleKeys.some((key) => expanded.has(key))) {
        expanded.add(permission);
        changed = true;
      }
    }
  }
  return expanded;
}

export function invalidateRbacCache() {
  permMemCache.clear();
  try {
    revalidateTag(RBAC_PERMISSIONS_TAG, "max");
  } catch (error) {
    if (!(error instanceof Error && error.message.includes("incrementalCache missing"))) {
      throw error;
    }
  }
}

// Load all permission keys for a user (in-memory cache → unstable_cache → DB)
export const loadUserPermissions = cache(async (userId: string): Promise<Set<string>> => {
  return timeBlock(`rbac:loadUserPermissions`, async () => {
    const { keys, departmentContext } = await loadPermissionBundle(userId);
    const departmentScopedKeys = await loadDepartmentScopedPermissionKeys(
      departmentContext,
      keys,
    );
    return expandPermissionKeys([...keys, ...departmentScopedKeys]);
  }, 50);
});

export async function can(userId: string, permissionKey: string): Promise<boolean> {
  const perms = await loadUserPermissions(userId);
  return perms.has(permissionKey);
}

export async function canAll(userId: string, keys: string[]): Promise<boolean> {
  const perms = await loadUserPermissions(userId);
  return keys.every((k) => perms.has(k));
}

// Throws ForbiddenError if user lacks permission — use in server actions and route handlers
export async function requirePermission(userId: string, permissionKey: string): Promise<void> {
  const allowed = await can(userId, permissionKey);
  if (!allowed) {
    throw new ForbiddenError(permissionKey);
  }
}

// Serialisable caps object for client-side nav gating
export async function loadCaps(userId: string): Promise<Caps> {
  const perms = await loadUserPermissions(userId);
  const result: Record<string, boolean> = {};
  for (const key of perms) {
    result[key] = true;
  }
  return result;
}
