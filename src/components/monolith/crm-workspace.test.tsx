import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  CrmButton,
  CrmInput,
  CrmMetric,
  CrmMetrics,
  CrmPanel,
  CrmSection,
  CrmSelect,
  CrmStatus,
  CrmTable,
  CrmTabs,
  CrmTextarea,
  getCrmRouteMeta,
} from "./crm-workspace";

describe("CRM production components", () => {
  it("maps exact and dynamic CRM routes", () => {
    expect(getCrmRouteMeta("/crm/dashboard").title).toBe("CRM command centre");
    expect(getCrmRouteMeta("/crm/leads/lead-1").title).toBe("Lead detail");
    expect(getCrmRouteMeta("/crm/customers/account-1/edit").title).toBe(
      "Edit customer",
    );
    expect(getCrmRouteMeta("/crm/quotes/quote-1").title).toBe("Quote detail");
    expect(getCrmRouteMeta("/crm/tickets/ticket-1").title).toBe(
      "Support case detail",
    );
  });

  it("renders connected metrics, panels, tabs, sections, and tables", () => {
    const markup = renderToStaticMarkup(
      <>
        <CrmMetrics>
          <CrmMetric label="Open leads" value={12} detail="In qualification" />
          <CrmMetric label="Pipeline" value="₹12L" href="/crm/deals" />
        </CrmMetrics>
        <CrmPanel>Panel content</CrmPanel>
        <CrmSection title="Pipeline" description="Qualified opportunity work">
          <CrmStatus variant="success">Qualified</CrmStatus>
        </CrmSection>
        <CrmTabs>
          <CrmButton role="tab">Active</CrmButton>
        </CrmTabs>
        <CrmTable>
          <tbody>
            <tr>
              <td>CRM-001</td>
            </tr>
          </tbody>
        </CrmTable>
      </>,
    );

    expect(markup).toContain("mnx-workspace-metrics mnx-crm-metrics");
    expect(markup).toContain("mnx-workspace-metric");
    expect(markup).toContain("mnx-crm-panel");
    expect(markup).toContain("mnx-crm-section");
    expect(markup).toContain("mnx-crm-tabs");
    expect(markup).toContain("mnx-crm-table");
  });

  it("renders all standard controls through shared CRM contracts", () => {
    const markup = renderToStaticMarkup(
      <>
        <CrmButton>Save</CrmButton>
        <CrmInput aria-label="Name" />
        <CrmInput type="checkbox" aria-label="Select" />
        <CrmInput type="range" aria-label="Probability" />
        <CrmSelect aria-label="Stage">
          <option>Qualified</option>
        </CrmSelect>
        <CrmTextarea aria-label="Notes" />
      </>,
    );

    expect(markup).toContain("mnx-button-secondary");
    expect(markup).toContain("mnx-field-control");
    expect(markup).toContain("mnx-choice-control");
    expect(markup).toContain("mnx-range-control");
    expect(markup).toContain("mnx-field-select");
    expect(markup).toContain("mnx-field-textarea");
  });
});
