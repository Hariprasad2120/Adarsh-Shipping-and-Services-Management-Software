"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Check,
  CreditCard,
  DollarSign,
  Loader2,
  RefreshCw,
  Settings,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";

type ReimbursementClaim = {
  id: string;
  distanceKm: number;
  ratePerKm: number;
  amount: number;
  status: string;
  createdAt: string;
  approvedAt?: string;
  paidAt?: string;
  notes?: string;
  user: { id: string; name: string; email: string };
  onDutyRequest: {
    id: string;
    fromDate: string;
    toDate: string;
    purpose?: string;
    totalDistanceKm?: number;
  };
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-[#fbbf24]/10 text-[#d97706]",
  APPROVED: "bg-primary/10 text-primary",
  REJECTED: "bg-[#ef4444]/10 text-[#ef4444]",
  PAID: "bg-[#22c55e]/10 text-[#22c55e]",
};

export function ReimbursementAdminView() {
  const [claims, setClaims] = useState<ReimbursementClaim[]>([]);
  const [currentRate, setCurrentRate] = useState(3.75);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [newRate, setNewRate] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [claimsRes, rateRes] = await Promise.all([
        fetch("/api/hrms/reimbursement"),
        fetch("/api/hrms/reimbursement?type=rate"),
      ]);
      const [claimsJson, rateJson] = await Promise.all([claimsRes.json(), rateRes.json()]);

      if (claimsJson.ok) setClaims(claimsJson.data);
      if (rateJson.ok) setCurrentRate(rateJson.data.ratePerKm);
    } catch (error: any) {
      toast.error(error.message || "Failed to load reimbursement data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (claimId: string, action: string, reason?: string) => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/hrms/reimbursement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, claimId, reason }),
      });
      const json = await response.json();
      if (!json.ok) throw new Error(json.error || "Action failed");
      toast.success(`Claim ${action}d successfully`);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Action failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRate = async () => {
    const rate = parseFloat(newRate);
    if (isNaN(rate) || rate <= 0) {
      toast.error("Please enter a valid rate");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/hrms/reimbursement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_rate", ratePerKm: rate }),
      });
      const json = await response.json();
      if (!json.ok) throw new Error(json.error || "Failed to update rate");
      toast.success("Reimbursement rate updated");
      setShowRateModal(false);
      setNewRate("");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update rate");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[24rem] flex-col items-center justify-center gap-3 text-on-surface-variant">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="ds-label">Loading Reimbursement Data</p>
      </div>
    );
  }

  const pendingClaims = claims.filter((c) => c.status === "PENDING");
  const approvedClaims = claims.filter((c) => c.status === "APPROVED");
  const totalPending = pendingClaims.reduce((sum, c) => sum + c.amount, 0);
  const totalApproved = approvedClaims.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="rounded-[24px] border border-outline-variant bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="ds-icon-badge">
              <CreditCard className="size-5" />
            </span>
            <div>
              <h1 className="ds-h1 text-on-surface">FUEL REIMBURSEMENT</h1>
              <p className="mt-2 text-sm text-on-surface-variant">
                Manage fuel reimbursement claims, policy rates, and payment tracking.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={() => setShowRateModal(true)}>
              <Settings className="size-4" />
              <span>Rate: ₹{currentRate}/km</span>
            </Button>
            <Button type="button" variant="outline" mode="icon" onClick={fetchData}>
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card-top-accent-orange rounded-2xl border border-outline-variant bg-surface p-5 shadow-sm">
          <p className="ds-label text-on-surface-variant">PENDING CLAIMS</p>
          <p className="mt-2 text-[2rem] font-extralight tracking-tight text-on-surface ds-numeric">
            {pendingClaims.length}
          </p>
        </div>
        <div className="card-top-accent-orange rounded-2xl border border-outline-variant bg-surface p-5 shadow-sm">
          <p className="ds-label text-on-surface-variant">PENDING AMOUNT</p>
          <p className="mt-2 text-[2rem] font-extralight tracking-tight text-on-surface ds-numeric">
            ₹{totalPending.toFixed(2)}
          </p>
        </div>
        <div className="card-top-accent rounded-2xl border border-outline-variant bg-surface p-5 shadow-sm">
          <p className="ds-label text-on-surface-variant">AWAITING PAYMENT</p>
          <p className="mt-2 text-[2rem] font-extralight tracking-tight text-on-surface ds-numeric">
            {approvedClaims.length}
          </p>
        </div>
        <div className="card-top-accent rounded-2xl border border-outline-variant bg-surface p-5 shadow-sm">
          <p className="ds-label text-on-surface-variant">APPROVED AMOUNT</p>
          <p className="mt-2 text-[2rem] font-extralight tracking-tight text-on-surface ds-numeric">
            ₹{totalApproved.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Claims Table */}
      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="ds-table">
            <thead>
              <tr>
                <th className="px-6 py-3">Employee</th>
                <th className="px-6 py-3">Trip Purpose</th>
                <th className="px-6 py-3">Distance</th>
                <th className="px-6 py-3">Rate</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {claims.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-on-surface-variant">
                    No reimbursement claims yet.
                  </td>
                </tr>
              ) : (
                claims.map((claim) => (
                  <tr key={claim.id}>
                    <td className="px-6 py-4 font-medium text-on-surface">{claim.user.name}</td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      {claim.onDutyRequest.purpose || "On-Duty Trip"}
                    </td>
                    <td className="px-6 py-4 ds-numeric text-on-surface">
                      {claim.distanceKm} km
                    </td>
                    <td className="px-6 py-4 ds-numeric text-on-surface-variant">
                      ₹{claim.ratePerKm}/km
                    </td>
                    <td className="px-6 py-4 ds-numeric font-medium text-on-surface">
                      ₹{claim.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${STATUS_STYLES[claim.status] ?? ""}`}>
                        {claim.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        {claim.status === "PENDING" ? (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleAction(claim.id, "approve")}
                              disabled={submitting}
                            >
                              <Check className="size-3" />
                              <span>Approve</span>
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleAction(claim.id, "reject")}
                              disabled={submitting}
                            >
                              <X className="size-3" />
                              <span>Reject</span>
                            </Button>
                          </>
                        ) : null}
                        {claim.status === "APPROVED" ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleAction(claim.id, "pay")}
                            disabled={submitting}
                          >
                            <DollarSign className="size-3" />
                            <span>Mark Paid</span>
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rate Update Modal */}
      <Modal
        open={showRateModal}
        title="Update Reimbursement Rate"
        description="Set the per-kilometer fuel reimbursement rate. This will apply to all new claims."
        onClose={() => { setShowRateModal(false); setNewRate(""); }}
        className="max-w-md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="ds-label">Current Rate</label>
            <p className="text-lg text-on-surface ds-numeric">₹{currentRate}/km</p>
          </div>
          <div className="space-y-2">
            <label className="ds-label">New Rate (₹/km)</label>
            <input
              type="number"
              step="0.25"
              min="0.01"
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
              className="w-full text-sm"
              placeholder="e.g. 3.75"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setShowRateModal(false); setNewRate(""); }}>
              Cancel
            </Button>
            <Button type="button" onClick={handleUpdateRate} disabled={submitting}>
              Update Rate
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
