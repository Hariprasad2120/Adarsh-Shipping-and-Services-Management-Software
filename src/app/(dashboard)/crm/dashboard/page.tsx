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
  CheckSquare
} from "lucide-react";
import { requirePermission } from "@/lib/rbac";
import { DemoDataButton } from "./demo-data-button";

export default async function CrmDashboardPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return <CrmConfigurationState description="Missing organisation context for the current user session." />;
  }

  // Permission Guard
  try {
    await requirePermission(session.user.id, "crm.access");
  } catch (e) {
    return <CrmPermissionState description="You do not have the required permissions to view the CRM module." />;
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
        <CrmActionLink href="/crm/leads/new" primary>
          <span>+ Add Lead</span>
        </CrmActionLink>
        <CrmActionLink href="/crm/deals">
          <span>View Deals</span>
        </CrmActionLink>
      </div>

      {/* ─── KPI METRICS GRID ─────────────────────────────────────────── */}
      <CrmMetrics>
        <CrmMetric
          href="/crm/leads"
          label="Leads summary"
          value={totalLeads}
          detail={`+${newLeadsThisMonth} new this month · ${convertedLeads} converted`}
          icon={<UserCheck aria-hidden="true" />}
        />
        <CrmMetric
          href="/crm/deals"
          label="Deals pipeline"
          value={`₹${(pipelineValue / 100000).toFixed(1)}L`}
          detail={`${openDeals.length} open · ${wonDeals.length} won`}
          icon={<Target aria-hidden="true" />}
        />
        <CrmMetric
          href="/crm/forecasts"
          label="Weighted forecast"
          value={`₹${(forecastValue / 100000).toFixed(1)}L`}
          detail="Probability-weighted open revenue"
          icon={<TrendingUp aria-hidden="true" />}
        />
        <CrmMetric
          href="/crm/invoices"
          label="Won revenue"
          value={`₹${(revenueTotal / 100000).toFixed(1)}L`}
          detail={`₹${(pendingRevenue / 100000).toFixed(1)}L pending invoices`}
          icon={<DollarSign aria-hidden="true" />}
        />
      </CrmMetrics>

      {/* ─── TWO-COLUMN WORKSPACE SECTION ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Column 1 & 2: Sales Funnel & Recent Leads */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Sales Funnel Chart */}
          <div className="p-6 rounded-xl bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/50 space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--mnx-border)]/30 pb-3">
              <h3 className="font-bold text-sm text-[var(--mnx-text-strong)] uppercase tracking-wider">Freight Sales Pipeline Funnel</h3>
              <span className="text-xs text-[var(--mnx-muted)]">{deals.length} total negotiations</span>
            </div>
            
            <div className="space-y-3">
              {stagesList.map((stage) => {
                const stageData = stageCounts[stage] || { count: 0, value: 0 };
                const maxCount = Math.max(...Object.values(stageCounts).map(s => s.count), 1);
                const pct = (stageData.count / maxCount) * 100;
                
                return (
                  <div key={stage} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-[var(--mnx-muted)] uppercase tracking-wide text-[11px]">{stage.replace("_", " ")}</span>
                      <span className="text-[var(--mnx-muted)]">
                        {stageData.count} {stageData.count === 1 ? "deal" : "deals"} (₹{(stageData.value / 1000).toFixed(0)}K)
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

          {/* Recent Leads Panel */}
          <div className="p-6 rounded-xl bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/50 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--mnx-border)]/30 pb-3">
              <h3 className="font-bold text-sm text-[var(--mnx-text-strong)] uppercase tracking-wider">Recently Acquired Leads</h3>
              <Link href="/crm/leads" className="text-xs text-[var(--mnx-accent)] hover:underline flex items-center gap-1 font-semibold cursor-pointer">
                <span>All Leads</span>
                <ChevronRight className="size-3" />
              </Link>
            </div>

            {recentLeads.length === 0 ? (
              <div className="p-8 text-center text-[var(--mnx-muted)] text-sm">No new leads available</div>
            ) : (
              <div className="divide-y divide-[var(--mnx-border)]/30">
                {recentLeads.map((lead) => (
                  <div key={lead.id} className="py-3 flex items-center justify-between">
                    <div>
                      <Link href={`/crm/leads/${lead.id}`} className="font-bold text-[var(--mnx-text-strong)] hover:text-[var(--mnx-accent)] transition-colors block text-sm">
                        {lead.firstName ? `${lead.firstName} ` : ""}{lead.lastName}
                      </Link>
                      <span className="text-xs text-[var(--mnx-muted)]">{lead.company} • Owner: {lead.owner.name}</span>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-[var(--mnx-surface)] text-[var(--mnx-muted)] rounded uppercase tracking-wider">
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
          
          <div className="p-6 rounded-xl bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/50 space-y-4 flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[var(--mnx-border)]/30 pb-3">
                <h3 className="font-bold text-sm text-[var(--mnx-text-strong)] uppercase tracking-wider">Signals & Reminders</h3>
                <span className="text-xs text-[var(--mnx-warning)] font-bold">{activities.length} pending</span>
              </div>

              {activities.length === 0 ? (
                <div className="p-8 text-center text-[var(--mnx-muted)] text-sm">No pending activity tasks scheduled for today</div>
              ) : (
                <div className="space-y-3.5 mt-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="p-3 bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/40 rounded-lg flex gap-3 items-start">
                      <div className={`p-2 rounded-lg shrink-0 ${
                        activity.type === "TASK"
                          ? "bg-[var(--mnx-accent-soft)] text-[var(--mnx-accent-text)]"
                          : activity.type === "EVENT"
                          ? "bg-[var(--mnx-accent-soft)] text-[var(--mnx-accent-text)]"
                          : "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]"
                      }`}>
                        {activity.type === "TASK" ? <CheckSquare className="size-4" /> : activity.type === "EVENT" ? <Calendar className="size-4" /> : <PhoneCall className="size-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-[var(--mnx-text-strong)] text-xs block truncate leading-tight">{activity.title}</span>
                        <span className="text-[10px] text-[var(--mnx-muted)] block mt-1 uppercase tracking-wider font-semibold">
                          Due: {activity.dueAt ? new Date(activity.dueAt).toLocaleDateString("en-IN") : "No date"} • Priority: {activity.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="pt-4 border-t border-[var(--mnx-border)]/30 flex items-center justify-between text-xs text-[var(--mnx-muted)]">
              <div className="flex items-center gap-1.5">
                <Clock className="size-3.5 text-[var(--mnx-warning)]" />
                <span>Overdue: {activities.filter(a => a.dueAt && new Date(a.dueAt) < new Date()).length} tasks</span>
              </div>
              <Link href="/crm/tasks" className="text-[var(--mnx-accent)] hover:underline font-semibold flex items-center cursor-pointer">
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
