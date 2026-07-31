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
});
