import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AccountingMetric,
  AccountingMetrics,
  AccountingPanel,
  AccountingSection,
  AccountingStatus,
  AccountingTable,
  AccountingToolbar,
  getAccountingBreadcrumbs,
  getAccountingRouteMeta,
} from "./accounting-workspace";

describe("Accounting production components", () => {
  it("maps all route families including dynamic details", () => {
    expect(getAccountingRouteMeta("/accounting").title).toBe("Accounting command centre");
    expect(getAccountingRouteMeta("/accounting/readiness").title).toBe("Accounting readiness evidence");
    expect(getAccountingRouteMeta("/accounting/items/item-1").title).toBe("Item details");
    expect(getAccountingRouteMeta("/accounting/journal-entries/jv-1").title).toBe("Journal entry details");
    expect(getAccountingRouteMeta("/accounting/payment-entries/pay-1").title).toBe("Payment entry details");
    expect(getAccountingRouteMeta("/accounting/sales-invoices/inv-1").title).toBe("Sales invoice details");
    expect(getAccountingRouteMeta("/accounting/purchase-invoices/pinv-1").title).toBe("Purchase invoice details");
    expect(getAccountingRouteMeta("/accounting/reports").title).toBe("Accounting reports");
    expect(getAccountingRouteMeta("/accounting/access-denied").title).toBe("Access denied");
  });

  it("builds compact route-aware breadcrumbs", () => {
    expect(getAccountingBreadcrumbs("/accounting")).toEqual([
      { label: "Accounting command centre" },
    ]);
    expect(getAccountingBreadcrumbs("/accounting/sales-invoices")).toEqual([
      { href: "/accounting", label: "Accounting" },
      { label: "Sales invoices" },
    ]);
    expect(getAccountingBreadcrumbs("/accounting/sales-invoices/inv-1")).toEqual([
      { href: "/accounting", label: "Accounting" },
      { href: "/accounting/sales-invoices", label: "Sales invoices" },
      { label: "Sales invoice details" },
    ]);
  });

  it("renders shared metrics, panels, sections, controls, statuses, and tables", () => {
    const markup = renderToStaticMarkup(
      <>
        <AccountingMetrics>
          <AccountingMetric label="Receivables" value="₹42,000" detail="Outstanding" />
        </AccountingMetrics>
        <AccountingPanel>Panel content</AccountingPanel>
        <AccountingToolbar>Toolbar content</AccountingToolbar>
        <AccountingSection title="Ledger register">
          <AccountingTable>
            <tbody><tr><td>JV-001</td></tr></tbody>
          </AccountingTable>
        </AccountingSection>
        <AccountingStatus status="POSTED" />
        <AccountingTable>
          <tbody><tr><td>JV-001</td></tr></tbody>
        </AccountingTable>
      </>,
    );

    expect(markup).toContain("mnx-accounting-metrics");
    expect(markup).toContain("mnx-accounting-panel");
    expect(markup).toContain("mnx-accounting-toolbar");
    expect(markup).toContain("mnx-accounting-section");
    expect(markup).toContain("mnx-badge-success");
    expect(markup).toContain("mnx-accounting-table");
    expect(markup).toContain('role="region"');
    expect(markup).toContain('aria-label="Ledger register table"');
    expect(markup).toContain('aria-label="Accounting records"');
    expect(markup).toContain('tabindex="0"');
  });
});
