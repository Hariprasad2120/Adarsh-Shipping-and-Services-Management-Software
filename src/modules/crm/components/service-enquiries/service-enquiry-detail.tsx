"use client";

import { ButtonLink } from "@/components/ui/button";
import {
  CrmPanel,
  CrmSection,
} from "@/modules/crm/components/workspace/crm-workspace";

export type ServiceEnquiryDetailRecord = {
  id: string;
  enquiryRef: string | null;
  status: string;
  serviceType: "FREIGHT_FORWARDING" | "CUSTOMS_CLEARANCE";
  sourceSnapshot: Record<string, unknown> | null;
  pricingSnapshot: Record<string, unknown> | null;
  lead: {
    id: string;
    firstName: string | null;
    lastName: string;
    company: string;
    email: string | null;
    mobile: string | null;
    owner: { id: string; name: string | null; email: string } | null;
  };
  assignedTo: { id: string; name: string | null; email: string } | null;
  assignedManager: { id: string; name: string | null; email: string } | null;
  quotation: { id: string; quotationNumber: string; status: string } | null;
  chaJob: { id: string; jobNumber: string; stage: string; status: string } | null;
};

function readSnapshotValue(
  snapshot: Record<string, unknown> | null,
  ...keys: string[]
) {
  for (const key of keys) {
    const value = snapshot?.[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }
  return "—";
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-wider text-mono-muted">
        {label}
      </div>
      <div className="break-words text-sm text-mono-text">{value}</div>
    </div>
  );
}

function SnapshotPanel({
  title,
  snapshot,
}: {
  title: string;
  snapshot: Record<string, unknown> | null;
}) {
  const formattedSnapshot = JSON.stringify(snapshot ?? {}, null, 2);

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-mono-text">
          {title}
        </h2>
        <span className="rounded-full border border-[var(--mnx-border)] bg-[var(--mnx-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-mono-muted">
          JSON
        </span>
      </div>
      <div className="min-w-0 overflow-hidden rounded-2xl border border-[var(--mnx-border)] bg-[var(--mnx-soft)]/65">
        <pre className="max-h-[28rem] min-w-0 overflow-auto whitespace-pre-wrap break-words p-4 text-xs leading-6 text-mono-text">
          {formattedSnapshot}
        </pre>
      </div>
    </div>
  );
}

export function ServiceEnquiryDetail({
  record,
  backHref,
  title,
}: {
  record: ServiceEnquiryDetailRecord;
  backHref: "/crm/freight-forwarding" | "/crm/customs-clearance";
  title: string;
}) {
  return (
    <div className="min-w-0 space-y-6">
      <CrmSection
        title={title}
        description="Normalized CRM service enquiry detail backed by the service-routing workflow."
        actions={
          <ButtonLink href={backHref} variant="inverse">
            Back to queue
          </ButtonLink>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <DetailField
            label="Enquiry number"
            value={record.enquiryRef || "Pending reference"}
          />
          <DetailField label="Status" value={record.status.replaceAll("_", " ")} />
          <DetailField
            label="Assigned to"
            value={record.assignedTo?.name || "Assignment pending"}
          />
        </div>
      </CrmSection>

      <CrmPanel>
        <div className="grid items-start gap-6 md:grid-cols-2">
          <div className="min-w-0 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-mono-text">
              Customer and cargo
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <DetailField
                label="Customer"
                value={[record.lead.firstName, record.lead.lastName].filter(Boolean).join(" ")}
              />
              <DetailField label="Company" value={record.lead.company} />
              <DetailField label="Email" value={record.lead.email || "—"} />
              <DetailField label="Mobile" value={record.lead.mobile || "—"} />
              <DetailField label="Mode" value={readSnapshotValue(record.sourceSnapshot, "type")} />
              <DetailField
                label="Direction"
                value={readSnapshotValue(record.sourceSnapshot, "seaType")}
              />
              <DetailField
                label="Origin"
                value={readSnapshotValue(record.sourceSnapshot, "pol", "aol")}
              />
              <DetailField
                label="Destination"
                value={readSnapshotValue(record.sourceSnapshot, "pod", "aod")}
              />
              <DetailField
                label="Commodity"
                value={readSnapshotValue(record.sourceSnapshot, "commodity")}
              />
              <DetailField
                label="Weight"
                value={readSnapshotValue(record.sourceSnapshot, "weight")}
              />
            </div>
          </div>

          <div className="min-w-0 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-mono-text">
              Workflow links
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <DetailField
                label="Lead owner"
                value={record.lead.owner?.name || "—"}
              />
              <DetailField
                label="Manager"
                value={record.assignedManager?.name || "—"}
              />
              <DetailField
                label="Quotation"
                value={record.quotation ? `${record.quotation.quotationNumber} (${record.quotation.status})` : "Not linked"}
              />
              <DetailField
                label="CHA job"
                value={record.chaJob ? `${record.chaJob.jobNumber} (${record.chaJob.stage})` : "Not linked"}
              />
            </div>
          </div>
        </div>
      </CrmPanel>

      <CrmPanel>
        <div className="grid items-start gap-6 md:grid-cols-2">
          <SnapshotPanel title="Source snapshot" snapshot={record.sourceSnapshot} />
          <SnapshotPanel title="Pricing snapshot" snapshot={record.pricingSnapshot} />
        </div>
      </CrmPanel>
    </div>
  );
}
