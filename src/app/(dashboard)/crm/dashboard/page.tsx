import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { startOfMonth } from "date-fns";
import {
  TrendingUp,
  UserCheck,
  Briefcase,
  DollarSign,
  AlertCircle,
  Calendar,
  Users,
  Building,
  Target,
  Clock,
  PhoneCall,
  Activity,
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
  } catch (e) {
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
  const lostDeals = deals.filter(d => d.stage === "LOST");

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

  // Activity categorisation
  const tasks = activities.filter(a => a.type === "TASK");
  const meetings = activities.filter(a => a.type === "EVENT");
  const calls = activities.filter(a => a.type === "CALL");

  return (
    <div className="space-y-8">
      {/* Actions bar */}
      <div className="flex items-center justify-end gap-3">
        <DemoDataButton />
        <Link
          href="/crm/leads/new"
          className="flex items-center gap-2 bg-[#00c4b6] hover:bg-[#00b0a3] text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-md shadow-[#00c4b6]/10 cursor-pointer"
        >
          <span>+ Add Lead</span>
        </Link>
        <Link
          href="/crm/deals"
          className="flex items-center gap-2 bg-[#161f28] hover:bg-[#1f2d3a] border border-[#1c212a]/80 text-slate-200 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer"
        >
          <span>View Deals</span>
        </Link>
      </div>

      {/* ─── KPI METRICS GRID ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI Card: Leads Status */}
        <div className="p-5 rounded-xl bg-[#0f1319] border border-[#1c212a]/50 flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Leads Summary</span>
            <div className="text-3xl font-black text-white">{totalLeads}</div>
            <div className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
              <span className="text-emerald-400 font-bold">+{newLeadsThisMonth}</span> new this month
              <span className="text-slate-600">|</span>
              <span className="text-[#00c4b6] font-bold">{convertedLeads}</span> converted
            </div>
          </div>
          <div className="p-3 bg-[#818cf8]/10 text-[#818cf8] rounded-lg">
            <UserCheck className="size-5" />
          </div>
        </div>

        {/* KPI Card: Pipeline Value */}
        <div className="p-5 rounded-xl bg-[#0f1319] border border-[#1c212a]/50 flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Deals Pipeline</span>
            <div className="text-3xl font-black text-white">₹{(pipelineValue / 100000).toFixed(1)}L</div>
            <div className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
              <span className="text-amber-400 font-bold">{openDeals.length}</span> open deals
              <span className="text-slate-600">|</span>
              <span className="text-emerald-400 font-bold">{wonDeals.length}</span> won
            </div>
          </div>
          <div className="p-3 bg-[#00c4b6]/10 text-[#00c4b6] rounded-lg">
            <Target className="size-5" />
          </div>
        </div>

        {/* KPI Card: Weighted Forecast */}
        <div className="p-5 rounded-xl bg-[#0f1319] border border-[#1c212a]/50 flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Weighted Forecast</span>
            <div className="text-3xl font-black text-white">₹{(forecastValue / 100000).toFixed(1)}L</div>
            <div className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
              Weighted revenue based on close probability percentages.
            </div>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg">
            <TrendingUp className="size-5" />
          </div>
        </div>

        {/* KPI Card: Total Revenue */}
        <div className="p-5 rounded-xl bg-[#0f1319] border border-[#1c212a]/50 flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Won Revenue</span>
            <div className="text-3xl font-black text-[#00c4b6]">₹{(revenueTotal / 100000).toFixed(1)}L</div>
            <div className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
              <span className="text-slate-400">₹{(pendingRevenue / 100000).toFixed(1)}L pending invoices</span>
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
          <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/50 space-y-5">
            <div className="flex items-center justify-between border-b border-[#1c212a]/30 pb-3">
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">Freight Sales Pipeline Funnel</h3>
              <span className="text-xs text-slate-400">{deals.length} total negotiations</span>
            </div>
            
            <div className="space-y-3">
              {stagesList.map((stage) => {
                const stageData = stageCounts[stage] || { count: 0, value: 0 };
                const maxCount = Math.max(...Object.values(stageCounts).map(s => s.count), 1);
                const pct = (stageData.count / maxCount) * 100;
                
                return (
                  <div key={stage} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-300 uppercase tracking-wide text-[11px]">{stage.replace("_", " ")}</span>
                      <span className="text-slate-400">
                        {stageData.count} {stageData.count === 1 ? "deal" : "deals"} (₹{(stageData.value / 1000).toFixed(0)}K)
                      </span>
                    </div>
                    <div className="h-3 bg-[#0a0d12] rounded-full overflow-hidden border border-[#1c212a]/40">
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
          <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/50 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1c212a]/30 pb-3">
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">Recently Acquired Leads</h3>
              <Link href="/crm/leads" className="text-xs text-[#00c4b6] hover:underline flex items-center gap-1 font-semibold cursor-pointer">
                <span>All Leads</span>
                <ChevronRight className="size-3" />
              </Link>
            </div>

            {recentLeads.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">No new leads available</div>
            ) : (
              <div className="divide-y divide-[#1c212a]/30">
                {recentLeads.map((lead) => (
                  <div key={lead.id} className="py-3 flex items-center justify-between">
                    <div>
                      <Link href={`/crm/leads/${lead.id}`} className="font-bold text-white hover:text-[#00c4b6] transition-colors block text-sm">
                        {lead.firstName ? `${lead.firstName} ` : ""}{lead.lastName}
                      </Link>
                      <span className="text-xs text-slate-400">{lead.company} • Owner: {lead.owner.name}</span>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-[#161f28] text-slate-300 rounded uppercase tracking-wider">
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
          
          <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/50 space-y-4 flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[#1c212a]/30 pb-3">
                <h3 className="font-bold text-sm text-white uppercase tracking-wider">Signals & Reminders</h3>
                <span className="text-xs text-amber-400 font-bold">{activities.length} pending</span>
              </div>

              {activities.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">No pending activity tasks scheduled for today</div>
              ) : (
                <div className="space-y-3.5 mt-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="p-3 bg-[#0a0d12] border border-[#1c212a]/40 rounded-lg flex gap-3 items-start">
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
                        <span className="font-bold text-white text-xs block truncate leading-tight">{activity.title}</span>
                        <span className="text-[10px] text-slate-400 block mt-1 uppercase tracking-wider font-semibold">
                          Due: {activity.dueAt ? new Date(activity.dueAt).toLocaleDateString("en-IN") : "No date"} • Priority: {activity.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="pt-4 border-t border-[#1c212a]/30 flex items-center justify-between text-xs text-slate-400">
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
