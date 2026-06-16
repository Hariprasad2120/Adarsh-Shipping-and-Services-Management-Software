"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { updateDealStageAction, deleteDealAction } from "@/modules/crm/actions";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-table";
import { Input } from "@/components/ui/input";
import {
  List,
  Kanban,
  Search,
  Plus,
  Eye,
  Trash2,
} from "lucide-react";

interface Deal {
  id: string;
  name: string;
  stage: string;
  amount: number;
  probability: number;
  expectedCloseDate: Date | null;
  serviceType: string | null;
  logisticsCategory: string | null;
  account: { id: string; name: string } | null;
  owner: { id: string; name: string };
}

interface DealsClientProps {
  initialDeals: Deal[];
}

const STAGES = ["PROSPECTING", "QUALIFICATION", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];
const STAGE_PROBABILITIES: Record<string, number> = {
  PROSPECTING: 10,
  QUALIFICATION: 20,
  PROPOSAL: 40,
  NEGOTIATION: 70,
  WON: 100,
  LOST: 0,
};

export function DealsClient({ initialDeals }: DealsClientProps) {
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [viewMode, setViewMode] = useState<"KANBAN" | "LIST">("KANBAN");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Filter deals based on search
  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.account?.name || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [deals, searchQuery]);

  // Aggregate stats
  const stats = useMemo(() => {
    const openDeals = deals.filter(d => d.stage !== "WON" && d.stage !== "LOST");
    const totalPipeline = openDeals.reduce((sum, d) => sum + d.amount, 0);
    const totalForecast = openDeals.reduce((sum, d) => sum + (d.amount * (d.probability / 100)), 0);
    const wonCount = deals.filter(d => d.stage === "WON").length;
    return { totalPipeline, totalForecast, openCount: openDeals.length, wonCount };
  }, [deals]);

  const handleStageChange = async (dealId: string, newStage: string) => {
    setUpdatingId(dealId);
    const prob = STAGE_PROBABILITIES[newStage] || 0;
    const res = await updateDealStageAction(dealId, newStage, prob);
    setUpdatingId(null);

    if (res.ok) {
      toast.success(`Deal stage updated to ${newStage.replace("_", " ")}`);
      setDeals((prev) =>
        prev.map((d) => (d.id === dealId ? { ...d, stage: newStage, probability: prob } : d))
      );
    } else {
      toast.error(res.error);
    }
  };

  const handleDelete = async (dealId: string) => {
    if (!confirm("Are you sure you want to delete this deal?")) return;

    const res = await deleteDealAction(dealId);
    if (res.ok) {
      toast.success("Deal deleted successfully");
      setDeals((prev) => prev.filter((d) => d.id !== dealId));
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-200">
      
      {/* ─── PAGE HEADER & STATS ────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 border-b border-outline-variant/30 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-on-surface">Deals Pipeline</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Track shipping negotiations, freight forwarding pipelines, and CHA contracts.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex rounded-xl border border-outline-variant/40 bg-surface-container-low p-0.5">
            <button
              onClick={() => setViewMode("KANBAN")}
              className={`p-1.5 rounded-md cursor-pointer ${
                viewMode === "KANBAN" ? "bg-surface text-[#00c4b6] shadow-sm" : "text-on-surface-variant hover:text-on-surface"
              }`}
              title="Pipeline Kanban Grid"
            >
              <Kanban className="size-4" />
            </button>
            <button
              onClick={() => setViewMode("LIST")}
              className={`p-1.5 rounded-md cursor-pointer ${
                viewMode === "LIST" ? "bg-surface text-[#00c4b6] shadow-sm" : "text-on-surface-variant hover:text-on-surface"
              }`}
              title="Table List View"
            >
              <List className="size-4" />
            </button>
          </div>

          <Link
            href="/crm/deals/new"
            className="flex items-center gap-2 bg-[#00c4b6] hover:bg-[#00b0a3] text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-md shadow-[#00c4b6]/10 cursor-pointer"
          >
            <Plus className="size-4" />
            <span>Create Deal</span>
          </Link>
        </div>
      </div>

      {/* Mini Stats Summary Bar */}
      <div className="grid grid-cols-2 gap-4 rounded-2xl border border-outline-variant/40 bg-surface p-4 shadow-sm md:grid-cols-4">
        <div className="space-y-1">
          <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-on-surface-variant">Open Pipeline</span>
          <span className="text-lg font-semibold text-on-surface">₹{stats.totalPipeline.toLocaleString("en-IN")}</span>
        </div>
        <div className="space-y-1">
          <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-on-surface-variant">Weighted Forecast</span>
          <span className="text-lg font-semibold text-[#00c4b6]">₹{stats.totalForecast.toLocaleString("en-IN")}</span>
        </div>
        <div className="space-y-1">
          <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-on-surface-variant">Active Enquiries</span>
          <span className="text-lg font-semibold text-on-surface">{stats.openCount} Deals</span>
        </div>
        <div className="space-y-1">
          <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-on-surface-variant">Negotiations Won</span>
          <span className="text-lg font-semibold text-emerald-600">{stats.wonCount} Closed</span>
        </div>
      </div>

      {/* Search Filter bar */}
      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant" />
        <Input
          type="text"
          placeholder="Filter deals by name or account..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-10 pl-9 pr-4 text-sm"
        />
      </div>

      {/* ─── KANBAN VIEW ────────────────────────────────────────────────── */}
      {viewMode === "KANBAN" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-start select-none overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageDeals = filteredDeals.filter((d) => d.stage === stage);
            const stageSum = stageDeals.reduce((sum, d) => sum + d.amount, 0);
            
            return (
              <div key={stage} className="min-w-[240px] shrink-0 space-y-3 rounded-2xl border border-outline-variant/40 bg-surface p-3 shadow-sm">
                {/* Column Header */}
                <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2">
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-on-surface">
                    {stage.replace("_", " ")}
                  </span>
                  <span className="rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-semibold text-on-surface-variant">
                    {stageDeals.length}
                  </span>
                </div>
                <div className="text-[10px] font-bold text-[#00c4b6]">₹{stageSum.toLocaleString("en-IN")}</div>

                {/* Cards List */}
                <div className="space-y-2.5 min-h-[300px] overflow-y-auto max-h-[500px] custom-scrollbar">
                  {stageDeals.length === 0 ? (
                    <div className="py-8 text-center text-xs italic text-on-surface-variant">No deals</div>
                  ) : (
                    stageDeals.map((deal) => (
                      <div
                        key={deal.id}
                        className={`relative space-y-2 rounded-xl border border-outline-variant/35 bg-surface-container-low p-3 transition-all hover:border-[#00c4b6]/40 ${
                          updatingId === deal.id ? "opacity-50" : ""
                        }`}
                      >
                        {/* Title & Amount */}
                        <div className="space-y-1">
                          <Link href={`/crm/deals/${deal.id}`} className="block truncate pr-4 text-xs font-medium text-on-surface hover:text-[#00c4b6] hover:underline">
                            {deal.name}
                          </Link>
                          {deal.account && (
                            <span className="block truncate text-[10px] text-on-surface-variant">{deal.account.name}</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-semibold text-[#00c4b6]">
                          <span>₹{deal.amount.toLocaleString("en-IN")}</span>
                          <span className="rounded bg-surface px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-on-surface-variant">
                            {deal.probability}%
                          </span>
                        </div>

                        {/* Dropdown to quick shift stage */}
                        <div className="flex items-center justify-between gap-1.5 border-t border-outline-variant/30 pt-2">
                          <span className="truncate text-[9px] text-on-surface-variant">Owner: {deal.owner.name.split(" ")[0]}</span>
                          <select
                            value={deal.stage}
                            onChange={(e) => handleStageChange(deal.id, e.target.value)}
                            disabled={updatingId === deal.id}
                            className="cursor-pointer rounded border border-outline-variant/50 bg-surface px-1 py-0.5 text-[9.5px] font-medium text-on-surface-variant focus:border-[#00c4b6] focus:outline-none"
                          >
                            {STAGES.map((st) => (
                              <option key={st} value={st}>{st.replace("_", " ")}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ─── LIST VIEW ─── */
        <DataTable>
          <DataTableHeader>
            <tr>
              <DataTableHead>Deal Name</DataTableHead>
              <DataTableHead>Account Name</DataTableHead>
              <DataTableHead>Deal Stage</DataTableHead>
              <DataTableHead>Value</DataTableHead>
              <DataTableHead>Close Date</DataTableHead>
              <DataTableHead>Owner</DataTableHead>
              <DataTableHead className="text-right">Actions</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {filteredDeals.length === 0 ? (
              <DataTableEmpty colSpan={7} message="No deals matched search criteria." className="py-8" />
            ) : (
              filteredDeals.map((deal) => (
                <DataTableRow key={deal.id}>
                  <DataTableCell>
                    <Link href={`/crm/deals/${deal.id}`} className="font-medium text-on-surface hover:text-[#00c4b6] hover:underline">
                      {deal.name}
                    </Link>
                    {deal.serviceType ? (
                      <span className="mt-0.5 block text-[10px] text-on-surface-variant">
                        {deal.serviceType} • {deal.logisticsCategory || "CHA"}
                      </span>
                    ) : null}
                  </DataTableCell>
                  <DataTableCell>
                    {deal.account ? (
                      <Link href={`/crm/accounts/${deal.account.id}`} className="text-[#00c4b6] hover:underline">
                        {deal.account.name}
                      </Link>
                    ) : (
                      <span className="italic text-on-surface-variant">No account</span>
                    )}
                  </DataTableCell>
                  <DataTableCell>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      deal.stage === "WON"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : deal.stage === "LOST"
                        ? "bg-red-500/10 text-red-500"
                        : "bg-[#00c4b6]/10 text-[#00c4b6]"
                    }`}>
                      {deal.stage.replace("_", " ")}
                    </span>
                  </DataTableCell>
                  <DataTableCell className="font-semibold text-[#00c4b6]">
                    ₹{deal.amount.toLocaleString("en-IN")}
                  </DataTableCell>
                  <DataTableCell className="text-xs text-on-surface-variant">
                    {deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString("en-IN") : "No Close Date"}
                  </DataTableCell>
                  <DataTableCell className="text-sm font-medium text-on-surface">
                    {deal.owner.name}
                  </DataTableCell>
                  <DataTableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/crm/deals/${deal.id}`} className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface">
                        <Eye className="size-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(deal.id)}
                        className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-red-500/10 hover:text-red-500"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </DataTableCell>
                </DataTableRow>
              ))
            )}
          </DataTableBody>
        </DataTable>
      )}
    </div>
  );
}
