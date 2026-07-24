"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableHead,
  DataTableHeader,
  DataTableToolbar,
} from "@/components/data-table";
import type { getCustomerPortalShipmentDetailData } from "@/modules/customer-portal/shipments";

type ChecklistItem = NonNullable<Awaited<ReturnType<typeof getCustomerPortalShipmentDetailData>>>["checklists"][number];

export function ChecklistDecisionsClient({
  checklists,
  error,
}: {
  checklists: ChecklistItem[];
  error?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeChecklistId, setActiveChecklistId] = useState<string | null>(null);
  const [reviewChecklistId, setReviewChecklistId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string | null>>({});
  const [remarksByChecklistId, setRemarksByChecklistId] = useState<Record<string, string>>({});
  const reviewChecklist = checklists.find((item) => item.id === reviewChecklistId) ?? null;

  const handleDecision = (checklistId: string, decision: "APPROVED" | "REJECTED") => {
    setRowError((current) => ({ ...current, [checklistId]: null }));
    setActiveChecklistId(checklistId);
    const remarks = remarksByChecklistId[checklistId]?.trim() || undefined;

    startTransition(async () => {
      try {
        const response = await fetch(`/api/customer-portal/checklists/${checklistId}/decision`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ decision, remarks }),
        });

        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        if (!response.ok) {
          setRowError((current) => ({
            ...current,
            [checklistId]: body?.error || "The checklist decision could not be submitted.",
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
    <DataTable className="border border-outline-variant/45">
      <DataTableToolbar className="bg-surface">
        <div className="flex items-center gap-3">
          <span className="ds-icon-badge">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 12l2 2 4-4" />
              <path d="M21 12c0 4.97-4.03 9-9 9S3 16.97 3 12 7.03 3 12 3c1.86 0 3.58.57 5 1.54" />
            </svg>
          </span>
          <div>
            <h2 className="ds-h2 text-on-surface">Checklist Decisions</h2>
            <p className="text-xs text-on-surface-variant">
              Download the visible checklist file and approve or reject it once your account is ready to respond.
            </p>
          </div>
        </div>
      </DataTableToolbar>
      {error ? (
        <tbody>
          <tr>
            <DataTableCell colSpan={5} className="px-5 py-8 text-center text-on-surface-variant">
              {error}
            </DataTableCell>
          </tr>
        </tbody>
      ) : (
        <>
          <DataTableHeader>
            <tr>
              <DataTableHead>Checklist</DataTableHead>
              <DataTableHead>Version</DataTableHead>
              <DataTableHead>Portal Status</DataTableHead>
              <DataTableHead>Visible At</DataTableHead>
              <DataTableHead>Customer Action</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {checklists.length === 0 ? (
              <DataTableEmpty colSpan={5} message="No customer-visible checklist decisions are available yet." />
            ) : (
              checklists.map((item) => {
                const isSubmitting = isPending && activeChecklistId === item.id;
                return (
                  <tr key={item.id}>
                    <DataTableCell className="font-medium">{item.checklistLabel}</DataTableCell>
                    <DataTableCell className="text-on-surface-variant">
                      {item.isDownloadable && item.downloadHref ? (
                        <a href={item.downloadHref} className="inline-flex flex-col gap-1 text-[#00cec4] hover:underline">
                          <span>{item.versionLabel || "Checklist File"}</span>
                          {item.fileName ? (
                            <span className="text-xs text-on-surface-variant no-underline">{item.fileName}</span>
                          ) : null}
                        </a>
                      ) : (
                        item.versionLabel || "—"
                      )}
                    </DataTableCell>
                    <DataTableCell>
                      <Badge variant={item.canRespond ? "warning" : "secondary"}>{item.approvalStatus}</Badge>
                    </DataTableCell>
                    <DataTableCell className="text-on-surface-variant">
                      {item.visibleAt ? formatDateTime(item.visibleAt) : "—"}
                    </DataTableCell>
                    <DataTableCell>
                      <div className="space-y-2">
                        {item.canRespond ? (
                          <>
                            <Button
                              size="sm"
                              disabled={isSubmitting}
                              onClick={() => {
                                setRowError((current) => ({ ...current, [item.id]: null }));
                                setReviewChecklistId(item.id);
                              }}
                            >
                              Review And Decide
                            </Button>
                          </>
                        ) : (
                          <div className="space-y-1">
                            <Badge variant={item.responseDecision === "REJECTED" ? "destructive" : "success"}>
                              {item.responseDecision || item.responseState}
                            </Badge>
                            <div className="text-xs text-on-surface-variant">
                              {item.responseDecision ? "This customer account has already responded." : item.responseState}
                            </div>
                          </div>
                        )}
                        {rowError[item.id] ? (
                          <div className="text-xs text-[#fb923c]">{rowError[item.id]}</div>
                        ) : null}
                      </div>
                    </DataTableCell>
                  </tr>
                );
              })
            )}
          </DataTableBody>
        </>
      )}
      <Modal
        open={Boolean(reviewChecklist)}
        onClose={() => {
          if (!isPending) {
            setReviewChecklistId(null);
          }
        }}
        title={reviewChecklist ? `${reviewChecklist.checklistLabel} ${reviewChecklist.versionLabel ?? ""}`.trim() : "Checklist Review"}
        description="Review the current checklist file, add any remarks, and approve or reject it from this popup."
        className="max-w-6xl"
      >
        {reviewChecklist ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_360px]">
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant/35 bg-surface-container-low/35 px-4 py-3">
                <div className="min-w-0">
                  <p className="ds-label">Visible File</p>
                  <p className="mt-1 text-sm text-on-surface">
                    {reviewChecklist.fileName || reviewChecklist.versionLabel || "Checklist File"}
                  </p>
                </div>
                {reviewChecklist.downloadHref ? (
                  <a href={reviewChecklist.downloadHref} className="shrink-0">
                    <Button variant="outline" size="sm">Download File</Button>
                  </a>
                ) : null}
              </div>
              <div className="overflow-hidden rounded-xl border border-outline-variant/35 bg-surface-container-low/20">
                {reviewChecklist.downloadHref ? (
                  <iframe
                    title={`${reviewChecklist.checklistLabel} preview`}
                    src={previewHref(reviewChecklist.downloadHref)}
                    className="h-[65vh] w-full bg-surface"
                  />
                ) : (
                  <div className="flex h-[65vh] items-center justify-center px-6 text-center text-sm text-on-surface-variant">
                    A preview is not available for this checklist file.
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-4 rounded-xl border border-outline-variant/35 bg-surface p-5">
              <div>
                <p className="ds-label">Portal Status</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="warning">{reviewChecklist.approvalStatus}</Badge>
                  <Badge variant="secondary">{reviewChecklist.visibleAt ? formatDateTime(reviewChecklist.visibleAt) : "Visible now"}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor={`checklist-remarks-modal-${reviewChecklist.id}`}
                  className="ds-label block text-on-surface-variant"
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
                    setRowError((current) => ({ ...current, [reviewChecklist.id]: null }));
                  }}
                  placeholder="Add an approval note or rejection reason."
                  rows={8}
                  maxLength={500}
                  disabled={isPending && activeChecklistId === reviewChecklist.id}
                  className="min-h-[200px] w-full rounded-xl border border-[#00cec4]/55 bg-surface px-4 py-3 text-sm text-on-surface placeholder:text-[var(--color-placeholder)] focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15 hover:border-[#00cec4]/85 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="text-xs text-on-surface-variant">
                  Remarks are optional for approval and useful for rejection.
                </p>
              </div>

              {rowError[reviewChecklist.id] ? (
                <div className="rounded-xl border border-[#fb923c]/30 bg-[#fb923c]/10 px-4 py-3 text-sm text-[#c96a16] dark:text-[#fdba74]">
                  {rowError[reviewChecklist.id]}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  size="sm"
                  disabled={isPending && activeChecklistId === reviewChecklist.id}
                  onClick={() => handleDecision(reviewChecklist.id, "APPROVED")}
                >
                  {isPending && activeChecklistId === reviewChecklist.id ? "Submitting..." : "Approve Checklist"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isPending && activeChecklistId === reviewChecklist.id}
                  onClick={() => handleDecision(reviewChecklist.id, "REJECTED")}
                >
                  {isPending && activeChecklistId === reviewChecklist.id ? "Submitting..." : "Reject Checklist"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending && activeChecklistId === reviewChecklist.id}
                  onClick={() => setReviewChecklistId(null)}
                >
                  Cancel
                </Button>
              </div>
            </section>
          </div>
        ) : null}
      </Modal>
    </DataTable>
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
  return href.replace("?download=true", "");
}
