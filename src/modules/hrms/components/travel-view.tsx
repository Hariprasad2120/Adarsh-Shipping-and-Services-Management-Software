"use client";

import {
  PeopleControlButton as MnxAction,
  PeopleControlInput as MnxInput,
} from "@/modules/people/components";

import { NativeSelect } from "@/components/ui/native-select";
import { DateInput } from "@/components/ui/date-input";
import React, { useState, useEffect } from "react";
import {
  Plane,
  Plus,
  Loader2,
  Calendar,
  MapPin,
  Receipt,
} from "lucide-react";
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
      const res = await fetch("/api/hrms/travel");
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
      const res = await fetch("/api/hrms/travel", {
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
      const res = await fetch("/api/hrms/travel", {
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
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-[var(--mnx-muted)]">
        <Loader2 className="size-8 animate-spin text-[var(--mnx-accent)]" />
        <p className="text-xs font-semibold tracking-wider">
          Syncing travel logs...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative rounded-3xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)]/85 p-6 overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--mnx-accent)]/5 rounded-full blur-3xl" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-[var(--mnx-accent)]/10 border border-[var(--mnx-accent)]/35 flex items-center justify-center text-[var(--mnx-accent)] shadow-sm">
              <Plane className="size-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-black text-[var(--mnx-muted)] uppercase tracking-widest">
                Trip desk
              </h1>
              <p className="text-xs text-[var(--mnx-muted)] font-bold mt-0.5 uppercase tracking-wider">
                Raise travel requests, manage approved trips, and file reimbursement bills
              </p>
            </div>
          </div>

          <MnxAction
            type="button"
            onClick={() => setShowRequestForm(!showRequestForm)}
            className="inline-flex items-center justify-center gap-2 bg-[var(--mnx-accent)]/15 hover:bg-[var(--mnx-accent)]/25 border border-[var(--mnx-accent)]/35 rounded-2xl px-4 py-2 text-xs font-black text-[var(--mnx-accent)] cursor-pointer transition-all uppercase tracking-wider"
          >
            <Plus className="size-4" />
            <span>Request Trip</span>
          </MnxAction>
        </div>
      </div>

      {/* Trip request Form */}
      {showRequestForm && (
        <form
          onSubmit={handleCreateRequest}
          className="rounded-3xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)]/80 p-5 space-y-4 shadow-xl max-w-xl"
        >
          <h3 className="text-xs font-black text-[var(--mnx-muted)] uppercase tracking-widest">
            New Trip Request details
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-[var(--mnx-muted)] uppercase tracking-wider">
                Destination
              </label>
              <MnxInput
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                required
                placeholder="e.g. Mumbai branch office"
                className="w-full px-3 py-2 text-xs bg-[var(--mnx-soft)]/60 border border-[var(--mnx-border)] rounded-xl text-[var(--mnx-muted)] outline-none focus:border-[var(--mnx-accent)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-[var(--mnx-muted)] uppercase tracking-wider">
                Purpose
              </label>
              <MnxInput
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                required
                placeholder="e.g. Annual Audit review"
                className="w-full px-3 py-2 text-xs bg-[var(--mnx-soft)]/60 border border-[var(--mnx-border)] rounded-xl text-[var(--mnx-muted)] outline-none focus:border-[var(--mnx-accent)]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-[var(--mnx-muted)] uppercase tracking-wider">
                From Date
              </label>
              <DateInput
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-[var(--mnx-soft)]/60 border border-[var(--mnx-border)] rounded-xl text-[var(--mnx-muted)] outline-none focus:border-[var(--mnx-accent)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-[var(--mnx-muted)] uppercase tracking-wider">
                To Date
              </label>
              <DateInput
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-[var(--mnx-soft)]/60 border border-[var(--mnx-border)] rounded-xl text-[var(--mnx-muted)] outline-none focus:border-[var(--mnx-accent)]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <MnxAction
              type="button"
              onClick={() => setShowRequestForm(false)}
              className="px-4 py-2 border border-[var(--mnx-border)] rounded-xl text-xs font-bold text-[var(--mnx-muted)] bg-transparent hover:bg-[var(--mnx-soft)] cursor-pointer"
            >
              Cancel
            </MnxAction>
            <MnxAction
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-gradient-to-r from-[var(--mnx-success)] to-[var(--mnx-accent)] border-0 rounded-xl text-xs font-black text-[var(--mnx-text)] cursor-pointer transition-all disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Send Request"}
            </MnxAction>
          </div>
        </form>
      )}

      {/* Expense submission Form */}
      {showExpenseForm && (
        <form
          onSubmit={handleCreateExpense}
          className="rounded-3xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)]/80 p-5 space-y-4 shadow-xl max-w-xl"
        >
          <h3 className="text-xs font-black text-[var(--mnx-muted)] uppercase tracking-widest text-[var(--mnx-accent)]">
            File Travel Expense Receipt
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-[var(--mnx-muted)] uppercase tracking-wider">
                Amount (INR)
              </label>
              <MnxInput
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                placeholder="e.g. 1500"
                className="w-full px-3 py-2 text-xs bg-[var(--mnx-soft)]/60 border border-[var(--mnx-border)] rounded-xl text-[var(--mnx-muted)] outline-none focus:border-[var(--mnx-accent)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-[var(--mnx-muted)] uppercase tracking-wider">
                Category
              </label>
              <NativeSelect
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[var(--mnx-soft)]/60 border border-[var(--mnx-border)] rounded-xl text-[var(--mnx-muted)] outline-none focus:border-[var(--mnx-accent)]"
              >
                <option value="HOTEL">Hotel / Stay</option>
                <option value="FOOD">Meals / Food</option>
                <option value="CAB">Cab / Taxi</option>
                <option value="FLIGHT">Flight / Transport</option>
                <option value="OTHER">Other Receipts</option>
              </NativeSelect>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <MnxAction
              type="button"
              onClick={() => {
                setShowExpenseForm(false);
                setActiveRequestId(null);
              }}
              className="px-4 py-2 border border-[var(--mnx-border)] rounded-xl text-xs font-bold text-[var(--mnx-muted)] bg-transparent hover:bg-[var(--mnx-soft)] cursor-pointer"
            >
              Cancel
            </MnxAction>
            <MnxAction
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-gradient-to-r from-[var(--mnx-success)] to-[var(--mnx-accent)] border-0 rounded-xl text-xs font-black text-[var(--mnx-text)] cursor-pointer transition-all disabled:opacity-50"
            >
              {submitting ? "Uploading..." : "Claim Refund"}
            </MnxAction>
          </div>
        </form>
      )}

      {/* Trips display grid */}
      <div className="space-y-4">
        {requests.length === 0 ? (
          <div className="text-center py-16 text-xs text-[var(--mnx-text)] font-bold border border-dashed border-[var(--mnx-border)] rounded-3xl">
            No travel trips requested. Raise a trip application above to start.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {requests.map((req) => {
              const statusColors =
                req.status === "APPROVED"
                  ? "bg-[var(--mnx-success-bg)]/10 text-[var(--mnx-success)] border border-[var(--mnx-success)]/20"
                  : req.status === "REJECTED"
                    ? "bg-[var(--mnx-danger-bg)]/10 text-[var(--mnx-danger)] border border-[var(--mnx-danger)]/20"
                    : "bg-[var(--mnx-warning-bg)]/10 text-[var(--mnx-warning)] border border-[var(--mnx-warning)]/20";

              return (
                <div
                  key={req.id}
                  className="rounded-3xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)]/40 p-5 space-y-4 transition hover:border-[var(--mnx-border)] backdrop-blur-sm flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-[var(--mnx-muted)]">
                        <MapPin className="size-4 text-[var(--mnx-accent)]" />
                        <span className="text-xs font-black uppercase tracking-wider">
                          {req.destination}
                        </span>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-xl text-[8px] font-black uppercase tracking-wider ${statusColors}`}
                      >
                        {req.status}
                      </span>
                    </div>

                    <p className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider leading-relaxed">
                      Purpose:{" "}
                      <span className="text-[var(--mnx-muted)]">
                        {req.purpose}
                      </span>
                    </p>

                    <div className="flex items-center gap-2 text-[9px] font-bold text-[var(--mnx-muted)] font-mono">
                      <Calendar className="size-3.5" />
                      <span>
                        {new Date(req.fromDate).toLocaleDateString()} -{" "}
                        {new Date(req.toDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Expenses claimed under this trip */}
                  <div className="pt-4 mt-4 border-t border-[var(--mnx-border)] space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black text-[var(--mnx-muted)] uppercase tracking-widest">
                      <span>Expense Bills</span>
                      {req.status === "APPROVED" && (
                        <MnxAction
                          type="button"
                          onClick={() => {
                            setActiveRequestId(req.id);
                            setShowExpenseForm(true);
                          }}
                          className="text-[var(--mnx-accent)] hover:underline inline-flex items-center gap-1 cursor-pointer bg-transparent border-0"
                        >
                          <Plus className="size-3" />
                          <span>Add Bill</span>
                        </MnxAction>
                      )}
                    </div>

                    {req.expenses.length === 0 ? (
                      <p className="text-[9px] font-bold text-[var(--mnx-text)] uppercase tracking-wider italic">
                        No bills filed
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {req.expenses.map((exp: any) => (
                          <div
                            key={exp.id}
                            className="flex items-center justify-between bg-[var(--mnx-soft)]/40 border border-[var(--mnx-border)] rounded-xl p-2.5 text-[10.5px] font-mono text-[var(--mnx-muted)]"
                          >
                            <div className="flex items-center gap-2">
                              <Receipt className="size-3.5 text-[var(--mnx-muted)]" />
                              <span className="font-bold text-[var(--mnx-muted)]">
                                {exp.category}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-[var(--mnx-muted)]">
                                ₹{exp.amount}
                              </span>
                              <span
                                className={`text-[8px] px-1.5 py-0.5 rounded font-sans uppercase tracking-wider font-black ${
                                  exp.status === "APPROVED"
                                    ? "bg-[var(--mnx-success-bg)]/10 text-[var(--mnx-success)]"
                                    : "bg-[var(--mnx-warning-bg)]/10 text-[var(--mnx-warning)]"
                                }`}
                              >
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
