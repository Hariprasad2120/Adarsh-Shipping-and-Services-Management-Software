import {
  AccountingActionLink,
  AccountingRoutePageHeader,
  AccountingSection,
  AccountingTable,
} from "@/components/monolith";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { getAccountingIntegrationWorkspace } from "@/modules/accounting/phase9-workspaces";

export default async function AccountingIntegrationsPage() {
  const { orgId } = await requireAccountingRouteAccess("/accounting/integrations", [
    "accounting.audit.read",
    "accounting.outbox.retry",
    "accounting.integration.manual-review",
  ]);
  const workspace = await getAccountingIntegrationWorkspace(orgId);

  return (
    <>
      <AccountingRoutePageHeader />
      <AccountingSection
        eyebrow="API and integrations"
        title="Source-mapping and event-delivery hub"
        description="Review accounting source mappings, inbox and outbox health, and posting attempts without bypassing the canonical posting boundary."
        actions={
          <AccountingActionLink href="/accounting/outbox">
            Open outbox
          </AccountingActionLink>
        }
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Source system</th>
              <th>Source type</th>
              <th>Target document</th>
              <th>Target module</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {workspace.sourceMappings.map((mapping) => (
              <tr key={mapping.id}>
                <td>{mapping.sourceSystem}</td>
                <td>{mapping.sourceType}</td>
                <td>{mapping.targetDocumentType}</td>
                <td>{mapping.targetModule}</td>
                <td>{mapping.isActive ? "Active" : "Inactive"}</td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
      </AccountingSection>
      <AccountingSection
        eyebrow="Integration inbox"
        title="Inbound evidence register"
        description="Recent inbound snapshots and posting attempts show whether upstream payloads are landing cleanly before canonical document preparation."
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Inbox status</th>
              <th>Source system</th>
              <th>Source type</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {workspace.inbox.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.status}</td>
                <td>{entry.sourceSystem}</td>
                <td>{entry.messageType}</td>
                <td>{new Date(entry.createdAt).toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
      </AccountingSection>
      <AccountingSection
        eyebrow="Outbox"
        title="Recent publication attempts"
        description="These events and posting attempts back the external API and integration surface without directly posting to outside systems."
        actions={
          <AccountingActionLink href="/api/accounting/integrations">
            API
          </AccountingActionLink>
        }
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Event</th>
              <th>Destination</th>
              <th>Status</th>
              <th>Attempts</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {workspace.outbox.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.eventType}</td>
                <td>{entry.destination}</td>
                <td>{entry.status}</td>
                <td>{entry.attemptCount}</td>
                <td>{new Date(entry.createdAt).toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
      </AccountingSection>
    </>
  );
}
