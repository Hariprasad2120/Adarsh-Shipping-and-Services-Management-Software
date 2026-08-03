import {
  AccountingActionLink,
  AccountingRoutePageHeader,
  AccountingSection,
  AccountingTable,
} from "@/components/monolith/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { getAccountingReportBuilderWorkspace } from "@/modules/accounting/phase9-workspaces";

export default async function AccountingReportBuilderPage() {
  const { orgId } = await requireAccountingRouteAccess("/accounting/report-builder", [
    "accounting.reports.view",
    "accounting.settings.manage",
  ]);
  const workspace = await getAccountingReportBuilderWorkspace(orgId);

  return (
    <>
      <AccountingRoutePageHeader />
      <AccountingSection
        eyebrow="Report builder"
        title="Report catalog and export coverage"
        description="Map the implemented live accounting reports to saved export profiles so reporting, delivery, and portal publication stay governed."
        actions={
          <AccountingActionLink href="/api/accounting/reports/catalog">
            API
          </AccountingActionLink>
        }
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Report</th>
              <th>Code</th>
              <th>Saved profiles</th>
              <th>Route</th>
            </tr>
          </thead>
          <tbody>
            {workspace.catalog.map((report) => (
              <tr key={report.code}>
                <td>{report.name}</td>
                <td>{report.code}</td>
                <td>{report.profileCount}</td>
                <td>
                  <AccountingActionLink href={report.route}>
                    Open
                  </AccountingActionLink>
                </td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
      </AccountingSection>
      <AccountingSection
        eyebrow="Saved exports"
        title="Export profile register"
        description="Each profile preserves reporting parameters, file format, and delivery intent for recurring or controlled dispatch."
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Name</th>
              <th>Report</th>
              <th>Format</th>
              <th>Delivery</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {workspace.exportProfiles.map((profile) => (
              <tr key={profile.id}>
                <td>{profile.name}</td>
                <td>{profile.reportCode}</td>
                <td>{profile.exportFormat}</td>
                <td>{profile.deliveryMode}</td>
                <td>{profile.isActive ? "Active" : "Inactive"}</td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
      </AccountingSection>
      <AccountingSection
        eyebrow="Close evidence"
        title="Latest close-run lineage for reporting"
        description="Recent close runs provide the period boundary context that downstream management and statutory reporting should reference."
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Legal entity</th>
              <th>Status</th>
              <th>Close date</th>
            </tr>
          </thead>
          <tbody>
            {workspace.latestCloseRuns.map((run) => (
              <tr key={run.id}>
                <td>{run.legalEntity}</td>
                <td>{run.status}</td>
                <td>{new Date(run.closeDate).toLocaleDateString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
      </AccountingSection>
    </>
  );
}
