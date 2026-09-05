import {
  CrmActionLink,
  CrmConfigurationState,
  CrmMetric,
  CrmMetrics,
  CrmPermissionState,
} from "@/modules/crm/components/workspace/crm-workspace";
import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { startOfMonth, startOfYear, differenceInCalendarDays } from "date-fns";
import {
  TrendingUp,
  UserCheck,
  DollarSign,
  Calendar,
  Target,
  Clock,
  PhoneCall,
  ChevronRight,
  CheckSquare,
  Percent,
  AlertTriangle,
  Ship,
} from "lucide-react";
import { requirePermission } from "@/lib/rbac";
import { DemoDataButton } from "./demo-data-button";

const STAGE_LIST = ["PROSPECTING", "QUALIFICATION", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];
const ENQUIRY_STAGES: { key: string; label: string }[] = [
  { key: "NEW", label: "New" },
  { key: "ASSIGNED", label: "Assigned" },
  { key: "PRICING_IN_PROGRESS", label: "Pricing" },
  { key: "RATES_RECEIVED", label: "Rates in" },
  { key: "QUOTED", label: "Quoted" },
  { key: "CUSTOMER_ACCEPTED", label: "Accepted" },
  { key: "JOB_CREATED", label: "Job created" },
  { key: "LOST", label: "Lost" },
];

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
const linkClass =
  "text-xs text-[var(--mnx-accent)] hover:underline flex items-center gap-1 font-semibold cursor-pointer";

export default async function CrmDashboardPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return <CrmConfigurationState description="Missing organisation context for the current user session." />;
  }

  try {
    await requirePermission(session.user.id, "crm.access");
  } catch {
    return <CrmPermissionState description="You do not have the required permissions to view the CRM module." />;
  }

  const now = new Date();
  const monthStart = startOfMonth(now);
  const yearStart = startOfYear(now);
  const staleBefore = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    totalLeads,
    newLeadsThisMonth,
    convertedLeadsThisMonth,
    deals,
    activities,
    invoices,
    recentLeads,
    enquiryGroups,
    openEnquiryCount,
  ] = await Promise.all([
    db.crmLead.count({ where: { orgId, isConverted: false } }),
    db.crmLead.count({ where: { orgId, createdAt: { gte: monthStart } } }),
    db.crmLead.count({ where: { orgId, isConverted: true, convertedAt: { gte: monthStart } } }),
    db.crmDeal.findMany({
      where: { orgId },
      include: {
        account: { select: { name: true } },
        owner: { select: { name: true } },
      },
    }),
    db.crmActivity.findMany({
      where: { orgId, status: { not: "COMPLETED" } },
      orderBy: { dueAt: "asc" },
      take: 8,
    }),
    db.crmInvoice.findMany({
      where: { orgId },
      select: { type: true, status: true, approvalStatus: true, total: true, date: true },
    }),
    db.crmLead.findMany({
      where: { orgId, isConverted: false },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { owner: { select: { name: true } } },
    }),
    db.crmServiceEnquiry.groupBy({ by: ["status"], where: { orgId }, _count: { _all: true } }),
    db.crmServiceEnquiry.count({
      where: { orgId, status: { notIn: ["JOB_CREATED", "CUSTOMER_REJECTED", "LOST"] } },
    }),
  ]);

  // ─── Deal analytics ────────────────────────────────────────────────
  const openDeals = deals.filter((d) => d.stage !== "WON" && d.stage !== "LOST");
  const wonDeals = deals.filter((d) => d.stage === "WON");
  const lostDeals = deals.filter((d) => d.stage === "LOST");
  const wonThisYear = wonDeals.filter((d) => d.updatedAt >= yearStart);

  const pipelineValue = openDeals.reduce((s, d) => s + d.amount, 0);
  const forecastValue = openDeals.reduce((s, d) => s + d.amount * (d.probability / 100), 0);
  const decided = wonDeals.length + lostDeals.length;
  const winRate = decided > 0 ? Math.round((wonDeals.length / decided) * 100) : 0;

  const stageStats: Record<string, { count: number; value: number }> = {};
  for (const d of deals) {
    stageStats[d.stage] ??= { count: 0, value: 0 };
    stageStats[d.stage].count += 1;
    stageStats[d.stage].value += d.amount;
  }
  const maxStageCount = Math.max(...Object.values(stageStats).map((s) => s.count), 1);

  const topOpenDeals = [...openDeals].sort((a, b) => b.amount - a.amount).slice(0, 6);
  const agingDeals = openDeals
    .filter((d) => d.updatedAt < staleBefore)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  // ─── Owner leaderboard ─────────────────────────────────────────────
  const ownerAgg = new Map<string, { name: string; open: number; pipeline: number; won: number }>();
  for (const d of deals) {
    const key = d.ownerId;
    const row = ownerAgg.get(key) ?? { name: d.owner?.name ?? "Unassigned", open: 0, pipeline: 0, won: 0 };
    if (d.stage !== "WON" && d.stage !== "LOST") {
      row.open += 1;
      row.pipeline += d.amount;
    }
    if (d.stage === "WON" && d.updatedAt >= yearStart) row.won += d.amount;
    ownerAgg.set(key, row);
  }
  const leaderboard = [...ownerAgg.values()].sort((a, b) => b.pipeline - a.pipeline).slice(0, 5);

  // ─── Revenue / quotes ──────────────────────────────────────────────
  const revenueWonYtd = wonThisYear.reduce((s, d) => s + d.amount, 0);
  const quotes = invoices.filter((i) => i.type === "QUOTE");
  const quotesSent = quotes.filter((i) =>
    ["SENT", "CUSTOMER_VIEWED", "ACCEPTED", "INVOICED"].includes(i.approvalStatus),
  ).length;
  const quotesAccepted = quotes.filter((i) => ["ACCEPTED", "INVOICED"].includes(i.approvalStatus)).length;

  // ─── Activities ────────────────────────────────────────────────────
  const overdueCount = activities.filter((a) => a.dueAt && a.dueAt < now).length;
  const dueThisWeek = activities.filter((a) => a.dueAt && a.dueAt >= now && a.dueAt <= weekAhead).length;

  const enquiryCountByStatus: Record<string, number> = {};
  for (const g of enquiryGroups) enquiryCountByStatus[g.status] = g._count._all;
  const totalEnquiries = enquiryGroups.reduce((s, g) => s + g._count._all, 0);

  const glance: { label: string; value: string; href: string }[] = [
    { label: "Leads created", value: String(newLeadsThisMonth), href: "/crm/leads" },
    { label: "Leads converted", value: String(convertedLeadsThisMonth), href: "/crm/leads" },
    { label: "Deals won (YTD)", value: String(wonThisYear.length), href: "/crm/deals" },
    { label: "Deals lost", value: String(lostDeals.length), href: "/crm/deals" },
    { label: "Quotes sent", value: String(quotesSent), href: "/crm/quotes" },
    { label: "Quotes accepted", value: String(quotesAccepted), href: "/crm/quotes" },
  ];

  return (
    <div className="space-y-8">
      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <DemoDataButton />
        <CrmActionLink href="/crm/leads/new" primary>
          <span>+ New Lead</span>
        </CrmActionLink>
        <CrmActionLink href="/crm/enquiries/new">
          <span>+ New Enquiry</span>
        </CrmActionLink>
        <CrmActionLink href="/crm/quotes/new">
          <span>+ New Quote</span>
        </CrmActionLink>
        <CrmActionLink href="/crm/deals">
          <span>Pipeline</span>
        </CrmActionLink>
      </div>

      {/* ─── KPI ROW ─────────────────────────────────────────────────── */}
      <CrmMetrics>
        <CrmMetric
          href="/crm/leads"
          label="Open leads"
          value={totalLeads}
          detail={`+${newLeadsThisMonth} new · ${convertedLeadsThisMonth} converted this month`}
          icon={<UserCheck aria-hidden="true" />}
        />
        <CrmMetric
          href="/crm/enquiries"
          label="Open enquiries"
          value={openEnquiryCount}
          detail={`${totalEnquiries} logged all-time`}
          icon={<Ship aria-hidden="true" />}
        />
        <CrmMetric
          href="/crm/deals"
          label="Pipeline value"
          value={inr(pipelineValue)}
          detail={`${openDeals.length} open deals`}
          icon={<Target aria-hidden="true" />}
        />
        <CrmMetric
          href="/crm/forecasts"
          label="Weighted forecast"
          value={inr(forecastValue)}
          detail="Probability-weighted open revenue"
          icon={<TrendingUp aria-hidden="true" />}
        />
        <CrmMetric
          href="/crm/deals"
          label="Win rate"
          value={`${winRate}%`}
          detail={`${wonDeals.length} won · ${lostDeals.length} lost`}
          icon={<Percent aria-hidden="true" />}
        />
        <CrmMetric
          href="/crm/deals"
          label="Revenue won (YTD)"
          value={inr(revenueWonYtd)}
          detail={`${wonThisYear.length} deals closed this year`}
          icon={<DollarSign aria-hidden="true" />}
        />
        <CrmMetric
          href="/crm/quotes"
          label="Quotes accepted"
          value={quotesAccepted}
          detail={`${quotesSent} sent to customers`}
          icon={<CheckSquare aria-hidden="true" />}
        />
        <CrmMetric
          href="/crm/tasks"
          label="Overdue activities"
          value={overdueCount}
          detail={`${dueThisWeek} due within 7 days`}
          icon={<Clock aria-hidden="true" />}
        />
      </CrmMetrics>

      {/* ─── ROW 2: pipeline + top deals | glance + activities ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Pipeline by stage */}
          <div className={panelClass}>
            <div className={panelHeaderClass}>
              <h3 className={panelTitleClass}>Sales Pipeline by Stage</h3>
              <span className="text-xs text-[var(--mnx-muted)]">{deals.length} deals · {inr(deals.reduce((s, d) => s + d.amount, 0))} total</span>
            </div>
            <div className="space-y-3">
              {STAGE_LIST.map((stage) => {
                const s = stageStats[stage] || { count: 0, value: 0 };
                const pct = (s.count / maxStageCount) * 100;
                return (
                  <div key={stage} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-[var(--mnx-muted)] uppercase tracking-wide text-[11px]">
                        {stage.replace("_", " ")}
                      </span>
                      <span className="text-[var(--mnx-muted)]">
                        {s.count} {s.count === 1 ? "deal" : "deals"} · {inr(s.value)}
                      </span>
                    </div>
                    <div className="h-3 bg-[var(--mnx-surface)] rounded-full overflow-hidden border border-[var(--mnx-border)]/40">
                      <div
                        style={{ width: `${pct}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${
                          stage === "WON"
                            ? "bg-[var(--mnx-success-bg)]"
                            : stage === "LOST"
                            ? "bg-[var(--mnx-danger-bg)]"
                            : "bg-[var(--mnx-accent)]"
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top open deals */}
          <div className={panelClass}>
            <div className={panelHeaderClass}>
              <h3 className={panelTitleClass}>Top Open Deals</h3>
              <Link href="/crm/deals" className={linkClass}>
                <span>All deals</span>
                <ChevronRight className="size-3" />
              </Link>
            </div>
            {topOpenDeals.length === 0 ? (
              <div className="p-8 text-center text-[var(--mnx-muted)] text-sm">No open deals in the pipeline</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-[var(--mnx-muted)] border-b border-[var(--mnx-border)]/30">
                      <th className="text-left font-semibold py-2">Deal</th>
                      <th className="text-left font-semibold py-2">Customer</th>
                      <th className="text-left font-semibold py-2">Stage</th>
                      <th className="text-right font-semibold py-2">Value</th>
                      <th className="text-right font-semibold py-2">Close</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--mnx-border)]/20">
                    {topOpenDeals.map((d) => (
                      <tr key={d.id}>
                        <td className="py-2.5 pr-3">
                          <Link
                            href={`/crm/deals/${d.id}`}
                            className="font-semibold text-[var(--mnx-text-strong)] hover:text-[var(--mnx-accent)]"
                          >
                            {d.name}
                          </Link>
                        </td>
                        <td className="py-2.5 pr-3 text-[var(--mnx-muted)]">{d.account?.name ?? "—"}</td>
                        <td className="py-2.5 pr-3">
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-[var(--mnx-accent-soft)] text-[var(--mnx-accent-text)] rounded uppercase tracking-wider">
                            {d.stage.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-right font-semibold text-[var(--mnx-text-strong)]">{inr(d.amount)}</td>
                        <td className="py-2.5 text-right text-[var(--mnx-muted)] text-xs">
                          {d.expectedCloseDate ? new Date(d.expectedCloseDate).toLocaleDateString("en-IN") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Aging deals */}
          <div className={panelClass}>
            <div className={panelHeaderClass}>
              <h3 className={panelTitleClass}>Stuck Deals · no update in 14+ days</h3>
              <span className="text-xs text-[var(--mnx-warning)] font-bold">{agingDeals.length} flagged</span>
            </div>
            {agingDeals.length === 0 ? (
              <div className="p-6 text-center text-[var(--mnx-muted)] text-sm">Every open deal has recent activity — nice.</div>
            ) : (
              <div className="divide-y divide-[var(--mnx-border)]/20">
                {agingDeals.map((d) => (
                  <div key={d.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/crm/deals/${d.id}`}
                        className="font-semibold text-[var(--mnx-text-strong)] hover:text-[var(--mnx-accent)] text-sm block truncate"
                      >
                        {d.name}
                      </Link>
                      <span className="text-xs text-[var(--mnx-muted)]">
                        {d.account?.name ?? "No customer"} · {d.owner?.name ?? "Unassigned"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-semibold text-[var(--mnx-text-strong)]">{inr(d.amount)}</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)] rounded uppercase tracking-wider">
                        {differenceInCalendarDays(now, d.updatedAt)}d idle
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Month at a glance */}
          <div className={panelClass}>
            <div className={panelHeaderClass}>
              <h3 className={panelTitleClass}>This Month at a Glance</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {glance.map((g) => (
                <Link
                  key={g.label}
                  href={g.href}
                  className="p-3 rounded-lg border border-[var(--mnx-border)]/40 hover:border-[var(--mnx-accent)]/50 transition-colors block"
                >
                  <span className="text-xl font-bold text-[var(--mnx-text-strong)] block leading-none">{g.value}</span>
                  <span className="text-[10px] text-[var(--mnx-muted)] uppercase tracking-wider font-semibold mt-1.5 block">
                    {g.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Service enquiry pipeline (freight) */}
          <div className={panelClass}>
            <div className={panelHeaderClass}>
              <h3 className={panelTitleClass}>
                <Ship className="inline size-3.5 mr-1.5 -mt-0.5" />
                Service Enquiries
              </h3>
              <Link href="/crm/enquiries" className={linkClass}>
                <span>{openEnquiryCount} live</span>
                <ChevronRight className="size-3" />
              </Link>
            </div>
            {totalEnquiries === 0 ? (
              <div className="p-6 text-center text-[var(--mnx-muted)] text-sm">No service enquiries logged yet</div>
            ) : (
              <div className="space-y-2">
                {ENQUIRY_STAGES.map((st) => {
                  const c = enquiryCountByStatus[st.key] ?? 0;
                  const pct = totalEnquiries > 0 ? (c / totalEnquiries) * 100 : 0;
                  return (
                    <div key={st.key} className="flex items-center gap-3">
                      <span className="text-[11px] text-[var(--mnx-muted)] w-24 shrink-0 uppercase tracking-wide">{st.label}</span>
                      <div className="flex-1 h-2 bg-[var(--mnx-surface)] rounded-full overflow-hidden border border-[var(--mnx-border)]/40">
                        <div className="h-full bg-[var(--mnx-accent)] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-[var(--mnx-text-strong)] w-6 text-right">{c}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Activities & reminders */}
          <div className={panelClass}>
            <div className={panelHeaderClass}>
              <h3 className={panelTitleClass}>Signals &amp; Reminders</h3>
              <span className="text-xs text-[var(--mnx-warning)] font-bold">{activities.length} pending</span>
            </div>
            {activities.length === 0 ? (
              <div className="p-8 text-center text-[var(--mnx-muted)] text-sm">No pending activities scheduled</div>
            ) : (
              <div className="space-y-3">
                {activities.map((a) => (
                  <div
                    key={a.id}
                    className="p-3 bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/40 rounded-lg flex gap-3 items-start"
                  >
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        a.type === "CALL"
                          ? "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]"
                          : "bg-[var(--mnx-accent-soft)] text-[var(--mnx-accent-text)]"
                      }`}
                    >
                      {a.type === "TASK" ? (
                        <CheckSquare className="size-4" />
                      ) : a.type === "EVENT" ? (
                        <Calendar className="size-4" />
                      ) : (
                        <PhoneCall className="size-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-[var(--mnx-text-strong)] text-xs block truncate leading-tight">{a.title}</span>
                      <span className="text-[10px] text-[var(--mnx-muted)] block mt-1 uppercase tracking-wider font-semibold">
                        Due {a.dueAt ? new Date(a.dueAt).toLocaleDateString("en-IN") : "—"} · {a.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="pt-3 border-t border-[var(--mnx-border)]/30 flex items-center justify-between text-xs text-[var(--mnx-muted)]">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="size-3.5 text-[var(--mnx-warning)]" />
                {overdueCount} overdue
              </span>
              <Link href="/crm/tasks" className={linkClass}>
                <span>Manage</span>
                <ChevronRight className="size-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ─── ROW 3: leaderboard + recent leads ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={panelClass}>
          <div className={panelHeaderClass}>
            <h3 className={panelTitleClass}>Sales Owner Leaderboard</h3>
            <span className="text-xs text-[var(--mnx-muted)]">Open pipeline · won YTD</span>
          </div>
          {leaderboard.length === 0 ? (
            <div className="p-6 text-center text-[var(--mnx-muted)] text-sm">No deals assigned yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-[var(--mnx-muted)] border-b border-[var(--mnx-border)]/30">
                    <th className="text-left font-semibold py-2">Owner</th>
                    <th className="text-right font-semibold py-2">Open</th>
                    <th className="text-right font-semibold py-2">Pipeline</th>
                    <th className="text-right font-semibold py-2">Won YTD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--mnx-border)]/20">
                  {leaderboard.map((o) => (
                    <tr key={o.name}>
                      <td className="py-2.5 font-semibold text-[var(--mnx-text-strong)]">{o.name}</td>
                      <td className="py-2.5 text-right text-[var(--mnx-muted)]">{o.open}</td>
                      <td className="py-2.5 text-right font-semibold text-[var(--mnx-text-strong)]">{inr(o.pipeline)}</td>
                      <td className="py-2.5 text-right text-[var(--mnx-success)]">{inr(o.won)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={panelClass}>
          <div className={panelHeaderClass}>
            <h3 className={panelTitleClass}>Recently Acquired Leads</h3>
            <Link href="/crm/leads" className={linkClass}>
              <span>All leads</span>
              <ChevronRight className="size-3" />
            </Link>
          </div>
          {recentLeads.length === 0 ? (
            <div className="p-8 text-center text-[var(--mnx-muted)] text-sm">No new leads available</div>
          ) : (
            <div className="divide-y divide-[var(--mnx-border)]/30">
              {recentLeads.map((lead) => (
                <div key={lead.id} className="py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <Link
                      href={`/crm/leads/${lead.id}`}
                      className="font-bold text-[var(--mnx-text-strong)] hover:text-[var(--mnx-accent)] transition-colors block text-sm truncate"
                    >
                      {lead.firstName ? `${lead.firstName} ` : ""}
                      {lead.lastName}
                    </Link>
                    <span className="text-xs text-[var(--mnx-muted)]">
                      {lead.company} · Owner: {lead.owner.name}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-[var(--mnx-surface)] text-[var(--mnx-muted)] rounded uppercase tracking-wider shrink-0">
                    {lead.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
