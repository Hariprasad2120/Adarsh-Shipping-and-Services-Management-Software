"use client";

import { useState, useTransition, FormEvent } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requestOtAction, decideOtAction } from "./actions";
import { Plus, Check, X, Clock, User, Calendar, MessageSquare, AlertCircle } from "lucide-react";

type OTEntry = {
  id: string;
  userId: string;
  date: Date | string;
  hours: number;
  status: string;
  notes?: string | null;
  createdAt: Date | string;
  user: {
    name: string;
  };
};

interface OtClientProps {
  initialEntries: OTEntry[];
  canApprove: boolean;
  canRequest: boolean;
  currentUserId: string;
}

export function OtClient({
  initialEntries,
  canApprove,
  canRequest,
  currentUserId,
}: OtClientProps) {
  const [entries, setEntries] = useState<OTEntry[]>(initialEntries);
  const [date, setDate] = useState("");
  const [hours, setHours] = useState("");
  const [notes, setNotes] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDecision, startDecisionTransition] = useTransition();
  const [pendingRequest, startRequestTransition] = useTransition();

  // Approve / Reject decision
  function handleDecision(entryId: string, decision: "approved" | "rejected") {
    startDecisionTransition(async () => {
      const formData = new FormData();
      formData.append("entryId", entryId);
      formData.append("decision", decision);

      const res = await decideOtAction(formData);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Request ${decision} successfully`);
      setEntries((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, status: decision } : e))
      );
    });
  }

  // Request Overtime
  function handleRequestSubmit(e: FormEvent) {
    e.preventDefault();
    if (!date) { toast.error("Date is required"); return; }
    if (!hours) { toast.error("Hours is required"); return; }

    startRequestTransition(async () => {
      const formData = new FormData();
      formData.append("date", date);
      formData.append("hours", hours);
      formData.append("notes", notes.trim());

      const res = await requestOtAction(formData);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("OT request submitted successfully");
      setDate("");
      setHours("");
      setNotes("");
      setFormOpen(false);
      // Reload page to fetch updated list
      window.location.reload();
    });
  }

  const pendingEntries = entries.filter((e) => e.status === "pending");
  const decidedEntries = entries.filter((e) => e.status !== "pending");

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main List Column (Left) */}
      <div className="lg:col-span-2 space-y-6">
        {/* Pending Approvals (Visible to Approvers) */}
        {canApprove && pendingEntries.length > 0 && (
          <Card className="border-0 shadow-sm border-l-4 border-l-amber-500 bg-surface">
            <CardHeader className="pb-3 border-b border-outline-variant/60">
              <CardTitle className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Pending Approvals ({pendingEntries.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {pendingEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-outline-variant/50 p-4 bg-surface-container-low/30 dark:bg-surface-container-lowest/30 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <User className="size-4 text-slate-400" /> {entry.user.name}
                      </h4>
                      <p className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                        <Calendar className="size-3.5" />
                        <span suppressHydrationWarning>{new Date(entry.date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}</span>
                        {" · "}
                        <Clock className="size-3.5" /> {entry.hours} hrs
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleDecision(entry.id, "approved")}
                        disabled={pendingDecision}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 w-8 px-0 flex items-center justify-center rounded-lg"
                      >
                        <Check className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDecision(entry.id, "rejected")}
                        disabled={pendingDecision}
                        className="border-rose-200 text-rose-600 hover:text-rose-700 hover:bg-rose-50/20 h-8 w-8 px-0 flex items-center justify-center rounded-lg"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {entry.notes && (
                    <div className="bg-surface p-3 rounded-lg border border-outline-variant/40 text-xs text-slate-600 dark:text-slate-400 font-semibold flex items-start gap-1.5">
                      <MessageSquare className="size-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{entry.notes}</span>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* History / Logs */}
        <Card className="border-0 shadow-sm bg-surface">
          <CardHeader className="pb-3 border-b border-outline-variant/60">
            <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">
              Overtime History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {decidedEntries.length === 0 && (!canApprove || pendingEntries.length === 0) ? (
              <div className="text-center text-slate-400/80 py-16 text-sm font-medium">
                No overtime entries recorded.
              </div>
            ) : decidedEntries.length === 0 ? (
              <div className="text-center text-slate-400/80 py-12 text-sm font-medium">
                No history entries yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container-low/40 dark:bg-surface-container-lowest/50 text-left">
                      {canApprove && (
                        <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Employee</th>
                      )}
                      <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Date</th>
                      <th className="px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Hours</th>
                      <th className="px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                      <th className="px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40">
                    {decidedEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-800/10 transition">
                        {canApprove && (
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                            {entry.user.name}
                          </td>
                        )}
                        <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300" suppressHydrationWarning>
                          {new Date(entry.date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 text-slate-600 dark:text-slate-400 font-bold ds-numeric">
                          {entry.hours} hrs
                        </td>
                        <td className="px-4">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                              entry.status === "approved"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/30"
                                : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900/30"
                            }`}
                          >
                            {entry.status}
                          </span>
                        </td>
                        <td className="px-4 text-xs text-slate-400 font-semibold max-w-[200px] truncate">
                          {entry.notes || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form Card (Right Column) */}
      <div className="space-y-6">
        {canRequest && (
          <Card className="border-0 shadow-sm border-l-4 border-l-[#00cec4] bg-surface">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">
                Request Overtime
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRequestSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Overtime Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border border-outline-variant/60 bg-surface px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#00cec4] transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Number of Hours
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="16"
                    value={hours}
                    placeholder="e.g. 2.5"
                    onChange={(e) => setHours(e.target.value)}
                    className="w-full rounded-lg border border-outline-variant/60 bg-surface px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#00cec4] transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Work Description / Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder="Briefly describe what tasks were worked on during overtime..."
                    className="w-full rounded-lg border border-outline-variant/60 bg-surface px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#00cec4] transition resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={pendingRequest || !date || !hours}
                  className="w-full"
                >
                  {pendingRequest ? "Submitting..." : "Submit Overtime Request"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {!canRequest && (
          <Card className="border-0 shadow-sm bg-surface">
            <CardContent className="py-8 text-center text-xs text-slate-400 font-semibold flex flex-col items-center gap-3">
              <AlertCircle className="size-8 text-slate-300" />
              <span>You do not have active permissions to request overtime entries. Contact your HR administrator to set up permissions.</span>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
