import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  MonolithAction,
  MonolithBadge,
  MonolithEmptyState,
  MonolithPage,
  MonolithSpecLabel,
  MonolithSurface,
} from "@/components/ui/foundation";

describe("Monolith foundation primitives", () => {
  it("preserves the dashboard page and panel class contracts", () => {
    expect(renderToStaticMarkup(<MonolithPage className="custom" />)).toBe(
      '<div class="mnx-dashboard-page custom"></div>',
    );
    expect(
      renderToStaticMarkup(
        <MonolithSurface as="section" className="mnx-organization-workspace" />,
      ),
    ).toBe(
      '<section class="mnx-panel mnx-organization-workspace"></section>',
    );
  });

  it("preserves action, badge, label, and empty-state markup", () => {
    expect(
      renderToStaticMarkup(
        <MonolithAction variant="primary" className="mnx-button-wide">
          Continue
        </MonolithAction>,
      ),
    ).toBe(
      '<button type="button" class="mnx-button mnx-button-primary mnx-button-wide">Continue</button>',
    );
    expect(
      renderToStaticMarkup(
        <MonolithBadge tone="warning"><i />Today</MonolithBadge>,
      ),
    ).toBe(
      '<span class="mnx-badge mnx-badge-warning"><i></i>Today</span>',
    );
    expect(
      renderToStaticMarkup(
        <MonolithSpecLabel as="p">DASHBOARD UNAVAILABLE</MonolithSpecLabel>,
      ),
    ).toBe(
      '<p class="mnx-dashboard-spec-label">DASHBOARD UNAVAILABLE</p>',
    );
    expect(
      renderToStaticMarkup(
        <MonolithEmptyState className="mnx-table-empty" />,
      ),
    ).toBe(
      '<div class="mnx-empty-state mnx-table-empty"></div>',
    );
  });
});
