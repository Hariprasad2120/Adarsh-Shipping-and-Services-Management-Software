import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import {
  CrmConfigurationState,
  CrmMetric,
  CrmMetrics,
  CrmPermissionState,
} from "@/modules/crm/components/workspace/crm-workspace";
import {
  startOfMonth,
  endOfMonth,
  addMonths,
  startOfQuarter,
  endOfQuarter,
  format,
} from "date-fns";

const OPEN_STAGES = ["PROSPECTING", "QUALIFICATION", "PROPOSAL", "NEGOTIATION"];
const ALL_STAGES = [...OPEN_STAGES, "WON", "LOST"];

function inr(value: number): string {
  if (!Number.isFinite(value)) return "₹0";
  if (Math.abs(value) >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

const panelClass =
  "p-6 rounded-xl bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/50 space-y-4";
const panelHeaderClass =
  "flex items-center justify-between border-b border-[var(--mnx-border)]/30 pb-3";
const panelTitleClass =
  "font-bold text-sm text-[var(--mnx-text-strong)] uppercase tracking-wider";
const thClass =
  "text-left text-[10px] uppercase tracking-wider text-[var(--mnx-muted)] font-semibold py-2";
const tdNum = "py-2.5 text-right tabular-nums";

export default async function CrmForecastsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return <CrmConfigurationState description="Missing organisation context for the current user session." />;
  }
  try {
    await requirePermission(session.user.id, "crm.access");
  } catch {
    return <CrmPermissionState description="You do not have the required permissions to view CRM forecasts." />;
  }

  const now = new Date();
  const qStart = startOfQuarter(now);
  const qEnd = endOfQuarter(now);

  const deals = await db.crmDeal.findMany({
    where: { orgId },
    select: {
      id: true,
      name: true,
      stage: true,
      amount: true,
      probability: true,
      expectedCloseDate: true,
      serviceType: true,
      updatedAt: true,
      owner: { select: { name: true } },
      account: { select: { name: true } },
    },
  });

  const openDeals = deals.filter((d) => OPEN_STAGES.includes(d.stage));
  const wonDeals = deals.filter((d) => d.stage === "WON");

  const grossPipeline = openDeals.reduce((s, d) => s + d.amount, 0);
  const weighted = openDeals.reduce((s, d) => s + d.amount * (d.probability / 100), 0);
  const committedQtr = wonDeals
    .filter((d) => d.updatedAt >= qStart && d.updatedAt <= qEnd)
    .reduce((s, d) => s + d.amount, 0);
  const closingThisQtr = openDeals.filter(
    (d) => d.expectedCloseDate && d.expectedCloseDate >= qStart && d.expectedCloseDate <= qEnd,
  );
  const bestCaseQtr = committedQtr + closingThisQtr.reduce((s, d) => s + d.amount, 0);
  const weightedQtr =
    committedQtr + closingThisQtr.reduce((s, d) => s + d.amount * (d.probability / 100), 0);

  // ── Forecast by expected-close month (next 6 months) ──────────────
  const months = Array.from({ length: 6 }, (_, i) => {
    const mStart = startOfMonth(addMonths(now, i));
    const mEnd = endOfMonth(mStart);
    const inMonth = openDeals.filter(
      (d) => d.expectedCloseDate && d.expectedCloseDate >= mStart && d.expectedCloseDate <= mEnd,
    );
    const wonInMonth = wonDeals.filter((d) => d.updatedAt >= mStart && d.updatedAt <= mEnd);
    return {
      label: format(mStart, "MMM yyyy"),
      count: inMonth.length,
      gross: inMonth.reduce((s, d) => s + d.amount, 0),
      weighted: inMonth.reduce((s, d) => s + d.amount * (d.probability / 100), 0),
      won: wonInMonth.reduce((s, d) => s + d.amount, 0),
    };
  });
  const noDatePipeline = openDeals
    .filter((d) => !d.expectedCloseDate)
    .reduce((s, d) => s + d.amount, 0);
  const maxMonthGross = Math.max(...months.map((m) => m.gross), 1);

  // ── By stage ─────────────────────────────────────────────────────
  const byStage = ALL_STAGES.map((stage) => {
    const rows = deals.filter((d) => d.stage === stage);
    return {
      stage,
      count: rows.length,
      gross: rows.reduce((s, d) => s + d.amount, 0),
      weighted: rows.reduce((s, d) => s + d.amount * (d.probability / 100), 0),
    };
  });

  // ── By owner (open pipeline + weighted, plus won this quarter) ────
  const ownerMap = new Map<string, { name: string; count: number; gross: number; weighted: number; wonQtr: number }>();
  for (const d of deals) {
    const name = d.owner?.name ?? "Unassigned";
    const row = ownerMap.get(name) ?? { name, count: 0, gross: 0, weighted: 0, wonQtr: 0 };
    if (OPEN_STAGES.includes(d.stage)) {
      row.count += 1;
      row.gross += d.amount;
      row.weighted += d.amount * (d.probability / 100);
    }
    if (d.stage === "WON" && d.updatedAt >= qStart && d.updatedAt <= qEnd) row.wonQtr += d.amount;
    ownerMap.set(name, row);
  }
  const byOwner = [...ownerMap.values()].sort((a, b) => b.weighted - a.weighted);

  // ── By service type ──────────────────────────────────────────────
  const svcMap = new Map<string, { gross: number; weighted: number; count: number }>();
  for (const d of openDeals) {
    const key = d.serviceType?.trim() || "Unspecified";
    const row = svcMap.get(key) ?? { gross: 0, weighted: 0, count: 0 };
    row.gross += d.amount;
    row.weighted += d.amount * (d.probability / 100);
    row.count += 1;
    svcMap.set(key, row);
  }
  const byService = [...svcMap.entries()].sort((a, b) => b[1].weighted - a[1].weighted);

  const quarterLabel = format(qStart, "QQQ yyyy");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--mnx-muted)]">
          Pipeline outlook from open deals, weighted by stage probability. Current quarter: <strong>{quarterLabel}</strong>.
        </p>
        <Link
          href="/crm/deals"
          className="text-xs font-semibold text-[var(--mnx-accent)] hover:underline"
        >
          Manage deals →
        </Link>
      </div>

      <CrmMetrics>
        <CrmMetric label="Open pipeline" value={inr(grossPipeline)} detail={`${openDeals.length} open deals`} />
        <CrmMetric label="Weighted forecast" value={inr(weighted)} detail="All open deals × probability" />
        <CrmMetric label={`Best case · ${quarterLabel}`} value={inr(bestCaseQtr)} detail={`${closingThisQtr.length} deals due to close`} />
        <CrmMetric label={`Weighted · ${quarterLabel}`} value={inr(weightedQtr)} detail={`${inr(committedQtr)} already committed`} />
      </CrmMetrics>

      {deals.length === 0 ? (
        <div className={panelClass}>
          <div className="p-10 text-center text-[var(--mnx-muted)] text-sm">
            No deals yet. Create deals in the pipeline to build a forecast.
          </div>
        </div>
      ) : (
        <>
          {/* Forecast by close month */}
          <div className={panelClass}>
            <div className={panelHeaderClass}>
              <h3 className={panelTitleClass}>Forecast by Expected Close Month</h3>
              <span className="text-xs text-[var(--mnx-muted)]">next 6 months</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--mnx-border)]/30">
                    <th className={thClass}>Month</th>
                    <th className={thClass + " text-right"}>Deals</th>
                    <th className={thClass + " text-right"}>Gross pipeline</th>
                    <th className={thClass + " text-right"}>Weighted</th>
                    <th className={thClass + " text-right"}>Won</th>
                    <th className={thClass} style={{ width: "22%" }}>Mix</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--mnx-border)]/20">
                  {months.map((m) => (
                    <tr key={m.label}>
                      <td className="py-2.5 font-semibold text-[var(--mnx-text-strong)]">{m.label}</td>
                      <td className={tdNum + " text-[var(--mnx-muted)]"}>{m.count}</td>
                      <td className={tdNum}>{inr(m.gross)}</td>
                      <td className={tdNum + " font-semibold text-[var(--mnx-text-strong)]"}>{inr(m.weighted)}</td>
                      <td className={tdNum + " text-[var(--mnx-success)]"}>{m.won ? inr(m.won) : "—"}</td>
                      <td className="py-2.5 pl-3">
                        <div className="h-2 bg-[var(--mnx-surface)] rounded-full overflow-hidden border border-[var(--mnx-border)]/40">
                          <div className="h-full bg-[var(--mnx-accent)] rounded-full" style={{ width: `${(m.gross / maxMonthGross) * 100}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {noDatePipeline > 0 ? (
                    <tr>
                      <td className="py-2.5 text-[var(--mnx-muted)] italic">No close date</td>
                      <td className={tdNum + " text-[var(--mnx-muted)]"}>{openDeals.filter((d) => !d.expectedCloseDate).length}</td>
                      <td className={tdNum}>{inr(noDatePipeline)}</td>
                      <td className={tdNum + " text-[var(--mnx-muted)]"}>—</td>
                      <td className={tdNum + " text-[var(--mnx-muted)]"}>—</td>
                      <td />
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By stage */}
            <div className={panelClass}>
              <div className={panelHeaderClass}>
                <h3 className={panelTitleClass}>Pipeline by Stage</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--mnx-border)]/30">
                    <th className={thClass}>Stage</th>
                    <th className={thClass + " text-right"}>Deals</th>
                    <th className={thClass + " text-right"}>Gross</th>
                    <th className={thClass + " text-right"}>Weighted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--mnx-border)]/20">
                  {byStage.map((s) => (
                    <tr key={s.stage}>
                      <td className="py-2.5">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--mnx-muted)]">
                          {s.stage}
                        </span>
                      </td>
                      <td className={tdNum + " text-[var(--mnx-muted)]"}>{s.count}</td>
                      <td className={tdNum}>{inr(s.gross)}</td>
                      <td className={tdNum + " font-semibold text-[var(--mnx-text-strong)]"}>{inr(s.weighted)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* By service type */}
            <div className={panelClass}>
              <div className={panelHeaderClass}>
                <h3 className={panelTitleClass}>Open Pipeline by Service Line</h3>
              </div>
              {byService.length === 0 ? (
                <div className="p-6 text-center text-[var(--mnx-muted)] text-sm">No open deals</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--mnx-border)]/30">
                      <th className={thClass}>Service line</th>
                      <th className={thClass + " text-right"}>Deals</th>
                      <th className={thClass + " text-right"}>Gross</th>
                      <th className={thClass + " text-right"}>Weighted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--mnx-border)]/20">
                    {byService.map(([name, v]) => (
                      <tr key={name}>
                        <td className="py-2.5 font-semibold text-[var(--mnx-text-strong)]">{name}</td>
                        <td className={tdNum + " text-[var(--mnx-muted)]"}>{v.count}</td>
                        <td className={tdNum}>{inr(v.gross)}</td>
                        <td className={tdNum + " font-semibold text-[var(--mnx-text-strong)]"}>{inr(v.weighted)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* By owner */}
          <div className={panelClass}>
            <div className={panelHeaderClass}>
              <h3 className={panelTitleClass}>Forecast by Owner</h3>
              <span className="text-xs text-[var(--mnx-muted)]">open pipeline · won {quarterLabel}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--mnx-border)]/30">
                    <th className={thClass}>Owner</th>
                    <th className={thClass + " text-right"}>Open deals</th>
                    <th className={thClass + " text-right"}>Gross pipeline</th>
                    <th className={thClass + " text-right"}>Weighted</th>
                    <th className={thClass + " text-right"}>Won {quarterLabel}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--mnx-border)]/20">
                  {byOwner.map((o) => (
                    <tr key={o.name}>
                      <td className="py-2.5 font-semibold text-[var(--mnx-text-strong)]">{o.name}</td>
                      <td className={tdNum + " text-[var(--mnx-muted)]"}>{o.count}</td>
                      <td className={tdNum}>{inr(o.gross)}</td>
                      <td className={tdNum + " font-semibold text-[var(--mnx-text-strong)]"}>{inr(o.weighted)}</td>
                      <td className={tdNum + " text-[var(--mnx-success)]"}>{o.wonQtr ? inr(o.wonQtr) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Deals closing this quarter */}
          <div className={panelClass}>
            <div className={panelHeaderClass}>
              <h3 className={panelTitleClass}>Open Deals Closing in {quarterLabel}</h3>
              <span className="text-xs text-[var(--mnx-muted)]">{closingThisQtr.length} deals</span>
            </div>
            {closingThisQtr.length === 0 ? (
              <div className="p-6 text-center text-[var(--mnx-muted)] text-sm">
                No open deals have an expected close date in this quarter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--mnx-border)]/30">
                      <th className={thClass}>Deal</th>
                      <th className={thClass}>Customer</th>
                      <th className={thClass}>Stage</th>
                      <th className={thClass + " text-right"}>Amount</th>
                      <th className={thClass + " text-right"}>Prob.</th>
                      <th className={thClass + " text-right"}>Close date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--mnx-border)]/20">
                    {closingThisQtr
                      .sort((a, b) => (a.expectedCloseDate!.getTime()) - (b.expectedCloseDate!.getTime()))
                      .map((d) => (
                        <tr key={d.id}>
                          <td className="py-2.5 pr-3">
                            <Link href={`/crm/deals/${d.id}`} className="font-semibold text-[var(--mnx-text-strong)] hover:text-[var(--mnx-accent)]">
                              {d.name}
                            </Link>
                          </td>
                          <td className="py-2.5 pr-3 text-[var(--mnx-muted)]">{d.account?.name ?? "—"}</td>
                          <td className="py-2.5 pr-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--mnx-muted)]">{d.stage}</span>
                          </td>
                          <td className={tdNum + " font-semibold text-[var(--mnx-text-strong)]"}>{inr(d.amount)}</td>
                          <td className={tdNum + " text-[var(--mnx-muted)]"}>{d.probability}%</td>
                          <td className={tdNum + " text-[var(--mnx-muted)] text-xs"}>
                            {format(d.expectedCloseDate!, "dd MMM yyyy")}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
