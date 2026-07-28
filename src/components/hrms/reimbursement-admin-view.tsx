"use client";

import {
  PeopleControlInput as MnxInput,
  PeopleControlTable as MnxTable,
} from "@/components/monolith/people-controls";

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
import { Button } from "@/components/monolith/button";
import { Card } from "@/components/monolith/card";
import { Modal } from "@/components/monolith/modal";

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
  PENDING: "bg-[var(--mnx-warning)]/10 text-[var(--mnx-warning)]",
  APPROVED: "bg-mono-accent/10 text-mono-accent",
  REJECTED: "bg-[var(--mnx-danger)]/10 text-[var(--mnx-danger)]",
  PAID: "bg-[var(--mnx-success)]/10 text-[var(--mnx-success)]",
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
      const [claimsJson, rateJson] = await Promise.all([
        claimsRes.json(),
        rateRes.json(),
      ]);

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

  const handleAction = async (
    claimId: string,
    action: string,
    reason?: string,
  ) => {
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
      <div className="flex min-h-[24rem] flex-col items-center justify-center gap-3 text-mono-muted">
        <Loader2 className="size-8 animate-spin text-mono-accent" />
        <p className="mnx-dashboard-spec-label">Loading Reimbursement Data</p>
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
      <Card className="rounded-[24px] border border-mono-border bg-mono-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="mnx-icon-badge">
              <CreditCard className="size-5" />
            </span>
            <div>
              <h1 className="mnx-title-1 text-mono-text">FUEL REIMBURSEMENT</h1>
              <p className="mt-2 text-sm text-mono-muted">
                Manage fuel reimbursement claims, policy rates, and payment
                tracking.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowRateModal(true)}
            >
              <Settings className="size-4" />
              <span>Rate: ₹{currentRate}/km</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              mode="icon"
              onClick={fetchData}
            >
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="mnx-panel mnx-accent-warning rounded-2xl border border-mono-border bg-mono-card p-5 shadow-sm">
          <p className="mnx-dashboard-spec-label text-mono-muted">
            PENDING CLAIMS
          </p>
          <p className="mt-2 text-[2rem] font-extralight tracking-tight text-mono-text mnx-numeric">
            {pendingClaims.length}
          </p>
        </div>
        <div className="mnx-panel mnx-accent-warning rounded-2xl border border-mono-border bg-mono-card p-5 shadow-sm">
          <p className="mnx-dashboard-spec-label text-mono-muted">
            PENDING AMOUNT
          </p>
          <p className="mt-2 text-[2rem] font-extralight tracking-tight text-mono-text mnx-numeric">
            ₹{totalPending.toFixed(2)}
          </p>
        </div>
        <div className="mnx-panel mnx-accent-edge rounded-2xl border border-mono-border bg-mono-card p-5 shadow-sm">
          <p className="mnx-dashboard-spec-label text-mono-muted">
            AWAITING PAYMENT
          </p>
          <p className="mt-2 text-[2rem] font-extralight tracking-tight text-mono-text mnx-numeric">
            {approvedClaims.length}
          </p>
        </div>
        <div className="mnx-panel mnx-accent-edge rounded-2xl border border-mono-border bg-mono-card p-5 shadow-sm">
          <p className="mnx-dashboard-spec-label text-mono-muted">
            APPROVED AMOUNT
          </p>
          <p className="mt-2 text-[2rem] font-extralight tracking-tight text-mono-text mnx-numeric">
            ₹{totalApproved.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Claims Table */}
      <div className="overflow-hidden rounded-xl border border-mono-border bg-mono-card shadow-sm">
        <div className="overflow-x-auto">
          <MnxTable className="mnx-workspace-table">
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
                  <td
                    colSpan={7}
                    className="py-10 text-center text-sm text-mono-muted"
                  >
                    No reimbursement claims yet.
                  </td>
                </tr>
              ) : (
                claims.map((claim) => (
                  <tr key={claim.id}>
                    <td className="px-6 py-4 font-medium text-mono-text">
                      {claim.user.name}
                    </td>
                    <td className="px-6 py-4 text-mono-muted">
                      {claim.onDutyRequest.purpose || "On-Duty Trip"}
                    </td>
                    <td className="px-6 py-4 mnx-numeric text-mono-text">
                      {claim.distanceKm} km
                    </td>
                    <td className="px-6 py-4 mnx-numeric text-mono-muted">
                      ₹{claim.ratePerKm}/km
                    </td>
                    <td className="px-6 py-4 mnx-numeric font-medium text-mono-text">
                      ₹{claim.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${STATUS_STYLES[claim.status] ?? ""}`}
                      >
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
          </MnxTable>
        </div>
      </div>

      {/* Rate Update Modal */}
      <Modal
        open={showRateModal}
        title="Update Reimbursement Rate"
        description="Set the per-kilometer fuel reimbursement rate. This will apply to all new claims."
        onClose={() => {
          setShowRateModal(false);
          setNewRate("");
        }}
        className="max-w-md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="mnx-dashboard-spec-label">Current Rate</label>
            <p className="text-lg text-mono-text mnx-numeric">
              ₹{currentRate}/km
            </p>
          </div>
          <div className="space-y-2">
            <label className="mnx-dashboard-spec-label">New Rate (₹/km)</label>
            <MnxInput
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
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowRateModal(false);
                setNewRate("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUpdateRate}
              disabled={submitting}
            >
              Update Rate
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
