import { redirect } from "next/navigation";
import {
  PerformanceSection,
  PerformanceSectionHeader,
  PerformanceSummary,
  PerformanceSummaryGrid,
} from "@/modules/performance/components/performance-workspace";
import { BarChart3, Clock, Users, Wallet } from "lucide-react";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getAppraisalAnalytics } from "@/modules/ams/analytics";

export const metadata = { title: "Appraisal Analytics | AMS | Adarsh Shipping" };

function Bar({ label, value, max, suffix }: { label: string; value: number; max: number; suffix?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-mono-text">{label}</span>
        <span className="font-semibold text-mono-muted">
          {value}
          {suffix ?? ""}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-mono-soft">
        <div className="h-2 rounded-full bg-mono-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function AppraisalAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const orgId = session.user.orgId;
  if (!orgId) redirect("/ams");
  if (!(await can(session.user.id, "ams.appraisal.view_all"))) redirect("/ams");

  const sp = await searchParams;
  const year = sp.year ? Number(sp.year) : undefined;
  const a = await getAppraisalAnalytics(orgId, year);

  const funnelMax = Math.max(1, ...a.funnel.map((f) => f.count));
  const gradeMax = Math.max(1, ...a.gradeMix.map((g) => g.count));
  const hikeMax = Math.max(1, ...a.hikeDistribution.map((h) => h.count));
  const loadMax = Math.max(1, ...a.reviewerLoad.map((r) => r.assigned));
  const closed = a.funnel.find((f) => f.stage === "CLOSED")?.count ?? 0;
  const arrearTotal = a.arrears.reduce((sum, row) => sum + row.amount, 0);

  return (
    <div className="space-y-6">
      <PerformanceSummaryGrid>
        <PerformanceSummary icon={<BarChart3 aria-hidden="true" />} label="Appraisals" value={a.totalAppraisals} detail="In selected scope" />
        <PerformanceSummary icon={<Clock aria-hidden="true" />} label="Closed" value={closed} detail="Reached final outcome" />
        <PerformanceSummary
          icon={<Users aria-hidden="true" />}
          label="Reviewers engaged"
          value={a.reviewerLoad.length}
          detail="Distinct assigned reviewers"
        />
        <PerformanceSummary
          icon={<Wallet aria-hidden="true" />}
          label="Arrear value"
          value={`₹${Math.round(arrearTotal).toLocaleString("en-IN")}`}
          detail="Across all statuses"
        />
      </PerformanceSummaryGrid>

      <PerformanceSection>
        <PerformanceSectionHeader eyebrow="Pipeline" title="Cycle funnel" description="Current count of appraisals at each stage." />
        <div className="space-y-3 p-5">
          {a.funnel.map((row) => (
            <Bar key={row.stage} label={row.label} value={row.count} max={funnelMax} />
          ))}
        </div>
      </PerformanceSection>

      <PerformanceSection>
        <PerformanceSectionHeader
          eyebrow="Turnaround"
          title="Stage transition time"
          description="Median and 90th-percentile calendar days between consecutive stage transitions."
        />
        <div className="overflow-x-auto p-5">
          <table className="min-w-[520px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-mono-border bg-mono-soft text-xs font-bold text-mono-muted">
                <th className="px-3 py-2">Transition</th>
                <th className="px-3 py-2">Median days</th>
                <th className="px-3 py-2">P90 days</th>
                <th className="px-3 py-2">Samples</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mono-border/60 text-mono-muted">
              {a.turnaround.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-mono-muted">
                    Not enough transition history yet.
                  </td>
                </tr>
              ) : (
                a.turnaround.map((row) => (
                  <tr key={row.transition}>
                    <td className="px-3 py-2 text-mono-text">{row.transition}</td>
                    <td className="px-3 py-2">{row.medianDays ?? "-"}</td>
                    <td className="px-3 py-2">{row.p90Days ?? "-"}</td>
                    <td className="px-3 py-2">{row.samples}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PerformanceSection>

      <div className="grid gap-6 lg:grid-cols-2">
        <PerformanceSection>
          <PerformanceSectionHeader eyebrow="Outcomes" title="Grade mix" description="Suggested grade on finalised decisions." />
          <div className="space-y-3 p-5">
            {a.gradeMix.length === 0 ? (
              <p className="text-sm text-mono-muted">No finalised decisions yet.</p>
            ) : (
              a.gradeMix.map((row) => <Bar key={row.grade} label={row.grade} value={row.count} max={gradeMax} />)
            )}
          </div>
        </PerformanceSection>

        <PerformanceSection>
          <PerformanceSectionHeader eyebrow="Outcomes" title="Increment distribution" description="Finalised hike percentage buckets." />
          <div className="space-y-3 p-5">
            {a.hikeDistribution.map((row) => (
              <Bar key={row.bucket} label={row.bucket} value={row.count} max={hikeMax} />
            ))}
          </div>
        </PerformanceSection>
      </div>

      <PerformanceSection>
        <PerformanceSectionHeader
          eyebrow="Load"
          title="Reviewer load & on-time rate"
          description="Assigned reviews vs. submitted, per reviewer."
        />
        <div className="space-y-3 p-5">
          {a.reviewerLoad.length === 0 ? (
            <p className="text-sm text-mono-muted">No reviewer assignments yet.</p>
          ) : (
            a.reviewerLoad.map((row) => (
              <Bar
                key={row.name}
                label={`${row.name} — ${row.submitted}/${row.assigned} submitted`}
                value={row.assigned}
                max={loadMax}
              />
            ))
          )}
        </div>
      </PerformanceSection>

      {a.arrears.length > 0 && (
        <PerformanceSection>
          <PerformanceSectionHeader eyebrow="Compensation" title="Arrear incidence" description="Late-meeting arrears by status." />
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
            {a.arrears.map((row) => (
              <div key={row.status} className="rounded-xl border border-mono-border bg-mono-card p-3">
                <p className="text-xs text-mono-muted">{row.status.replace(/_/g, " ")}</p>
                <p className="text-lg font-bold text-mono-text">{row.count}</p>
                <p className="text-xs text-mono-muted">₹{Math.round(row.amount).toLocaleString("en-IN")}</p>
              </div>
            ))}
          </div>
        </PerformanceSection>
      )}
    </div>
  );
}
