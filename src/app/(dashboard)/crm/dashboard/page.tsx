import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { startOfMonth } from "date-fns";
import {
  TrendingUp,
  UserCheck,
  DollarSign,
  Calendar,
  Target,
  Clock,
  PhoneCall,
  ChevronRight,
  ShieldAlert,
  CheckSquare
} from "lucide-react";
import { requirePermission } from "@/lib/rbac";
import { DemoDataButton } from "./demo-data-button";

export default async function CrmDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return (
      <div className="p-8 text-center text-red-400">
        <ShieldAlert className="size-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Configuration Error</h2>
        <p className="text-sm mt-1">Missing organisation context for the current user session.</p>
      </div>
    );
  }

  // Permission Guard
  try {
    await requirePermission(session.user.id, "crm.access");
  } catch {
    return (
      <div className="p-8 text-center text-red-400">
        <ShieldAlert className="size-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-sm mt-1">You do not have the required permissions to view the CRM module.</p>
      </div>
    );
  }

  const firstDayOfMonth = startOfMonth(new Date());

  // Parallel Database Queries for Metrics
  const [
    totalLeads,
    newLeadsThisMonth,
    convertedLeads,
    deals,
    activities,
    invoices,
    recentLeads,
  ] = await Promise.all([
    db.crmLead.count({ where: { orgId, isConverted: false } }),
    db.crmLead.count({ where: { orgId, createdAt: { gte: firstDayOfMonth } } }),
    db.crmLead.count({ where: { orgId, isConverted: true } }),
    db.crmDeal.findMany({ where: { orgId } }),
    db.crmActivity.findMany({
      where: { orgId, status: { not: "COMPLETED" } },
      orderBy: { dueAt: "asc" },
      take: 6,
    }),
    db.crmInvoice.findMany({
      where: { orgId, type: "INVOICE" },
      select: { total: true, status: true },
    }),
    db.crmLead.findMany({
      where: { orgId, isConverted: false },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { owner: { select: { name: true } } },
    }),
  ]);

  // Deal Calculations
  const openDeals = deals.filter(d => d.stage !== "WON" && d.stage !== "LOST");
  const wonDeals = deals.filter(d => d.stage === "WON");

  const pipelineValue = openDeals.reduce((sum, d) => sum + d.amount, 0);
  const forecastValue = openDeals.reduce((sum, d) => sum + (d.amount * (d.probability / 100)), 0);

  // Revenue Calculations
  const revenueTotal = invoices.filter(i => i.status === "PAID").reduce((sum, i) => sum + i.total, 0);
  const pendingRevenue = invoices.filter(i => i.status !== "PAID" && i.status !== "CANCELLED").reduce((sum, i) => sum + i.total, 0);

  // Funnel Data (Group Deals by Stage)
  const stageCounts: Record<string, { count: number; value: number }> = {};
  deals.forEach(d => {
    if (!stageCounts[d.stage]) stageCounts[d.stage] = { count: 0, value: 0 };
    stageCounts[d.stage].count += 1;
    stageCounts[d.stage].value += d.amount;
  });

  const stagesList = ["PROSPECTING", "QUALIFICATION", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col gap-4 border-b border-outline-variant/30 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-on-surface">CRM Dashboard</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Real-time pipeline metrics and customer activity log for your logistics network.</p>
        </div>
        <div className="flex items-center gap-3">
          <DemoDataButton />
          <Link
            href="/crm/leads/new"
            className="flex items-center gap-2 bg-[#00c4b6] hover:bg-[#00b0a3] text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-md shadow-[#00c4b6]/10 cursor-pointer"
          >
            <span>+ Add Lead</span>
          </Link>
          <Link
            href="/crm/deals"
            className="flex items-center gap-2 rounded-lg border border-outline-variant/50 bg-surface px-4 py-2 text-sm font-medium text-on-surface transition-all hover:bg-surface-container-low cursor-pointer"
          >
            <span>View Deals</span>
          </Link>
        </div>
      </div>

      {/* ─── KPI METRICS GRID ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI Card: Leads Status */}
        <div className="flex items-start justify-between rounded-2xl border border-outline-variant/40 bg-surface p-5 shadow-sm">
          <div className="space-y-2">
            <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-on-surface-variant">Leads Summary</span>
            <div className="text-3xl font-semibold text-on-surface">{totalLeads}</div>
            <div className="flex items-center gap-1.5 pt-1 text-xs text-on-surface-variant">
              <span className="font-semibold text-emerald-600">+{newLeadsThisMonth}</span> new this month
              <span className="text-outline">|</span>
              <span className="font-semibold text-[#00c4b6]">{convertedLeads}</span> converted
            </div>
          </div>
          <div className="p-3 bg-[#818cf8]/10 text-[#818cf8] rounded-lg">
            <UserCheck className="size-5" />
          </div>
        </div>

        {/* KPI Card: Pipeline Value */}
        <div className="flex items-start justify-between rounded-2xl border border-outline-variant/40 bg-surface p-5 shadow-sm">
          <div className="space-y-2">
            <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-on-surface-variant">Deals Pipeline</span>
            <div className="text-3xl font-semibold text-on-surface">₹{(pipelineValue / 100000).toFixed(1)}L</div>
            <div className="flex items-center gap-1.5 pt-1 text-xs text-on-surface-variant">
              <span className="font-semibold text-amber-600">{openDeals.length}</span> open deals
              <span className="text-outline">|</span>
              <span className="font-semibold text-emerald-600">{wonDeals.length}</span> won
            </div>
          </div>
          <div className="p-3 bg-[#00c4b6]/10 text-[#00c4b6] rounded-lg">
            <Target className="size-5" />
          </div>
        </div>

        {/* KPI Card: Weighted Forecast */}
        <div className="flex items-start justify-between rounded-2xl border border-outline-variant/40 bg-surface p-5 shadow-sm">
          <div className="space-y-2">
            <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-on-surface-variant">Weighted Forecast</span>
            <div className="text-3xl font-semibold text-on-surface">₹{(forecastValue / 100000).toFixed(1)}L</div>
            <div className="flex items-center gap-1.5 pt-1 text-xs text-on-surface-variant">
              Weighted revenue based on close probability percentages.
            </div>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg">
            <TrendingUp className="size-5" />
          </div>
        </div>

        {/* KPI Card: Total Revenue */}
        <div className="flex items-start justify-between rounded-2xl border border-outline-variant/40 bg-surface p-5 shadow-sm">
          <div className="space-y-2">
            <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-on-surface-variant">Won Revenue</span>
            <div className="text-3xl font-semibold text-[#00c4b6]">₹{(revenueTotal / 100000).toFixed(1)}L</div>
            <div className="flex items-center gap-1.5 pt-1 text-xs text-on-surface-variant">
              <span>₹{(pendingRevenue / 100000).toFixed(1)}L pending invoices</span>
            </div>
          </div>
          <div className="p-3 bg-emerald-500/10 text-[#34d399] rounded-lg">
            <DollarSign className="size-5" />
          </div>
        </div>

      </div>

      {/* ─── TWO-COLUMN WORKSPACE SECTION ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Column 1 & 2: Sales Funnel & Recent Leads */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Sales Funnel Chart */}
          <div className="space-y-5 rounded-2xl border border-outline-variant/40 bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <h3 className="text-sm font-medium uppercase tracking-[0.14em] text-on-surface">Freight Sales Pipeline Funnel</h3>
              <span className="text-xs text-on-surface-variant">{deals.length} total negotiations</span>
            </div>
            
            <div className="space-y-3">
              {stagesList.map((stage) => {
                const stageData = stageCounts[stage] || { count: 0, value: 0 };
                const maxCount = Math.max(...Object.values(stageCounts).map(s => s.count), 1);
                const pct = (stageData.count / maxCount) * 100;
                
                return (
                  <div key={stage} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-[11px] uppercase tracking-wide text-on-surface">{stage.replace("_", " ")}</span>
                      <span className="text-on-surface-variant">
                        {stageData.count} {stageData.count === 1 ? "deal" : "deals"} (₹{(stageData.value / 1000).toFixed(0)}K)
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full border border-outline-variant/40 bg-surface-container">
                      <div
                        style={{ width: `${pct}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${
                          stage === "WON"
                            ? "bg-emerald-500"
                            : stage === "LOST"
                            ? "bg-red-500"
                            : "bg-[#00c4b6]"
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Leads Panel */}
          <div className="space-y-4 rounded-2xl border border-outline-variant/40 bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <h3 className="text-sm font-medium uppercase tracking-[0.14em] text-on-surface">Recently Acquired Leads</h3>
              <Link href="/crm/leads" className="text-xs text-[#00c4b6] hover:underline flex items-center gap-1 font-semibold cursor-pointer">
                <span>All Leads</span>
                <ChevronRight className="size-3" />
              </Link>
            </div>

            {recentLeads.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">No new leads available</div>
            ) : (
              <div className="divide-y divide-outline-variant/30">
                {recentLeads.map((lead) => (
                  <div key={lead.id} className="py-3 flex items-center justify-between">
                    <div>
                      <Link href={`/crm/leads/${lead.id}`} className="block text-sm font-medium text-on-surface transition-colors hover:text-[#00c4b6]">
                        {lead.firstName ? `${lead.firstName} ` : ""}{lead.lastName}
                      </Link>
                      <span className="text-xs text-on-surface-variant">{lead.company} • Owner: {lead.owner.name}</span>
                    </div>
                    <span className="rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                      {lead.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Column 3: Activities list & upcoming followups */}
        <div className="space-y-6">
          
          <div className="flex h-full flex-col justify-between space-y-4 rounded-2xl border border-outline-variant/40 bg-surface p-6 shadow-sm">
            <div>
              <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
                <h3 className="text-sm font-medium uppercase tracking-[0.14em] text-on-surface">Signals & Reminders</h3>
                <span className="text-xs font-semibold text-amber-600">{activities.length} pending</span>
              </div>

              {activities.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">No pending activity tasks scheduled for today</div>
              ) : (
                <div className="space-y-3.5 mt-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 rounded-xl border border-outline-variant/35 bg-surface-container-low p-3">
                      <div className={`p-2 rounded-lg shrink-0 ${
                        activity.type === "TASK"
                          ? "bg-blue-500/10 text-blue-400"
                          : activity.type === "EVENT"
                          ? "bg-purple-500/10 text-purple-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}>
                        {activity.type === "TASK" ? <CheckSquare className="size-4" /> : activity.type === "EVENT" ? <Calendar className="size-4" /> : <PhoneCall className="size-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium leading-tight text-on-surface">{activity.title}</span>
                        <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-on-surface-variant">
                          Due: {activity.dueAt ? new Date(activity.dueAt).toLocaleDateString("en-IN") : "No date"} • Priority: {activity.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between border-t border-outline-variant/30 pt-4 text-xs text-on-surface-variant">
              <div className="flex items-center gap-1.5">
                <Clock className="size-3.5 text-amber-500" />
                <span>Overdue: {activities.filter(a => a.dueAt && new Date(a.dueAt) < new Date()).length} tasks</span>
              </div>
              <Link href="/crm/tasks" className="text-[#00c4b6] hover:underline font-semibold flex items-center cursor-pointer">
                <span>Manage</span>
                <ChevronRight className="size-3" />
              </Link>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
