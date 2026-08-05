import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CategorizedFilterMenuPanel } from "./filter-menu";

describe("CategorizedFilterMenuPanel", () => {
  it("renders the active accordion section with view select and checkbox rows", () => {
    const markup = renderToStaticMarkup(
      <CategorizedFilterMenuPanel
        activeCategoryKey="status"
        onActiveCategoryChange={() => undefined}
        sections={[
          {
            key: "status",
            label: "Status",
            value: "Active",
            active: true,
            options: [
              { key: "active", label: "Active", selected: true, onSelect: () => undefined },
              { key: "hold", label: "Hold", note: "Paused work", selected: false, onSelect: () => undefined },
            ],
            viewAllLabel: "View all...",
          },
          {
            key: "priority",
            label: "Priority",
            value: "All",
            active: false,
            options: [{ key: "high", label: "High", selected: false, onSelect: () => undefined }],
          },
        ]}
        headerActionLabel="Save view"
        footer={<button type="button">Apply Filters</button>}
      />,
    );

    expect(markup).toContain("mnx-filter-menu-panel");
    expect(markup).toContain("Save view");
    expect(markup).toContain("Status");
    expect(markup).toContain("Priority");
    expect(markup).toContain("Active");
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain("Apply Filters");
    expect(markup).toContain('type="checkbox"');
    expect(markup).toContain("Paused work");
    expect(markup).toContain("View all...");
  });
});
