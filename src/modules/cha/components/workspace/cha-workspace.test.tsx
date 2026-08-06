import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ChaMetric,
  ChaMetrics,
  ChaPanel,
  ChaSection,
  ChaTable,
  ChaTabs,
  getChaRouteMeta,
} from "@/modules/cha/components/workspace/cha-workspace";

describe("Expense and CHA production components", () => {
  it("maps exact and dynamic Expense and CHA routes", () => {
    expect(getChaRouteMeta("/cha").title).toBe("CHA command centre");
    expect(getChaRouteMeta("/cha/jobs/new").title).toBe("New CHA job");
    expect(getChaRouteMeta("/cha/process").title).toBe("Process");
    expect(getChaRouteMeta("/cha/jobs/job-1").title).toBe("Job operations");
    expect(getChaRouteMeta("/cha/customers/customer-1/edit").title).toBe(
      "Edit customer",
    );
    expect(getChaRouteMeta("/cha/settings/filing-workflows").title).toBe(
      "Filing workflow builder",
    );
    expect(getChaRouteMeta("/expense").title).toBe("Expense workspace");
  });

  it("renders connected metrics, panels, tabs, sections, and tables", () => {
    const markup = renderToStaticMarkup(
      <>
        <ChaMetrics>
          <ChaMetric label="Open jobs" value={12} detail="In progress" />
          <ChaMetric label="Pending approvals" value={3} />
        </ChaMetrics>
        <ChaPanel>Panel content</ChaPanel>
        <ChaSection title="Filing" description="Controlled filing operations">
          Filing content
        </ChaSection>
        <ChaTabs>
          <button role="tab">Documents</button>
        </ChaTabs>
        <ChaTable>
          <tbody>
            <tr>
              <td>CHA-001</td>
            </tr>
          </tbody>
        </ChaTable>
      </>,
    );

    expect(markup).toContain("mnx-workspace-metrics mnx-cha-metrics");
    expect(markup).toContain("mnx-workspace-metric");
    expect(markup).toContain("mnx-cha-panel");
    expect(markup).toContain("mnx-cha-section");
    expect(markup).toContain("mnx-cha-tabs");
    expect(markup).toContain("mnx-cha-table");
  });
});
