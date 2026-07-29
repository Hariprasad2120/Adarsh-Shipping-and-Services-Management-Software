"use client";

import { CrmButton, CrmDialog, CrmTextarea } from "@/components/monolith/crm-workspace";

import React, { useState, useTransition } from "react";
import {Send,CheckCircle,RotateCcw,XCircle,Eye,ThumbsUp,FileText,ArchiveRestore,Loader2,ChevronDown,Plus,} from "lucide-react";
import type { ApprovalStatus, CrmEntityType } from "@/modules/crm/approval-workflow";
import {actionSubmitForApproval,actionApproveDocument,actionRequestRework,actionDeclineDocument,actionSendToCustomer,actionMarkCustomerViewed,actionAcceptQuote,actionMarkInvoiced,actionAdminRestoreToDraft,actionConvertToInvoice,actionRaiseDirectSalesOrder,} from "@/modules/crm/approval-actions";
import { toast } from "sonner";

// ─── Permission caps passed from server ───────────────────────────────────────

export type ApprovalCaps = {
  canSubmit: boolean;
  canApprove: boolean;
  canSend: boolean;
  canManage: boolean;
  canAdminRestore: boolean;
};

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  DRAFT: { label: "Draft", bg: "var(--mnx-accent-soft)", text: "var(--mnx-text-muted)" },
  PENDING_APPROVAL: { label: "Pending Approval", bg: "var(--mnx-warning-bg)", text: "var(--mnx-warning)" },
  APPROVED: { label: "Approved", bg: "var(--mnx-success-bg)", text: "var(--mnx-success)" },
  REWORK: { label: "Rework Required", bg: "var(--mnx-warning-bg)", text: "var(--mnx-warning)" },
  SENT: { label: "Sent", bg: "var(--mnx-accent-soft)", text: "var(--mnx-accent)" },
  CUSTOMER_VIEWED: { label: "Viewed by Customer", bg: "var(--mnx-accent-soft)", text: "var(--mnx-accent)" },
  ACCEPTED: { label: "Accepted", bg: "var(--mnx-success-bg)", text: "var(--mnx-success)" },
  INVOICED: { label: "Invoiced", bg: "var(--mnx-accent-soft)", text: "var(--mnx-accent)" },
  DECLINED: { label: "Declined", bg: "var(--mnx-danger-bg)", text: "var(--mnx-danger)" },
  ACTIVE: { label: "Active", bg: "var(--mnx-accent-soft)", text: "var(--mnx-accent)" },
  COMPLETED: { label: "Completed", bg: "var(--mnx-success-bg)", text: "var(--mnx-success)" },
  PAID: { label: "Paid", bg: "var(--mnx-success-bg)", text: "var(--mnx-success)" },
};

export function ApprovalStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide"
      style={{ background: cfg.bg, color: cfg.text }}
    >
      {cfg.label}
    </span>
  );
}

// ─── Note dialog ──────────────────────────────────────────────────────────────

function NoteDialog({
  title,
  required,
  placeholder,
  confirmLabel,
  confirmVariant,
  onConfirm,
  onCancel,
}: {
  title: string;
  required?: boolean;
  placeholder?: string;
  confirmLabel: string;
  confirmVariant: "cyan" | "red" | "orange";
  onConfirm: (note: string) => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState("");
  const btnBg =
    confirmVariant === "cyan"
      ? "var(--mnx-accent)"
      : confirmVariant === "red"
      ? "var(--mnx-danger)"
      : "var(--mnx-warning)";
  return (
    <CrmDialog
      open
      onClose={onCancel}
      title={title}
      size="compact"
      footer={
        <div className="flex gap-3 justify-end">
          <CrmButton onClick={onCancel} variant="secondary">
            Cancel
          </CrmButton>
          <CrmButton
            onClick={() => {
              if (required && !note.trim()) return;
              onConfirm(note);
            }}
            variant={confirmVariant === "red" ? "destructive" : "primary"}
            style={{ background: btnBg }}
          >
            {confirmLabel}
          </CrmButton>
        </div>
      }
    >
        <CrmTextarea
          autoFocus
          rows={4}
          placeholder={placeholder || "Add a note (optional)"}
          className="w-full px-3 py-2 text-sm rounded-xl resize-none"
          style={{ border: "1px solid var(--mnx-accent-soft)" }}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
    </CrmDialog>
  );
}

// ─── ApprovalActionBar ────────────────────────────────────────────────────────

type DialogType =
  | "submit"
  | "approve"
  | "rework"
  | "decline"
  | "restore"
  | null;

interface ApprovalActionBarProps {
  invoiceId: string;
  entityType: CrmEntityType;
  approvalStatus: ApprovalStatus;
  caps: ApprovalCaps;
  reworkNote?: string | null;
  onSuccess?: () => void;
}

export function ApprovalActionBar({
  invoiceId,
  entityType,
  approvalStatus,
  caps,
  reworkNote,
  onSuccess,
}: ApprovalActionBarProps) {
  const [dialog, setDialog] = useState<DialogType>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<void>, label: string) {
    startTransition(async () => {
      try {
        await action();
        toast.success(label);
        setDialog(null);
        onSuccess?.();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Action failed");
      }
    });
  }

  const status = approvalStatus;

  // Compute available actions
  type ActionItem = {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    variant: "cyan" | "gray" | "red" | "orange";
    show: boolean;
  };
  const actions = ([
    // Submit for approval
    {
      label: "Submit for Approval",
      icon: <Send size={14} />,
      onClick: () => setDialog("submit"),
      variant: "cyan",
      show: caps.canSubmit && (status === "DRAFT" || status === "REWORK"),
    },
    // Approve
    {
      label: "Approve",
      icon: <CheckCircle size={14} />,
      onClick: () => setDialog("approve"),
      variant: "cyan",
      show: caps.canApprove && status === "PENDING_APPROVAL",
    },
    // Request rework
    {
      label: "Request Rework",
      icon: <RotateCcw size={14} />,
      onClick: () => setDialog("rework"),
      variant: "orange",
      show: caps.canApprove && status === "PENDING_APPROVAL",
    },
    // Decline (from approval queue)
    {
      label: "Decline",
      icon: <XCircle size={14} />,
      onClick: () => setDialog("decline"),
      variant: "red",
      show:
        caps.canApprove &&
        status === "PENDING_APPROVAL" &&
        entityType !== "SALES_ORDER",
    },
    // Send to customer (quote only)
    {
      label: "Send to Customer",
      icon: <Send size={14} />,
      onClick: () =>
        run(() => actionSendToCustomer(invoiceId), "Quote sent to customer"),
      variant: "cyan",
      show:
        caps.canSend && status === "APPROVED" && entityType === "QUOTE",
    },
    // Mark customer viewed
    {
      label: "Mark Viewed",
      icon: <Eye size={14} />,
      onClick: () =>
        run(() => actionMarkCustomerViewed(invoiceId), "Marked as viewed"),
      variant: "gray",
      show: caps.canManage && status === "SENT" && entityType === "QUOTE",
    },
    // Accept quote
    {
      label: "Mark Accepted",
      icon: <ThumbsUp size={14} />,
      onClick: () =>
        run(() => actionAcceptQuote(invoiceId), "Quote accepted"),
      variant: "cyan",
      show:
        caps.canManage &&
        (status === "SENT" || status === "CUSTOMER_VIEWED") &&
        entityType === "QUOTE",
    },
    // Decline (customer declined — from manage perm)
    {
      label: "Mark Declined",
      icon: <XCircle size={14} />,
      onClick: () => setDialog("decline"),
      variant: "red",
      show:
        caps.canManage &&
        (status === "SENT" || status === "CUSTOMER_VIEWED" || status === "ACCEPTED") &&
        entityType === "QUOTE",
    },
    // Convert to invoice
    {
      label: "Convert to Invoice",
      icon: <FileText size={14} />,
      onClick: () =>
        run(() => actionMarkInvoiced(invoiceId), "Quote converted to invoice"),
      variant: "cyan",
      show:
        caps.canManage && status === "ACCEPTED" && entityType === "QUOTE",
    },
    // Convert Sales Order to Invoice
    {
      label: "Convert to Invoice",
      icon: <FileText size={14} />,
      onClick: () =>
        run(async () => {
          const res = await actionConvertToInvoice(invoiceId);
          if (res?.id) {
            window.location.href = `/crm/invoices/${res.id}`;
          }
        }, "Converted Sales Order to Invoice"),
      variant: "cyan",
      show:
        caps.canManage &&
        (status === "APPROVED" || status === "ACTIVE") &&
        entityType === "SALES_ORDER",
    },
    // Raise Direct Sales Order (for declined invoices)
    {
      label: "Raise Direct Sales Order",
      icon: <Plus size={14} />,
      onClick: () =>
        run(async () => {
          const res = await actionRaiseDirectSalesOrder(invoiceId);
          if (res?.id) {
            window.location.href = `/crm/invoices/${res.id}`;
          }
        }, "Direct Sales Order Raised"),
      variant: "cyan",
      show:
        caps.canManage &&
        status === "DECLINED" &&
        entityType === "INVOICE",
    },
    // Admin restore to draft
    {
      label: "Restore to Draft",
      icon: <ArchiveRestore size={14} />,
      onClick: () => setDialog("restore"),
      variant: "gray",
      show:
        caps.canAdminRestore &&
        (status === "DECLINED" || status === "REWORK"),
    },
  ] as ActionItem[]).filter((a) => a.show);

  if (actions.length === 0 && !reworkNote) return null;

  const btnBase =
    "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-xl transition-all disabled:opacity-50";

  const variantStyles = {
    cyan: "bg-[var(--mnx-accent)] text-mono-text hover:bg-[var(--mnx-accent)]",
    gray: "bg-[var(--color-surface-container)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-low)]",
    red: "bg-[var(--mnx-danger)] text-mono-text hover:bg-[var(--mnx-danger)]",
    orange: "bg-[var(--mnx-warning)] text-mono-text hover:bg-[var(--mnx-warning)]",
  };

  return (
    <>
      {reworkNote && (status === "REWORK" || status === "DRAFT") && (
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-xl mb-3"
          style={{
            background: "var(--mnx-warning-bg)",
            border: "1px solid var(--mnx-warning-bg)",
          }}
        >
          <RotateCcw size={14} className="mt-0.5 flex-shrink-0" style={{ color: "var(--mnx-warning)" }} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--mnx-warning)" }}>
              Rework Required
            </p>
            <p className="text-sm mt-0.5" style={{ color: "var(--color-on-surface)" }}>
              {reworkNote}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center flex-wrap gap-2">
        {isPending && <Loader2 size={14} className="animate-spin text-[var(--mnx-accent)]" />}
        {actions.map((action) => (
          <CrmButton
            key={action.label}
            onClick={action.onClick}
            disabled={isPending}
            className={`${btnBase} ${variantStyles[action.variant]}`}
          >
            {action.icon}
            {action.label}
          </CrmButton>
        ))}
      </div>

      {/* Dialogs */}
      {dialog === "submit" && (
        <NoteDialog
          title="Submit for Approval"
          placeholder="Add a note for the approver (optional)"
          confirmLabel="Submit"
          confirmVariant="cyan"
          onConfirm={(note) =>
            run(() => actionSubmitForApproval(invoiceId, note || undefined), "Submitted for approval")
          }
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === "approve" && (
        <NoteDialog
          title="Approve Document"
          placeholder="Add an approval note (optional)"
          confirmLabel="Approve"
          confirmVariant="cyan"
          onConfirm={(note) =>
            run(() => actionApproveDocument(invoiceId, note || undefined), "Approved")
          }
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === "rework" && (
        <NoteDialog
          title="Request Rework"
          required
          placeholder="Describe what needs to be changed..."
          confirmLabel="Send Back"
          confirmVariant="orange"
          onConfirm={(note) =>
            run(() => actionRequestRework(invoiceId, note), "Sent back for rework")
          }
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === "decline" && (
        <NoteDialog
          title="Decline Document"
          placeholder="Reason for declining (optional)"
          confirmLabel="Decline"
          confirmVariant="red"
          onConfirm={(note) =>
            run(() => actionDeclineDocument(invoiceId, note || undefined), "Declined")
          }
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === "restore" && (
        <NoteDialog
          title="Restore to Draft"
          placeholder="Reason for restoring (optional)"
          confirmLabel="Restore"
          confirmVariant="cyan"
          onConfirm={(note) =>
            run(() => actionAdminRestoreToDraft(invoiceId, note || undefined), "Restored to draft")
          }
          onCancel={() => setDialog(null)}
        />
      )}
    </>
  );
}

// ─── Audit log viewer ─────────────────────────────────────────────────────────

export type ApprovalLogEntry = {
  id: string;
  fromStatus: string;
  toStatus: string;
  note: string | null;
  createdAt: Date;
  actor: { id: string; name: string };
};

export function ApprovalLogList({ logs }: { logs: ApprovalLogEntry[] }) {
  if (logs.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
        No approval activity yet.
      </p>
    );
  }

  return (
    <ol className="relative border-l-2 ml-2" style={{ borderColor: "var(--mnx-accent-soft)" }}>
      {logs.map((log) => (
        <li key={log.id} className="mb-4 ml-5">
          <span
            className="absolute flex items-center justify-center w-3 h-3 rounded-full -left-1.5 mt-1"
            style={{ background: "var(--mnx-accent)" }}
          />
          <div className="flex items-center gap-2 flex-wrap">
            <ApprovalStatusBadge status={log.toStatus} />
            <span className="text-xs" style={{ color: "var(--color-on-surface-variant)" }}>
              by {log.actor.name}
            </span>
            <span className="text-xs" style={{ color: "var(--color-on-surface-variant)" }}>
              {new Date(log.createdAt).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          </div>
          {log.fromStatus && (
            <p className="text-xs mt-0.5" style={{ color: "var(--color-on-surface-variant)" }}>
              {log.fromStatus} → {log.toStatus}
            </p>
          )}
          {log.note && (
            <p className="text-sm mt-1" style={{ color: "var(--color-on-surface)" }}>
              {log.note}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
