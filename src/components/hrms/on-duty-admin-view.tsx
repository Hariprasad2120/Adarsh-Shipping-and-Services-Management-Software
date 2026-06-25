"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  RefreshCw,
  Route,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";

type OnDutyRequest = {
  id: string;
  fromDate: string;
  toDate: string;
  startTime?: string;
  endTime?: string;
  reason: string;
  purpose?: string;
  clientReference?: string;
  visitLocation?: string;
  visitAddress?: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  totalDistanceKm?: number;
  createdAt: string;
  user: { id: string; name: string; email: string };
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-[#fbbf24]/10 text-[#d97706]",
  APPROVED: "bg-primary/10 text-primary",
  REJECTED: "bg-[#ef4444]/10 text-[#ef4444]",
  ACTIVE: "bg-primary/10 text-primary",
  COMPLETED: "bg-[#22c55e]/10 text-[#22c55e]",
  CANCELLED: "bg-surface-container-low text-on-surface-variant",
};

export function OnDutyAdminView() {
  const [requests, setRequests] = useState<OnDutyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/hrms/on-duty");
      const json = await response.json();
      if (!json.ok) throw new Error(json.error || "Failed to load data");
      setRequests(json.data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load on-duty requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (requestId: string, action: string, reason?: string) => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/hrms/on-duty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, requestId, reason }),
      });
      const json = await response.json();
      if (!json.ok) throw new Error(json.error || "Action failed");
      toast.success(`Request ${action === "approve" ? "approved" : "rejected"}`);
      setRejectModal(null);
      setRejectReason("");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Action failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[24rem] flex-col items-center justify-center gap-3 text-on-surface-variant">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="ds-label">Loading On-Duty Requests</p>
      </div>
    );
  }

  const pendingRequests = requests.filter((r) => r.status === "PENDING");
  const activeRequests = requests.filter((r) => r.status === "ACTIVE");
  const recentRequests = requests.filter((r) => !["PENDING", "ACTIVE"].includes(r.status)).slice(0, 20);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="rounded-[24px] border border-outline-variant bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="ds-icon-badge">
              <Route className="size-5" />
            </span>
            <div>
              <h1 className="ds-h1 text-on-surface">ON-DUTY MANAGEMENT</h1>
              <p className="mt-2 text-sm text-on-surface-variant">
                Approve requests, view live trips, and manage on-duty workflows.
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" mode="icon" onClick={fetchData}>
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-top-accent-orange rounded-2xl border border-outline-variant bg-surface p-5 shadow-sm">
          <p className="ds-label text-on-surface-variant">PENDING APPROVAL</p>
          <p className="mt-2 text-[2rem] font-extralight tracking-tight text-on-surface ds-numeric">
            {pendingRequests.length}
          </p>
        </div>
        <div className="card-top-accent rounded-2xl border border-outline-variant bg-surface p-5 shadow-sm">
          <p className="ds-label text-on-surface-variant">ACTIVE TRIPS</p>
          <p className="mt-2 text-[2rem] font-extralight tracking-tight text-on-surface ds-numeric">
            {activeRequests.length}
          </p>
        </div>
        <div className="card-top-accent rounded-2xl border border-outline-variant bg-surface p-5 shadow-sm">
          <p className="ds-label text-on-surface-variant">TOTAL REQUESTS</p>
          <p className="mt-2 text-[2rem] font-extralight tracking-tight text-on-surface ds-numeric">
            {requests.length}
          </p>
        </div>
      </div>

      {/* Pending Approvals */}
      {pendingRequests.length > 0 ? (
        <div className="space-y-3">
          <h2 className="ds-h2 text-on-surface">PENDING APPROVALS</h2>
          {pendingRequests.map((req) => (
            <Card key={req.id} className="card-left-accent-orange rounded-2xl border border-outline-variant bg-surface p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-on-surface">{req.user.name}</p>
                  <p className="text-xs text-on-surface-variant">
                    {req.purpose || req.reason}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    <Clock className="mr-1 inline size-3" />
                    {new Date(req.fromDate).toLocaleDateString()} — {new Date(req.toDate).toLocaleDateString()}
                    {req.startTime ? ` | ${req.startTime}` : ""}
                    {req.endTime ? ` – ${req.endTime}` : ""}
                  </p>
                  {req.visitLocation ? (
                    <p className="text-xs text-on-surface-variant">
                      <MapPin className="mr-1 inline size-3" />
                      {req.visitLocation}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => handleAction(req.id, "approve")}
                    disabled={submitting}
                  >
                    <Check className="size-4" />
                    <span>Approve</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRejectModal(req.id)}
                    disabled={submitting}
                  >
                    <X className="size-4" />
                    <span>Reject</span>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {/* Active Trips */}
      {activeRequests.length > 0 ? (
        <div className="space-y-3">
          <h2 className="ds-h2 text-on-surface">ACTIVE TRIPS</h2>
          {activeRequests.map((req) => (
            <Card key={req.id} className="card-left-accent rounded-2xl border border-outline-variant bg-surface p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-on-surface">{req.user.name}</p>
                  <p className="text-xs text-on-surface-variant">
                    {req.purpose || req.reason} | Started: {req.startedAt ? new Date(req.startedAt).toLocaleTimeString() : "—"}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                  <span className="size-2 rounded-full bg-primary animate-pulse" /> Active
                </span>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {/* Recent History */}
      {recentRequests.length > 0 ? (
        <div className="space-y-3">
          <h2 className="ds-h2 text-on-surface">RECENT HISTORY</h2>
          <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
            <div className="overflow-x-auto">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th className="px-6 py-3">Employee</th>
                    <th className="px-6 py-3">Purpose</th>
                    <th className="px-6 py-3">Dates</th>
                    <th className="px-6 py-3">Distance</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRequests.map((req) => (
                    <tr key={req.id}>
                      <td className="px-6 py-4 font-medium text-on-surface">{req.user.name}</td>
                      <td className="px-6 py-4 text-on-surface-variant">{req.purpose || req.reason}</td>
                      <td className="px-6 py-4 text-on-surface-variant ds-numeric">
                        {new Date(req.fromDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 ds-numeric text-on-surface">
                        {req.totalDistanceKm ? `${req.totalDistanceKm} km` : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${STATUS_STYLES[req.status] ?? ""}`}>
                          {req.status.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {/* Reject Modal */}
      <Modal
        open={!!rejectModal}
        title="Reject On-Duty Request"
        description="Provide a reason for rejection. The employee will be notified."
        onClose={() => { setRejectModal(null); setRejectReason(""); }}
        className="max-w-lg"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="ds-label">Reason</label>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full text-sm"
              placeholder="Enter rejection reason..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setRejectModal(null); setRejectReason(""); }}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (rejectModal) handleAction(rejectModal, "reject", rejectReason);
              }}
              disabled={submitting}
              className="bg-[#ef4444] hover:bg-[#dc2626]"
            >
              Reject
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
