import { Search } from "lucide-react";
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
import { MonolithIcon } from "@/components/ui/monolith-icon";

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

  it("requires explicit surface interactivity", () => {
    expect(renderToStaticMarkup(<MonolithSurface />)).not.toContain(
      "data-interactive",
    );
    expect(
      renderToStaticMarkup(<MonolithSurface interactive tabIndex={0} />),
    ).toContain('data-interactive="true"');
  });

  it("renders theme-ready iconography with one shared contract", () => {
    expect(
      renderToStaticMarkup(
        <MonolithIcon icon={Search} tone="primary" size="sm" surface="soft" />,
      ),
    ).toBe(
      '<span class="mnx-icon" data-size="sm" data-surface="soft" data-tone="primary" aria-hidden="true"><span class="mnx-icon-glyph"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search mnx-icon-svg"><path d="m21 21-4.34-4.34"></path><circle cx="11" cy="11" r="8"></circle></svg></span></span>',
    );
  });
});
