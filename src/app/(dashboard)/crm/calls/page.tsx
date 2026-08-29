import {
  CrmTable,
  CrmConfigurationState,
  CrmPermissionState,
} from "@/modules/crm/components/workspace/crm-workspace";
import React from "react";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import {
  Phone,
  Play,
  CheckSquare,
  AlertTriangle,
  User,
  Activity,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

export default async function CrmCallsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return (
      <CrmConfigurationState description="Missing organisation context." />
    );
  }

  // Gated access check
  try {
    await requirePermission(session.user.id, "crm.lead.read");
  } catch (e) {
    return (
      <CrmPermissionState description="You do not have permission to view call logs." />
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
            lead: {
              select: { firstName: true, lastName: true, company: true },
            },
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
            lead: {
              select: { firstName: true, lastName: true, company: true },
            },
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

  const avgQuality = transcriptAggregate._avg.qualityScore
    ? Math.round(transcriptAggregate._avg.qualityScore)
    : 0;

  const salespersonRankings = activeSalespeople
    .map((sp) => {
      const calls = sp.crmCallAttempts.length;
      const completedCalls = sp.crmCallAttempts.filter(
        (c) => c.status === "COMPLETED",
      ).length;
      const convertedCount = sp.crmCallAttempts.filter(
        (c) => c.lead.isConverted,
      ).length;

      const ratingSum = sp.crmCallReviews.reduce((sum, r) => sum + r.rating, 0);
      const avgReviewRating = sp.crmCallReviews.length
        ? (ratingSum / sp.crmCallReviews.length).toFixed(1)
        : "N/A";
      const conversionRate =
        calls > 0 ? Math.round((convertedCount / calls) * 100) : 0;

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
    <main className="w-full animate-in space-y-8 fade-in duration-200 text-[var(--mnx-muted)]">
      {/* Page Heading */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="mnx-title-1 text-[var(--mnx-text-strong)]">Call Quality Center</h2>
          <p className="text-xs text-[var(--mnx-muted)] mt-1 uppercase tracking-wider">
            Monitor calling activity, listen to voice uploads, and review AI
            transcription audits
          </p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="mnx-crm-panel-surface  rounded-xl bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/55 p-5 space-y-2">
          <div className="flex items-center justify-between text-[var(--mnx-muted)] uppercase tracking-widest text-[9px] font-extrabold">
            <span>Call Attempts</span>
            <Phone className="size-4 text-[var(--mnx-accent)]" />
          </div>
          <p className="mnx-numeric text-[var(--mnx-text-strong)] text-3xl font-black">
            {attemptsCount}
          </p>
          <div className="text-[10px] text-[var(--mnx-muted)]">
            Initiated via mobile client
          </div>
        </div>

        <div className="mnx-crm-panel-surface  rounded-xl bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/55 p-5 space-y-2">
          <div className="flex items-center justify-between text-[var(--mnx-muted)] uppercase tracking-widest text-[9px] font-extrabold">
            <span>Audio Synced</span>
            <Play className="size-4 text-[var(--mnx-accent)]" />
          </div>
          <p className="mnx-numeric text-[var(--mnx-text-strong)] text-3xl font-black">
            {recordingsCount}
          </p>
          <div className="text-[10px] text-[var(--mnx-muted)]">
            {attemptsCount > 0
              ? Math.round((recordingsCount / attemptsCount) * 100)
              : 0}
            % sync rate from phone storage
          </div>
        </div>

        <div className="mnx-crm-panel-surface  rounded-xl bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/55 p-5 space-y-2">
          <div className="flex items-center justify-between text-[var(--mnx-muted)] uppercase tracking-widest text-[9px] font-extrabold">
            <span>AI Quality Score</span>
            <Sparkles className="size-4 text-[var(--mnx-accent)]" />
          </div>
          <p className="mnx-numeric text-[var(--mnx-text-strong)] text-3xl font-black">
            {avgQuality}%
          </p>
          <div className="text-[10px] text-[var(--mnx-muted)]">
            Average based on Whisper audits
          </div>
        </div>

        <div
          className={`mnx-crm-panel-surface ${pendingReviewsCount > 0 ? "mnx-tone-warning" : ""} rounded-xl bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/55 p-5 space-y-2`}
        >
          <div className="flex items-center justify-between text-[var(--mnx-muted)] uppercase tracking-widest text-[9px] font-extrabold">
            <span>Pending Audit</span>
            <AlertTriangle
              className={`size-4 ${pendingReviewsCount > 0 ? "text-[var(--mnx-accent)]" : "text-[var(--mnx-muted)]"}`}
            />
          </div>
          <p className="mnx-numeric text-[var(--mnx-text-strong)] text-3xl font-black">
            {pendingReviewsCount}
          </p>
          <div className="text-[10px] text-[var(--mnx-muted)]">
            Recordings requiring manager review
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Salesperson Performance Table */}
        <div className="lg:col-span-2 rounded-xl bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/55 p-6 space-y-4">
          <h3 className="mnx-title-3 text-[var(--mnx-text-strong)] flex items-center gap-2">
            <Activity className="size-4 text-[var(--mnx-accent)]" />
            Sales Representatives Standings
          </h3>
          <div className="overflow-x-auto">
            <CrmTable className="mnx-crm-table">
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
                    <td
                      colSpan={5}
                      className="text-center py-6 text-[var(--mnx-muted)] italic"
                    >
                      No call records logged for active representatives.
                    </td>
                  </tr>
                ) : (
                  salespersonRankings.map((sp) => (
                    <tr key={sp.id}>
                      <td className="font-bold text-[var(--mnx-text-strong)] flex items-center gap-2">
                        <User className="size-3.5 text-[var(--mnx-accent)]" />
                        {sp.name}
                      </td>
                      <td className="mnx-numeric font-medium">{sp.calls}</td>
                      <td className="mnx-numeric font-medium">
                        {sp.completedCalls}
                      </td>
                      <td className="mnx-numeric text-[var(--mnx-muted)]">
                        {sp.avgReviewRating === "N/A" ? (
                          <span className="text-[var(--mnx-muted)]">-</span>
                        ) : (
                          <span className="text-[var(--mnx-accent)] font-black">
                            {sp.avgReviewRating} / 5.0
                          </span>
                        )}
                      </td>
                      <td className="mnx-numeric text-[var(--mnx-text-strong)] font-bold">
                        {sp.conversionRate}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </CrmTable>
          </div>
        </div>

        {/* Low Quality Call Audits */}
        <div className="rounded-xl bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/55 p-6 space-y-4">
          <h3 className="mnx-title-3 text-[var(--mnx-accent)] flex items-center gap-2">
            <AlertTriangle className="size-4 text-[var(--mnx-accent)]" />
            Low Quality Call Alerts
          </h3>
          <div className="space-y-3">
            {lowQualityList.length === 0 ? (
              <div className="p-8 text-center text-[var(--mnx-muted)] italic">
                No low quality alerts generated. Excellent!
              </div>
            ) : (
              lowQualityList.map((rec) => {
                const leadName =
                  `${rec.callAttempt.lead?.firstName || ""} ${rec.callAttempt.lead?.lastName || ""}`.trim();
                return (
                  <div
                    key={rec.id}
                    className="p-3 bg-[var(--mnx-surface)]/50 border border-[var(--mnx-danger)] hover:border-[var(--mnx-danger)] rounded-lg space-y-2 transition-colors"
                  >
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-[var(--mnx-muted)] uppercase">
                        {rec.callAttempt.salesperson.name}
                      </span>
                      <span className="font-black text-[var(--mnx-danger)] uppercase tracking-widest font-mono">
                        Score {rec.transcript?.qualityScore || 0}%
                      </span>
                    </div>
                    <p className="font-semibold text-[var(--mnx-muted)] text-xs">
                      Call with: {leadName}
                    </p>
                    {rec.transcript?.summary && (
                      <p className="text-[10px] text-[var(--mnx-muted)] line-clamp-2 italic">
                        &quot;{rec.transcript.summary}&quot;
                      </p>
                    )}
                    <div className="flex justify-end pt-1">
                      <Link
                        href={`/crm/leads/${rec.leadId}`}
                        className="text-[9px] text-[var(--mnx-accent)] font-bold uppercase tracking-wider flex items-center gap-1 hover:underline cursor-pointer"
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
        <div className="rounded-xl bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/55 p-6 space-y-4">
          <h3 className="mnx-title-3 text-[var(--mnx-text-strong)] flex items-center gap-2">
            <CheckSquare className="size-4 text-[var(--mnx-accent)]" />
            Pending Manager Review Registry
          </h3>
          <div className="space-y-3">
            {pendingReviewList.length === 0 ? (
              <div className="p-6 text-center text-[var(--mnx-muted)] italic">
                All uploaded call recordings have been audited.
              </div>
            ) : (
              pendingReviewList.map((rec) => {
                const leadName =
                  `${rec.callAttempt.lead?.firstName || ""} ${rec.callAttempt.lead?.lastName || ""}`.trim();
                return (
                  <div
                    key={rec.id}
                    className="p-3 bg-[var(--mnx-surface)]/50 border border-[var(--mnx-border)]/40 rounded-lg flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="font-bold text-[var(--mnx-text-strong)] text-xs truncate">
                        Call: {leadName}
                      </p>
                      <div className="text-[10px] text-[var(--mnx-muted)]">
                        Agent:{" "}
                        <span className="text-[var(--mnx-muted)] font-semibold">
                          {rec.callAttempt.salesperson.name}
                        </span>{" "}
                        • Synced:{" "}
                        {new Date(rec.recordedAt).toLocaleDateString("en-IN")}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="mnx-numeric font-extrabold text-[var(--mnx-accent)] text-xs">
                        AI {rec.transcript?.qualityScore || 0}%
                      </span>
                      <Link
                        href={`/crm/leads/${rec.leadId}`}
                        className="bg-[var(--mnx-accent)] text-[var(--mnx-text-strong)] hover:bg-[var(--mnx-accent)]  px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer"
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
        <div className="rounded-xl bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/55 p-6 space-y-4">
          <h3 className="mnx-title-3 text-[var(--mnx-muted)] flex items-center gap-2">
            <AlertTriangle className="size-4 text-[var(--mnx-muted)]" />
            Calls Missing Audio Uploads
          </h3>
          <div className="space-y-3">
            {callsWithoutRecording.length === 0 ? (
              <div className="p-6 text-center text-[var(--mnx-muted)] italic">
                All logged call attempts have synced audio recordings.
              </div>
            ) : (
              callsWithoutRecording.map((call) => {
                const leadName =
                  `${call.lead?.firstName || ""} ${call.lead?.lastName || ""}`.trim();
                return (
                  <div
                    key={call.id}
                    className="p-3 bg-[var(--mnx-surface)]/50 border border-[var(--mnx-border)]/40 rounded-lg flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="font-bold text-[var(--mnx-text-strong)] text-xs truncate">
                        Call: {leadName}
                      </p>
                      <div className="text-[10px] text-[var(--mnx-muted)]">
                        Agent:{" "}
                        <span className="text-[var(--mnx-muted)] font-semibold">
                          {call.salesperson.name}
                        </span>{" "}
                        • Number:{" "}
                        <span className="font-mono text-[var(--mnx-muted)]">
                          {call.customerPhone}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--mnx-muted)] block">
                        Status
                      </span>
                      <span className="text-[10px] font-extrabold uppercase text-[var(--mnx-accent)]">
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
