"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CreditCard,
  Search,
  Filter,
  DollarSign,
  AlertCircle,
  Clock,
  CheckCircle2,
  HelpCircle,
  XCircle,
  FileText,
  User,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import * as actions from "@/modules/cha/actions";
import Link from "next/link";

interface ExpensesClientProps {
  initialExpenses: any[];
  filters: {
    status?: string;
    search?: string;
    isUrgent?: boolean;
  };
  currentUserId: string;
}

export function ExpensesClient({
  initialExpenses,
  filters,
  currentUserId,
}: ExpensesClientProps) {
  const router = useRouter();

  // Filter state
  const [status, setStatus] = useState(filters.status || "");
  const [search, setSearch] = useState(filters.search || "");
  const [isUrgent, setIsUrgent] = useState<string>(
    filters.isUrgent === true ? "true" : filters.isUrgent === false ? "false" : ""
  );

  // Loading
  const [loading, setLoading] = useState<string | null>(null);

  // Forms
  const [reviewRequestId, setReviewRequestId] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState("");
  const [reviewRemarks, setReviewRemarks] = useState("");

  const [payRequestId, setPayRequestId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState("");
  const [payMethod, setPayMethod] = useState("BANK_TRANSFER");
  const [payRef, setPayRef] = useState("");

  const [resolveQueryId, setResolveQueryId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState("");

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    if (isUrgent === "true") params.set("isUrgent", "true");
    if (isUrgent === "false") params.set("isUrgent", "false");
    router.push(`/cha/expenses?${params.toString()}`);
  };

  const resetFilters = () => {
    setStatus("");
    setSearch("");
    setIsUrgent("");
    router.push("/cha/expenses");
  };

  // Review status submit
  const handleReviewStatus = async () => {
    if (!reviewRequestId || !reviewStatus) return;
    if ((reviewStatus === "CLARIFICATION_REQUIRED" || reviewStatus === "REJECTED") && !reviewRemarks.trim()) {
      toast.error("Review remarks justification is required for rejections/clarifications.");
      return;
    }

    setLoading(`review-${reviewRequestId}`);
    try {
      const res = await actions.setExpenseStatusAction(
        reviewRequestId,
        reviewStatus as any,
        reviewRemarks
      );

      if (res.ok) {
        toast.success("Expense status successfully updated.");
        setReviewRequestId(null);
        setReviewRemarks("");
        router.refresh();
      } else {
        toast.error(res.error || "Action failed.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  // Post payment disburse submit
  const handlePostPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payRequestId || !payAmount || !payDate || !payRef) {
      toast.error("All payout fields are mandatory.");
      return;
    }

    setLoading(`pay-${payRequestId}`);
    try {
      const mockKey = `cha/expenses/proof_${Math.random().toString(36).substring(7)}.jpg`;
      const res = await actions.postExpensePaymentAction(payRequestId, {
        amountPaid: parseFloat(payAmount),
        paymentDate: new Date(payDate),
        paymentMethod: payMethod,
        transactionReference: payRef,
        paymentProofKey: mockKey,
      });

      if (res.ok) {
        toast.success("Disbursement payout registered successfully.");
        setPayRequestId(null);
        setPayAmount("");
        setPayDate("");
        setPayRef("");
        router.refresh();
      } else {
        toast.error(res.error || "Disbursement post failed.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  // Resolve query submit
  const handleResolveQuery = async () => {
    if (!resolutionText.trim() || !resolveQueryId) {
      toast.error("Resolution note text is required.");
      return;
    }

    setLoading(`resolve-${resolveQueryId}`);
    try {
      const res = await actions.resolvePaymentQueryAction(resolveQueryId, resolutionText);
      if (res.ok) {
        toast.success("Query resolved successfully.");
        setResolveQueryId(null);
        setResolutionText("");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to resolve query.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-outline-variant/30 pb-4">
        <h1 className="ds-h1 text-[#00cec4] flex items-center gap-2">
          <span className="ds-icon-badge bg-[#00cec4]/10 text-[#00cec4] p-1.5 rounded-xl">
            <CreditCard size={20} />
          </span>
          Accounts Expense Disbursement Panel
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Review, query, audit, and post bank payouts for job-linked customs duty and operational expenses.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-surface border border-outline-variant/30 p-5 rounded-xl space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-[#00cec4]">
          <Filter size={16} />
          <span className="ds-label tracking-wider font-semibold">Queue Filters</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative col-span-1 md:col-span-2">
            <span className="absolute inset-y-0 left-3 flex items-center text-on-surface-variant">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Search job #, customer, requester..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-full text-sm font-sans"
            />
          </div>

          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full text-sm font-sans">
            <option value="">All Statuses</option>
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="URGENT_PAYMENT_REQUIRED">URGENT DISBURSEMENT</option>
            <option value="UNDER_REVIEW">UNDER REVIEW</option>
            <option value="CLARIFICATION_REQUIRED">CLARIFICATION REQUIRED</option>
            <option value="APPROVED">APPROVED</option>
            <option value="READY_FOR_DISBURSEMENT">READY FOR DISBURSEMENT</option>
            <option value="PAID">PAID</option>
            <option value="RECEIPT_ACKNOWLEDGED">RECEIPT ACKNOWLEDGED</option>
            <option value="REJECTED">REJECTED</option>
          </select>

          <select value={isUrgent} onChange={(e) => setIsUrgent(e.target.value)} className="w-full text-sm font-sans">
            <option value="">All Urgency levels</option>
            <option value="true">Urgent Escalated Only</option>
            <option value="false">Standard Priority Only</option>
          </select>

          <div className="flex gap-2 col-span-1 md:col-span-4 justify-end">
            <Button variant="outline" onClick={resetFilters} className="text-xs">
              Reset Filters
            </Button>
            <Button onClick={applyFilters} className="text-xs px-6">
              Apply Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Expenses queue grid list */}
      <div className="space-y-4">
        {initialExpenses.length === 0 ? (
          <div className="bg-surface border border-outline-variant/30 p-12 text-center text-on-surface-variant rounded-xl shadow-sm">
            <CreditCard size={48} className="text-outline-variant mx-auto mb-3" />
            <p className="text-sm font-semibold">Disbursement queue is currently empty.</p>
            <p className="text-xs mt-1">Pending expense requests from operations will appear here.</p>
          </div>
        ) : (
          initialExpenses.map((req) => {
            const isPaid = req.status === "PAID";
            const isAck = req.status === "RECEIPT_ACKNOWLEDGED";
            const isQuery = req.status === "QUERY_RAISED";
            const isUrgent = req.isUrgent;
            const sum = req.lines.reduce((tot: number, l: any) => tot + Number(l.amount), 0);

            return (
              <div
                key={req.id}
                className={`bg-surface p-6 rounded-xl border shadow-sm space-y-4 transition-all ${
                  isUrgent ? "border-red-200 bg-red-50/5" : "border-outline-variant/50"
                }`}
              >
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-outline-variant/30 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-on-surface-variant font-mono">
                        Ref: {req.id}
                      </span>
                      <Link
                        href={`/cha/jobs/${req.jobId}`}
                        className="text-xs font-bold text-[#00cec4] hover:underline flex items-center gap-1"
                      >
                        Job: {req.job.jobNumber} <ExternalLink size={10} />
                      </Link>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-on-surface-variant">
                        Customer: <strong className="text-on-surface">{req.job.customer.name}</strong> • Requester:{" "}
                        <strong className="text-on-surface">{req.requestedBy?.name}</strong>
                      </span>
                    </div>

                    <span className="text-xl font-bold text-[#00cec4] block mt-1.5 ds-numeric">
                      ₹{sum.toLocaleString("en-IN")}{" "}
                      {isUrgent && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 ml-2">
                          URGENT
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isAck
                        ? "bg-green-100 text-green-700 border border-green-200"
                        : isPaid
                        ? "bg-blue-100 text-blue-700 border border-blue-200"
                        : isQuery
                        ? "bg-orange-100 text-orange-700 border border-orange-200"
                        : "bg-surface-container-high text-on-surface-variant border border-outline-variant"
                    }`}>
                      {req.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>

                {/* Line Items */}
                <div className="pl-3 border-l-2 border-outline-variant/40 space-y-2">
                  {req.lines.map((l: any) => (
                    <div key={l.id} className="text-xs flex justify-between">
                      <span className="text-on-surface">
                        <strong className="text-on-surface-variant uppercase">{l.category}</strong>: {l.purpose}
                      </span>
                      <span className="font-mono ds-numeric text-on-surface-variant">₹{Number(l.amount).toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>

                {/* Urgent alert notes */}
                {isUrgent && req.urgencyReason && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs leading-relaxed text-red-700">
                    <strong>Disbursement urgency justification:</strong> "{req.urgencyReason}"
                  </div>
                )}

                {/* Queries history loop */}
                {req.queries?.map((q: any) => (
                  <div key={q.id} className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-xs space-y-2">
                    <div>
                      <strong className="text-[#fb923c]">DISBURSEMENT QUERY:</strong>
                      <p className="text-on-surface italic mt-0.5">"{q.queryText}"</p>
                      <span className="text-[10px] text-on-surface-variant block mt-0.5">Raised by: {q.author?.name}</span>
                    </div>

                    {q.resolved ? (
                      <div className="border-t border-orange-200/50 pt-2 text-[11px] text-green-700">
                        <strong>Resolution:</strong> "{q.resolutionText}" (Resolved by {q.resolvedBy?.name})
                      </div>
                    ) : (
                      resolveQueryId === q.id ? (
                        <div className="space-y-2 border-t border-orange-200/50 pt-2">
                          <input
                            type="text"
                            placeholder="Enter query resolution note details..."
                            value={resolutionText}
                            onChange={(e) => setResolutionText(e.target.value)}
                            className="w-full text-xs font-sans"
                          />
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" onClick={() => setResolveQueryId(null)} className="h-7 text-xs">
                              Cancel
                            </Button>
                            <Button size="sm" onClick={handleResolveQuery} disabled={loading !== null} className="h-7 text-xs">
                              Confirm Resolution
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setResolveQueryId(q.id);
                            setResolutionText("");
                          }}
                          className="text-xs font-semibold text-[#fb923c] hover:underline flex items-center gap-1.5"
                        >
                          <MessageSquare size={12} /> Post Resolution Reply
                        </button>
                      )
                    )}
                  </div>
                ))}

                {/* Payments details */}
                {req.payments?.map((p: any) => (
                  <div key={p.id} className="p-3 bg-green-50/5 border border-green-200 rounded-lg text-xs flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-green-700 block">Payout Completed via {p.paymentMethod}</span>
                      <span className="text-[10px] text-on-surface-variant">
                        Txn ID: {p.transactionReference} • Paid by {p.paidBy?.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-on-surface-variant font-mono font-bold">
                      {new Date(p.paymentDate).toDateString()}
                    </span>
                  </div>
                ))}

                {/* Review Form Drawer popup */}
                {reviewRequestId === req.id && (
                  <div className="p-4 border border-outline-variant/60 bg-surface-container-low rounded-xl space-y-3">
                    <span className="ds-label block text-on-surface">Change Expense Request Status</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <select
                        value={reviewStatus}
                        onChange={(e) => setReviewStatus(e.target.value)}
                        className="text-xs w-full"
                      >
                        <option value="">Select Stage Decision</option>
                        <option value="UNDER_REVIEW">UNDER REVIEW</option>
                        <option value="CLARIFICATION_REQUIRED">CLARIFICATION REQUIRED</option>
                        <option value="APPROVED">APPROVED</option>
                        <option value="READY_FOR_DISBURSEMENT">READY FOR DISBURSEMENT</option>
                        <option value="REJECTED">REJECTED</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Review Remarks (Required for rejection/clarification)..."
                        value={reviewRemarks}
                        onChange={(e) => setReviewRemarks(e.target.value)}
                        className="text-xs w-full font-sans"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setReviewRequestId(null)} className="text-xs h-8">
                        Cancel
                      </Button>
                      <Button onClick={handleReviewStatus} disabled={loading !== null} className="text-xs h-8">
                        Submit Status Update
                      </Button>
                    </div>
                  </div>
                )}

                {/* Pay Post Form popup */}
                {payRequestId === req.id && (
                  <form onSubmit={handlePostPayment} className="p-4 border border-[#00cec4]/40 bg-[#00cec4]/5 rounded-xl space-y-4">
                    <span className="ds-label text-[#00cec4] block">Disburse Bank Payout Details</span>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[9px] uppercase font-bold tracking-wide block text-on-surface-variant">Amount Paid (₹) *</label>
                        <input
                          type="number"
                          required
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          className="w-full text-xs font-mono ds-numeric h-8"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] uppercase font-bold tracking-wide block text-on-surface-variant">Payment Date *</label>
                        <input
                          type="date"
                          required
                          value={payDate}
                          onChange={(e) => setPayDate(e.target.value)}
                          className="w-full text-xs h-8"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] uppercase font-bold tracking-wide block text-on-surface-variant">Disbursement Method *</label>
                        <select
                          value={payMethod}
                          onChange={(e) => setPayMethod(e.target.value)}
                          className="w-full text-xs h-8"
                        >
                          <option value="BANK_TRANSFER">IMPS / Bank Transfer</option>
                          <option value="NEFT">NEFT / RTGS</option>
                          <option value="CASH">Office Cash Drawer</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] uppercase font-bold tracking-wide block text-on-surface-variant">Txn Reference ID *</label>
                        <input
                          type="text"
                          required
                          placeholder="Reference ref code"
                          value={payRef}
                          onChange={(e) => setPayRef(e.target.value)}
                          className="w-full text-xs h-8"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPayRequestId(null)} className="text-xs h-8">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={loading !== null} className="text-xs h-8">
                        Confirm Bank Disbursement
                      </Button>
                    </div>
                  </form>
                )}

                {/* Actions footer */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/20 text-xs">
                  {req.status !== "PAID" && req.status !== "RECEIPT_ACKNOWLEDGED" && req.status !== "REJECTED" && (
                    <button
                      onClick={() => {
                        setReviewRequestId(req.id);
                        setReviewStatus(req.status);
                        setReviewRemarks("");
                      }}
                      className="text-on-surface-variant hover:text-on-surface font-semibold"
                    >
                      Audit Status
                    </button>
                  )}

                  {(req.status === "APPROVED" || req.status === "READY_FOR_DISBURSEMENT" || req.isUrgent) &&
                    req.status !== "PAID" &&
                    req.status !== "RECEIPT_ACKNOWLEDGED" &&
                    req.status !== "REJECTED" && (
                      <button
                        onClick={() => {
                          setPayRequestId(req.id);
                          setPayAmount(String(sum));
                          setPayDate(new Date().toISOString().slice(0, 10));
                          setPayRef("");
                        }}
                        className="text-[#00cec4] hover:underline font-bold"
                      >
                        Register Payout
                      </button>
                    )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
