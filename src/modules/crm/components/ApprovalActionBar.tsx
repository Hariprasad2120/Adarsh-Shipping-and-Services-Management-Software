"use client";

import {
  CrmButton,
  CrmDialog,
  CrmInput,
  CrmTextarea,
} from "@/modules/crm/components/workspace/crm-workspace";

import Link from "next/link";
import React, { useState, useTransition } from "react";
import {
  ArchiveRestore,
  CheckCircle,
  ChevronRight,
  ClipboardCheck,
  FilePlus2,
  Loader2,
  RotateCcw,
  Send,
  UserCheck,
  XCircle,
} from "lucide-react";
import type {
  ApprovalStatus,
  CrmEntityType,
} from "@/modules/crm/approval-workflow";
import {
  actionAdminRestoreToDraft,
  actionApproveDocument,
  actionConvertToInvoice,
  actionCreateQuoteBooking,
  actionRaiseDirectSalesOrder,
  actionRecordCustomerDecision,
  actionRequestRework,
  actionSubmitForApproval,
} from "@/modules/crm/approval-actions";
import { toast } from "sonner";

export type ApprovalCaps = {
  canSubmit: boolean;
  canApprove: boolean;
  canSend: boolean;
  canManage: boolean;
  canAdminRestore: boolean;
};

export type ApprovalLogEntry = {
  id: string;
  fromStatus: string;
  toStatus: string;
  note: string | null;
  createdAt: Date;
  actor: { id: string; name: string };
};

type QuoteManagerOption = { id: string; name: string };

type QuoteWorkflowContextLike = {
  includedDepartments?: Array<"FREIGHT_FORWARDING" | "CUSTOMS_CLEARANCE">;
  pendingDepartments?: Array<"FREIGHT_FORWARDING" | "CUSTOMS_CLEARANCE">;
  approvalFlow?: {
    selectedManagerId?: string | null;
  } | null;
  conversion?: {
    chaJobId?: string | null;
    chaJobNumber?: string | null;
    chaStatus?: "CREATED" | "PROCESSING_PENDING" | "PROCESSING" | null;
    freightBookingGroupId?: string | null;
    freightBookingNumber?: string | null;
    freightTransactionId?: string | null;
    freightTransactionType?: "MBL" | "HBL" | null;
    freightStatus?: "CREATED" | "PROCESSING_PENDING" | null;
  } | null;
} | null;

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  DRAFT: {
    label: "Draft",
    bg: "var(--mnx-accent-soft)",
    text: "var(--mnx-text-muted)",
  },
  PENDING_MANAGER_APPROVAL: {
    label: "Pending Manager Approval",
    bg: "var(--mnx-warning-bg)",
    text: "var(--mnx-warning)",
  },
  PENDING_CUSTOMER_APPROVAL: {
    label: "Pending Customer Approval",
    bg: "var(--mnx-accent-soft)",
    text: "var(--mnx-accent)",
  },
  CUSTOMER_APPROVED: {
    label: "Customer Approved",
    bg: "var(--mnx-success-bg)",
    text: "var(--mnx-success)",
  },
  BOOKING_CREATED: {
    label: "Booking Created",
    bg: "var(--mnx-success-bg)",
    text: "var(--mnx-success)",
  },
  PENDING_APPROVAL: {
    label: "Pending Approval",
    bg: "var(--mnx-warning-bg)",
    text: "var(--mnx-warning)",
  },
  APPROVED: {
    label: "Approved",
    bg: "var(--mnx-success-bg)",
    text: "var(--mnx-success)",
  },
  REWORK: {
    label: "Rework Required",
    bg: "var(--mnx-warning-bg)",
    text: "var(--mnx-warning)",
  },
  SENT: {
    label: "Sent",
    bg: "var(--mnx-accent-soft)",
    text: "var(--mnx-accent)",
  },
  CUSTOMER_VIEWED: {
    label: "Viewed by Customer",
    bg: "var(--mnx-accent-soft)",
    text: "var(--mnx-accent)",
  },
  ACCEPTED: {
    label: "Accepted",
    bg: "var(--mnx-success-bg)",
    text: "var(--mnx-success)",
  },
  INVOICED: {
    label: "Invoiced",
    bg: "var(--mnx-accent-soft)",
    text: "var(--mnx-accent)",
  },
  DECLINED: {
    label: "Declined",
    bg: "var(--mnx-danger-bg)",
    text: "var(--mnx-danger)",
  },
  ACTIVE: {
    label: "Active",
    bg: "var(--mnx-accent-soft)",
    text: "var(--mnx-accent)",
  },
  COMPLETED: {
    label: "Completed",
    bg: "var(--mnx-success-bg)",
    text: "var(--mnx-success)",
  },
  PAID: {
    label: "Paid",
    bg: "var(--mnx-success-bg)",
    text: "var(--mnx-success)",
  },
};

type DialogState =
  | null
  | { type: "submit" }
  | { type: "approve" }
  | { type: "rework" }
  | { type: "decline" }
  | { type: "customer-approve" }
  | { type: "customer-reject" }
  | { type: "booking" }
  | { type: "restore" };

export function ApprovalStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide"
      style={{ background: cfg.bg, color: cfg.text }}
    >
      {cfg.label}
    </span>
  );
}

function NoteDialog({
  title,
  placeholder,
  confirmLabel,
  confirmVariant,
  required = false,
  includeDate = false,
  onCancel,
  onConfirm,
  children,
}: {
  title: string;
  placeholder?: string;
  confirmLabel: string;
  confirmVariant: "primary" | "warning" | "danger";
  required?: boolean;
  includeDate?: boolean;
  onCancel: () => void;
  onConfirm: (note: string, actedAt?: string) => void;
  children?: React.ReactNode;
}) {
  const [note, setNote] = useState("");
  const [actedAt, setActedAt] = useState(
    new Date().toISOString().slice(0, 10),
  );

  return (
    <CrmDialog
      open
      onClose={onCancel}
      title={title}
      size="compact"
      footer={
        <div className="flex justify-end gap-3">
          <CrmButton onClick={onCancel} variant="secondary">
            Cancel
          </CrmButton>
          <CrmButton
            onClick={() => {
              if (required && !note.trim()) return;
              onConfirm(note, includeDate ? actedAt : undefined);
            }}
            variant={
              confirmVariant === "danger"
                ? "destructive"
                : confirmVariant === "warning"
                  ? "secondary"
                  : "primary"
            }
          >
            {confirmLabel}
          </CrmButton>
        </div>
      }
    >
      <div className="space-y-4">
        {children}
        {includeDate ? (
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--mnx-text-muted)]">
              Decision date
            </span>
            <CrmInput
              type="date"
              value={actedAt}
              onChange={(event) => setActedAt(event.target.value)}
            />
          </label>
        ) : null}
        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--mnx-text-muted)]">
            Remarks {required ? "(Required)" : "(Optional)"}
          </span>
          <CrmTextarea
            rows={4}
            value={note}
            placeholder={placeholder ?? "Add remarks"}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
      </div>
    </CrmDialog>
  );
}

interface ApprovalActionBarProps {
  invoiceId: string;
  entityType: CrmEntityType;
  approvalStatus: ApprovalStatus;
  caps: ApprovalCaps;
  reworkNote?: string | null;
  onSuccess?: () => void;
  managerOptions?: QuoteManagerOption[];
  workflowContext?: QuoteWorkflowContextLike;
}

export function ApprovalActionBar({
  invoiceId,
  entityType,
  approvalStatus,
  caps,
  reworkNote,
  onSuccess,
  managerOptions = [],
  workflowContext = null,
}: ApprovalActionBarProps) {
  const [dialog, setDialog] = useState<DialogState>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedManagerId, setSelectedManagerId] = useState(
    workflowContext?.approvalFlow?.selectedManagerId ?? managerOptions[0]?.id ?? "",
  );

  function run(action: () => Promise<void>, successMessage: string) {
    startTransition(async () => {
      try {
        await action();
        toast.success(successMessage);
        setDialog(null);
        onSuccess?.();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Action failed");
      }
    });
  }

  const quoteConversion = workflowContext?.conversion ?? null;
  const includedDepartments = workflowContext?.includedDepartments ?? [];
  const pendingDepartments = workflowContext?.pendingDepartments ?? [];
  const handoffDepartments = Array.from(
    new Set([...includedDepartments, ...pendingDepartments]),
  );
  const isQuote = entityType === "QUOTE";
  const actionClass =
    "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-60";

  if (isQuote) {
    const showDraftActions = approvalStatus === "DRAFT";
    const showManagerReview = approvalStatus === "PENDING_MANAGER_APPROVAL";
    const showCustomerDecision = approvalStatus === "PENDING_CUSTOMER_APPROVAL";
    const showCreateBooking = approvalStatus === "CUSTOMER_APPROVED";
    const showBookingLinks = approvalStatus === "BOOKING_CREATED";
    const chaProcessHref =
      quoteConversion?.chaStatus === "PROCESSING_PENDING" || !quoteConversion?.chaJobId
        ? `/cha/process/${invoiceId}`
        : `/cha/jobs/${quoteConversion.chaJobId}`;
    const freightProcessHref =
      quoteConversion?.freightStatus === "PROCESSING_PENDING" || !quoteConversion?.freightTransactionId
        ? `/freight-forwarding/process/${invoiceId}`
        : `/freight-forwarding/${(quoteConversion.freightTransactionType || "HBL").toLowerCase()}/${quoteConversion.freightTransactionId}`;

    return (
      <>
        {reworkNote ? (
          <div
            className="mb-3 flex items-start gap-3 rounded-xl px-4 py-3"
            style={{
              background: "var(--mnx-warning-bg)",
              border: "1px solid var(--mnx-warning-bg)",
            }}
          >
            <RotateCcw
              size={14}
              className="mt-0.5 flex-shrink-0"
              style={{ color: "var(--mnx-warning)" }}
            />
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--mnx-warning)" }}
              >
                Returned to Draft
              </p>
              <p className="mt-0.5 text-sm text-[var(--mnx-text-strong)]">
                {reworkNote}
              </p>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {isPending ? (
            <Loader2
              size={14}
              className="animate-spin text-[var(--mnx-accent)]"
            />
          ) : null}

          {showDraftActions && caps.canSubmit ? (
            <CrmButton
              onClick={() => setDialog({ type: "submit" })}
              disabled={isPending}
              className={`${actionClass} bg-[var(--mnx-accent)] text-mono-text`}
            >
              <Send size={14} />
              Submit For Approval
            </CrmButton>
          ) : null}

          {showManagerReview && caps.canApprove ? (
            <>
              <CrmButton
                onClick={() => setDialog({ type: "approve" })}
                disabled={isPending}
                className={`${actionClass} bg-[var(--mnx-accent)] text-mono-text`}
              >
                <UserCheck size={14} />
                Approve
              </CrmButton>
              <CrmButton
                onClick={() => setDialog({ type: "rework" })}
                disabled={isPending}
                className={`${actionClass} bg-[var(--mnx-warning)] text-mono-text`}
              >
                <RotateCcw size={14} />
                Reject To Draft
              </CrmButton>
            </>
          ) : null}

          {showCustomerDecision && caps.canManage ? (
            <>
              <CrmButton
                onClick={() => setDialog({ type: "customer-approve" })}
                disabled={isPending}
                className={`${actionClass} bg-[var(--mnx-success)] text-mono-text`}
              >
                <ClipboardCheck size={14} />
                Record Customer Approval
              </CrmButton>
              <CrmButton
                onClick={() => setDialog({ type: "customer-reject" })}
                disabled={isPending}
                className={`${actionClass} bg-[var(--mnx-danger)] text-mono-text`}
              >
                <XCircle size={14} />
                Record Customer Rejection
              </CrmButton>
            </>
          ) : null}

          {showCreateBooking && caps.canManage ? (
            <CrmButton
              onClick={() => setDialog({ type: "booking" })}
              disabled={isPending}
              className={`${actionClass} bg-[var(--mnx-success)] text-mono-text`}
            >
              <FilePlus2 size={14} />
              Create Booking
            </CrmButton>
          ) : null}

          {showBookingLinks && handoffDepartments.includes("CUSTOMS_CLEARANCE") ? (
            <Link
              href={chaProcessHref}
              className={`${actionClass} bg-[var(--mnx-surface)] text-[var(--mnx-text-strong)]`}
            >
              <ChevronRight size={14} />
              {quoteConversion?.chaStatus === "PROCESSING_PENDING"
                ? "Open CHA Process"
                : "Open CHA Job"}
            </Link>
          ) : null}

          {showBookingLinks && handoffDepartments.includes("FREIGHT_FORWARDING") ? (
            <Link
              href={freightProcessHref}
              className={`${actionClass} bg-[var(--mnx-surface)] text-[var(--mnx-text-strong)]`}
            >
              <ChevronRight size={14} />
              {quoteConversion?.freightStatus === "PROCESSING_PENDING"
                ? "Open Freight Process"
                : "Open Freight Booking"}
            </Link>
          ) : null}
        </div>

        {dialog?.type === "booking" ? (
          <CrmDialog
            open
            onClose={() => setDialog(null)}
            title="Create Operational Booking"
            size="compact"
            footer={
              <div className="flex justify-end gap-3">
                <CrmButton onClick={() => setDialog(null)} variant="secondary">
                  Cancel
                </CrmButton>
                <CrmButton
                  onClick={() =>
                    run(
                      () => actionCreateQuoteBooking(invoiceId).then(() => undefined),
                      "Booking conversion completed",
                    )
                  }
                  disabled={isPending}
                >
                  Confirm
                </CrmButton>
              </div>
            }
          >
            <div className="space-y-4 text-sm text-[var(--mnx-text-muted)]">
              <p>
                This will queue the approved quotation for downstream
                operational processing and route each team to its dedicated
                process page.
              </p>
              <div className="rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] px-4 py-3">
                <p className="font-semibold text-[var(--mnx-text-strong)]">
                  Handoff summary
                </p>
                <ul className="mt-2 space-y-2">
                  {handoffDepartments.includes("FREIGHT_FORWARDING") ? (
                    <li>
                      Freight team: send the quotation into the Freight
                      Forwarding process queue with quote details prefilled.
                    </li>
                  ) : null}
                  {handoffDepartments.includes("CUSTOMS_CLEARANCE") ? (
                    <li>
                      Clearance team: send the quotation into the CHA process
                      queue so the job can be created when processing starts.
                    </li>
                  ) : null}
                  <li>
                    The enquiry reference will be carried forward as the working
                    job reference wherever possible.
                  </li>
                </ul>
              </div>
            </div>
          </CrmDialog>
        ) : null}

        {dialog?.type === "submit" ? (
          <CrmDialog
            open
            onClose={() => setDialog(null)}
            title="Submit For Manager Approval"
            size="compact"
            footer={
              <div className="flex justify-end gap-3">
                <CrmButton onClick={() => setDialog(null)} variant="secondary">
                  Cancel
                </CrmButton>
                <CrmButton
                  onClick={() =>
                    run(
                      () =>
                        actionSubmitForApproval(
                          invoiceId,
                          undefined,
                          selectedManagerId,
                        ),
                      "Quotation submitted for manager approval",
                    )
                  }
                  disabled={isPending || !selectedManagerId}
                >
                  Submit
                </CrmButton>
              </div>
            }
          >
            <div className="space-y-4">
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--mnx-text-muted)]">
                  Approving manager
                </span>
                <select
                  value={selectedManagerId}
                  onChange={(event) => setSelectedManagerId(event.target.value)}
                  className="h-11 w-full rounded-xl border border-[var(--mnx-border)] bg-mono-card px-3 text-sm text-[var(--mnx-text-strong)]"
                >
                  <option value="">Select manager</option>
                  {managerOptions.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-sm text-[var(--mnx-text-muted)]">
                The selected manager will receive the approval request and must
                complete the review before customer approval can be recorded.
              </p>
            </div>
          </CrmDialog>
        ) : null}

        {dialog?.type === "approve" ? (
          <NoteDialog
            title="Approve Quotation"
            placeholder="Add manager remarks (optional)"
            confirmLabel="Approve"
            confirmVariant="primary"
            onCancel={() => setDialog(null)}
            onConfirm={(note) =>
              run(
                () => actionApproveDocument(invoiceId, note || undefined),
                "Manager approval recorded",
              )
            }
          />
        ) : null}

        {dialog?.type === "rework" ? (
          <NoteDialog
            title="Reject Back To Draft"
            placeholder="Explain what needs to be changed"
            confirmLabel="Return To Draft"
            confirmVariant="warning"
            required
            onCancel={() => setDialog(null)}
            onConfirm={(note) =>
              run(
                () => actionRequestRework(invoiceId, note),
                "Quotation returned to draft",
              )
            }
          />
        ) : null}

        {dialog?.type === "customer-approve" ? (
          <NoteDialog
            title="Record Customer Approval"
            placeholder="Add customer remarks (optional)"
            confirmLabel="Record Approval"
            confirmVariant="primary"
            includeDate
            onCancel={() => setDialog(null)}
            onConfirm={(note, actedAt) =>
              run(
                () =>
                  actionRecordCustomerDecision(
                    invoiceId,
                    "APPROVED",
                    note || undefined,
                    actedAt,
                  ),
                "Customer approval recorded",
              )
            }
          />
        ) : null}

        {dialog?.type === "customer-reject" ? (
          <NoteDialog
            title="Record Customer Rejection"
            placeholder="Record the customer rejection reason"
            confirmLabel="Record Rejection"
            confirmVariant="danger"
            includeDate
            required
            onCancel={() => setDialog(null)}
            onConfirm={(note, actedAt) =>
              run(
                () =>
                  actionRecordCustomerDecision(
                    invoiceId,
                    "REJECTED",
                    note,
                    actedAt,
                  ),
                "Customer rejection recorded",
              )
            }
          />
        ) : null}
      </>
    );
  }

  const legacyActions = [
    {
      key: "submit",
      show: caps.canSubmit && (approvalStatus === "DRAFT" || approvalStatus === "REWORK"),
      label: "Submit",
      icon: <Send size={14} />,
      className: `${actionClass} bg-[var(--mnx-accent)] text-mono-text`,
      onClick: () =>
        run(
          () => actionSubmitForApproval(invoiceId),
          "Submitted for approval",
        ),
    },
    {
      key: "approve",
      show: caps.canApprove && approvalStatus === "PENDING_APPROVAL",
      label: "Approve",
      icon: <CheckCircle size={14} />,
      className: `${actionClass} bg-[var(--mnx-accent)] text-mono-text`,
      onClick: () =>
        run(() => actionApproveDocument(invoiceId), "Approved"),
    },
    {
      key: "rework",
      show: caps.canApprove && approvalStatus === "PENDING_APPROVAL",
      label: "Rework",
      icon: <RotateCcw size={14} />,
      className: `${actionClass} bg-[var(--mnx-warning)] text-mono-text`,
      onClick: () => setDialog({ type: "rework" }),
    },
    {
      key: "so-invoice",
      show:
        caps.canManage &&
        (approvalStatus === "APPROVED" || approvalStatus === "ACTIVE") &&
        entityType === "SALES_ORDER",
      label: "Convert To Invoice",
      icon: <FilePlus2 size={14} />,
      className: `${actionClass} bg-[var(--mnx-success)] text-mono-text`,
      onClick: () =>
        run(
          async () => {
            const result = await actionConvertToInvoice(invoiceId);
            if (result?.id) window.location.href = `/crm/invoices/${result.id}`;
          },
          "Invoice draft created",
        ),
    },
    {
      key: "raise-so",
      show:
        caps.canManage &&
        approvalStatus === "DECLINED" &&
        entityType === "INVOICE",
      label: "Raise Direct Sales Order",
      icon: <FilePlus2 size={14} />,
      className: `${actionClass} bg-[var(--mnx-accent)] text-mono-text`,
      onClick: () =>
        run(
          async () => {
            const result = await actionRaiseDirectSalesOrder(invoiceId);
            if (result?.id) window.location.href = `/crm/invoices/${result.id}`;
          },
          "Direct sales order created",
        ),
    },
    {
      key: "restore",
      show:
        caps.canAdminRestore &&
        (approvalStatus === "DECLINED" || approvalStatus === "REWORK"),
      label: "Restore To Draft",
      icon: <ArchiveRestore size={14} />,
      className: `${actionClass} bg-[var(--mnx-surface)] text-[var(--mnx-text-strong)]`,
      onClick: () => setDialog({ type: "restore" }),
    },
  ];

  return (
    <>
      {reworkNote ? (
        <div
          className="mb-3 flex items-start gap-3 rounded-xl px-4 py-3"
          style={{
            background: "var(--mnx-warning-bg)",
            border: "1px solid var(--mnx-warning-bg)",
          }}
        >
          <RotateCcw
            size={14}
            className="mt-0.5 flex-shrink-0"
            style={{ color: "var(--mnx-warning)" }}
          />
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--mnx-warning)" }}
            >
              Rework Required
            </p>
            <p className="mt-0.5 text-sm text-[var(--mnx-text-strong)]">
              {reworkNote}
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {isPending ? (
          <Loader2
            size={14}
            className="animate-spin text-[var(--mnx-accent)]"
          />
        ) : null}
        {legacyActions
          .filter((action) => action.show)
          .map((action) => (
            <CrmButton
              key={action.key}
              onClick={action.onClick}
              disabled={isPending}
              className={action.className}
            >
              {action.icon}
              {action.label}
            </CrmButton>
          ))}
      </div>

      {dialog?.type === "rework" ? (
        <NoteDialog
          title="Request Rework"
          placeholder="Describe what needs to change"
          confirmLabel="Send Back"
          confirmVariant="warning"
          required
          onCancel={() => setDialog(null)}
          onConfirm={(note) =>
            run(() => actionRequestRework(invoiceId, note), "Sent back for rework")
          }
        />
      ) : null}

      {dialog?.type === "restore" ? (
        <NoteDialog
          title="Restore To Draft"
          placeholder="Add a restore note (optional)"
          confirmLabel="Restore"
          confirmVariant="primary"
          onCancel={() => setDialog(null)}
          onConfirm={(note) =>
            run(
              () => actionAdminRestoreToDraft(invoiceId, note || undefined),
              "Restored to draft",
            )
          }
        />
      ) : null}
    </>
  );
}

export function ApprovalLogList({ logs }: { logs: ApprovalLogEntry[] }) {
  if (logs.length === 0) {
    return (
      <p className="text-sm text-[var(--mnx-text-muted)]">
        No approval activity yet.
      </p>
    );
  }

  return (
    <ol
      className="relative ml-2 border-l-2"
      style={{ borderColor: "var(--mnx-accent-soft)" }}
    >
      {logs.map((log) => (
        <li key={log.id} className="mb-4 ml-5">
          <span
            className="absolute -left-1.5 mt-1 flex h-3 w-3 items-center justify-center rounded-full"
            style={{ background: "var(--mnx-accent)" }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <ApprovalStatusBadge status={log.toStatus} />
            <span className="text-xs text-[var(--mnx-text-muted)]">
              by {log.actor.name}
            </span>
            <span className="text-xs text-[var(--mnx-text-muted)]">
              {new Date(log.createdAt).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          </div>
          {log.fromStatus ? (
            <p className="mt-0.5 text-xs text-[var(--mnx-text-muted)]">
              {log.fromStatus} to {log.toStatus}
            </p>
          ) : null}
          {log.note ? (
            <p className="mt-1 text-sm text-[var(--mnx-text-strong)]">
              {log.note}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
