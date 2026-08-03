import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  accountingAutomationRuleInputSchema,
  accountingCustomFieldInputSchema,
  accountingWorkspaceModuleInputSchema,
} from "../customization";
import { listAccountingReportCatalog } from "../phase9-workspaces";

describe("Phase 9 late-slice registries", () => {
  it("accepts representative accounting customization payloads", () => {
    expect(
      accountingCustomFieldInputSchema.parse({
        scope: "SALES_INVOICE",
        label: "Customer PO Number",
        dataType: "TEXT",
        helpText: "Captured on sales invoices",
        required: false,
        active: true,
        position: 10,
        options: [],
      }).scope,
    ).toBe("SALES_INVOICE");

    expect(
      accountingAutomationRuleInputSchema.parse({
        name: "Notify on portal publication",
        triggerType: "PORTAL_PUBLISHED",
        targetScope: "PORTAL",
        actionType: "QUEUE_PORTAL_NOTIFICATION",
        conditionsJson: "{\"documentType\":\"QUOTATION\"}",
        configurationJson: "{\"audience\":\"CUSTOMER\"}",
        active: true,
      }).actionType,
    ).toBe("QUEUE_PORTAL_NOTIFICATION");

    expect(
      accountingWorkspaceModuleInputSchema.parse({
        code: "credit-control",
        name: "Credit Control",
        routePath: "/accounting/customer-advances",
        description: "Shared AR control workspace",
        configurationJson: "{\"owner\":\"finance\"}",
        active: true,
      }).routePath,
    ).toBe("/accounting/customer-advances");
  });

  it("publishes a stable report catalog for the report-builder API surface", () => {
    const catalog = listAccountingReportCatalog();
    expect(catalog.some((report) => report.code === "pnl")).toBe(true);
    expect(catalog.some((report) => report.code === "general-ledger")).toBe(
      true,
    );
    expect(catalog.every((report) => report.route.startsWith("/accounting/"))).toBe(
      true,
    );
  });

  it("surfaces the late-phase control routes on the accounting landing page", () => {
    const page = readFileSync(
      join(
        process.cwd(),
        "src/app/(dashboard)/accounting/page.tsx",
      ),
      "utf8",
    );

    expect(page).toContain("/accounting/currency-adjustments");
    expect(page).toContain("/accounting/tax-settlement");
    expect(page).toContain("/accounting/report-builder");
    expect(page).toContain("/accounting/integrations");
    expect(page).toContain("/accounting/customization");
  });
});
