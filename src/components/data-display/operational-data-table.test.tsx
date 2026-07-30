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
            <OperationalVisibleRecords visible={3} total={7} />
            <OperationalFilterButton activeCount={0}>Filter</OperationalFilterButton>
            <button type="button">New Job</button>
          </>
        }
      />,
    );

    expect(markup).toContain("mnx-operational-table-actions");
    expect(markup).toContain("mnx-operational-visible-records");
    expect(markup).toContain('aria-label="Visible records: 3 of 7"');
    expect(markup).toContain('aria-label="0 active filters"');
    expect(markup).toContain("New Job");
  });
});
