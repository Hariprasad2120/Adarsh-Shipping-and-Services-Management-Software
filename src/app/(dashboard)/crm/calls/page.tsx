import React from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import {
  ShieldAlert,
  Phone,
  Play,
  CheckSquare,
  AlertTriangle,
  User,
  Star,
  Activity,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

export default async function CrmCallsPage() {
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

  // Gated access check
  try {
    await requirePermission(session.user.id, "crm.lead.read");
  } catch (e) {
    return (
      <div className="p-8 text-center text-red-400">
        <ShieldAlert className="size-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-sm mt-1">You do not have permission to view call logs.</p>
      </div>
    );
  }

  // Parallelize all independent queries
  const [
    attemptsCount,
    recordingsCount,
    transcriptAggregate,
    pendingReviewsCount,
    callsWithoutRecording,
    pendingReviewList,
    lowQualityList,
    activeSalespeople,
  ] = await Promise.all([
    db.crmCallAttempt.count({ where: { orgId } }),
    db.crmCallRecording.count({ where: { orgId } }),
    db.crmCallTranscript.aggregate({
      _avg: { qualityScore: true },
      where: { orgId },
    }),
    db.crmCallRecording.count({
      where: { orgId, reviews: { none: {} } },
    }),
    db.crmCallAttempt.findMany({
      where: { orgId, recordings: { none: {} } },
      include: {
        lead: { select: { firstName: true, lastName: true, company: true } },
        salesperson: { select: { name: true } },
      },
      take: 5,
      orderBy: { callStartedAt: "desc" },
    }),
    db.crmCallRecording.findMany({
      where: { orgId, reviews: { none: {} } },
      include: {
        callAttempt: {
          include: {
            lead: { select: { firstName: true, lastName: true, company: true } },
            salesperson: { select: { name: true } },
          },
        },
        transcript: { select: { qualityScore: true } },
      },
      take: 5,
      orderBy: { recordedAt: "desc" },
    }),
    db.crmCallRecording.findMany({
      where: {
        orgId,
        OR: [
          { transcript: { qualityScore: { lt: 70 } } },
          { reviews: { some: { rating: { lte: 2 } } } },
        ],
      },
      include: {
        callAttempt: {
          include: {
            lead: { select: { firstName: true, lastName: true, company: true } },
            salesperson: { select: { name: true } },
          },
        },
        transcript: { select: { qualityScore: true, summary: true } },
      },
      take: 5,
      orderBy: { recordedAt: "desc" },
    }),
    db.user.findMany({
      where: { orgId, active: true },
      select: {
        id: true,
        name: true,
        crmCallAttempts: {
          select: {
            id: true,
            status: true,
            lead: { select: { isConverted: true } },
          },
        },
        crmCallReviews: { select: { rating: true } },
        crmCallAuditLogs: { select: { id: true } },
      },
    }),
  ]);

  const avgQuality = transcriptAggregate._avg.qualityScore ? Math.round(transcriptAggregate._avg.qualityScore) : 0;

  const salespersonRankings = activeSalespeople
    .map((sp) => {
      const calls = sp.crmCallAttempts.length;
      const completedCalls = sp.crmCallAttempts.filter((c) => c.status === "COMPLETED").length;
      const convertedCount = sp.crmCallAttempts.filter((c) => c.lead.isConverted).length;
      
      const ratingSum = sp.crmCallReviews.reduce((sum, r) => sum + r.rating, 0);
      const avgReviewRating = sp.crmCallReviews.length ? (ratingSum / sp.crmCallReviews.length).toFixed(1) : "N/A";
      const conversionRate = calls > 0 ? Math.round((convertedCount / calls) * 100) : 0;

      return {
        id: sp.id,
        name: sp.name,
        calls,
        completedCalls,
        conversionRate,
        avgReviewRating,
      };
    })
    .filter((sp) => sp.calls > 0)
    .sort((a, b) => b.calls - a.calls);

  return (
    <main className="w-full animate-in space-y-8 fade-in duration-200 text-slate-300">
      {/* Page Heading */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="ds-h1 text-white">Call Quality Center</h2>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">
            Monitor calling activity, listen to voice uploads, and review AI transcription audits
          </p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card-top-accent rounded-xl bg-[#0f1319] border border-[#1c212a]/55 p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-500 uppercase tracking-widest text-[9px] font-extrabold">
            <span>Call Attempts</span>
            <Phone className="size-4 text-[#00cec4]" />
          </div>
          <p className="ds-numeric text-white text-3xl font-black">{attemptsCount}</p>
          <div className="text-[10px] text-slate-500">Initiated via mobile client</div>
        </div>

        <div className="card-top-accent rounded-xl bg-[#0f1319] border border-[#1c212a]/55 p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-500 uppercase tracking-widest text-[9px] font-extrabold">
            <span>Audio Synced</span>
            <Play className="size-4 text-[#00cec4]" />
          </div>
          <p className="ds-numeric text-white text-3xl font-black">{recordingsCount}</p>
          <div className="text-[10px] text-slate-500">
            {attemptsCount > 0 ? Math.round((recordingsCount / attemptsCount) * 100) : 0}% sync rate from phone storage
          </div>
        </div>

        <div className="card-top-accent rounded-xl bg-[#0f1319] border border-[#1c212a]/55 p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-500 uppercase tracking-widest text-[9px] font-extrabold">
            <span>AI Quality Score</span>
            <Sparkles className="size-4 text-[#00cec4]" />
          </div>
          <p className="ds-numeric text-white text-3xl font-black">{avgQuality}%</p>
          <div className="text-[10px] text-slate-500">Average based on Whisper audits</div>
        </div>

        <div className={`card-top-accent${pendingReviewsCount > 0 ? "-orange" : ""} rounded-xl bg-[#0f1319] border border-[#1c212a]/55 p-5 space-y-2`}>
          <div className="flex items-center justify-between text-slate-500 uppercase tracking-widest text-[9px] font-extrabold">
            <span>Pending Audit</span>
            <AlertTriangle className={`size-4 ${pendingReviewsCount > 0 ? "text-[#fb923c]" : "text-slate-500"}`} />
          </div>
          <p className="ds-numeric text-white text-3xl font-black">{pendingReviewsCount}</p>
          <div className="text-[10px] text-slate-500">Recordings requiring manager review</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Salesperson Performance Table */}
        <div className="lg:col-span-2 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 p-6 space-y-4">
          <h3 className="ds-h3 text-white flex items-center gap-2">
            <Activity className="size-4 text-[#00cec4]" />
            Sales Representatives Standings
          </h3>
          <div className="overflow-x-auto">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Representative</th>
                  <th>Calls Clicked</th>
                  <th>Calls Reached</th>
                  <th>Avg Manager Rating</th>
                  <th>Conversion rate</th>
                </tr>
              </thead>
              <tbody>
                {salespersonRankings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-500 italic">
                      No call records logged for active representatives.
                    </td>
                  </tr>
                ) : (
                  salespersonRankings.map((sp) => (
                    <tr key={sp.id}>
                      <td className="font-bold text-white flex items-center gap-2">
                        <User className="size-3.5 text-[#00cec4]" />
                        {sp.name}
                      </td>
                      <td className="ds-numeric font-medium">{sp.calls}</td>
                      <td className="ds-numeric font-medium">{sp.completedCalls}</td>
                      <td className="ds-numeric text-slate-300">
                        {sp.avgReviewRating === "N/A" ? (
                          <span className="text-slate-600">-</span>
                        ) : (
                          <span className="text-[#fb923c] font-black">{sp.avgReviewRating} / 5.0</span>
                        )}
                      </td>
                      <td className="ds-numeric text-white font-bold">{sp.conversionRate}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Quality Call Audits */}
        <div className="rounded-xl bg-[#0f1319] border border-[#1c212a]/55 p-6 space-y-4">
          <h3 className="ds-h3 text-[#fb923c] flex items-center gap-2">
            <AlertTriangle className="size-4 text-[#fb923c]" />
            Low Quality Call Alerts
          </h3>
          <div className="space-y-3">
            {lowQualityList.length === 0 ? (
              <div className="p-8 text-center text-slate-500 italic">
                No low quality alerts generated. Excellent!
              </div>
            ) : (
              lowQualityList.map((rec) => {
                const leadName = `${rec.callAttempt.lead?.firstName || ""} ${rec.callAttempt.lead?.lastName || ""}`.trim();
                return (
                  <div
                    key={rec.id}
                    className="p-3 bg-[#0a0d12]/50 border border-red-500/10 hover:border-red-500/30 rounded-lg space-y-2 transition-colors"
                  >
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-slate-400 uppercase">{rec.callAttempt.salesperson.name}</span>
                      <span className="font-black text-red-400 uppercase tracking-widest font-mono">
                        Score {rec.transcript?.qualityScore || 0}%
                      </span>
                    </div>
                    <p className="font-semibold text-slate-200 text-xs">Call with: {leadName}</p>
                    {rec.transcript?.summary && (
                      <p className="text-[10px] text-slate-400 line-clamp-2 italic">
                        "{rec.transcript.summary}"
                      </p>
                    )}
                    <div className="flex justify-end pt-1">
                      <Link
                        href={`/crm/leads/${rec.leadId}`}
                        className="text-[9px] text-[#00cec4] font-bold uppercase tracking-wider flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        Inspect Lead <ArrowUpRight className="size-3" />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Pending Quality Audits */}
        <div className="rounded-xl bg-[#0f1319] border border-[#1c212a]/55 p-6 space-y-4">
          <h3 className="ds-h3 text-white flex items-center gap-2">
            <CheckSquare className="size-4 text-[#00cec4]" />
            Pending Manager Review Registry
          </h3>
          <div className="space-y-3">
            {pendingReviewList.length === 0 ? (
              <div className="p-6 text-center text-slate-500 italic">
                All uploaded call recordings have been audited.
              </div>
            ) : (
              pendingReviewList.map((rec) => {
                const leadName = `${rec.callAttempt.lead?.firstName || ""} ${rec.callAttempt.lead?.lastName || ""}`.trim();
                return (
                  <div
                    key={rec.id}
                    className="p-3 bg-[#0a0d12]/50 border border-[#1c212a]/40 rounded-lg flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="font-bold text-white text-xs truncate">Call: {leadName}</p>
                      <div className="text-[10px] text-slate-500">
                        Agent: <span className="text-slate-300 font-semibold">{rec.callAttempt.salesperson.name}</span> • Synced: {new Date(rec.recordedAt).toLocaleDateString("en-IN")}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="ds-numeric font-extrabold text-[#00cec4] text-xs">
                        AI {rec.transcript?.qualityScore || 0}%
                      </span>
                      <Link
                        href={`/crm/leads/${rec.leadId}`}
                        className="bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Audit
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Calls Missing Audio Uploads */}
        <div className="rounded-xl bg-[#0f1319] border border-[#1c212a]/55 p-6 space-y-4">
          <h3 className="ds-h3 text-slate-400 flex items-center gap-2">
            <AlertTriangle className="size-4 text-slate-500" />
            Calls Missing Audio Uploads
          </h3>
          <div className="space-y-3">
            {callsWithoutRecording.length === 0 ? (
              <div className="p-6 text-center text-slate-500 italic">
                All logged call attempts have synced audio recordings.
              </div>
            ) : (
              callsWithoutRecording.map((call) => {
                const leadName = `${call.lead?.firstName || ""} ${call.lead?.lastName || ""}`.trim();
                return (
                  <div
                    key={call.id}
                    className="p-3 bg-[#0a0d12]/50 border border-[#1c212a]/40 rounded-lg flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="font-bold text-white text-xs truncate">Call: {leadName}</p>
                      <div className="text-[10px] text-slate-500">
                        Agent: <span className="text-slate-300 font-semibold">{call.salesperson.name}</span> • Number: <span className="font-mono text-slate-400">{call.customerPhone}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
                        Status
                      </span>
                      <span className="text-[10px] font-extrabold uppercase text-[#fb923c]">
                        {call.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
