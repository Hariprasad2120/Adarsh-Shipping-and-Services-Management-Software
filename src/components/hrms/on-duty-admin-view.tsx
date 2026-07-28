"use client";

import {
  PeopleControlTextarea as MnxTextarea,
  PeopleControlTable as MnxTable,
} from "@/components/monolith/people-controls";

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
import { Button } from "@/components/monolith/button";
import { Card } from "@/components/monolith/card";
import { Modal } from "@/components/monolith/modal";

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
  PENDING: "bg-[var(--mnx-warning)]/10 text-[var(--mnx-warning)]",
  APPROVED: "bg-mono-accent/10 text-mono-accent",
  REJECTED: "bg-[var(--mnx-danger)]/10 text-[var(--mnx-danger)]",
  ACTIVE: "bg-mono-accent/10 text-mono-accent",
  COMPLETED: "bg-[var(--mnx-success)]/10 text-[var(--mnx-success)]",
  CANCELLED: "bg-mono-soft text-mono-muted",
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

  const handleAction = async (
    requestId: string,
    action: string,
    reason?: string,
  ) => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/hrms/on-duty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, requestId, reason }),
      });
      const json = await response.json();
      if (!json.ok) throw new Error(json.error || "Action failed");
      toast.success(
        `Request ${action === "approve" ? "approved" : "rejected"}`,
      );
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
      <div className="flex min-h-[24rem] flex-col items-center justify-center gap-3 text-mono-muted">
        <Loader2 className="size-8 animate-spin text-mono-accent" />
        <p className="mnx-dashboard-spec-label">Loading On-Duty Requests</p>
      </div>
    );
  }

  const pendingRequests = requests.filter((r) => r.status === "PENDING");
  const activeRequests = requests.filter((r) => r.status === "ACTIVE");
  const recentRequests = requests
    .filter((r) => !["PENDING", "ACTIVE"].includes(r.status))
    .slice(0, 20);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="rounded-[24px] border border-mono-border bg-mono-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="mnx-icon-badge">
              <Route className="size-5" />
            </span>
            <div>
              <h1 className="mnx-title-1 text-mono-text">ON-DUTY MANAGEMENT</h1>
              <p className="mt-2 text-sm text-mono-muted">
                Approve requests, view live trips, and manage on-duty workflows.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            mode="icon"
            onClick={fetchData}
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="mnx-panel mnx-accent-warning rounded-2xl border border-mono-border bg-mono-card p-5 shadow-sm">
          <p className="mnx-dashboard-spec-label text-mono-muted">
            PENDING APPROVAL
          </p>
          <p className="mt-2 text-[2rem] font-extralight tracking-tight text-mono-text mnx-numeric">
            {pendingRequests.length}
          </p>
        </div>
        <div className="mnx-panel mnx-accent-edge rounded-2xl border border-mono-border bg-mono-card p-5 shadow-sm">
          <p className="mnx-dashboard-spec-label text-mono-muted">
            ACTIVE TRIPS
          </p>
          <p className="mt-2 text-[2rem] font-extralight tracking-tight text-mono-text mnx-numeric">
            {activeRequests.length}
          </p>
        </div>
        <div className="mnx-panel mnx-accent-edge rounded-2xl border border-mono-border bg-mono-card p-5 shadow-sm">
          <p className="mnx-dashboard-spec-label text-mono-muted">
            TOTAL REQUESTS
          </p>
          <p className="mt-2 text-[2rem] font-extralight tracking-tight text-mono-text mnx-numeric">
            {requests.length}
          </p>
        </div>
      </div>

      {/* Pending Approvals */}
      {pendingRequests.length > 0 ? (
        <div className="space-y-3">
          <h2 className="mnx-title-2 text-mono-text">PENDING APPROVALS</h2>
          {pendingRequests.map((req) => (
            <Card
              key={req.id}
              className="mnx-panel mnx-accent-warning rounded-2xl border border-mono-border bg-mono-card p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-mono-text">
                    {req.user.name}
                  </p>
                  <p className="text-xs text-mono-muted">
                    {req.purpose || req.reason}
                  </p>
                  <p className="text-xs text-mono-muted">
                    <Clock className="mr-1 inline size-3" />
                    {new Date(req.fromDate).toLocaleDateString()} —{" "}
                    {new Date(req.toDate).toLocaleDateString()}
                    {req.startTime ? ` | ${req.startTime}` : ""}
                    {req.endTime ? ` – ${req.endTime}` : ""}
                  </p>
                  {req.visitLocation ? (
                    <p className="text-xs text-mono-muted">
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
          <h2 className="mnx-title-2 text-mono-text">ACTIVE TRIPS</h2>
          {activeRequests.map((req) => (
            <Card
              key={req.id}
              className="mnx-panel mnx-accent-edge rounded-2xl border border-mono-border bg-mono-card p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-mono-text">
                    {req.user.name}
                  </p>
                  <p className="text-xs text-mono-muted">
                    {req.purpose || req.reason} | Started:{" "}
                    {req.startedAt
                      ? new Date(req.startedAt).toLocaleTimeString()
                      : "—"}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-mono-accent/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-mono-accent">
                  <span className="size-2 rounded-full bg-mono-accent animate-pulse" />{" "}
                  Active
                </span>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {/* Recent History */}
      {recentRequests.length > 0 ? (
        <div className="space-y-3">
          <h2 className="mnx-title-2 text-mono-text">RECENT HISTORY</h2>
          <div className="overflow-hidden rounded-xl border border-mono-border bg-mono-card shadow-sm">
            <div className="overflow-x-auto">
              <MnxTable className="mnx-workspace-table">
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
                      <td className="px-6 py-4 font-medium text-mono-text">
                        {req.user.name}
                      </td>
                      <td className="px-6 py-4 text-mono-muted">
                        {req.purpose || req.reason}
                      </td>
                      <td className="px-6 py-4 text-mono-muted mnx-numeric">
                        {new Date(req.fromDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 mnx-numeric text-mono-text">
                        {req.totalDistanceKm
                          ? `${req.totalDistanceKm} km`
                          : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${STATUS_STYLES[req.status] ?? ""}`}
                        >
                          {req.status.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </MnxTable>
            </div>
          </div>
        </div>
      ) : null}

      {/* Reject Modal */}
      <Modal
        open={!!rejectModal}
        title="Reject On-Duty Request"
        description="Provide a reason for rejection. The employee will be notified."
        onClose={() => {
          setRejectModal(null);
          setRejectReason("");
        }}
        className="max-w-lg"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="mnx-dashboard-spec-label">Reason</label>
            <MnxTextarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full text-sm"
              placeholder="Enter rejection reason..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRejectModal(null);
                setRejectReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (rejectModal)
                  handleAction(rejectModal, "reject", rejectReason);
              }}
              disabled={submitting}
              className="bg-[var(--mnx-danger)] hover:bg-[var(--mnx-danger)]"
            >
              Reject
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
