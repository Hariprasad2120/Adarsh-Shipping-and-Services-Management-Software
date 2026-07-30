"use client";

import { Download } from "lucide-react";
import { DataTable, DataTableBody, DataTableCell, DataTableEmpty, DataTableHead, DataTableHeader, DataTableRow, DataTableToolbar } from "@/components/data-display/data-table";
import { Badge } from "@/components/ui/badge";
import { getChaDocumentStatusBadgeVariant } from "@/lib/cha-badges";
import type { CustomerPortalShipmentDetailData } from "@/modules/customer-portal/shipments";

type ShipmentDocument = CustomerPortalShipmentDetailData["documents"][number];
const DOCUMENT_TABLE_COL_SPAN = 4;

export function DocumentsTableClient({
  documents,
  error,
}: {
  documents: CustomerPortalShipmentDetailData["documents"];
  error?: string;
}) {
  const hasDownloadableDocuments = documents.some((document) => document.isDownloadable);

  return (
    <DataTable
      className="border border-mono-border/45"
      tableClassName="[&_td]:!px-5 [&_td]:!py-4"
    >
      <DataTableToolbar className="bg-mono-card">
        <div className="flex items-center gap-3">
          <span className="monolith-icon-badge">
            <Download size={16} />
          </span>
          <div>
            <h2 className="monolith-h2 text-mono-text">Document Status</h2>
            <p className="text-xs text-mono-muted">Requirement-level status with the latest active customer submission.</p>
          </div>
        </div>
      </DataTableToolbar>
      {error ? (
        <SectionErrorRow colSpan={DOCUMENT_TABLE_COL_SPAN} message={error} />
      ) : (
        <>
          <DataTableHeader>
            <tr>
              <DataTableHead>Requirement</DataTableHead>
              <DataTableHead>Requirement Status</DataTableHead>
              <DataTableHead>Latest Submission</DataTableHead>
              <DataTableHead>Reviewer Note</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {documents.length === 0 ? (
              <DataTableEmpty colSpan={DOCUMENT_TABLE_COL_SPAN} message="No document requirements are available for this shipment yet." />
            ) : (
              <>
                {!hasDownloadableDocuments ? (
                  <DataTableRow className="hover:bg-transparent">
                    <DataTableCell
                      colSpan={DOCUMENT_TABLE_COL_SPAN}
                      className="!px-5 !py-4 text-xs text-mono-muted"
                    >
                      No shipment documents have been shared for download in the portal yet.
                    </DataTableCell>
                  </DataTableRow>
                ) : null}
                {documents.map((document) => (
                  <DocumentRow key={document.requirementId} document={document} />
                ))}
              </>
            )}
          </DataTableBody>
        </>
      )}
    </DataTable>
  );
}

function DocumentRow({ document }: { document: ShipmentDocument }) {
  const rowClassName = document.isDownloadable
    ? "monolith-row-link cursor-pointer transition-colors hover:bg-mono-soft/80 focus-within:bg-mono-soft/80"
    : "";

  const handleActivate = () => {
    if (!document.downloadHref) return;
    window.location.assign(document.downloadHref);
  };

  return (
    <tr
      className={rowClassName}
      onClick={document.isDownloadable ? handleActivate : undefined}
      onKeyDown={document.isDownloadable ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleActivate();
        }
      } : undefined}
      role={document.isDownloadable ? "link" : undefined}
      tabIndex={document.isDownloadable ? 0 : undefined}
      aria-label={document.isDownloadable && document.latestFileName
        ? `Download ${document.latestFileName}`
        : undefined}
    >
      <DataTableCell className="font-medium">{document.requirementName}</DataTableCell>
      <DataTableCell>
        <Badge variant={getChaDocumentStatusBadgeVariant(document.requirementStatus.replaceAll(" ", "_"))}>
          {document.requirementStatus}
        </Badge>
      </DataTableCell>
      <DataTableCell className="text-mono-muted">
        {document.latestSubmissionStatus ? (
          <div className="flex min-w-0 items-center gap-2 text-sm text-mono-text">
            {document.latestFileName ? (
              <>
                <Download className="size-3.5 shrink-0 text-[#F9D972]" />
                <span className="truncate underline decoration-[#F9D972]/45 underline-offset-3">
                  {document.latestFileName}
                </span>
                {document.lastUpdatedAt ? (
                  <span className="shrink-0 text-xs text-mono-muted">
                    {formatDateTime(document.lastUpdatedAt)}
                  </span>
                ) : null}
              </>
            ) : document.lastUpdatedAt ? (
              <span className="text-xs text-mono-muted">{formatDateTime(document.lastUpdatedAt)}</span>
            ) : null}
          </div>
        ) : (
          "No file shared yet"
        )}
      </DataTableCell>
      <DataTableCell className="text-mono-muted">{document.reviewerComment || "—"}</DataTableCell>
    </tr>
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

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
