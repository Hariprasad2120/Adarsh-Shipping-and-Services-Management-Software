"use client";

import {
  CrmButton,
  CrmInput,
  CrmMetric,
  CrmMetrics,
  CrmTable,
} from "@/modules/crm/components/workspace/crm-workspace";

import { NativeSelect } from "@/components/ui/native-select";
import React, { useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "@/modules/notifications/client";
import { updateDealStageAction, deleteDealAction } from "@/modules/crm/actions";
import { List, Kanban, Search, Plus, Eye, Trash2 } from "lucide-react";

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

const STAGES = [
  "PROSPECTING",
  "QUALIFICATION",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
];
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
      const matchesSearch =
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.account?.name || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [deals, searchQuery]);

  // Aggregate stats
  const stats = useMemo(() => {
    const openDeals = deals.filter(
      (d) => d.stage !== "WON" && d.stage !== "LOST",
    );
    const totalPipeline = openDeals.reduce((sum, d) => sum + d.amount, 0);
    const totalForecast = openDeals.reduce(
      (sum, d) => sum + d.amount * (d.probability / 100),
      0,
    );
    const wonCount = deals.filter((d) => d.stage === "WON").length;
    return {
      totalPipeline,
      totalForecast,
      openCount: openDeals.length,
      wonCount,
    };
  }, [deals]);

  const handleStageChange = async (dealId: string, newStage: string) => {
    setUpdatingId(dealId);
    const prob = STAGE_PROBABILITIES[newStage] || 0;
    const res = await updateDealStageAction(dealId, newStage, prob);
    setUpdatingId(null);

    if (res.ok) {
      toast.success(`Deal stage updated to ${newStage.replace("_", " ")}`);
      setDeals((prev) =>
        prev.map((d) =>
          d.id === dealId ? { ...d, stage: newStage, probability: prob } : d,
        ),
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
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Mini Stats Summary Bar */}
      <CrmMetrics>
        <CrmMetric
          label="Open Pipeline"
          value={`₹${stats.totalPipeline.toLocaleString("en-IN")}`}
        />
        <CrmMetric
          label="Weighted Forecast"
          value={`₹${stats.totalForecast.toLocaleString("en-IN")}`}
        />
        <CrmMetric label="Active Enquiries" value={`${stats.openCount} Deals`} />
        <CrmMetric label="Negotiations Won" value={`${stats.wonCount} Closed`} />
      </CrmMetrics>

      {/* Search Filter bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-2.5 size-4 text-[var(--mnx-muted)]" />
          <CrmInput
            type="text"
            placeholder="Filter deals by name or account..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm placeholder:text-[var(--mnx-muted)] focus:outline-none focus:border-[var(--mnx-accent)] text-[var(--mnx-text-strong)]"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex border border-[var(--mnx-border)] bg-[var(--mnx-surface)] p-0.5 rounded-lg">
            <CrmButton
              onClick={() => setViewMode("KANBAN")}
              className={`p-1.5 rounded-md cursor-pointer ${
                viewMode === "KANBAN"
                  ? "bg-[var(--mnx-surface)] text-[var(--mnx-accent)]"
                  : "text-[var(--mnx-muted)] hover:text-[var(--mnx-text-strong)]"
              }`}
              title="Pipeline Kanban Grid"
            >
              <Kanban className="size-4" />
            </CrmButton>
            <CrmButton
              onClick={() => setViewMode("LIST")}
              className={`p-1.5 rounded-md cursor-pointer ${
                viewMode === "LIST"
                  ? "bg-[var(--mnx-surface)] text-[var(--mnx-accent)]"
                  : "text-[var(--mnx-muted)] hover:text-[var(--mnx-text-strong)]"
              }`}
              title="Table List View"
            >
              <List className="size-4" />
            </CrmButton>
          </div>
          <Link
            href="/crm/deals/new"
            className="flex items-center gap-2 bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent)] text-[var(--mnx-text-strong)] px-3 py-1.5 rounded-lg text-xs font-bold transition-all mnx-shadow-panel cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>Create Deal</span>
          </Link>
        </div>
      </div>

      {/* ─── KANBAN VIEW ────────────────────────────────────────────────── */}
      {viewMode === "KANBAN" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-start select-none overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageDeals = filteredDeals.filter((d) => d.stage === stage);
            const stageSum = stageDeals.reduce((sum, d) => sum + d.amount, 0);

            return (
              <div
                key={stage}
                className="bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/55 rounded-xl p-3 space-y-3 shrink-0 min-w-[240px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between border-b border-[var(--mnx-border)]/30 pb-2">
                  <span className="text-xs font-bold text-[var(--mnx-text-strong)] uppercase tracking-wider">
                    {stage.replace("_", " ")}
                  </span>
                  <span className="text-[10px] font-bold text-[var(--mnx-muted)] bg-[var(--mnx-surface)] px-2 py-0.5 rounded-full">
                    {stageDeals.length}
                  </span>
                </div>
                <div className="text-[10px] font-bold text-[var(--mnx-accent)]">
                  ₹{stageSum.toLocaleString("en-IN")}
                </div>

                {/* Cards List */}
                <div className="space-y-2.5 min-h-[300px] overflow-y-auto max-h-[500px] custom-scrollbar">
                  {stageDeals.length === 0 ? (
                    <div className="py-8 text-center text-[var(--mnx-muted)] text-xs italic">
                      No deals
                    </div>
                  ) : (
                    stageDeals.map((deal) => (
                      <div
                        key={deal.id}
                        className={`p-3 bg-[var(--mnx-surface)]/90 border border-[var(--mnx-border)]/70 rounded-lg hover:border-[var(--mnx-accent)]/60 transition-all space-y-2 relative ${
                          updatingId === deal.id ? "opacity-50" : ""
                        }`}
                      >
                        {/* Title & Amount */}
                        <div className="space-y-1">
                          <Link
                            href={`/crm/deals/${deal.id}`}
                            className="font-bold text-[var(--mnx-text-strong)] text-xs block hover:underline hover:text-[var(--mnx-accent)] truncate pr-4"
                          >
                            {deal.name}
                          </Link>
                          {deal.account && (
                            <span className="text-[10px] text-[var(--mnx-muted)] block truncate">
                              {deal.account.name}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-bold text-[var(--mnx-accent)]">
                          <span>₹{deal.amount.toLocaleString("en-IN")}</span>
                          <span className="text-[9px] text-[var(--mnx-muted)] uppercase tracking-wide bg-[var(--mnx-soft)] px-1.5 py-0.5 rounded">
                            {deal.probability}%
                          </span>
                        </div>

                        {/* Dropdown to quick shift stage */}
                        <div className="pt-2 border-t border-[var(--mnx-border)]/30 flex items-center justify-between gap-1.5">
                          <span className="min-w-0 flex-1 truncate text-[9px] text-[var(--mnx-muted)]">
                            Owner: {deal.owner.name.split(" ")[0]}
                          </span>
                          <NativeSelect
                            value={deal.stage}
                            onChange={(e) =>
                              handleStageChange(deal.id, e.target.value)
                            }
                            disabled={updatingId === deal.id}
                            className="shrink-0 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] text-[9.5px] font-semibold text-[var(--mnx-muted)] rounded px-1 py-0.5 focus:outline-none focus:border-[var(--mnx-accent)] cursor-pointer"
                          >
                            {STAGES.map((st) => (
                              <option key={st} value={st}>
                                {st.replace("_", " ")}
                              </option>
                            ))}
                          </NativeSelect>
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
        <div className="overflow-hidden rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] shadow-sm">
          {filteredDeals.length === 0 ? (
            <div className="p-8 text-center text-[var(--mnx-muted)]">
              No deals matched search criteria
            </div>
          ) : (
            <div className="overflow-x-auto">
              <CrmTable className="mnx-crm-table">
                <thead>
                  <tr>
                    <th className="px-6 py-3">Deal Name</th>
                    <th className="px-6 py-3">Account Name</th>
                    <th className="px-6 py-3">Deal Stage</th>
                    <th className="px-6 py-3">Value</th>
                    <th className="px-6 py-3">Close Date</th>
                    <th className="px-6 py-3">Owner</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeals.map((deal) => (
                    <tr key={deal.id} className="mnx-row-link">
                      <td className="px-6 py-4 font-medium">
                        <Link
                          href={`/crm/deals/${deal.id}`}
                          className="hover:text-[var(--mnx-accent)] transition-colors"
                        >
                          {deal.name}
                        </Link>
                        {deal.serviceType && (
                          <span className="mnx-label block mt-0.5 font-normal">
                            {deal.serviceType} •{" "}
                            {deal.logisticsCategory || "CHA"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {deal.account ? (
                          <Link
                            href={`/crm/customers/${deal.account.id}`}
                            className="hover:underline text-[var(--mnx-accent)]"
                          >
                            {deal.account.name}
                          </Link>
                        ) : (
                          <span className="text-[var(--mnx-muted)] italic">
                            No account
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            deal.stage === "WON"
                              ? "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]"
                              : deal.stage === "LOST"
                                ? "bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)]"
                                : "bg-[var(--mnx-accent)]/10 text-[var(--mnx-accent)]"
                          }`}
                        >
                          {deal.stage.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-[var(--mnx-accent)]">
                        ₹{deal.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-4 text-[var(--mnx-muted)] text-xs">
                        {deal.expectedCloseDate
                          ? new Date(deal.expectedCloseDate).toLocaleDateString(
                              "en-IN",
                            )
                          : "No Close Date"}
                      </td>
                      <td className="px-6 py-4 text-xs">{deal.owner.name}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/crm/deals/${deal.id}`}
                            className="p-1.5 text-[var(--mnx-muted)] hover:text-[var(--mnx-text-strong)] rounded hover:bg-[var(--mnx-soft)] cursor-pointer"
                          >
                            <Eye className="size-4" />
                          </Link>
                          <CrmButton
                            onClick={() => handleDelete(deal.id)}
                            className="p-1.5 text-[var(--mnx-muted)] hover:text-[var(--mnx-danger)] rounded hover:bg-[var(--mnx-danger-bg)] cursor-pointer"
                          >
                            <Trash2 className="size-4" />
                          </CrmButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </CrmTable>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
