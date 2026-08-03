import { describe, expect, it } from "vitest";

import {
  canAccessAccountingRoute,
  getAccountingRouteAccess,
} from "../operational-access";

describe("banking route access", () => {
  it("maps the Banking route to payment read permissions", () => {
    expect(getAccountingRouteAccess("/accounting/banking")).toEqual({
      area: "payments",
      permissions: [
        "accounting.payment.read",
        "accounting.payment.approve",
        "accounting.payment.prepare",
        "accounting.payment.allocate",
      ],
    });
  });

  it("denies Banking reads without a matching payment capability", () => {
    expect(
      canAccessAccountingRoute({}, "/accounting/banking"),
    ).toBe(false);
    expect(
      canAccessAccountingRoute(
        { "accounting.payment.read": true },
        "/accounting/banking",
      ),
    ).toBe(true);
  });
});
