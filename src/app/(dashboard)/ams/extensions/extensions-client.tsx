"use client";

import {
  PerformanceControlTextarea,
  PerformanceTable,
  PerformanceTableBody,
  PerformanceTableCell,
  PerformanceTableHead,
  PerformanceTableHeader,
  PerformanceTableRow,
} from "@/components/monolith/performance-workspace";
import { NativeSelect } from "@/components/monolith/native-select";
import { useState, useTransition, FormEvent } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/monolith/card";
import { Button } from "@/components/monolith/button";
import { requestExtensionAction, decideExtensionAction } from "./actions";
import {
  Plus,
  Check,
  X,
  Calendar,
  User,
  MessageSquare,
  AlertCircle,
  FileText,
} from "lucide-react";

type Request = {
  id: string;
  appraisalId: string;
  requesterId: string;
  reason: string;
  status: string;
  extendedUntil?: Date | string | null;
  createdAt: Date | string;
  requester: { name: string; designation?: string | null };
  decidedBy?: { name: string } | null;
  appraisal: {
    cycle: { name: string };
    employee: { name: string };
  };
};

type ActiveAppraisal = {
  id: string;
  cycle: { name: string };
  employee: { name: string };
};

interface ExtensionsClientProps {
  initialRequests: Request[];
  activeAppraisals: ActiveAppraisal[];
  isAdmin: boolean;
  currentUserId: string;
}

export function ExtensionsClient({
  initialRequests,
  activeAppraisals,
  isAdmin,
  currentUserId,
}: ExtensionsClientProps) {
  const [requests, setRequests] = useState<Request[]>(initialRequests);
  const [appraisalId, setAppraisalId] = useState("");
  const [reason, setReason] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDecision, startDecisionTransition] = useTransition();
  const [pendingRequest, startRequestTransition] = useTransition();

  // Submit decision
  function handleDecision(
    requestId: string,
    decision: "APPROVED" | "REJECTED",
  ) {
    startDecisionTransition(async () => {
      const formData = new FormData();
      formData.append("requestId", requestId);
      formData.append("decision", decision);

      const res = await decideExtensionAction(formData);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Request ${decision.toLowerCase()} successfully`);
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? { ...r, status: decision, decidedBy: { name: "You" } }
            : r,
        ),
      );
    });
  }

  // Request extension
  function handleRequestSubmit(e: FormEvent) {
    e.preventDefault();
    if (!appraisalId) {
      toast.error("Please select an appraisal");
      return;
    }
    if (!reason.trim()) {
      toast.error("Reason is required");
      return;
    }

    startRequestTransition(async () => {
      const formData = new FormData();
      formData.append("appraisalId", appraisalId);
      formData.append("reason", reason.trim());

      const res = await requestExtensionAction(formData);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Extension request submitted successfully");
      setReason("");
      setAppraisalId("");
      setFormOpen(false);
      // Let's reload to update the requests list
      window.location.reload();
    });
  }

  const pendingRequests = requests.filter((r) => r.status === "PENDING");
  const decidedRequests = requests.filter((r) => r.status !== "PENDING");

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* List Column (Left / Main) */}
      <div className="lg:col-span-2 space-y-6">
        {/* Pending approvals */}
        {isAdmin && pendingRequests.length > 0 && (
          <Card className="border-0 shadow-sm border-l-4 border-l-mono-accent bg-mono-card">
            <CardHeader className="pb-3 border-b border-mono-border/60">
              <CardTitle className="text-base font-bold text-[var(--mnx-warning)] dark:text-[var(--mnx-warning)]">
                Pending Extension Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="rounded-xl border border-mono-border/50 p-4 bg-mono-soft/30 dark:bg-mono-soft/30 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-mono-text dark:text-mono-text">
                        {req.appraisal.employee.name} —{" "}
                        {req.appraisal.cycle.name}
                      </h4>
                      <p className="text-xs text-mono-muted font-semibold">
                        Requested by: {req.requester.name} on{" "}
                        <span suppressHydrationWarning>
                          {new Date(req.createdAt).toLocaleDateString("en-IN")}
                        </span>
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleDecision(req.id, "APPROVED")}
                        disabled={pendingDecision}
                        className="bg-[var(--mnx-success-bg)] hover:bg-[var(--mnx-success-bg)] text-mono-text h-8 w-8 px-0 flex items-center justify-center rounded-lg"
                      >
                        <Check className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDecision(req.id, "REJECTED")}
                        disabled={pendingDecision}
                        className="border-mono-border text-[var(--mnx-danger)] hover:text-[var(--mnx-danger)] hover:bg-[var(--mnx-danger-bg)] h-8 w-8 px-0 flex items-center justify-center rounded-lg"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="bg-mono-card p-3 rounded-lg border border-mono-border/40 text-sm text-mono-muted dark:text-mono-text">
                    <span className="font-semibold text-xs text-mono-muted block mb-1 uppercase tracking-wider">
                      Reason:
                    </span>
                    {req.reason}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Decided extensions */}
        <Card className="border-0 shadow-sm bg-mono-card">
          <CardHeader className="pb-3 border-b border-mono-border/60">
            <CardTitle className="text-base font-bold text-mono-text dark:text-mono-text">
              Extension Logs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {decidedRequests.length === 0 &&
            (!isAdmin || pendingRequests.length === 0) ? (
              <div className="text-center text-mono-muted py-16 text-sm font-medium">
                No extension requests recorded.
              </div>
            ) : decidedRequests.length === 0 ? (
              <div className="text-center text-mono-muted py-12 text-sm font-medium">
                No history entries yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <PerformanceTable className="w-full text-sm">
                  <PerformanceTableHeader>
                    <PerformanceTableRow className="border-b border-mono-border bg-mono-soft/40 dark:bg-mono-soft/50 text-left">
                      <PerformanceTableHead className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-mono-muted">
                        Employee
                      </PerformanceTableHead>
                      <PerformanceTableHead className="px-4 text-xs font-bold uppercase tracking-wider text-mono-muted">
                        Cycle
                      </PerformanceTableHead>
                      <PerformanceTableHead className="px-4 text-xs font-bold uppercase tracking-wider text-mono-muted">
                        Status
                      </PerformanceTableHead>
                      <PerformanceTableHead className="px-4 text-xs font-bold uppercase tracking-wider text-mono-muted">
                        Extended Until
                      </PerformanceTableHead>
                      <PerformanceTableHead className="px-4 text-xs font-bold uppercase tracking-wider text-mono-muted">
                        Approved By
                      </PerformanceTableHead>
                    </PerformanceTableRow>
                  </PerformanceTableHeader>
                  <PerformanceTableBody className="divide-y divide-outline-variant/40">
                    {decidedRequests.map((req) => (
                      <PerformanceTableRow
                        key={req.id}
                        className="hover:bg-mono-card dark:hover:bg-mono-card transition"
                      >
                        <PerformanceTableCell className="py-3.5 px-4 font-bold text-mono-text dark:text-mono-text">
                          {req.appraisal.employee.name}
                        </PerformanceTableCell>
                        <PerformanceTableCell className="px-4 text-mono-muted dark:text-mono-muted font-semibold">
                          {req.appraisal.cycle.name}
                        </PerformanceTableCell>
                        <PerformanceTableCell className="px-4">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                              req.status === "APPROVED"
                                ? "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)] dark:bg-[var(--mnx-success-bg)] dark:text-[var(--mnx-success)] border-mono-border dark:border-mono-border"
                                : "bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)] dark:bg-[var(--mnx-danger-bg)] dark:text-[var(--mnx-danger)] border-mono-border dark:border-mono-border"
                            }`}
                          >
                            {req.status}
                          </span>
                        </PerformanceTableCell>
                        <PerformanceTableCell
                          className="px-4 text-mono-muted dark:text-mono-muted font-semibold"
                          suppressHydrationWarning
                        >
                          {req.extendedUntil
                            ? new Date(req.extendedUntil).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                },
                              )
                            : "—"}
                        </PerformanceTableCell>
                        <PerformanceTableCell className="px-4 text-mono-muted dark:text-mono-muted font-semibold">
                          {req.decidedBy?.name || "System"}
                        </PerformanceTableCell>
                      </PerformanceTableRow>
                    ))}
                  </PerformanceTableBody>
                </PerformanceTable>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form / Quick Links Column (Right) */}
      <div className="space-y-6">
        {!isAdmin && activeAppraisals.length > 0 && (
          <Card className="border-0 shadow-sm border-l-4 border-l-mono-accent bg-mono-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-mono-text dark:text-mono-text">
                Request Deadline Extension
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRequestSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-mono-muted">
                    Active Appraisal Cycle
                  </label>
                  <NativeSelect
                    value={appraisalId}
                    onChange={(e) => setAppraisalId(e.target.value)}
                    className="w-full rounded-lg border border-mono-border/60 bg-mono-card px-3 py-2.5 text-sm text-mono-text dark:text-mono-text focus:outline-none focus:border-mono-border transition"
                  >
                    <option value="">Select Appraisal</option>
                    {activeAppraisals.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.employee.name} — {a.cycle.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-mono-muted">
                    Reason for Extension
                  </label>
                  <PerformanceControlTextarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                    placeholder="Provide a clear justification for why you need more time to complete your ratings..."
                    className="w-full rounded-lg border border-mono-border/60 bg-mono-card px-3 py-2 text-sm text-mono-text dark:text-mono-text placeholder:text-mono-muted focus:outline-none focus:border-mono-border transition resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={pendingRequest || !appraisalId || !reason.trim()}
                  className="w-full"
                >
                  {pendingRequest
                    ? "Submitting..."
                    : "Submit Extension Request"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {!isAdmin && activeAppraisals.length === 0 && (
          <Card className="border-0 shadow-sm bg-mono-card">
            <CardContent className="py-8 text-center text-xs text-mono-muted font-semibold flex flex-col items-center gap-3">
              <AlertCircle className="size-8 text-mono-text" />
              <span>
                You have no active appraisal cycles that qualify for deadline
                extension requests.
              </span>
            </CardContent>
          </Card>
        )}

        {/* Informational Guidelines Card */}
        <Card className="border-0 shadow-sm bg-mono-card">
          <CardHeader className="border-b border-mono-border/60 pb-3">
            <CardTitle className="text-sm font-bold text-mono-muted dark:text-mono-text flex items-center gap-2">
              <FileText className="size-4 text-mono-accent" /> Extension Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3 text-xs text-mono-muted dark:text-mono-muted font-semibold leading-relaxed">
            <p>
              1. Employees and reviewers can request deadline extensions if they
              are unable to complete ratings due to unforeseen workload,
              holidays, or emergency leaves.
            </p>
            <p>
              2. Upon approval by the appraisal manager or HR admin, the
              specific phase deadline (self-assessment or reviewer rating) is
              automatically extended by **2 business days** (weekends and
              national holidays excluded).
            </p>
            <p>
              3. Only **one active request** can be pending at a time for any
              single appraisal cycle.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
