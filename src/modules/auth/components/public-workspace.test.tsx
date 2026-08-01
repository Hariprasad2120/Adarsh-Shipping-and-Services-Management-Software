import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  PublicActions,
  PublicBrand,
  PublicDetail,
  PublicDetailGrid,
  PublicHeader,
  PublicInset,
  PublicMonolithShell,
  PublicPanel,
  PublicStage,
  PublicStatus,
  PublicStatusBadge,
} from "@/modules/auth/components/public-workspace";

describe("Public Monolith workspace", () => {
  it("renders the shared public shell and production surfaces", () => {
    const markup = renderToStaticMarkup(
      <PublicMonolithShell data-public-route="test">
        <PublicBrand subtitle="Secure access" />
        <PublicStage>
          <PublicPanel>
            <PublicHeader
              badge={<PublicStatusBadge tone="success">Ready</PublicStatusBadge>}
              eyebrow="Public workflow"
              title="Identity verification"
              description="Shared public composition"
            />
            <PublicStatus
              eyebrow="Status"
              icon={<span>!</span>}
              title="Verification ready"
              tone="info"
            />
            <PublicDetailGrid>
              <PublicDetail label="Record" value="MON-001" />
            </PublicDetailGrid>
            <PublicInset>Protected information</PublicInset>
            <PublicActions>Continue</PublicActions>
          </PublicPanel>
        </PublicStage>
      </PublicMonolithShell>,
    );

    expect(markup).toContain('data-public-route="test"');
    expect(markup).toContain("mnx-public-shell");
    expect(markup).toContain("mnx-public-panel");
    expect(markup).toContain("mnx-public-header");
    expect(markup).toContain("mnx-public-status-info");
    expect(markup).toContain("mnx-public-detail-grid");
    expect(markup).toContain("mnx-badge-success");
  });

  it("supports the workspace frame used by protected root control", () => {
    const markup = renderToStaticMarkup(
      <PublicMonolithShell workspace>Root workspace</PublicMonolithShell>,
    );

    expect(markup).toContain("mnx-public-shell-workspace");
  });
});
