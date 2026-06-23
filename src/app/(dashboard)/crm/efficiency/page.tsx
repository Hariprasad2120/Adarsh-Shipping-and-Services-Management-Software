import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import {
  Clock,
  TrendingUp,
  UserCheck,
  DollarSign,
  Users,
  Building,
  Target,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  History
} from "lucide-react";

export default async function CrmEfficiencyPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return (
      <div className="p-8 text-center text-red-400">
        <ShieldAlert className="size-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Configuration Error</h2>
        <p className="text-sm mt-1">Missing organisation context.</p>
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
        <p className="text-sm mt-1">You do not have the required permissions to view this page.</p>
      </div>
    );
  }

  // Fetch all leads, timeline events, deals, time logs, and users for aggregation
  const [leads, timelineEvents, deals, workTimeLogs, users] = await Promise.all([
    db.crmLead.findMany({
      where: { orgId },
      select: {
        id: true,
        createdAt: true,
        isConverted: true,
        convertedAt: true,
        ownerId: true,
        firstName: true,
        lastName: true,
        company: true
      }
    }),
    db.crmTimelineEvent.findMany({
      where: { orgId, relatedToType: "LEAD" },
      orderBy: { createdAt: "asc" }
    }),
    db.crmDeal.findMany({
      where: { orgId },
      select: { id: true, ownerId: true, stage: true, amount: true }
    }),
    db.crmWorkTimeLog.findMany({
      where: { orgId },
      include: {
        user: { select: { name: true } },
        lead: { select: { id: true, firstName: true, lastName: true, company: true } }
      },
      orderBy: { loggedAt: "desc" }
    }),
    db.user.findMany({
      where: { orgId, active: true },
      select: { id: true, name: true, email: true }
    })
  ]);

  // 1. Calculate Response Times (Lead Ingestion to first status change/contact attempt)
  const responseTimesByLead: Record<string, number> = {};
  leads.forEach((lead) => {
    // Find first event that isn't LEAD_CREATED or LEAD_IMPORT
    const leadEvents = timelineEvents.filter((e) => e.relatedToId === lead.id);
    const firstResponse = leadEvents.find(
      (e) => e.eventType !== "LEAD_CREATED" && e.eventType !== "LEAD_IMPORT"
    );
    if (firstResponse) {
      const diffMs = new Date(firstResponse.createdAt).getTime() - new Date(lead.createdAt).getTime();
      responseTimesByLead[lead.id] = diffMs / 3600000; // in hours
    }
  });

  // 2. Calculate Conversion Times (Lead Ingestion to conversion)
  const conversionTimesByLead: Record<string, number> = {};
  leads.forEach((lead) => {
    if (lead.isConverted && lead.convertedAt) {
      const diffMs = new Date(lead.convertedAt).getTime() - new Date(lead.createdAt).getTime();
      conversionTimesByLead[lead.id] = diffMs / 86400000; // in days
    }
  });

  // 3. Aggregate metrics by salesperson
  const userMetrics: Record<string, {
    name: string;
    leadsCount: number;
    responseTimes: number[];
    conversionTimes: number[];
    totalHoursLogged: number;
    wonDealsValue: number;
  }> = {};

  users.forEach((u) => {
    userMetrics[u.id] = {
      name: u.name,
      leadsCount: 0,
      responseTimes: [],
      conversionTimes: [],
      totalHoursLogged: 0,
      wonDealsValue: 0
    };
  });

  // Count leads, response times, and conversion times
  leads.forEach((lead) => {
    const metrics = userMetrics[lead.ownerId];
    if (metrics) {
      metrics.leadsCount += 1;
      if (responseTimesByLead[lead.id] !== undefined) {
        metrics.responseTimes.push(responseTimesByLead[lead.id]);
      }
      if (conversionTimesByLead[lead.id] !== undefined) {
        metrics.conversionTimes.push(conversionTimesByLead[lead.id]);
      }
    }
  });

  // Sum logged work time hours
  workTimeLogs.forEach((log) => {
    const metrics = userMetrics[log.userId];
    if (metrics) {
      metrics.totalHoursLogged += log.durationHours;
    }
  });

  // Sum won deals value
  deals.forEach((deal) => {
    if (deal.stage === "WON") {
      const metrics = userMetrics[deal.ownerId];
      if (metrics) {
        metrics.wonDealsValue += deal.amount;
      }
    }
  });

  // 4. Calculate general organization efficiency metrics
  const allResponseTimes = Object.values(responseTimesByLead);
  const avgResponseTime = allResponseTimes.length > 0
    ? allResponseTimes.reduce((s, x) => s + x, 0) / allResponseTimes.length
    : 0;

  const allConversionTimes = Object.values(conversionTimesByLead);
  const avgConversionTime = allConversionTimes.length > 0
    ? allConversionTimes.reduce((s, x) => s + x, 0) / allConversionTimes.length
    : 0;

  const totalLoggedHours = workTimeLogs.reduce((sum, log) => sum + log.durationHours, 0);
  const totalWonDealsVal = deals.filter(d => d.stage === "WON").reduce((sum, d) => sum + d.amount, 0);
  const totalLeadsCount = leads.length;
  const convertedLeadsCount = leads.filter(l => l.isConverted).length;
  const orgConversionRate = totalLeadsCount > 0 ? (convertedLeadsCount / totalLeadsCount) * 100 : 0;

  // Format activities
  const activityLabels: Record<string, string> = {
    LEAD_PROCESSING: "Lead Processing",
    IN_CALL_ENQUIRY: "In-Call Enquiry",
    RATES_PREPARATION: "Rates Prep",
    QUOTE_DRAFTING: "Quote Drafting",
    SUBMITTED_FOR_APPROVAL: "Approval Prep",
    CLIENT_MEETING: "Client Meeting",
    FOLLOW_UP: "Follow-up",
    OTHER: "Other"
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* ─── TITLE SECTION ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-[#1c212a]/30 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white uppercase tracking-wider">Salesperson Efficiency & Impact</h2>
          <p className="text-xs text-slate-400 mt-1">Analytics on lead response times, conversion rates, and total client hours spent.</p>
        </div>
      </div>

      {/* ─── KPI METRICS GRID ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI: Avg. Response Time */}
        <div className="p-5 rounded-xl bg-[#0f1319] border border-[#1c212a]/50 flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Avg. Response Time</span>
            <div className="text-3xl font-black text-white">
              {avgResponseTime === 0 ? "N/A" : avgResponseTime < 1 ? `${Math.round(avgResponseTime * 60)}m` : `${avgResponseTime.toFixed(1)}h`}
            </div>
            <p className="text-[10px] text-slate-400">Lead capture to initial salesperson activity</p>
          </div>
          <div className="p-3 bg-[#00c4b6]/10 text-[#00c4b6] rounded-lg">
            <Clock className="size-5" />
          </div>
        </div>

        {/* KPI: Avg. Conversion Time */}
        <div className="p-5 rounded-xl bg-[#0f1319] border border-[#1c212a]/50 flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Avg. Conversion Time</span>
            <div className="text-3xl font-black text-white">
              {avgConversionTime === 0 ? "N/A" : `${avgConversionTime.toFixed(1)} days`}
            </div>
            <p className="text-[10px] text-slate-400">Lead capture to account qualification</p>
          </div>
          <div className="p-3 bg-[#818cf8]/10 text-[#818cf8] rounded-lg">
            <TrendingUp className="size-5" />
          </div>
        </div>

        {/* KPI: Total Logged Hours */}
        <div className="p-5 rounded-xl bg-[#0f1319] border border-[#1c212a]/50 flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Team Logged Hours</span>
            <div className="text-3xl font-black text-[#00c4b6]">{totalLoggedHours.toFixed(1)} hrs</div>
            <p className="text-[10px] text-slate-400">Total work hours spent on client interactions</p>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg">
            <Clock className="size-5" />
          </div>
        </div>

        {/* KPI: Team Conversion Rate */}
        <div className="p-5 rounded-xl bg-[#0f1319] border border-[#1c212a]/50 flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Conversion Rate</span>
            <div className="text-3xl font-black text-white">{orgConversionRate.toFixed(1)}%</div>
            <p className="text-[10px] text-slate-400">{convertedLeadsCount} converted / {totalLeadsCount} total leads</p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-[#34d399] rounded-lg">
            <UserCheck className="size-5" />
          </div>
        </div>

      </div>

      {/* ─── TEAM LEADERBOARD ─────────────────────────────────────────── */}
      <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/50 space-y-4">
        <div className="flex items-center justify-between border-b border-[#1c212a]/30 pb-3">
          <h3 className="font-bold text-sm text-white uppercase tracking-wider">Sales Team Leaderboard & Performance</h3>
          <span className="text-xs text-slate-400">Individual efficiency metrics</span>
        </div>

        <div className="overflow-x-auto">
          <table className="ds-table w-full">
            <thead>
              <tr>
                <th className="text-left py-3 px-4">Salesperson</th>
                <th className="text-center py-3 px-4">Leads Assigned</th>
                <th className="text-center py-3 px-4">Avg. Response Time</th>
                <th className="text-center py-3 px-4">Avg. Conversion Time</th>
                <th className="text-center py-3 px-4">Total Logged Time</th>
                <th className="text-right py-3 px-4">Won Value (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c212a]/30">
              {Object.entries(userMetrics)
                .filter(([_, data]) => data.leadsCount > 0 || data.totalHoursLogged > 0)
                .map(([userId, data]) => {
                  const avgResp = data.responseTimes.length > 0
                    ? data.responseTimes.reduce((s, x) => s + x, 0) / data.responseTimes.length
                    : 0;
                  const avgConv = data.conversionTimes.length > 0
                    ? data.conversionTimes.reduce((s, x) => s + x, 0) / data.conversionTimes.length
                    : 0;

                  return (
                    <tr key={userId} className="hover:bg-[#0a0d12]/30 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white">{data.name}</td>
                      <td className="py-3.5 px-4 text-center text-slate-300 font-medium">{data.leadsCount}</td>
                      <td className="py-3.5 px-4 text-center text-slate-300">
                        {avgResp === 0 ? "N/A" : avgResp < 1 ? `${Math.round(avgResp * 60)} mins` : `${avgResp.toFixed(1)} hrs`}
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-300">
                        {avgConv === 0 ? "N/A" : `${avgConv.toFixed(1)} days`}
                      </td>
                      <td className="py-3.5 px-4 text-center text-[#00c4b6] font-black">{data.totalHoursLogged.toFixed(1)} hrs</td>
                      <td className="py-3.5 px-4 text-right font-black text-white">
                        {data.wonDealsValue === 0 ? "-" : `₹${data.wonDealsValue.toLocaleString("en-IN")}`}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Column 1 & 2: Recent Log Entries Feed */}
        <div className="lg:col-span-2 p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/50 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1c212a]/30 pb-3">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider">Recent Work Log Entries</h3>
            <span className="text-xs text-[#00c4b6] font-semibold">{workTimeLogs.length} total entries</span>
          </div>

          {workTimeLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm italic">No work hours logged yet.</div>
          ) : (
            <div className="divide-y divide-[#1c212a]/30 max-h-[500px] overflow-y-auto pr-1">
              {workTimeLogs.slice(0, 15).map((log) => (
                <div key={log.id} className="py-3.5 flex items-start justify-between gap-4">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white text-xs">
                        {log.user.name}
                      </span>
                      <span className="text-slate-500 font-semibold">•</span>
                      <span className="text-[10px] font-bold text-[#00c4b6] uppercase bg-[#00c4b6]/5 px-2 py-0.5 rounded border border-[#00c4b6]/15">
                        {activityLabels[log.activityType] || log.activityType}
                      </span>
                      <span className="text-slate-500 font-semibold">•</span>
                      <span className="text-slate-400 font-black">{log.durationHours} hr{log.durationHours === 1 ? "" : "s"}</span>
                    </div>
                    {log.description && (
                      <p className="text-slate-300 text-xs leading-normal font-normal pl-0.5">{log.description}</p>
                    )}
                    {log.lead && (
                      <div className="text-[10px] text-slate-500 font-medium">
                        Linked Client:{" "}
                        <Link href={`/crm/leads/${log.lead.id}`} className="text-[#00c4b6] hover:underline font-bold">
                          {`${log.lead.firstName || ""} ${log.lead.lastName}`.trim()} ({log.lead.company})
                        </Link>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0 font-medium">
                    {new Date(log.loggedAt).toLocaleDateString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 3: Work Distribution by activity type */}
        <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/50 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1c212a]/30 pb-3">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider">Activity Distribution</h3>
            <span className="text-xs text-slate-400">Logged Hours</span>
          </div>

          <div className="space-y-4">
            {Object.entries(activityLabels).map(([key, label]) => {
              const hours = workTimeLogs
                .filter((l) => l.activityType === key)
                .reduce((sum, l) => sum + l.durationHours, 0);
              const pct = totalLoggedHours > 0 ? (hours / totalLoggedHours) * 100 : 0;

              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300 uppercase tracking-wide text-[10px]">{label}</span>
                    <span className="text-slate-400">{hours.toFixed(1)} hrs ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2.5 bg-[#0a0d12] rounded-full overflow-hidden border border-[#1c212a]/40">
                    <div
                      style={{ width: `${pct}%` }}
                      className="h-full rounded-full bg-[#00c4b6] transition-all duration-300"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
