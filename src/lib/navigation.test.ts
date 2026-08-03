import { describe, expect, it } from "vitest";
import { getVisibleSections } from "@/lib/navigation";
import { ACCOUNTING_WORKSPACE_CATALOG } from "@/modules/accounting/workspace-catalog";
import {
  getManagedFeatureIdForPath,
  getManagedModuleSectionIdForPath,
} from "@/modules/core/organisation/module-config";

describe("module visibility helpers", () => {
  it("maps protected paths to their managed module ids", () => {
    expect(getManagedModuleSectionIdForPath("/crm/leads")).toBe("crm");
    expect(getManagedModuleSectionIdForPath("/product-catalogue")).toBe("product-catalogue");
    expect(getManagedModuleSectionIdForPath("/hrms/recruit/employer")).toBe("recruit");
    expect(getManagedModuleSectionIdForPath("/dashboard")).toBeNull();
    expect(getManagedFeatureIdForPath("/cha/labs/import-job-creation")).toBe("cha-labs");
  });

  it("filters nav sections using enabled module ids", () => {
    const caps = {
      "crm.access": true,
      "admin.org.manage": true,
    };

    const sections = getVisibleSections(caps, ["product-catalogue"]);
    const ids = sections.map((section) => section.id);

    expect(ids).toContain("dashboard");
    expect(ids).toContain("product-catalogue");
    expect(ids).toContain("admin");
    expect(ids).not.toContain("crm");
  });

  it("shows Accounting navigation for Accounts-department managers with derived caps", () => {
  it("filters feature-gated nav items using enabled feature ids", () => {
    const caps = {
      "cha.access": true,
    };

    const withoutLabs = getVisibleSections(caps, ["cha"], []);
    const withoutLabsItems =
      withoutLabs.find((section) => section.id === "cha")?.items.map((item) => item.href) ?? [];
    expect(withoutLabsItems).not.toContain("/cha/labs/import-job-creation");

    const withLabs = getVisibleSections(caps, ["cha"], ["cha-labs"]);
    const withLabsItems =
      withLabs.find((section) => section.id === "cha")?.items.map((item) => item.href) ?? [];
    expect(withLabsItems).toContain("/cha/labs/import-job-creation");
  });

  it("keeps top-level accounting configuration workspaces discoverable", () => {
    const caps = {
      "accounting.settings.manage": true,
      "accounting.capability-policy.read": true,
    };

    const sections = getVisibleSections(caps, ["accounting"]);
    const accountingItems =
      sections.find((section) => section.id === "accounting")?.items.map((item) => item.href) ?? [];

    expect(accountingItems).toContain("/accounting/configuration");
    expect(accountingItems).toContain("/accounting/configuration/admin");
  });

  it("derives live accounting navigation from the module-owned workspace catalog", () => {
    const caps = {
      "accounting.dashboard.view": true,
      "accounting.document.read": true,
      "accounting.payment.read": true,
      "accounting.ledger.read": true,
      "accounting.journal.approve": true,
      "accounting.payment.approve": true,
      "accounting.settings.manage": true,
      "crm.invoice.manage": true,
    };

    const section = getVisibleSections(caps, ["accounting"]).find(
      (entry) => entry.id === "accounting",
    );

    expect(section).toBeDefined();
    expect(section?.items.some((item) => item.href === "/accounting")).toBe(true);
    expect(section?.items.some((item) => item.href === "/accounting/approvals")).toBe(true);
    expect(section?.items.some((item) => item.href === "/accounting/configuration")).toBe(true);
    expect(section?.items.some((item) => item.href === "/accounting/journal-entries")).toBe(true);
  });

  it("limits Accounting navigation for read-only Accounting users", () => {
    const caps = {
      "accounting.dashboard.view": true,
      "accounting.document.read": true,
      "accounting.invoice.read": true,
      "accounting.payment.read": true,
      "accounting.journal.read": true,
      "accounting.ledger.read": true,
      "accounting.account.read": true,
      "accounting.reports.view": true,
    };

    const section = getVisibleSections(caps, ["accounting"]).find(
      (entry) => entry.id === "accounting",
    );

    expect(section).toBeDefined();
    expect(section?.items.some((item) => item.href === "/accounting")).toBe(true);
    expect(section?.items.some((item) => item.href === "/accounting/journal-entries")).toBe(true);
    expect(section?.items.some((item) => item.href === "/accounting/accounts")).toBe(true);
    expect(section?.items.some((item) => item.href === "/accounting/approvals")).toBe(false);
    expect(section?.items.some((item) => item.href === "/accounting/configuration")).toBe(false);
  });

  it("derives live accounting navigation from the module-owned workspace catalog", () => {
    const caps = {
      "accounting.dashboard.view": true,
      "accounting.document.read": true,
      "accounting.payment.read": true,
      "accounting.ledger.read": true,
      "accounting.settings.manage": true,
      "accounting.capability-policy.read": true,
      "crm.invoice.manage": true,
    };

    const sections = getVisibleSections(caps, ["accounting"]);
    const accountingItems =
      sections.find((section) => section.id === "accounting")?.items.map((item) => item.href) ?? [];
    const catalogItems = ACCOUNTING_WORKSPACE_CATALOG.filter((item) => {
      if (!item.permission) return true;
      return Array.isArray(item.permission)
        ? item.permission.some((permission) => caps[permission as keyof typeof caps])
        : Boolean(caps[item.permission as keyof typeof caps]);
    }).map((item) => item.href);

    expect(accountingItems).toEqual(catalogItems);
  });
});
