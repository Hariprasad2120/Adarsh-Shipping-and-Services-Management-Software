"use client";

import { Download } from "lucide-react";
import {
  OperationalDataTable,
  OperationalDataTableHeader,
  OperationalDataTableWrap,
  OperationalTable,
  OperationalTableCell,
  OperationalTableEmpty,
  OperationalTableHead,
} from "@/components/data-display/operational-data-table";
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
  const hasDownloadableDocuments = documents.some(
    (document) => document.isDownloadable,
  );

  return (
    <OperationalDataTable>
      <OperationalDataTableHeader eyebrow="Requirement tracking" title="Document Status">
        <p>Requirement-level status with the latest active customer submission.</p>
      </OperationalDataTableHeader>
      {error ? (
        <OperationalDataTableWrap>
          <OperationalTable>
            <thead>
              <tr>
                <OperationalTableHead>Section Status</OperationalTableHead>
              </tr>
            </thead>
            <tbody>
              <OperationalTableEmpty colSpan={DOCUMENT_TABLE_COL_SPAN}>
                {error}
              </OperationalTableEmpty>
            </tbody>
          </OperationalTable>
        </OperationalDataTableWrap>
      ) : (
        <OperationalDataTableWrap>
          <OperationalTable>
            <thead>
              <tr>
                <OperationalTableHead>Requirement</OperationalTableHead>
                <OperationalTableHead>Requirement Status</OperationalTableHead>
                <OperationalTableHead>Latest Submission</OperationalTableHead>
                <OperationalTableHead>Reviewer Note</OperationalTableHead>
              </tr>
            </thead>
            <tbody>
              {documents.length === 0 ? (
                <OperationalTableEmpty colSpan={DOCUMENT_TABLE_COL_SPAN}>
                  No document requirements are available for this shipment yet.
                </OperationalTableEmpty>
              ) : (
                <>
                  {!hasDownloadableDocuments ? (
                    <tr className="hover:bg-transparent">
                      <OperationalTableCell
                        colSpan={DOCUMENT_TABLE_COL_SPAN}
                        className="text-xs text-mono-muted"
                      >
                        No shipment documents have been shared for download in the
                        portal yet.
                      </OperationalTableCell>
                    </tr>
                  ) : null}
                  {documents.map((document) => (
                    <DocumentRow
                      key={document.requirementId}
                      document={document}
                    />
                  ))}
                </>
              )}
            </tbody>
          </OperationalTable>
        </OperationalDataTableWrap>
      )}
    </OperationalDataTable>
  );
}

function DocumentRow({ document }: { document: ShipmentDocument }) {
  const rowClassName = document.isDownloadable
    ? "mnx-portal-link cursor-pointer transition-colors hover:bg-mono-soft/80 focus-within:bg-mono-soft/80"
    : "";

  const handleActivate = () => {
    if (!document.downloadHref) return;
    window.location.assign(document.downloadHref);
  };

  return (
    <tr
      className={rowClassName}
      onClick={document.isDownloadable ? handleActivate : undefined}
      onKeyDown={
        document.isDownloadable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleActivate();
              }
            }
          : undefined
      }
      role={document.isDownloadable ? "link" : undefined}
      tabIndex={document.isDownloadable ? 0 : undefined}
      aria-label={
        document.isDownloadable && document.latestFileName
          ? `Download ${document.latestFileName}`
          : undefined
      }
    >
      <OperationalTableCell className="font-medium">
        {document.requirementName}
      </OperationalTableCell>
      <OperationalTableCell>
        <Badge
          variant={getChaDocumentStatusBadgeVariant(
            document.requirementStatus.replaceAll(" ", "_"),
          )}
        >
          {document.requirementStatus}
        </Badge>
      </OperationalTableCell>
      <OperationalTableCell className="text-mono-muted">
        {document.latestSubmissionStatus ? (
          <div className="flex min-w-0 items-center gap-2 text-sm text-mono-text">
            {document.latestFileName ? (
              <>
                <Download className="size-3.5 shrink-0 mnx-portal-accent-text" />
                <span className="truncate underline  underline-offset-3">
                  {document.latestFileName}
                </span>
                {document.lastUpdatedAt ? (
                  <span className="shrink-0 text-xs text-mono-muted">
                    {formatDateTime(document.lastUpdatedAt)}
                  </span>
                ) : null}
              </>
            ) : document.lastUpdatedAt ? (
              <span className="text-xs text-mono-muted">
                {formatDateTime(document.lastUpdatedAt)}
              </span>
            ) : null}
          </div>
        ) : (
          "No file shared yet"
        )}
      </OperationalTableCell>
      <OperationalTableCell className="text-mono-muted">
        {document.reviewerComment || "—"}
      </OperationalTableCell>
    </tr>
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
