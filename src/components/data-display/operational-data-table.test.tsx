import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  OperationalDataTableHeader,
  OperationalFilterButton,
  OperationalVisibleRecords,
} from "./operational-data-table";

describe("Operational data-table toolbar", () => {
  it("keeps records and controls inside the canonical header action row", () => {
    const markup = renderToStaticMarkup(
      <OperationalDataTableHeader
        eyebrow="Shipment register"
        title="Active jobs"
        actions={
          <>
            <OperationalFilterButton activeCount={0}>Filter</OperationalFilterButton>
            <button type="button">New Job</button>
            <OperationalVisibleRecords visible={3} total={7} />
          </>
        }
      />,
    );

    expect(markup).toContain("mnx-operational-table-actions");
    expect(markup).toContain("mnx-operational-visible-records");
    expect(markup).toContain('aria-label="Visible records: 3 of 7"');
    expect(markup).toContain('aria-label="0 active filters"');
    expect(markup).toContain("New Job");
    expect(markup.indexOf("mnx-filter-button")).toBeLessThan(markup.indexOf("New Job"));
    expect(markup.indexOf("New Job")).toBeLessThan(
      markup.indexOf("mnx-operational-visible-records"),
    );
  });
});
