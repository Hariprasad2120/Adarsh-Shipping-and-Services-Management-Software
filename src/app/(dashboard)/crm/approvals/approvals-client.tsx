"use client";

import { CrmButton, CrmTextarea } from "@/modules/crm/components/workspace/crm-workspace";

import React, { useState, useTransition } from "react";
import {ClipboardList,CheckCircle2,XCircle,RotateCcw,Clock,TrendingUp,FileText,ShoppingCart,Receipt,Loader2,} from "lucide-react";
import { ApprovalStatusBadge } from "@/modules/crm/components/ApprovalActionBar";
import {actionApproveDocument,actionRequestRework,actionDeclineDocument,} from "@/modules/crm/approval-actions";
import { toast } from "@/modules/notifications/client";

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
      color: "var(--mnx-warning)",
    },
    {
      label: "Approved This Month",
      value: metrics.approvedThisMonth,
      icon: <CheckCircle2 size={20} />,
      color: "var(--mnx-accent)",
    },
    {
      label: "Declined This Month",
      value: metrics.declinedThisMonth,
      icon: <XCircle size={20} />,
      color: "var(--mnx-danger)",
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
      color: "var(--mnx-accent)",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="mnx-crm-icon-badge">
          <ClipboardList size={18} />
        </span>
        <div>
          <h1 className="mnx-title-1">Approval Queue</h1>
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
            className="mnx-crm-panel-surface  rounded-xl p-4"
            style={
              s.color !== "var(--mnx-accent)"
                ? ({
                    "--card-accent-color": s.color,
                  } as React.CSSProperties)
                : {}
            }
          >
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: s.color }}>{s.icon}</span>
              <span className="mnx-label">{s.label}</span>
            </div>
            <p
              className="mnx-numeric text-2xl font-bold"
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
          <CrmButton
            key={t}
            onClick={() => setFilterType(t)}
            className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-xl transition-all"
            style={{
              background:
                filterType === t
                  ? "var(--mnx-accent-soft)"
                  : "var(--color-surface-container)",
              color: filterType === t ? "var(--mnx-accent)" : "var(--color-on-surface-variant)",
              border:
                filterType === t ? "1px solid var(--mnx-accent-soft)" : "1px solid transparent",
            }}
          >
            {t === "all" ? "All" : TYPE_LABEL[t]}
          </CrmButton>
        ))}
      </div>

      {/* Queue */}
      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-2xl"
          style={{ background: "var(--color-surface)" }}
        >
          <CheckCircle2 size={40} style={{ color: "var(--mnx-accent)" }} className="mb-3 opacity-60" />
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
                className="mnx-crm-panel-surface  rounded-xl p-4"
                style={{ background: "var(--color-surface)" }}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left info */}
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className="mnx-crm-icon-badge mt-0.5 flex-shrink-0"
                      style={{ color: "var(--mnx-accent)" }}
                    >
                      {TYPE_ICON[item.type] ?? <FileText size={14} />}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="mnx-label">{TYPE_LABEL[item.type] ?? item.type}</span>
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
                    <p className="mnx-numeric font-bold" style={{ color: "var(--color-on-surface)" }}>
                      ₹{item.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                {canAct && !isReworkOpen && (
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <CrmButton
                      onClick={() => approve(item.id)}
                      disabled={isActing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-xl bg-[var(--mnx-accent)] text-[var(--mnx-text-strong)] hover:bg-[var(--mnx-accent)] transition-colors disabled:opacity-50"
                    >
                      {isActing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                      Approve
                    </CrmButton>
                    <CrmButton
                      onClick={() => {
                        setReworkId(item.id);
                        setReworkNote("");
                      }}
                      disabled={isActing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-xl bg-[var(--mnx-warning)] text-[var(--mnx-text-strong)] hover:bg-[var(--mnx-warning)] transition-colors disabled:opacity-50"
                    >
                      <RotateCcw size={12} />
                      Rework
                    </CrmButton>
                    {item.type !== "SALES_ORDER" && (
                      <CrmButton
                        onClick={() => decline(item.id)}
                        disabled={isActing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-xl bg-[var(--mnx-danger)] text-[var(--mnx-text-strong)] hover:bg-[var(--mnx-danger)] transition-colors disabled:opacity-50"
                      >
                        <XCircle size={12} />
                        Decline
                      </CrmButton>
                    )}
                  </div>
                )}

                {/* Rework note input */}
                {isReworkOpen && (
                  <div className="mt-3 space-y-2">
                    <CrmTextarea
                      autoFocus
                      rows={3}
                      placeholder="Describe what needs to be changed..."
                      className="w-full px-3 py-2 text-sm rounded-xl resize-none"
                      style={{ border: "1px solid var(--mnx-warning-bg)" }}
                      value={reworkNote}
                      onChange={(e) => setReworkNote(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <CrmButton
                        onClick={() => submitRework(item.id)}
                        disabled={isPending || !reworkNote.trim()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-xl bg-[var(--mnx-warning)] text-[var(--mnx-text-strong)] disabled:opacity-50"
                      >
                        {isPending ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                        Send Back
                      </CrmButton>
                      <CrmButton
                        onClick={() => setReworkId(null)}
                        className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-xl"
                        style={{
                          background: "var(--color-surface-container)",
                          color: "var(--color-on-surface)",
                        }}
                      >
                        Cancel
                      </CrmButton>
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
