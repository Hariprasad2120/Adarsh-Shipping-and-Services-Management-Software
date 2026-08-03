import { describe, expect, it } from "vitest";
import { getVisibleSections } from "@/lib/navigation";
import { getManagedModuleSectionIdForPath } from "@/modules/core/organisation/module-config";

describe("module visibility helpers", () => {
  it("maps protected paths to their managed module ids", () => {
    expect(getManagedModuleSectionIdForPath("/crm/leads")).toBe("crm");
    expect(getManagedModuleSectionIdForPath("/product-catalogue")).toBe("product-catalogue");
    expect(getManagedModuleSectionIdForPath("/hrms/recruit/employer")).toBe("recruit");
    expect(getManagedModuleSectionIdForPath("/dashboard")).toBeNull();
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
});
