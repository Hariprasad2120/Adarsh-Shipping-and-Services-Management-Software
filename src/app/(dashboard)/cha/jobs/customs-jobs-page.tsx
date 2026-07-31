import Link from "next/link";
import { redirect } from "next/navigation";
import { BriefcaseBusiness, FilePlus2, ShieldAlert } from "lucide-react";

import {
  WorkspaceBadge,
  WorkspacePage,
  WorkspacePageHeader,
  WorkspacePanel,
  WorkspaceState,
  WorkspaceTable,
} from "@/components/monolith/workspace";
import { getSession } from "@/lib/auth";
import { can, requirePermission } from "@/lib/rbac";
import {
  getChaCustomsFeatureFlags,
  isChaCustomsFeatureEnabled,
} from "@/modules/cha/customs/feature-flags";
import {
  listCustomsJobViewRows,
  type CustomsJobListRow,
} from "@/modules/cha/customs/filing/job-list";
import type { ChaCustomsWorkspaceDirection } from "@/modules/cha/customs/filing/workspace";

function formatDate(value: Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

function short(value: string | null | undefined) {
  return value?.trim() || "-";
}

function getColumns(direction: ChaCustomsWorkspaceDirection) {
  const shared = [
    "Job No",
    "Job Date",
    direction === "IMPORT" ? "BE / IGM No" : "SB No",
    direction === "IMPORT" ? "BE / IGM Date" : "SB Date",
    direction === "IMPORT" ? "BE Type" : "SB Type",
    "Mode",
    "Customs House",
    "Customs Code",
    direction === "IMPORT" ? "Importer" : "Exporter",
    "Branch Serial No",
    direction === "IMPORT" ? "Origin / Shipment" : "Consignee / Country",
    direction === "IMPORT" ? "Country of Origin" : "Buyer / Country",
    direction === "IMPORT" ? "Port of Shipment" : "Port of Discharge",
    direction === "IMPORT" ? "Port of Origin" : "Port of Destination",
    "Invoice No",
    "Scheme",
    "Total Invoice",
    "Total Items",
    "Status",
    "Action",
  ];
  return shared;
}

function renderRow(row: CustomsJobListRow, direction: ChaCustomsWorkspaceDirection) {
  const tabParam = direction === "IMPORT" ? "be-main" : "sb-main";
  return (
    <tr key={row.id}>
      <td>
        <Link href={`/cha/jobs/${row.id}?tab=customsFiling&customsSubtab=${tabParam}`}>
          {row.jobNumber}
        </Link>
      </td>
      <td>{formatDate(row.jobDate)}</td>
      <td>{short(row.referenceNo)}</td>
      <td>{formatDate(row.referenceDate)}</td>
      <td>{short(row.filingType)}</td>
      <td>{short(row.mode)}</td>
      <td>{short(row.customsHouse)}</td>
      <td>{short(row.customsCode)}</td>
      <td>{short(row.primaryPartyName)}</td>
      <td>{short(row.branchSerialNo)}</td>
      <td>{short(row.consigneeOrSupplier || row.consigneeOrSupplierCountry)}</td>
      <td>{short(row.buyerOrOriginCountry)}</td>
      <td>{short(row.portPrimary)}</td>
      <td>{short(row.portSecondary)}</td>
      <td>{short(row.invoiceNo)}</td>
      <td>{short(row.scheme)}</td>
      <td className="mnx-numeric">{row.totalInvoices}</td>
      <td className="mnx-numeric">{row.totalItems}</td>
      <td>
        <WorkspaceBadge variant={row.status === "COMPLETED" ? "success" : "neutral"}>
          {row.status}
        </WorkspaceBadge>
      </td>
      <td>
        <Link
          className="mnx-button mnx-button-outline mnx-button-compact"
          href={`/cha/jobs/${row.id}?tab=customsFiling&customsSubtab=${tabParam}`}
        >
          Open
        </Link>
      </td>
    </tr>
  );
}

export async function CustomsJobsPage({
  direction,
  searchParams,
}: {
  direction: ChaCustomsWorkspaceDirection;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  const orgId = session.user.orgId;
  if (!orgId) redirect("/setup");

  await requirePermission(session.user.id, "cha.job.read");
  const [flags, canViewCustoms, canCreateJob] = await Promise.all([
    getChaCustomsFeatureFlags(orgId),
    can(session.user.id, "cha.customs.filing.view"),
    can(session.user.id, "cha.job.create"),
  ]);
  const requiredFlag =
    direction === "IMPORT" ? "CHA_IMPORT_FILING_WORKSPACE" : "CHA_EXPORT_FILING_WORKSPACE";
  const enabled = isChaCustomsFeatureEnabled(flags, requiredFlag);

  if (!enabled || !canViewCustoms) {
    return (
      <WorkspacePage>
        <WorkspaceState
          variant="permission"
          eyebrow="Customs filing"
          title={`${direction === "IMPORT" ? "Import" : "Export"} jobs unavailable`}
          description="This route is hidden until the matching customs filing feature flag and permission are enabled."
          icon={<ShieldAlert size={22} aria-hidden="true" />}
        />
      </WorkspacePage>
    );
  }

  const params = await searchParams;
  const page = typeof params.page === "string" ? Number.parseInt(params.page, 10) : 1;
  const search = typeof params.search === "string" ? params.search : undefined;
  const data = await listCustomsJobViewRows({
    actorId: session.user.id,
    orgId,
    direction,
    filters: { search, page, pageSize: 15 },
  });
  const columns = getColumns(direction);
  const newHref = `/cha/jobs?new=true&customsDirection=${direction}`;

  return (
    <WorkspacePage>
      <WorkspacePageHeader
        eyebrow="Customs filing"
        title={`${direction === "IMPORT" ? "Import" : "Export"} Jobs`}
        description="Job records remain owned by the standard CHA workspace with customs filing data opened as a job tab."
        icon={<BriefcaseBusiness size={20} aria-hidden="true" />}
        actions={
          canCreateJob ? (
            <Link className="mnx-button mnx-button-primary" href={newHref}>
              <FilePlus2 size={16} aria-hidden="true" />
              New {direction === "IMPORT" ? "Import" : "Export"} Job
            </Link>
          ) : null
        }
      />
      <WorkspacePanel className="p-4">
        <WorkspaceTable scrollLabel={`${direction.toLowerCase()} customs job list`}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.items.length ? (
              data.items.map((row) => renderRow(row, direction))
            ) : (
              <tr>
                <td colSpan={columns.length}>No {direction.toLowerCase()} jobs match this view.</td>
              </tr>
            )}
          </tbody>
        </WorkspaceTable>
        <div className="mt-4 flex items-center justify-between gap-3 text-sm mnx-text-muted">
          <span>
            Showing {data.items.length} of {data.total} jobs
          </span>
          <span>
            Page {data.page} of {Math.max(data.totalPages, 1)}
          </span>
        </div>
      </WorkspacePanel>
    </WorkspacePage>
  );
}
