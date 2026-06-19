"use client";

import React, { useState, useTransition } from "react";
import {
  Send,
  CheckCircle,
  RotateCcw,
  XCircle,
  Eye,
  ThumbsUp,
  FileText,
  ArchiveRestore,
  Loader2,
  ChevronDown,
  Plus,
} from "lucide-react";
import type { ApprovalStatus, CrmEntityType } from "@/modules/crm/approval-workflow";
import {
  actionSubmitForApproval,
  actionApproveDocument,
  actionRequestRework,
  actionDeclineDocument,
  actionSendToCustomer,
  actionMarkCustomerViewed,
  actionAcceptQuote,
  actionMarkInvoiced,
  actionAdminRestoreToDraft,
  actionConvertToInvoice,
  actionRaiseDirectSalesOrder,
} from "@/modules/crm/approval-actions";
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
  DRAFT: { label: "Draft", bg: "rgba(100,116,139,0.12)", text: "#475569" },
  PENDING_APPROVAL: { label: "Pending Approval", bg: "rgba(251,191,36,0.15)", text: "#b45309" },
  APPROVED: { label: "Approved", bg: "rgba(16,185,129,0.12)", text: "#059669" },
  REWORK: { label: "Rework Required", bg: "rgba(251,146,60,0.15)", text: "#c2410c" },
  SENT: { label: "Sent", bg: "rgba(59,130,246,0.12)", text: "#1d4ed8" },
  CUSTOMER_VIEWED: { label: "Viewed by Customer", bg: "rgba(139,92,246,0.12)", text: "#7c3aed" },
  ACCEPTED: { label: "Accepted", bg: "rgba(16,185,129,0.15)", text: "#047857" },
  INVOICED: { label: "Invoiced", bg: "rgba(0,206,196,0.15)", text: "#0e8995" },
  DECLINED: { label: "Declined", bg: "rgba(239,68,68,0.12)", text: "#b91c1c" },
  ACTIVE: { label: "Active", bg: "rgba(59,130,246,0.12)", text: "#1d4ed8" },
  COMPLETED: { label: "Completed", bg: "rgba(16,185,129,0.12)", text: "#059669" },
  PAID: { label: "Paid", bg: "rgba(16,185,129,0.15)", text: "#047857" },
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
      ? "#00cec4"
      : confirmVariant === "red"
      ? "#ef4444"
      : "#f97316";
  const btnHover =
    confirmVariant === "cyan"
      ? "#00b8af"
      : confirmVariant === "red"
      ? "#dc2626"
      : "#ea580c";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)" }}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-md shadow-2xl"
        style={{ background: "var(--color-surface)" }}
      >
        <h3 className="ds-h3 mb-4">{title}</h3>
        <textarea
          autoFocus
          rows={4}
          placeholder={placeholder || "Add a note (optional)"}
          className="w-full px-3 py-2 text-sm rounded-xl resize-none"
          style={{ border: "1px solid rgba(0,206,196,0.55)" }}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="flex gap-3 justify-end mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-xl"
            style={{
              background: "var(--color-surface-container)",
              color: "var(--color-on-surface)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (required && !note.trim()) return;
              onConfirm(note);
            }}
            className="px-4 py-2 text-sm rounded-xl text-white font-medium transition-colors"
            style={{ background: btnBg }}
            onMouseEnter={(e) =>
              ((e.target as HTMLElement).style.background = btnHover)
            }
            onMouseLeave={(e) =>
              ((e.target as HTMLElement).style.background = btnBg)
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
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
    cyan: "bg-[#00cec4] text-white hover:bg-[#00b8af]",
    gray: "bg-[var(--color-surface-container)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-low)]",
    red: "bg-[#ef4444] text-white hover:bg-[#dc2626]",
    orange: "bg-[#f97316] text-white hover:bg-[#ea580c]",
  };

  return (
    <>
      {reworkNote && (status === "REWORK" || status === "DRAFT") && (
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-xl mb-3"
          style={{
            background: "rgba(251,146,60,0.1)",
            border: "1px solid rgba(251,146,60,0.3)",
          }}
        >
          <RotateCcw size={14} className="mt-0.5 flex-shrink-0" style={{ color: "#f97316" }} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#c2410c" }}>
              Rework Required
            </p>
            <p className="text-sm mt-0.5" style={{ color: "var(--color-on-surface)" }}>
              {reworkNote}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center flex-wrap gap-2">
        {isPending && <Loader2 size={14} className="animate-spin text-[#00cec4]" />}
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            disabled={isPending}
            className={`${btnBase} ${variantStyles[action.variant]}`}
          >
            {action.icon}
            {action.label}
          </button>
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
    <ol className="relative border-l-2 ml-2" style={{ borderColor: "rgba(0,206,196,0.25)" }}>
      {logs.map((log) => (
        <li key={log.id} className="mb-4 ml-5">
          <span
            className="absolute flex items-center justify-center w-3 h-3 rounded-full -left-1.5 mt-1"
            style={{ background: "#00cec4" }}
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
