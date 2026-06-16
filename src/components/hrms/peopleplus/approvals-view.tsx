"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Clock, Calendar, User, FileText, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ApprovalsViewProps {
  isAdmin: boolean;
}

export function ApprovalsView({ isAdmin }: ApprovalsViewProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [remarks, setRemarks] = useState<Record<string, string>>({});

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hrms/peopleplus/approvals");
      const json = await res.json();
      if (json.ok) {
        setData(json.data);
      }
    } catch (e) {
      toast.error("Failed to load pending approvals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleDecision = async (requestId: string, type: string, decision: "APPROVED" | "REJECTED") => {
    setActingId(requestId);
    const comment = remarks[requestId] || "";
    try {
      const res = await fetch("/api/hrms/peopleplus/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          type,
          decision,
          remarks: comment,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(`Request ${decision.toLowerCase()} successfully!`);
        fetchApprovals();
      } else {
        toast.error("Approval action failed");
      }
    } catch (err) {
      toast.error("Error submitting approval decision");
    } finally {
      setActingId(null);
    }
  };

  const handleRemarkChange = (id: string, text: string) => {
    setRemarks((prev) => ({ ...prev, [id]: text }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
        <Loader2 className="size-8 animate-spin text-[#00c4b6]" />
        <p className="text-xs font-semibold tracking-wider">Syncing pending approvals inbox...</p>
      </div>
    );
  }

  const hasRequests =
    data &&
    (data.leaves.length > 0 ||
      data.regularizations.length > 0 ||
      data.ots.length > 0 ||
      data.travels.length > 0 ||
      data.timesheets.length > 0 ||
      data.workreports.length > 0);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="relative rounded-3xl border border-slate-800 bg-[#0f121b]/85 p-6 overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00c4b6]/5 rounded-full blur-3xl" />
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-[#00c4b6]/10 border border-[#00c4b6]/35 flex items-center justify-center text-[#00c4b6] shadow-sm">
            <CheckCircle2 className="size-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-100 uppercase tracking-widest">APPROVALS CENTRAL INBOX</h1>
            <p className="text-xs text-slate-500 font-bold mt-0.5 uppercase tracking-wider">
              {isAdmin ? "Global Administrator Approvals Control Desk" : "Team Manager Review and Approval inbox"}
            </p>
          </div>
        </div>
      </div>

      {!hasRequests ? (
        <div className="text-center py-20 text-xs text-slate-600 font-bold border border-dashed border-slate-900 rounded-3xl">
          Inbox empty. No pending requests requiring approval.
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Leaves approvals list */}
          {data.leaves.length > 0 && (
            <div className="space-y-3">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Pending Leaves ({data.leaves.length})</div>
              <div className="grid gap-4 md:grid-cols-2">
                {data.leaves.map((req: any) => (
                  <div key={req.id} className="rounded-3xl border border-slate-900 bg-[#0e121b]/40 p-5 space-y-4 transition hover:border-slate-850 flex flex-col justify-between backdrop-blur-sm">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-[#00c4b6]/10 flex items-center justify-center font-bold text-xs text-[#00c4b6]">
                          {req.user.name[0]}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-200">{req.user.name}</h4>
                          <p className="text-[8.5px] font-bold text-slate-500 uppercase mt-0.5 font-mono">Employee #{req.user.employeeNumber || "—"}</p>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs text-slate-400">
                        <p className="font-bold text-slate-350">Leave type: <span className="text-slate-100 uppercase">{req.leaveType.name}</span></p>
                        <p className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 font-mono mt-1">
                          <Calendar className="size-3.5" />
                          <span>{new Date(req.fromDate).toLocaleDateString()} - {new Date(req.toDate).toLocaleDateString()}</span>
                        </p>
                      </div>
                      {req.notes && (
                        <p className="text-[10.5px] font-bold text-slate-500 leading-normal italic">"{req.notes}"</p>
                      )}
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-900 space-y-3">
                      <input
                        type="text"
                        placeholder="Add review comments..."
                        value={remarks[req.id] || ""}
                        onChange={(e) => handleRemarkChange(req.id, e.target.value)}
                        className="w-full px-3 py-1.5 text-[10.5px] bg-slate-950/60 border border-slate-900 rounded-xl text-slate-200 outline-none focus:border-[#00c4b6]"
                      />
                      <div className="flex justify-end gap-2.5">
                        <button
                          type="button"
                          disabled={actingId === req.id}
                          onClick={() => handleDecision(req.id, "LEAVE", "REJECTED")}
                          className="inline-flex items-center justify-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl px-3 py-1.5 text-[10px] font-black text-rose-400 cursor-pointer transition-all"
                        >
                          <XCircle className="size-3.5" /> Reject
                        </button>
                        <button
                          type="button"
                          disabled={actingId === req.id}
                          onClick={() => handleDecision(req.id, "LEAVE", "APPROVED")}
                          className="inline-flex items-center justify-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl px-3 py-1.5 text-[10px] font-black text-emerald-400 cursor-pointer transition-all"
                        >
                          <CheckCircle2 className="size-3.5" /> Approve
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Regularizations approvals list */}
          {data.regularizations.length > 0 && (
            <div className="space-y-3">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Pending Regularizations ({data.regularizations.length})</div>
              <div className="grid gap-4 md:grid-cols-2">
                {data.regularizations.map((req: any) => (
                  <div key={req.id} className="rounded-3xl border border-slate-900 bg-[#0e121b]/40 p-5 space-y-4 transition hover:border-slate-850 flex flex-col justify-between backdrop-blur-sm">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-[#00c4b6]/10 flex items-center justify-center font-bold text-xs text-[#00c4b6]">
                          {req.user.name[0]}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-200">{req.user.name}</h4>
                          <p className="text-[8.5px] font-bold text-slate-500 uppercase mt-0.5 font-mono">Employee #{req.user.employeeNumber || "—"}</p>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs text-slate-400">
                        <p className="font-bold text-slate-350">Adjust Date: <span className="text-slate-100 font-mono">{new Date(req.date).toLocaleDateString()}</span></p>
                        <p className="text-[10.5px] font-bold text-slate-500 mt-1 leading-normal italic">Reason: "{req.reason}"</p>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-900 space-y-3">
                      <input
                        type="text"
                        placeholder="Add review comments..."
                        value={remarks[req.id] || ""}
                        onChange={(e) => handleRemarkChange(req.id, e.target.value)}
                        className="w-full px-3 py-1.5 text-[10.5px] bg-slate-950/60 border border-slate-900 rounded-xl text-slate-200 outline-none focus:border-[#00c4b6]"
                      />
                      <div className="flex justify-end gap-2.5">
                        <button
                          type="button"
                          disabled={actingId === req.id}
                          onClick={() => handleDecision(req.id, "REGULARIZATION", "REJECTED")}
                          className="inline-flex items-center justify-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl px-3 py-1.5 text-[10px] font-black text-rose-400 cursor-pointer transition-all"
                        >
                          <XCircle className="size-3.5" /> Reject
                        </button>
                        <button
                          type="button"
                          disabled={actingId === req.id}
                          onClick={() => handleDecision(req.id, "REGULARIZATION", "APPROVED")}
                          className="inline-flex items-center justify-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl px-3 py-1.5 text-[10px] font-black text-emerald-400 cursor-pointer transition-all"
                        >
                          <CheckCircle2 className="size-3.5" /> Approve
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Travel approvals list */}
          {data.travels.length > 0 && (
            <div className="space-y-3">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Pending Trips ({data.travels.length})</div>
              <div className="grid gap-4 md:grid-cols-2">
                {data.travels.map((req: any) => (
                  <div key={req.id} className="rounded-3xl border border-slate-900 bg-[#0e121b]/40 p-5 space-y-4 transition hover:border-slate-850 flex flex-col justify-between backdrop-blur-sm">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-[#00c4b6]/10 flex items-center justify-center font-bold text-xs text-[#00c4b6]">
                          {req.user.name[0]}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-200">{req.user.name}</h4>
                          <p className="text-[8.5px] font-bold text-slate-500 uppercase mt-0.5 font-mono">Employee #{req.user.employeeNumber || "—"}</p>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs text-slate-400">
                        <p className="font-bold text-slate-350">To Destination: <span className="text-[#00c4b6] uppercase font-bold">{req.destination}</span></p>
                        <p className="text-[10.5px] font-bold text-slate-500 mt-1 leading-normal italic">Trip details: "{req.purpose}"</p>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-900 flex justify-end gap-2.5">
                      <button
                        type="button"
                        disabled={actingId === req.id}
                        onClick={() => handleDecision(req.id, "TRAVEL", "REJECTED")}
                        className="inline-flex items-center justify-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl px-3 py-1.5 text-[10px] font-black text-rose-400 cursor-pointer transition-all"
                      >
                        <XCircle className="size-3.5" /> Reject
                      </button>
                      <button
                        type="button"
                        disabled={actingId === req.id}
                        onClick={() => handleDecision(req.id, "TRAVEL", "APPROVED")}
                        className="inline-flex items-center justify-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl px-3 py-1.5 text-[10px] font-black text-emerald-400 cursor-pointer transition-all"
                      >
                        <CheckCircle2 className="size-3.5" /> Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
