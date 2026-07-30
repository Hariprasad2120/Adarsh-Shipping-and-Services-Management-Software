import { NativeSelect } from "@/components/ui/native-select";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ExternalLink,
  Filter,
  FolderKanban,
  ListFilter,
  PackageCheck,
  Search,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableHead,
  DataTableHeader,
  DataTableToolbar,
} from "@/components/data-display/data-table";
import { getChaJobStatusBadgeVariant, getChaPriorityBadgeVariant, getChaStageBadgeVariant } from "@/lib/cha-badges";
import { requirePortalSession } from "@/modules/customer-portal/auth";
import {
  getCustomerPortalShipmentsData,
  parseCustomerPortalShipmentFilters,
} from "@/modules/customer-portal/shipments";

export default async function CustomerPortalShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePortalSession();
  const filters = parseCustomerPortalShipmentFilters(await searchParams);
  const data = await getCustomerPortalShipmentsData(session, filters);

  return (
    <div className="space-y-6">
      <section className="monolith-card monolith-accent rounded-xl border border-mono-border/50 bg-mono-card px-5 py-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="monolith-label">CHA Customer Shipments</p>
            <h2 className="monolith-h1 text-mono-text">Shipment Catalogue</h2>
            <p className="max-w-3xl text-sm text-mono-muted">
              Browse the CHA jobs linked to {session.portalUser.customer.name}, narrow them by status and stage, and
              open each shipment&apos;s workspace for read-only documents, checklist decisions, queries, recent updates,
              and optional extra customer uploads.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/customer-portal/dashboard">
              <Button variant="outline" size="sm" className="gap-1.5">
                Dashboard
                <ExternalLink className="size-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Shipments"
          value={data.summary.totalShipments}
          helper="All CHA jobs linked to this customer account"
          icon={<FolderKanban size={16} />}
        />
        <StatCard
          title="Active Shipments"
          value={data.summary.activeShipments}
          helper="Shipments still moving through the CHA workflow"
          icon={<PackageCheck size={16} />}
        />
        <StatCard
          title="Awaiting Customer Action"
          value={data.summary.awaitingCustomerAction}
          helper="Jobs with checklist or query follow-up"
          icon={<TriangleAlert size={16} />}
          tone={data.summary.awaitingCustomerAction > 0 ? "warning" : "primary"}
        />
        <StatCard
          title="Recently Completed"
          value={data.summary.recentlyCompletedShipments}
          helper="Filed or completed shipments from the last 30 days"
          icon={<PackageCheck size={16} />}
        />
      </section>

      <Card className="monolith-card monolith-accent rounded-xl border border-mono-border/45">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <span className="monolith-icon-badge">
              <Filter size={16} />
            </span>
            <div>
              <CardTitle>Search And Filters</CardTitle>
              <p className="text-xs text-mono-muted">Server-side filters scoped only to this customer account.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 gap-4 lg:grid-cols-12" method="get">
            <div className="lg:col-span-4">
              <label className="monolith-label block">Search</label>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-mono-muted" />
                <input
                  name="q"
                  defaultValue={data.filters.q}
                  placeholder="Job number, shipment title, or customer ref"
                  className="w-full pl-10"
                />
              </div>
            </div>

            <FilterSelect
              name="stage"
              label="Stage"
              value={data.filters.stage ?? ""}
              options={data.filterOptions.stages}
            />
            <FilterSelect
              name="status"
              label="Status"
              value={data.filters.status ?? ""}
              options={data.filterOptions.statuses.map((value) => ({ value, label: value.replaceAll("_", " ") }))}
            />
            <FilterSelect
              name="priority"
              label="Priority"
              value={data.filters.priority ?? ""}
              options={data.filterOptions.priorities.map((value) => ({ value, label: value.replaceAll("_", " ") }))}
            />
            <FilterSelect
              name="attention"
              label="Attention"
              value={data.filters.attention}
              options={[
                { value: "all", label: "All Shipments" },
                { value: "needs_action", label: "Needs Customer Action" },
              ]}
            />
            <FilterSelect
              name="completion"
              label="Completion"
              value={data.filters.completion}
              options={[
                { value: "all", label: "All States" },
                { value: "recent", label: "Recently Completed" },
              ]}
            />
            <FilterSelect
              name="sort"
              label="Sort"
              value={data.filters.sort}
              options={[
                { value: "updatedAt_desc", label: "Last Updated" },
                { value: "createdAt_desc", label: "Created Date" },
                { value: "eta_asc", label: "Target / ETA" },
              ]}
            />

            <div className="flex items-end gap-2 lg:col-span-12">
              <Button size="sm" type="submit" className="gap-1.5">
                <ListFilter className="size-3.5" />
                Apply Filters
              </Button>
              <Link href="/customer-portal/shipments">
                <Button variant="outline" size="sm">Reset</Button>
              </Link>
              <p className="ml-auto text-xs text-mono-muted">
                Showing <span className="monolith-numeric text-mono-text">{data.totalResults}</span> shipment{data.totalResults === 1 ? "" : "s"}
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      <DataTable className="border border-mono-border/45">
        <DataTableToolbar className="bg-mono-card">
          <div className="flex items-center gap-3">
            <span className="monolith-icon-badge">
              <FolderKanban size={16} />
            </span>
            <div>
              <h2 className="monolith-h2 text-mono-text">Shipments</h2>
              <p className="text-xs text-mono-muted">Read-only view of customer-scoped CHA jobs and follow-up indicators.</p>
            </div>
          </div>
        </DataTableToolbar>
        {data.sectionErrors.shipments ? (
          <SectionErrorRow colSpan={8} message={data.sectionErrors.shipments} />
        ) : (
          <>
            <DataTableHeader>
              <tr>
                <DataTableHead>Shipment</DataTableHead>
                <DataTableHead>Customer Ref</DataTableHead>
                <DataTableHead>Current Stage</DataTableHead>
                <DataTableHead>Status</DataTableHead>
                <DataTableHead>Priority</DataTableHead>
                <DataTableHead>Attention</DataTableHead>
                <DataTableHead>Last Updated</DataTableHead>
                <DataTableHead>Target / ETA</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {data.shipments.length === 0 ? (
                <DataTableEmpty
                  colSpan={8}
                  message={data.summary.totalShipments === 0
                    ? "No CHA shipments are linked to this customer account yet."
                    : "No shipments match the current filters."}
                />
              ) : (
                data.shipments.map((shipment) => (
                  <tr key={shipment.id}>
                    <DataTableCell className="font-medium">
                      <Link href={shipment.href} className="text-[#F9D972] transition-colors hover:text-[#E8C85D]">
                        {shipment.jobNumber}
                      </Link>
                      <div className="mt-1 text-xs text-mono-muted">{shipment.title}</div>
                    </DataTableCell>
                    <DataTableCell className="text-mono-muted">{shipment.customerRef || "—"}</DataTableCell>
                    <DataTableCell>
                      <Badge variant={getChaStageBadgeVariant(shipment.stageKey)}>{shipment.stageLabel}</Badge>
                    </DataTableCell>
                    <DataTableCell>
                      <Badge variant={getChaJobStatusBadgeVariant(shipment.status)}>{shipment.status.replaceAll("_", " ")}</Badge>
                    </DataTableCell>
                    <DataTableCell>
                      <Badge variant={getChaPriorityBadgeVariant(shipment.priority)}>{shipment.priority.replaceAll("_", " ")}</Badge>
                    </DataTableCell>
                    <DataTableCell>
                      {shipment.hasCustomerAction ? (
                        <div className="space-y-2">
                          <Badge variant="warning">Needs Follow-Up</Badge>
                          <div className="text-xs text-mono-muted">
                            {buildAttentionSummary(shipment)}
                          </div>
                        </div>
                      ) : (
                        <Badge variant="success">Up To Date</Badge>
                      )}
                    </DataTableCell>
                    <DataTableCell className="text-mono-muted">
                      <div>{formatDateTime(shipment.updatedAt)}</div>
                      {shipment.recentUpdateAt ? (
                        <div className="mt-1 text-xs">Visible update {formatDateTime(shipment.recentUpdateAt)}</div>
                      ) : null}
                    </DataTableCell>
                    <DataTableCell className="text-mono-muted">
                      {shipment.estimatedClosureDate ? formatDate(shipment.estimatedClosureDate) : "—"}
                    </DataTableCell>
                  </tr>
                ))
              )}
            </DataTableBody>
          </>
        )}
      </DataTable>
    </div>
  );
}

function FilterSelect({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="lg:col-span-2">
      <label className="monolith-label block">{label}</label>
      <NativeSelect name={name} defaultValue={value} className="mt-2 w-full">
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}

function StatCard({
  title,
  value,
  helper,
  icon,
  tone = "primary",
}: {
  title: string;
  value: number;
  helper: string;
  icon: ReactNode;
  tone?: "primary" | "warning";
}) {
  const iconStyle = tone === "warning"
    ? { background: "rgba(251,146,60,0.10)", color: "#D88700" }
    : undefined;

  return (
    <Card
      className={`rounded-xl border-mono-border/40 bg-mono-card p-5 ${
        tone === "warning" ? "monolith-card monolith-accent-warning" : "monolith-card monolith-accent"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="monolith-label">{title}</p>
          <p className={`text-3xl monolith-numeric ${tone === "warning" && value > 0 ? "text-[#D88700]" : "text-mono-text"}`}>
            {value}
          </p>
        </div>
        <span className="monolith-icon-badge" style={iconStyle}>
          {icon}
        </span>
      </div>
      <p className="mt-3 text-xs text-mono-muted">{helper}</p>
    </Card>
  );
}

function SectionErrorRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <>
      <DataTableHeader>
        <tr>
          <DataTableHead>Section Status</DataTableHead>
        </tr>
      </DataTableHeader>
      <DataTableBody>
        <DataTableEmpty colSpan={colSpan} message={message} />
      </DataTableBody>
    </>
  );
}

function buildAttentionSummary(shipment: {
  pendingDocumentCount: number;
  pendingChecklistCount: number;
  openQueryCount: number;
}) {
  const parts: string[] = [];
  if (shipment.pendingDocumentCount > 0) parts.push(`${shipment.pendingDocumentCount} doc`);
  if (shipment.pendingChecklistCount > 0) parts.push(`${shipment.pendingChecklistCount} checklist`);
  if (shipment.openQueryCount > 0) parts.push(`${shipment.openQueryCount} query`);
  return parts.join(" • ");
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
