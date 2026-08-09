"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  OperationalDataTable,
  OperationalDataTableHeader,
  OperationalDataTableWrap,
  OperationalTable,
  OperationalTableCell,
  OperationalTableEmpty,
  OperationalTableHead,
} from "@/components/data-display/operational-data-table";
import type { getCustomerPortalShipmentDetailData } from "@/modules/customer-portal/shipments";

type ChecklistItem = NonNullable<
  Awaited<ReturnType<typeof getCustomerPortalShipmentDetailData>>
>["checklists"][number];

export function ChecklistDecisionsClient({
  checklists,
  error,
}: {
  checklists: ChecklistItem[];
  error?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeChecklistId, setActiveChecklistId] = useState<string | null>(
    null,
  );
  const [reviewChecklistId, setReviewChecklistId] = useState<string | null>(
    null,
  );
  const [rowError, setRowError] = useState<Record<string, string | null>>({});
  const [remarksByChecklistId, setRemarksByChecklistId] = useState<
    Record<string, string>
  >({});
  const reviewChecklist =
    checklists.find((item) => item.id === reviewChecklistId) ?? null;

  const handleDecision = (
    checklistId: string,
    decision: "APPROVED" | "REJECTED",
  ) => {
    setRowError((current) => ({ ...current, [checklistId]: null }));
    setActiveChecklistId(checklistId);
    const remarks = remarksByChecklistId[checklistId]?.trim() || undefined;

    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/customer-portal/checklists/${checklistId}/decision`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ decision, remarks }),
          },
        );

        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (!response.ok) {
          setRowError((current) => ({
            ...current,
            [checklistId]:
              body?.error || "The checklist decision could not be submitted.",
          }));
          return;
        }

        setReviewChecklistId(null);
        router.refresh();
      } catch {
        setRowError((current) => ({
          ...current,
          [checklistId]: "The checklist decision could not be submitted.",
        }));
      } finally {
        setActiveChecklistId(null);
      }
    });
  };

  return (
    <>
    <OperationalDataTable>
      <OperationalDataTableHeader eyebrow="Customer decisions" title="Checklist Decisions">
        <p>
          Download the visible checklist file and approve or reject it once
          your account is ready to respond.
        </p>
      </OperationalDataTableHeader>
      {error ? (
        <OperationalDataTableWrap>
          <OperationalTable>
            <tbody>
              <tr>
                <OperationalTableCell
                  colSpan={5}
                  className="text-center text-mono-muted"
                >
                  {error}
                </OperationalTableCell>
              </tr>
            </tbody>
          </OperationalTable>
        </OperationalDataTableWrap>
      ) : (
        <OperationalDataTableWrap>
          <OperationalTable>
            <thead>
              <tr>
                <OperationalTableHead>Checklist</OperationalTableHead>
                <OperationalTableHead>Version</OperationalTableHead>
                <OperationalTableHead>Portal Status</OperationalTableHead>
                <OperationalTableHead>Visible At</OperationalTableHead>
                <OperationalTableHead>Customer Action</OperationalTableHead>
              </tr>
            </thead>
            <tbody>
              {checklists.length === 0 ? (
                <OperationalTableEmpty colSpan={5}>
                  No customer-visible checklist decisions are available yet.
                </OperationalTableEmpty>
              ) : (
                checklists.map((item) => {
                  const isSubmitting = isPending && activeChecklistId === item.id;
                  return (
                    <tr key={item.id}>
                      <OperationalTableCell className="font-medium">
                        {item.checklistLabel}
                      </OperationalTableCell>
                      <OperationalTableCell className="text-mono-muted">
                        {item.isDownloadable && item.downloadHref ? (
                          <a
                            href={item.downloadHref}
                            className="inline-flex flex-col gap-1 mnx-portal-accent-text hover:underline"
                          >
                            <span>{item.versionLabel || "Checklist File"}</span>
                            {item.fileName ? (
                              <span className="text-xs text-mono-muted no-underline">
                                {item.fileName}
                              </span>
                            ) : null}
                          </a>
                        ) : (
                          item.versionLabel || "—"
                        )}
                      </OperationalTableCell>
                      <OperationalTableCell>
                        <Badge
                          variant={item.canRespond ? "warning" : "secondary"}
                        >
                          {item.approvalStatus}
                        </Badge>
                      </OperationalTableCell>
                      <OperationalTableCell className="text-mono-muted">
                        {item.visibleAt ? formatDateTime(item.visibleAt) : "—"}
                      </OperationalTableCell>
                      <OperationalTableCell>
                        <div className="space-y-2">
                          {item.canRespond ? (
                            <>
                              <Button
                                size="sm"
                                disabled={isSubmitting}
                                onClick={() => {
                                  setRowError((current) => ({
                                    ...current,
                                    [item.id]: null,
                                  }));
                                  setReviewChecklistId(item.id);
                                }}
                              >
                                Review And Decide
                              </Button>
                            </>
                          ) : (
                            <div className="space-y-1">
                              <Badge
                                variant={
                                  item.responseDecision === "REJECTED"
                                    ? "destructive"
                                    : "success"
                                }
                              >
                                {item.responseDecision || item.responseState}
                              </Badge>
                              <div className="text-xs text-mono-muted">
                                {item.responseDecision
                                  ? "This customer account has already responded."
                                  : item.responseState}
                              </div>
                            </div>
                          )}
                          {rowError[item.id] ? (
                            <div className="text-xs mnx-portal-warning-text">
                              {rowError[item.id]}
                            </div>
                          ) : null}
                        </div>
                      </OperationalTableCell>
                    </tr>
                  );
                })
              )}
            </tbody>
          </OperationalTable>
        </OperationalDataTableWrap>
      )}
    </OperationalDataTable>
      <Modal
        open={Boolean(reviewChecklist)}
        onClose={() => {
          if (!isPending) {
            setReviewChecklistId(null);
          }
        }}
        title={
          reviewChecklist
            ? `${reviewChecklist.checklistLabel} ${reviewChecklist.versionLabel ?? ""}`.trim()
            : "Checklist Review"
        }
        description="Review the current checklist file, add any remarks, and approve or reject it from this popup."
        className="max-w-6xl"
      >
        {reviewChecklist ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_360px]">
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-mono-border/35 bg-mono-soft/35 px-4 py-3">
                <div className="min-w-0">
                  <p className="mnx-portal-eyebrow">Visible File</p>
                  <p className="mt-1 text-sm text-mono-text">
                    {reviewChecklist.fileName ||
                      reviewChecklist.versionLabel ||
                      "Checklist File"}
                  </p>
                </div>
                {reviewChecklist.downloadHref ? (
                  <a href={reviewChecklist.downloadHref} className="shrink-0">
                    <Button variant="outline" size="sm">
                      Download File
                    </Button>
                  </a>
                ) : null}
              </div>
              <div className="overflow-hidden rounded-xl border border-mono-border/35 bg-mono-soft/20">
                {reviewChecklist.downloadHref ? (
                  <FilePreview checklist={reviewChecklist} />
                ) : (
                  <div className="flex h-[65vh] items-center justify-center px-6 text-center text-sm text-mono-muted">
                    A preview is not available for this checklist file.
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-4 rounded-xl border border-mono-border/35 bg-mono-card p-5">
              <div>
                <p className="mnx-portal-eyebrow">Portal Status</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="warning">
                    {reviewChecklist.approvalStatus}
                  </Badge>
                  <Badge variant="secondary">
                    {reviewChecklist.visibleAt
                      ? formatDateTime(reviewChecklist.visibleAt)
                      : "Visible now"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor={`checklist-remarks-modal-${reviewChecklist.id}`}
                  className="mnx-portal-eyebrow block text-mono-muted"
                >
                  Remarks
                </label>
                <textarea
                  id={`checklist-remarks-modal-${reviewChecklist.id}`}
                  value={remarksByChecklistId[reviewChecklist.id] ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    setRemarksByChecklistId((current) => ({
                      ...current,
                      [reviewChecklist.id]: value,
                    }));
                    setRowError((current) => ({
                      ...current,
                      [reviewChecklist.id]: null,
                    }));
                  }}
                  placeholder="Add an approval note or rejection reason."
                  rows={8}
                  maxLength={500}
                  disabled={
                    isPending && activeChecklistId === reviewChecklist.id
                  }
                  className="min-h-[200px] w-full rounded-xl border mnx-portal-accent-border bg-mono-card px-4 py-3 text-sm text-mono-text placeholder:text-[var(--color-placeholder)] focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="text-xs text-mono-muted">
                  Remarks are optional for approval and useful for rejection.
                </p>
              </div>

              {rowError[reviewChecklist.id] ? (
                <div className="rounded-xl border mnx-portal-warning-border mnx-portal-warning-surface px-4 py-3 text-sm mnx-portal-warning-text ">
                  {rowError[reviewChecklist.id]}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 pt-1">
                <div className="flex gap-3">
                  <Button
                    variant="destructive"
                    className="h-10 flex-1 basis-0 px-4"
                    disabled={
                      isPending && activeChecklistId === reviewChecklist.id
                    }
                    onClick={() =>
                      handleDecision(reviewChecklist.id, "REJECTED")
                    }
                  >
                    {isPending && activeChecklistId === reviewChecklist.id
                      ? "Submitting..."
                      : "Reject"}
                  </Button>
                  <Button
                    className="h-10 flex-1 basis-0 px-4"
                    disabled={
                      isPending && activeChecklistId === reviewChecklist.id
                    }
                    onClick={() =>
                      handleDecision(reviewChecklist.id, "APPROVED")
                    }
                  >
                    {isPending && activeChecklistId === reviewChecklist.id
                      ? "Submitting..."
                      : "Approve"}
                  </Button>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={
                    isPending && activeChecklistId === reviewChecklist.id
                  }
                  onClick={() => setReviewChecklistId(null)}
                >
                  Cancel
                </Button>
              </div>
            </section>
          </div>
        ) : null}
      </Modal>
    </>
  );
}

function FilePreview({ checklist }: { checklist: ChecklistItem }) {
  const src = previewHref(checklist.downloadHref ?? "");
  const isImagePreview = isPreviewableImage(checklist);

  if (isImagePreview) {
    return (
      <div className="flex h-[65vh] items-center justify-center bg-mono-card p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`${checklist.checklistLabel} preview`}
          className="max-h-full max-w-full rounded-lg object-contain"
        />
      </div>
    );
  }

  return (
    <object
      aria-label={`${checklist.checklistLabel} preview`}
      data={src}
      type={checklist.mimeType ?? undefined}
      className="h-[65vh] w-full bg-mono-card"
    >
      <div className="flex h-[65vh] flex-col items-center justify-center gap-3 px-6 text-center text-sm text-mono-muted">
        <p>This file type cannot be previewed in the browser.</p>
        {checklist.downloadHref ? (
          <a href={checklist.downloadHref}>
            <Button
              variant="outline"
              size="sm"
              className="h-10 min-w-40 justify-center px-4"
            >
              Download File
            </Button>
          </a>
        ) : null}
      </div>
    </object>
  );
}

function isPreviewableImage(checklist: ChecklistItem) {
  const mimeType = checklist.mimeType?.toLowerCase() ?? "";
  const fileName = checklist.fileName?.toLowerCase() ?? "";
  return (
    mimeType.startsWith("image/") ||
    /\.(png|jpe?g|webp|gif|bmp|svg)$/.test(fileName)
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function previewHref(href: string) {
  if (!href) return "";
  const [pathname] = href.split("?");
  return pathname;
}
