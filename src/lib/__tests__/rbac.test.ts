import { describe, expect, it } from "vitest";

import {
  expandPermissionKeys,
  getDepartmentScopedPermissionKeys,
} from "../rbac";

describe("Accounting RBAC compatibility", () => {
  it("expands legacy coarse Accounting grants into current operational permissions", () => {
    const expanded = expandPermissionKeys([
      "accounting.read",
      "accounting.create",
      "accounting.approve",
      "accounting.reverse",
    ]);

    expect(expanded.has("accounting.dashboard.view")).toBe(true);
    expect(expanded.has("accounting.document.read")).toBe(true);
    expect(expanded.has("accounting.invoice.create")).toBe(true);
    expect(expanded.has("accounting.journal.prepare")).toBe(true);
    expect(expanded.has("accounting.payment.prepare")).toBe(true);
    expect(expanded.has("accounting.document.approve")).toBe(true);
    expect(expanded.has("accounting.payment.approve")).toBe(true);
    expect(expanded.has("accounting.post")).toBe(true);
    expect(expanded.has("accounting.payment.post")).toBe(true);
    expect(expanded.has("accounting.payment.reverse")).toBe(true);
  });

  it("expands older draft-submit permissions into prepare flows", () => {
    const expanded = expandPermissionKeys([
      "accounting.journal.submit",
      "accounting.invoice.submit",
      "accounting.payment.submit",
    ]);

    expect(expanded.has("accounting.journal.prepare")).toBe(true);
    expect(expanded.has("accounting.sales-invoice.prepare")).toBe(true);
    expect(expanded.has("accounting.purchase-invoice.prepare")).toBe(true);
    expect(expanded.has("accounting.credit-note.prepare")).toBe(true);
    expect(expanded.has("accounting.debit-note.prepare")).toBe(true);
    expect(expanded.has("accounting.payment.prepare")).toBe(true);
    expect(expanded.has("accounting.receipt.prepare")).toBe(true);
  });

  it("grants full Accounting access to Accounts-department managers", () => {
    const derived = getDepartmentScopedPermissionKeys({
      departmentCode: "ACCCOUNTS",
      departmentName: "Acccounts",
      roleNames: ["Manager"],
    });

    expect(derived.has("accounting.dashboard.view")).toBe(true);
    expect(derived.has("accounting.journal.approve")).toBe(true);
    expect(derived.has("accounting.payment.approve")).toBe(true);
    expect(derived.has("accounting.settings.manage")).toBe(true);
    expect(derived.has("crm.invoice.manage")).toBe(true);
  });

  it("grants read access to Accounts-department management users", () => {
    const derived = getDepartmentScopedPermissionKeys({
      departmentCode: "ACCOUNTS",
      departmentName: "Accounts",
      roleNames: ["Management"],
    });

    expect(derived.has("accounting.dashboard.view")).toBe(true);
    expect(derived.has("accounting.ledger.read")).toBe(true);
    expect(derived.has("accounting.reports.view")).toBe(true);
    expect(derived.has("accounting.payment.prepare")).toBe(false);
    expect(derived.has("accounting.settings.manage")).toBe(false);
  });

  it("grants read-only Accounting access to Accounts-department employees", () => {
    const derived = getDepartmentScopedPermissionKeys({
      departmentCode: "ACCOUNTS",
      departmentName: "Accounts",
      roleNames: ["Employee"],
    });

    expect(derived.has("accounting.document.read")).toBe(true);
    expect(derived.has("accounting.payment.read")).toBe(true);
    expect(derived.has("accounting.journal.read")).toBe(true);
    expect(derived.has("accounting.document.approve")).toBe(false);
    expect(derived.has("accounting.post")).toBe(false);
  });

  it("does not infer Accounting access for non-Accounts managers", () => {
    const derived = getDepartmentScopedPermissionKeys({
      departmentCode: "CUSTOM_BROKER",
      departmentName: "Custom broker",
      roleNames: ["Manager"],
    });

    expect(derived.size).toBe(0);
  });

  it("keeps explicit Accounting permissions additive outside Accounts", () => {
    const derived = getDepartmentScopedPermissionKeys(
      {
        departmentCode: "CUSTOM_BROKER",
        departmentName: "Custom broker",
        roleNames: ["Manager"],
      },
      ["accounting.payment.read"],
    );

    expect(derived.size).toBe(0);
  });
});
