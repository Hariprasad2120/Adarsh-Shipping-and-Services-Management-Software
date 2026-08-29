import {
  AccountingActionLink,
  AccountingRoutePageHeader,
  AccountingSection,
  AccountingTable,
} from "@/components/monolith";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { getAccountingCommunicationWorkspace } from "@/modules/accounting/phase9-workspaces";

export default async function AccountingCommunicationsPage() {
  const { orgId } = await requireAccountingRouteAccess("/accounting/communications", [
    "accounting.reports.view",
    "accounting.audit.read",
    "accounting.settings.manage",
  ]);
  const workspace = await getAccountingCommunicationWorkspace(orgId);

  return (
    <>
      <AccountingRoutePageHeader />
      <AccountingSection
        eyebrow="Communications"
        title="Portal and delivery operations"
        description={`${workspace.activePortalUsers} active portal users, ${workspace.portalPublishedQuotations} live portal-published quotations, and ${workspace.queuedAccountingEmails} queued Accounting emails are currently in play.`}
        actions={
          <AccountingActionLink href="/api/accounting/communications">
            API
          </AccountingActionLink>
        }
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Export profile</th>
              <th>Report</th>
              <th>Format</th>
              <th>Delivery</th>
              <th>Portal</th>
            </tr>
          </thead>
          <tbody>
            {workspace.exportProfiles.map((profile) => (
              <tr key={profile.id}>
                <td>{profile.name}</td>
                <td>{profile.reportCode}</td>
                <td>{profile.exportFormat}</td>
                <td>{profile.deliveryMode}</td>
                <td>{profile.isPortalVisible ? "Visible" : "Hidden"}</td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
      </AccountingSection>
      <AccountingSection
        eyebrow="Portal publication"
        title="Customer-facing publication rules"
        description="These publication profiles determine which accounting documents can be surfaced through the customer portal and how long they remain visible."
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Document</th>
              <th>Audience</th>
              <th>Delivery</th>
              <th>Export profile</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {workspace.portalProfiles.map((profile) => (
              <tr key={profile.id}>
                <td>{profile.documentType}</td>
                <td>{profile.audienceType}</td>
                <td>{profile.deliveryMode}</td>
                <td>{profile.exportProfile || "—"}</td>
                <td>{profile.isActive ? "Active" : "Inactive"}</td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
      </AccountingSection>
    </>
  );
}
