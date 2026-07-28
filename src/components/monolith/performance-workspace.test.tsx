import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  getPerformanceRouteMeta,
  PerformanceCard,
  PerformanceControlButton,
  PerformanceControlInput,
  PerformanceControlSelect,
  PerformanceControlTextarea,
  PerformanceProgress,
  PerformanceSection,
  PerformanceStatus,
  PerformanceSummary,
  PerformanceSummaryGrid,
  PerformanceTable,
  PerformanceTableBody,
  PerformanceTableCell,
  PerformanceTableHead,
  PerformanceTableHeader,
  PerformanceTableRow,
  PerformanceTabs,
} from "./performance-workspace";

describe("Performance and learning production components", () => {
  it("maps exact and dynamic AMS and LMS routes", () => {
    expect(getPerformanceRouteMeta("/ams/appraisals").title).toBe("Appraisals");
    expect(getPerformanceRouteMeta("/ams/appraisals/appraisal-1").title).toBe(
      "Appraisal detail",
    );
    expect(
      getPerformanceRouteMeta("/ams/appraisals/appraisal-1/management-review")
        .title,
    ).toBe("Management calibration");
    expect(
      getPerformanceRouteMeta("/ams/my-appraisal/appraisal-1/self-assessment")
        .title,
    ).toBe("Self-assessment");
    expect(getPerformanceRouteMeta("/ams/assets/asset-1").title).toBe(
      "Asset detail",
    );
    expect(getPerformanceRouteMeta("/lms/my-learning").title).toBe(
      "My learning",
    );
  });

  it("renders shared performance surfaces, statuses, tabs, and tables", () => {
    const markup = renderToStaticMarkup(
      <>
        <PerformanceSummaryGrid>
          <PerformanceSummary label="Active appraisals" value={12} />
        </PerformanceSummaryGrid>
        <PerformanceSection>
          <PerformanceCard>
            <PerformanceStatus variant="success">Completed</PerformanceStatus>
          </PerformanceCard>
        </PerformanceSection>
        <PerformanceTabs>
          <PerformanceControlButton role="tab">Goals</PerformanceControlButton>
        </PerformanceTabs>
        <PerformanceTable>
          <PerformanceTableHeader>
            <PerformanceTableRow>
              <PerformanceTableHead>Employee</PerformanceTableHead>
            </PerformanceTableRow>
          </PerformanceTableHeader>
          <PerformanceTableBody>
            <PerformanceTableRow>
              <PerformanceTableCell>Asha Rao</PerformanceTableCell>
            </PerformanceTableRow>
          </PerformanceTableBody>
        </PerformanceTable>
      </>,
    );

    expect(markup).toContain("mnx-performance-summary-grid");
    expect(markup).toContain("mnx-performance-section");
    expect(markup).toContain("mnx-performance-card");
    expect(markup).toContain("mnx-badge-success");
    expect(markup).toContain("mnx-performance-tabs");
    expect(markup).toContain("mnx-performance-table-shell");
  });

  it("renders every standard control through shared contracts", () => {
    const markup = renderToStaticMarkup(
      <>
        <PerformanceControlButton>Review</PerformanceControlButton>
        <PerformanceControlInput aria-label="Employee" />
        <PerformanceControlInput type="checkbox" aria-label="Select employee" />
        <PerformanceControlInput type="range" aria-label="Progress" />
        <PerformanceControlSelect aria-label="Cycle">
          <option>Annual</option>
        </PerformanceControlSelect>
        <PerformanceControlTextarea aria-label="Notes" />
        <PerformanceProgress label="Appraisal progress" value={72} />
      </>,
    );

    expect(markup).toContain("mnx-button-primary");
    expect(markup).toContain("mnx-field-control");
    expect(markup).toContain("mnx-choice-control");
    expect(markup).toContain("mnx-range-control");
    expect(markup).toContain("mnx-field-select");
    expect(markup).toContain("mnx-field-textarea");
    expect(markup).toContain('aria-valuenow="72"');
  });
});
