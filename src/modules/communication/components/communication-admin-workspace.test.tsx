import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AdminButton,
  AdminMetric,
  AdminPanel,
  AdminTable,
  getAdminRouteMeta,
} from "@/modules/admin/components/admin-workspace";
import {
  CommunicationBadge,
  CommunicationButton,
  CommunicationMetric,
  CommunicationPanel,
  CommunicationTable,
  getCommunicationRouteMeta,
} from "@/modules/communication/components/workspace/communication-workspace";
import { WorkspaceBadge as AdminBadge } from "@/components/layout/workspace";

describe("Communication and administration production components", () => {
  it("maps every route in both workspace families", () => {
    expect(getCommunicationRouteMeta("/communication").title).toBe(
      "Communication command centre",
    );
    expect(getCommunicationRouteMeta("/communication/mail").title).toBe(
      "Workspace inbox",
    );
    expect(
      getCommunicationRouteMeta("/communication/google-chat-live-view").title,
    ).toBe("Google Chat live view");
    expect(getCommunicationRouteMeta("/communication/settings").title).toBe(
      "Communication settings",
    );

    expect(getAdminRouteMeta("/admin").title).toBe("Admin command centre");
    expect(getAdminRouteMeta("/admin/roles").title).toBe(
      "Roles and permissions",
    );
    expect(getAdminRouteMeta("/admin/sessions").title).toBe("Session monitor");
    expect(getAdminRouteMeta("/admin/google-chat").title).toBe(
      "Google Chat administration",
    );
  });

  it("renders shared metrics, panels, controls, badges, and tables", () => {
    const markup = renderToStaticMarkup(
      <>
        <CommunicationMetric label="Unread" value="12" detail="Inbox" />
        <CommunicationPanel>Mail workspace</CommunicationPanel>
        <CommunicationButton>Compose</CommunicationButton>
        <CommunicationBadge variant="success">Connected</CommunicationBadge>
        <CommunicationTable>
          <tbody>
            <tr>
              <td>Message</td>
            </tr>
          </tbody>
        </CommunicationTable>
        <AdminMetric label="Sessions" value="4" detail="Active" />
        <AdminPanel>Security workspace</AdminPanel>
        <AdminButton>Review</AdminButton>
        <AdminBadge variant="warning">Pending</AdminBadge>
        <AdminTable>
          <tbody>
            <tr>
              <td>Administrator</td>
            </tr>
          </tbody>
        </AdminTable>
      </>,
    );

    expect(markup).toContain("mnx-communication-panel");
    expect(markup).toContain("mnx-communication-table");
    expect(markup).toContain("mnx-admin-panel");
    expect(markup).toContain("mnx-admin-table");
    expect(markup).toContain("mnx-workspace-metric");
    expect(markup).toContain("mnx-button");
    expect(markup).toContain("mnx-badge-success");
    expect(markup).toContain("mnx-badge-warning");
  });
});
