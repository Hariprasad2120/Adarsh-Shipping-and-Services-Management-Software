"use client";

import React, { useState, useEffect } from "react";
import { Plane, DollarSign, Plus, Save, Loader2, AlertCircle, Calendar, MapPin, Receipt, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export function TravelView() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

  // New Request Form fields
  const [purpose, setPurpose] = useState("");
  const [destination, setDestination] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // New Expense Form fields
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("HOTEL");
  const [billKey, setBillKey] = useState("bill_stub_101.pdf");

  const fetchTravelData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hrms/peopleplus/travel");
      const json = await res.json();
      if (json.ok) {
        setRequests(json.data);
      }
    } catch (e) {
      toast.error("Failed to load travel requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTravelData();
  }, []);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/hrms/peopleplus/travel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_request",
          purpose,
          destination,
          fromDate,
          toDate,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("Travel Trip requested successfully!");
        setPurpose("");
        setDestination("");
        setFromDate("");
        setToDate("");
        setShowRequestForm(false);
        fetchTravelData();
      }
    } catch (err) {
      toast.error("Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRequestId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/hrms/peopleplus/travel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_expense",
          travelRequestId: activeRequestId,
          amount,
          category,
          billFileKey: billKey,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("Expense bill claimed!");
        setAmount("");
        setShowExpenseForm(false);
        fetchTravelData();
      }
    } catch (err) {
      toast.error("Failed to claim expense");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
        <Loader2 className="size-8 animate-spin text-[#00c4b6]" />
        <p className="text-xs font-semibold tracking-wider">Syncing travel logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative rounded-3xl border border-slate-800 bg-[#0f121b]/85 p-6 overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00c4b6]/5 rounded-full blur-3xl" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-[#00c4b6]/10 border border-[#00c4b6]/35 flex items-center justify-center text-[#00c4b6] shadow-sm">
              <Plane className="size-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-100 uppercase tracking-widest">TRAVEL & EXPENSES</h1>
              <p className="text-xs text-slate-500 font-bold mt-0.5 uppercase tracking-wider">Request trips clearances and submit reimbursement expense bills</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowRequestForm(!showRequestForm)}
            className="inline-flex items-center justify-center gap-2 bg-[#00c4b6]/15 hover:bg-[#00c4b6]/25 border border-[#00c4b6]/35 rounded-2xl px-4 py-2 text-xs font-black text-[#00c4b6] cursor-pointer transition-all uppercase tracking-wider"
          >
            <Plus className="size-4" />
            <span>Request Trip</span>
          </button>
        </div>
      </div>

      {/* Trip request Form */}
      {showRequestForm && (
        <form onSubmit={handleCreateRequest} className="rounded-3xl border border-slate-900 bg-[#0e121b]/80 p-5 space-y-4 shadow-xl max-w-xl">
          <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">New Trip Request details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Destination</label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                required
                placeholder="e.g. Mumbai branch office"
                className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-[#00c4b6]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Purpose</label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                required
                placeholder="e.g. Annual Audit review"
                className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-[#00c4b6]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-[#00c4b6]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-[#00c4b6]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowRequestForm(false)}
              className="px-4 py-2 border border-slate-800 rounded-xl text-xs font-bold text-slate-400 bg-transparent hover:bg-slate-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-[#00c4b6] border-0 rounded-xl text-xs font-black text-slate-950 cursor-pointer transition-all disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Send Request"}
            </button>
          </div>
        </form>
      )}

      {/* Expense submission Form */}
      {showExpenseForm && (
        <form onSubmit={handleCreateExpense} className="rounded-3xl border border-slate-900 bg-[#0e121b]/80 p-5 space-y-4 shadow-xl max-w-xl">
          <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest text-[#00c4b6]">File Travel Expense Receipt</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Amount (INR)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                placeholder="e.g. 1500"
                className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-[#00c4b6]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-250 outline-none focus:border-[#00c4b6]"
              >
                <option value="HOTEL">Hotel / Stay</option>
                <option value="FOOD">Meals / Food</option>
                <option value="CAB">Cab / Taxi</option>
                <option value="FLIGHT">Flight / Transport</option>
                <option value="OTHER">Other Receipts</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowExpenseForm(false);
                setActiveRequestId(null);
              }}
              className="px-4 py-2 border border-slate-800 rounded-xl text-xs font-bold text-slate-400 bg-transparent hover:bg-slate-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-[#00c4b6] border-0 rounded-xl text-xs font-black text-slate-950 cursor-pointer transition-all disabled:opacity-50"
            >
              {submitting ? "Uploading..." : "Claim Refund"}
            </button>
          </div>
        </form>
      )}

      {/* Trips display grid */}
      <div className="space-y-4">
        {requests.length === 0 ? (
          <div className="text-center py-16 text-xs text-slate-600 font-bold border border-dashed border-slate-900 rounded-3xl">
            No travel trips requested. Raise a trip application above to start.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {requests.map((req) => {
              const statusColors =
                req.status === "APPROVED"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : req.status === "REJECTED"
                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    : "bg-orange-500/10 text-orange-400 border border-orange-500/20";

              return (
                <div
                  key={req.id}
                  className="rounded-3xl border border-slate-900 bg-[#0e121b]/40 p-5 space-y-4 transition hover:border-slate-800 backdrop-blur-sm flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-slate-200">
                        <MapPin className="size-4 text-[#00c4b6]" />
                        <span className="text-xs font-black uppercase tracking-wider">{req.destination}</span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-xl text-[8px] font-black uppercase tracking-wider ${statusColors}`}>
                        {req.status}
                      </span>
                    </div>

                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider leading-relaxed">
                      Purpose: <span className="text-slate-355">{req.purpose}</span>
                    </p>

                    <div className="flex items-center gap-2 text-[9px] font-bold text-slate-550 font-mono">
                      <Calendar className="size-3.5" />
                      <span>
                        {new Date(req.fromDate).toLocaleDateString()} - {new Date(req.toDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Expenses claimed under this trip */}
                  <div className="pt-4 mt-4 border-t border-slate-900 space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <span>Expense Bills</span>
                      {req.status === "APPROVED" && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveRequestId(req.id);
                            setShowExpenseForm(true);
                          }}
                          className="text-[#00c4b6] hover:underline inline-flex items-center gap-1 cursor-pointer bg-transparent border-0"
                        >
                          <Plus className="size-3" />
                          <span>Add Bill</span>
                        </button>
                      )}
                    </div>

                    {req.expenses.length === 0 ? (
                      <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider italic">No bills filed</p>
                    ) : (
                      <div className="space-y-1.5">
                        {req.expenses.map((exp: any) => (
                          <div
                            key={exp.id}
                            className="flex items-center justify-between bg-slate-950/40 border border-slate-900 rounded-xl p-2.5 text-[10.5px] font-mono text-slate-400"
                          >
                            <div className="flex items-center gap-2">
                              <Receipt className="size-3.5 text-slate-500" />
                              <span className="font-bold text-slate-350">{exp.category}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-slate-200">₹{exp.amount}</span>
                              <span className={`text-[8px] px-1.5 py-0.5 rounded font-sans uppercase tracking-wider font-black ${
                                exp.status === "APPROVED"
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : "bg-orange-500/10 text-orange-400"
                              }`}>
                                {exp.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
