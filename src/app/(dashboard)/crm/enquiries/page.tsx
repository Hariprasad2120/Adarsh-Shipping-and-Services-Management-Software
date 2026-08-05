import { redirect } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  Clock3,
  GitBranch,
  Plane,
  Plus,
  Ship,
  User,
} from "lucide-react";
import {
  CrmActionLink,
  CrmConfigurationState,
  CrmPermissionState,
} from "@/modules/crm/components/workspace/crm-workspace";
import {
  OperationalDataTable,
  OperationalDataTableFooter,
  OperationalDataTableWrap,
  OperationalMode,
  OperationalPrimaryCell,
  OperationalStatus,
  OperationalTable,
  OperationalTableCell,
  OperationalTableEmpty,
  OperationalTableHead,
} from "@/components/data-display/operational-data-table";
import { OperationalLinkedRow } from "@/components/data-display/operational-linked-row";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import {
  EnquiryRegisterToolbar,
  type EnquiryTypeFilter,
} from "@/modules/crm/components/enquiries/enquiry-register-toolbar";
import { listEnquiries } from "@/modules/crm/service";

interface SearchParams {
  search?: string;
  type?: EnquiryTypeFilter;
}

export default async function CrmEnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return <CrmConfigurationState description="Missing organisation context." />;
  }

  try {
    await requirePermission(session.user.id, "crm.lead.read");
  } catch {
    return <CrmPermissionState description="You do not have permission to view CRM enquiries." />;
  }

  const awaitedParams = await searchParams;
  const search = awaitedParams.search || "";
  const type = awaitedParams.type || "all";

  const [allEnquiriesCount, perishableCount, futureFollowCount, enquiries] =
    await Promise.all([
      db.crmLead.count({
        where: {
          orgId,
          isConverted: false,
          status: { in: ["INTERESTED", "FOLLOW_UP"] },
        },
      }),
      db.crmLead.count({
        where: {
          orgId,
          isConverted: false,
          status: { in: ["INTERESTED", "FOLLOW_UP"] },
          isPerishable: true,
        },
      }),
      db.crmLead.count({
        where: {
          orgId,
          isConverted: false,
          status: { in: ["INTERESTED", "FOLLOW_UP"] },
          isFutureFollowUp: true,
        },
      }),
      listEnquiries(orgId, { search, type }),
    ]);

  const totalForCurrentType =
    type === "perishable"
      ? perishableCount
      : type === "future_follow"
        ? futureFollowCount
        : allEnquiriesCount;

  return (
    <OperationalDataTable>
      <EnquiryRegisterToolbar
        displayedCount={enquiries.length}
        search={search}
        totalCount={totalForCurrentType}
        type={type}
        typeCounts={{
          all: allEnquiriesCount,
          perishable: perishableCount,
          future_follow: futureFollowCount,
        }}
      />

      {enquiries.length === 0 ? (
        <OperationalDataTableWrap>
          <OperationalTable>
            <tbody>
              <OperationalTableEmpty colSpan={6}>
                <div className="flex flex-col items-center justify-center gap-4 p-14 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-mono-soft text-mono-muted">
                    <AlertTriangle className="size-6" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm mnx-text-primary">
                      No active enquiries found
                    </p>
                    <p className="mx-auto max-w-sm text-xs mnx-text-muted">
                      {type === "perishable"
                        ? "No perishable cargo enquiries logged yet."
                        : type === "future_follow"
                          ? "No future follow-up items scheduled yet."
                          : "Active enquiries will populate here when leads are updated to interested or follow-up status."}
                    </p>
                  </div>
                  <CrmActionLink href="/crm/enquiries/new" primary className="gap-1.5">
                    <Plus className="size-4" />
                    <span>Create Enquiry</span>
                  </CrmActionLink>
                </div>
              </OperationalTableEmpty>
            </tbody>
          </OperationalTable>
        </OperationalDataTableWrap>
      ) : (
        <OperationalDataTableWrap>
          <OperationalTable>
            <thead>
              <tr>
                <OperationalTableHead>Enquiry Number</OperationalTableHead>
                <OperationalTableHead>Client / Company</OperationalTableHead>
                <OperationalTableHead>Route & Cargo</OperationalTableHead>
                <OperationalTableHead>Ownership</OperationalTableHead>
                <OperationalTableHead>Flags</OperationalTableHead>
                <OperationalTableHead>Lead Status</OperationalTableHead>
              </tr>
            </thead>
            <tbody>
              {enquiries.map((enquiry) => {
                const details =
                  enquiry.enquiryDetails &&
                  typeof enquiry.enquiryDetails === "object" &&
                  !Array.isArray(enquiry.enquiryDetails)
                    ? (enquiry.enquiryDetails as Record<string, unknown>)
                    : {};
                const isSea = details.type === "Sea";
                const isAir = details.type === "Air";
                const serviceEnquiries = [...(enquiry.serviceEnquiries || [])].sort(
                  (left, right) => {
                    if (left.serviceType === right.serviceType) return 0;
                    return left.serviceType === "FREIGHT_FORWARDING" ? -1 : 1;
                  },
                );
                const primaryRef =
                  serviceEnquiries[0]?.departmentRef ||
                  serviceEnquiries[0]?.enquiryRef ||
                  enquiry.enquiryRef ||
                  "GEN-ENQ";
                const sharedSerial = serviceEnquiries[0]?.sharedSequence
                  ? String(serviceEnquiries[0].sharedSequence).padStart(4, "0")
                  : null;
                const serviceSummary =
                  serviceEnquiries.length > 1
                    ? `${serviceEnquiries.length} routed services`
                    : serviceEnquiries[0]?.serviceType === "CUSTOMS_CLEARANCE"
                      ? "Customs clearance"
                      : "Freight forwarding";

                return (
                  <OperationalLinkedRow
                    key={enquiry.id}
                    href={`/crm/enquiries/${enquiry.id}`}
                    ariaLabel={`Open enquiry ${primaryRef}`}
                  >
                    <OperationalPrimaryCell
                      primary={primaryRef}
                      secondary={
                        sharedSerial
                          ? `Serial ${sharedSerial} - ${serviceSummary}`
                          : serviceSummary
                      }
                    >
                      {serviceEnquiries.length > 1 ? (
                        <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-[var(--mnx-accent)]/20 bg-[var(--mnx-accent)]/8 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--mnx-accent)]">
                          <GitBranch className="size-3" />
                          Split route
                        </span>
                      ) : null}
                    </OperationalPrimaryCell>
                    <OperationalPrimaryCell
                      primary={`${enquiry.firstName ? `${enquiry.firstName} ` : ""}${enquiry.lastName}`}
                      secondary={enquiry.company || "Direct client"}
                    />
                    <OperationalTableCell>
                      {isSea ? (
                        <div className="space-y-1">
                          <OperationalMode icon={<Ship size={13} />}>
                            {String(details.pol || "POL")} - {String(details.pod || "POD")}
                          </OperationalMode>
                          <span className="block text-xs mnx-text-muted">
                            {String(details.commodity || "Commodity pending")} - {String(details.weight || "Weight pending")} - {String(details.seaLclFcl || "Mode pending")}
                          </span>
                        </div>
                      ) : isAir ? (
                        <div className="space-y-1">
                          <OperationalMode icon={<Plane size={13} />}>
                            {String(details.aol || "AOL")} - {String(details.aod || "AOD")}
                          </OperationalMode>
                          <span className="block text-xs mnx-text-muted">
                            {String(details.commodity || "Commodity pending")} - {String(details.weight || "Weight pending")} - {String(details.packages || "Package count pending")}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs mnx-text-muted">
                          No specific route logged
                        </span>
                      )}
                    </OperationalTableCell>
                    <OperationalTableCell>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-1.5 mnx-text-muted">
                          <User className="size-3.5" />
                          <span>{enquiry.owner?.name || "Unassigned"}</span>
                        </div>
                      </div>
                    </OperationalTableCell>
                    <OperationalTableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {enquiry.isPerishable ? (
                          <OperationalStatus tone="warning">Perishable</OperationalStatus>
                        ) : null}
                        {enquiry.isFutureFollowUp ? (
                          <OperationalStatus tone="info">Follow Up</OperationalStatus>
                        ) : null}
                        {!enquiry.isPerishable && !enquiry.isFutureFollowUp ? (
                          <OperationalStatus tone="neutral">Standard</OperationalStatus>
                        ) : null}
                      </div>
                      {enquiry.isFutureFollowUp && enquiry.followUpReminderDate ? (
                        <span className="mt-2 flex items-center gap-1.5 text-[11px] mnx-text-muted">
                          <Calendar className="size-3.5" />
                          <span>
                            {new Date(enquiry.followUpReminderDate).toLocaleDateString("en-IN")}
                          </span>
                        </span>
                      ) : null}
                    </OperationalTableCell>
                    <OperationalTableCell>
                      <div className="space-y-1">
                        <OperationalStatus
                          tone={enquiry.status === "FOLLOW_UP" ? "warning" : "info"}
                        >
                          {enquiry.status === "FOLLOW_UP" ? "Follow Up" : "Interested"}
                        </OperationalStatus>
                        {enquiry.isFutureFollowUp && enquiry.followUpReminderDate ? (
                          <span className="flex items-center gap-1.5 text-[11px] mnx-text-muted">
                            <Clock3 className="size-3.5" />
                            <span>
                              {new Date(enquiry.followUpReminderDate).toLocaleString("en-IN")}
                            </span>
                          </span>
                        ) : null}
                      </div>
                    </OperationalTableCell>
                  </OperationalLinkedRow>
                );
              })}
            </tbody>
          </OperationalTable>
        </OperationalDataTableWrap>
      )}
      <OperationalDataTableFooter
        summary={`Showing ${enquiries.length === 0 ? "0" : `1-${enquiries.length}`} of ${totalForCurrentType} enquiries`}
      />
    </OperationalDataTable>
  );
}
