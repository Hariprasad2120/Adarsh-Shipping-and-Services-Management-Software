import {
  PerformanceControlButton,
  PerformanceControlInput,
  PerformanceSection,
  PerformanceSectionHeader,
  PerformanceTable,
  PerformanceTableBody,
  PerformanceTableCell,
  PerformanceTableHead,
  PerformanceTableHeader,
  PerformanceTableRow,
} from "@/modules/performance/components/performance-workspace";
import { WorkspaceBadge } from "@/components/layout/workspace";
import { SlabForm } from "./slab-form";
import { deleteSlabAction, seedSlabsAction } from "./actions";
import { GRADE_BANDS } from "@/modules/ams/criteria-config";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

const gradeColors: Record<string, string> = {
  "A+": "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)] dark:bg-[var(--mnx-success-bg)] dark:text-[var(--mnx-success)]",
  A: "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)] dark:bg-[var(--mnx-success-bg)] dark:text-[var(--mnx-success)]",
  "B+": "bg-mono-accent/10 text-mono-accent dark:bg-mono-accent/40 dark:text-mono-accent",
  B: "bg-mono-accent/10 text-mono-accent dark:bg-mono-accent/40 dark:text-mono-accent",
  "C+": "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)] dark:bg-[var(--mnx-warning-bg)] dark:text-[var(--mnx-warning)]",
  C: "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)] dark:bg-[var(--mnx-warning-bg)] dark:text-[var(--mnx-warning)]",
  D: "bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)] dark:bg-[var(--mnx-danger-bg)] dark:text-[var(--mnx-danger)]",
};

export const metadata = {
  title: "Increment Slabs | AMS | Adarsh Shipping",
};

export default async function SlabsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  await requirePermission(session.user.id, "ams.cycle.manage");

  const slabs = await db.incrementSlab.findMany({
    orderBy: [{ grade: "asc" }, { minRating: "desc" }, { hikePercent: "desc" }],
  });

  return (
    <div className="space-y-6">
      <PerformanceSection>
        <PerformanceSectionHeader
          eyebrow="Performance compensation"
          title="Increment slabs"
          description="Configure recommended appraisal hike percentages by performance grade and rating band."
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <WorkspaceBadge variant="accent">
                {slabs.length} configured
              </WorkspaceBadge>
              <form action={seedSlabsAction}>
                <PerformanceControlButton type="submit">
                  Seed defaults
                </PerformanceControlButton>
              </form>
            </div>
          }
        />

        <div className="flex flex-wrap gap-2 px-5 pb-5 text-[11px] font-semibold">
          {GRADE_BANDS.map((band) => (
            <div
              key={band.grade}
              className="flex items-center gap-1.5 rounded-xl border border-mono-border/30 bg-mono-soft px-3 py-1.5"
            >
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${gradeColors[band.grade] ?? "bg-mono-soft text-mono-muted"}`}
              >
                {band.grade}
              </span>
              <span className="text-mono-muted">{band.label}</span>
              <span className="text-mono-muted">
                {band.minNormalized}-{band.maxNormalized}
              </span>
            </div>
          ))}
        </div>
      </PerformanceSection>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <PerformanceSection>
          <PerformanceSectionHeader
            eyebrow="Active configuration"
            title="Hike slabs"
            description="Review current mappings between rating ranges and recommended hike percentages."
          />

          <div className="px-5 pb-5">
            {slabs.length === 0 ? (
              <div className="mnx-empty-state">
                No increment slabs configured. Click &quot;Seed Defaults&quot;
                to populate standard parameters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <PerformanceTable className="w-full text-left text-sm">
                  <PerformanceTableHeader>
                    <PerformanceTableRow className="border-b border-mono-border bg-mono-soft text-xs font-bold text-mono-muted dark:bg-mono-card dark:text-mono-muted">
                      <PerformanceTableHead className="px-5 py-3 font-semibold">
                        Grade
                      </PerformanceTableHead>
                      <PerformanceTableHead className="px-5 py-3 font-semibold">
                        Label
                      </PerformanceTableHead>
                      <PerformanceTableHead className="px-5 py-3 font-semibold">
                        Rating band
                      </PerformanceTableHead>
                      <PerformanceTableHead className="px-5 py-3 font-semibold">
                        Hike percentage
                      </PerformanceTableHead>
                      <PerformanceTableHead className="px-5 py-3 text-right font-semibold">
                        Actions
                      </PerformanceTableHead>
                    </PerformanceTableRow>
                  </PerformanceTableHeader>
                  <PerformanceTableBody className="divide-y divide-outline-variant/60 font-medium text-mono-muted dark:text-mono-text">
                    {slabs.map((slab) => (
                      <PerformanceTableRow
                        key={slab.id}
                        className="transition duration-150 hover:bg-mono-soft/30 dark:hover:bg-mono-card"
                      >
                        <PerformanceTableCell className="px-5 py-3">
                          <span
                            className={`rounded px-2.5 py-0.5 text-[10px] font-bold ${gradeColors[slab.grade] ?? "bg-mono-soft text-mono-muted"}`}
                          >
                            {slab.grade}
                          </span>
                        </PerformanceTableCell>
                        <PerformanceTableCell className="px-5 py-3 text-mono-muted dark:text-mono-muted">
                          {slab.label}
                        </PerformanceTableCell>
                        <PerformanceTableCell className="px-5 py-3 font-semibold text-mono-muted">
                          {slab.minRating}-{slab.maxRating}
                        </PerformanceTableCell>
                        <PerformanceTableCell className="px-5 py-3">
                          <span
                            className={`font-bold ${slab.hikePercent > 0 ? "text-[var(--mnx-success)] dark:text-[var(--mnx-success)]" : "text-[var(--mnx-danger)]"}`}
                          >
                            {slab.hikePercent > 0 ? `${slab.hikePercent}%` : "Nil"}
                          </span>
                        </PerformanceTableCell>
                        <PerformanceTableCell className="px-5 py-3 text-right">
                          <form action={deleteSlabAction} className="inline-block">
                            <PerformanceControlInput
                              type="hidden"
                              name="id"
                              value={slab.id}
                            />
                            <PerformanceControlButton
                              type="submit"
                              className="rounded-lg p-1.5 text-[var(--mnx-danger)] transition duration-150 hover:bg-[var(--mnx-danger-bg)] hover:text-[var(--mnx-danger)]"
                              title="Delete slab"
                            >
                              <Trash2 className="size-4" />
                            </PerformanceControlButton>
                          </form>
                        </PerformanceTableCell>
                      </PerformanceTableRow>
                    ))}
                  </PerformanceTableBody>
                </PerformanceTable>
              </div>
            )}
          </div>
        </PerformanceSection>

        <PerformanceSection>
          <PerformanceSectionHeader
            eyebrow="Custom configuration"
            title="Add slab"
            description="Create a new grade band recommendation when the default slabs do not match policy."
            actions={<Plus className="size-4 text-mono-accent" aria-hidden="true" />}
          />

          <div className="px-5 pb-5">
            <div className="rounded-[var(--mn-radius-panel)] border border-mono-border/35 bg-mono-card p-4">
              <SlabForm />
            </div>
          </div>
        </PerformanceSection>
      </div>
    </div>
  );
}
