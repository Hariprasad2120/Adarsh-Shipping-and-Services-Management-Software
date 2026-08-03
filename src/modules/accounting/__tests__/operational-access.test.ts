import { describe, expect, it } from "vitest";

import type { Caps } from "@/lib/rbac";

import {
  canAccessAccountingRoute,
  getAccountingRouteAccess,
  hasAnyAccountingPermission,
  normalizeAccountingPath,
} from "../operational-access";

function caps(...permissions: string[]) {
  return Object.fromEntries(
    permissions.map((permission) => [permission, true]),
  ) as Caps;
}

describe("Phase 5 Accounting route access", () => {
  it("normalizes paths and maps dynamic operational routes to their area", () => {
    expect(normalizeAccountingPath("/accounting/payments/abc/")).toBe(
      "/accounting/payments/abc",
    );
    expect(getAccountingRouteAccess("/accounting/documents/abc").area).toBe(
      "sales",
    );
    expect(getAccountingRouteAccess("/accounting/manual-review").area).toBe(
      "outbox",
    );
    expect(getAccountingRouteAccess("/accounting/customization").area).toBe(
      "configuration",
    );
    expect(getAccountingRouteAccess("/accounting/integrations").area).toBe(
      "outbox",
    );
    expect(getAccountingRouteAccess("/accounting/tax-settlement").area).toBe(
      "configuration",
    );
    expect(getAccountingRouteAccess("/accounting/readiness").area).toBe(
      "readiness",
    );
  });

  it("allows a route only through an accepted Accounting permission", () => {
    expect(
      canAccessAccountingRoute(
        caps("accounting.payment.read"),
        "/accounting/payments",
      ),
    ).toBe(true);
    expect(
      canAccessAccountingRoute(caps("hrms.employee.read"), "/accounting/payments"),
    ).toBe(false);
    expect(
      hasAnyAccountingPermission(caps("accounting.ledger.read"), [
        "accounting.document.read",
        "accounting.ledger.read",
      ]),
    ).toBe(true);
  });

  it("does not infer finance access from unrelated administrative roles", () => {
    expect(
      canAccessAccountingRoute(
        caps("admin.settings.manage", "crm.invoice.manage"),
        "/accounting/general-ledger",
      ),
    ).toBe(false);
  });

  it("allows full Accounts access to approval, banking, and configuration routes", () => {
    const fullAccountingCaps = caps(
      "accounting.document.approve",
      "accounting.payment.approve",
      "accounting.journal.approve",
      "accounting.payment.read",
      "accounting.ledger.read",
      "accounting.journal.read",
      "accounting.account.read",
      "accounting.reports.view",
      "accounting.settings.manage",
      "accounting.period_lock.request",
      "accounting.exchange_rate.maintain",
      "accounting.number_series.admin",
      "accounting.approval_policy.admin",
      "accounting.rounding_policy.admin",
    );

    expect(
      canAccessAccountingRoute(fullAccountingCaps, "/accounting/approvals"),
    ).toBe(true);
    expect(
      canAccessAccountingRoute(fullAccountingCaps, "/accounting/banking"),
    ).toBe(true);
    expect(
      canAccessAccountingRoute(fullAccountingCaps, "/accounting/configuration"),
    ).toBe(true);
    expect(
      canAccessAccountingRoute(fullAccountingCaps, "/accounting/journal-entries"),
    ).toBe(true);
  });

  it("keeps read-only Accounting users out of prepare, approval, and configuration routes", () => {
    const readOnlyAccountingCaps = caps(
      "accounting.dashboard.view",
      "accounting.document.read",
      "accounting.invoice.read",
      "accounting.payment.read",
      "accounting.journal.read",
      "accounting.ledger.read",
      "accounting.account.read",
      "accounting.reports.view",
    );

    expect(
      canAccessAccountingRoute(readOnlyAccountingCaps, "/accounting"),
    ).toBe(true);
    expect(
      canAccessAccountingRoute(readOnlyAccountingCaps, "/accounting/general-ledger"),
    ).toBe(true);
    expect(
      canAccessAccountingRoute(readOnlyAccountingCaps, "/accounting/banking"),
    ).toBe(true);
    expect(
      canAccessAccountingRoute(readOnlyAccountingCaps, "/accounting/approvals"),
    ).toBe(false);
    expect(
      canAccessAccountingRoute(readOnlyAccountingCaps, "/accounting/configuration"),
    ).toBe(false);
    expect(
      canAccessAccountingRoute(readOnlyAccountingCaps, "/accounting/recurring"),
    ).toBe(false);
  });
});
