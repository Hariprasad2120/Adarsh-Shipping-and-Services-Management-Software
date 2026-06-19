"use client";

import React, { useState, useTransition } from "react";
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  TrendingUp,
  FileText,
  ShoppingCart,
  Receipt,
  Loader2,
} from "lucide-react";
import { ApprovalStatusBadge } from "@/components/crm/ApprovalActionBar";
import {
  actionApproveDocument,
  actionRequestRework,
  actionDeclineDocument,
} from "@/modules/crm/approval-actions";
import { toast } from "sonner";

type PendingItem = {
  id: string;
  invoiceNumber: string;
  type: string;
  approvalStatus: string;
  total: number;
  submittedAt: Date | null;
  owner: { id: string; name: string };
  account: { id: string; name: string } | null;
};

type Metrics = {
  pending: number;
  approvedThisMonth: number;
  declinedThisMonth: number;
  avgHours: number | null;
};

type Caps = {
  canApproveQuote: boolean;
  canApproveInvoice: boolean;
  canApproveSO: boolean;
  canAdminRestore: boolean;
};

interface ApprovalsClientProps {
  pending: PendingItem[];
  metrics: Metrics;
  caps: Caps;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  QUOTE: <FileText size={14} />,
  SALES_ORDER: <ShoppingCart size={14} />,
  INVOICE: <Receipt size={14} />,
};

const TYPE_LABEL: Record<string, string> = {
  QUOTE: "Quote",
  SALES_ORDER: "Sales Order",
  INVOICE: "Invoice",
  PURCHASE_ORDER: "PO",
};

function canActOn(type: string, caps: Caps): boolean {
  if (type === "QUOTE") return caps.canApproveQuote;
  if (type === "SALES_ORDER") return caps.canApproveSO;
  if (type === "INVOICE") return caps.canApproveInvoice;
  return false;
}

export default function ApprovalsClient({ pending, metrics, caps }: ApprovalsClientProps) {
  const [filterType, setFilterType] = useState<string>("all");
  const [acting, setActing] = useState<string | null>(null);
  const [reworkId, setReworkId] = useState<string | null>(null);
  const [reworkNote, setReworkNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered =
    filterType === "all" ? pending : pending.filter((p) => p.type === filterType);

  function approve(id: string) {
    setActing(id);
    startTransition(async () => {
      try {
        await actionApproveDocument(id);
        toast.success("Approved");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      } finally {
        setActing(null);
      }
    });
  }

  function decline(id: string) {
    setActing(id);
    startTransition(async () => {
      try {
        await actionDeclineDocument(id);
        toast.success("Declined");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      } finally {
        setActing(null);
      }
    });
  }

  function submitRework(id: string) {
    if (!reworkNote.trim()) {
      toast.error("Rework reason required");
      return;
    }
    setActing(id);
    startTransition(async () => {
      try {
        await actionRequestRework(id, reworkNote);
        toast.success("Sent back for rework");
        setReworkId(null);
        setReworkNote("");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      } finally {
        setActing(null);
      }
    });
  }

  const statCards = [
    {
      label: "Pending",
      value: metrics.pending,
      icon: <Clock size={20} />,
      color: "#f97316",
    },
    {
      label: "Approved This Month",
      value: metrics.approvedThisMonth,
      icon: <CheckCircle2 size={20} />,
      color: "#00cec4",
    },
    {
      label: "Declined This Month",
      value: metrics.declinedThisMonth,
      icon: <XCircle size={20} />,
      color: "#ef4444",
    },
    {
      label: "Avg Approval Time",
      value:
        metrics.avgHours !== null
          ? metrics.avgHours < 1
            ? `${Math.round(metrics.avgHours * 60)}m`
            : `${metrics.avgHours.toFixed(1)}h`
          : "—",
      icon: <TrendingUp size={20} />,
      color: "#818cf8",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="ds-icon-badge">
          <ClipboardList size={18} />
        </span>
        <div>
          <h1 className="ds-h1">Approval Queue</h1>
          <p className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
            Review and act on pending submissions
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="card-top-accent rounded-xl p-4"
            style={
              s.color !== "#00cec4"
                ? ({
                    "--card-accent-color": s.color,
                  } as React.CSSProperties)
                : {}
            }
          >
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: s.color }}>{s.icon}</span>
              <span className="ds-label">{s.label}</span>
            </div>
            <p
              className="ds-numeric text-2xl font-bold"
              style={{ color: "var(--color-on-surface)" }}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {["all", "QUOTE", "SALES_ORDER", "INVOICE"].map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-xl transition-all"
            style={{
              background:
                filterType === t
                  ? "rgba(0,206,196,0.15)"
                  : "var(--color-surface-container)",
              color: filterType === t ? "#00cec4" : "var(--color-on-surface-variant)",
              border:
                filterType === t ? "1px solid rgba(0,206,196,0.4)" : "1px solid transparent",
            }}
          >
            {t === "all" ? "All" : TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      {/* Queue */}
      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-2xl"
          style={{ background: "var(--color-surface)" }}
        >
          <CheckCircle2 size={40} style={{ color: "#00cec4" }} className="mb-3 opacity-60" />
          <p className="text-sm font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
            No pending approvals
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const canAct = canActOn(item.type, caps);
            const isReworkOpen = reworkId === item.id;
            const isActing = acting === item.id && isPending;

            return (
              <div
                key={item.id}
                className="card-left-accent rounded-xl p-4"
                style={{ background: "var(--color-surface)" }}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left info */}
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className="ds-icon-badge mt-0.5 flex-shrink-0"
                      style={{ color: "#00cec4" }}
                    >
                      {TYPE_ICON[item.type] ?? <FileText size={14} />}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="ds-label">{TYPE_LABEL[item.type] ?? item.type}</span>
                        <span
                          className="font-semibold text-sm"
                          style={{ color: "var(--color-on-surface)" }}
                        >
                          {item.invoiceNumber}
                        </span>
                        <ApprovalStatusBadge status={item.approvalStatus} />
                      </div>
                      <p
                        className="text-sm mt-0.5"
                        style={{ color: "var(--color-on-surface-variant)" }}
                      >
                        {item.account?.name ?? "—"} · by {item.owner.name}
                      </p>
                      {item.submittedAt && (
                        <p className="text-xs mt-0.5" style={{ color: "var(--color-on-surface-variant)" }}>
                          Submitted{" "}
                          {new Date(item.submittedAt).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right flex-shrink-0">
                    <p className="ds-numeric font-bold" style={{ color: "var(--color-on-surface)" }}>
                      ₹{item.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                {canAct && !isReworkOpen && (
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <button
                      onClick={() => approve(item.id)}
                      disabled={isActing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-xl bg-[#00cec4] text-white hover:bg-[#00b8af] transition-colors disabled:opacity-50"
                    >
                      {isActing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        setReworkId(item.id);
                        setReworkNote("");
                      }}
                      disabled={isActing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-xl bg-[#f97316] text-white hover:bg-[#ea580c] transition-colors disabled:opacity-50"
                    >
                      <RotateCcw size={12} />
                      Rework
                    </button>
                    {item.type !== "SALES_ORDER" && (
                      <button
                        onClick={() => decline(item.id)}
                        disabled={isActing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-xl bg-[#ef4444] text-white hover:bg-[#dc2626] transition-colors disabled:opacity-50"
                      >
                        <XCircle size={12} />
                        Decline
                      </button>
                    )}
                  </div>
                )}

                {/* Rework note input */}
                {isReworkOpen && (
                  <div className="mt-3 space-y-2">
                    <textarea
                      autoFocus
                      rows={3}
                      placeholder="Describe what needs to be changed..."
                      className="w-full px-3 py-2 text-sm rounded-xl resize-none"
                      style={{ border: "1px solid rgba(251,146,60,0.55)" }}
                      value={reworkNote}
                      onChange={(e) => setReworkNote(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => submitRework(item.id)}
                        disabled={isPending || !reworkNote.trim()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-xl bg-[#f97316] text-white disabled:opacity-50"
                      >
                        {isPending ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                        Send Back
                      </button>
                      <button
                        onClick={() => setReworkId(null)}
                        className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-xl"
                        style={{
                          background: "var(--color-surface-container)",
                          color: "var(--color-on-surface)",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
