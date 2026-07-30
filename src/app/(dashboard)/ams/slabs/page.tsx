import {
  PerformanceControlButton,
  PerformanceControlInput,
  PerformanceTable,
  PerformanceTableBody,
  PerformanceTableCell,
  PerformanceTableHead,
  PerformanceTableHeader,
  PerformanceTableRow,
} from "@/modules/performance/components/performance-workspace";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SlabForm } from "./slab-form";
import { deleteSlabAction, seedSlabsAction } from "./actions";
import { GRADE_BANDS } from "@/modules/ams/criteria-config";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Layers, Plus, Trash2 } from "lucide-react";

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
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-mono-muted dark:text-mono-muted font-medium">
            Configure recommended appraisal hike percentages based on employee
            performance grades and rating bands.
          </p>
        </div>

        <form action={seedSlabsAction}>
          <Button
            type="submit"
            variant="outline"
            className="h-10 text-xs font-semibold rounded-xl border-mono-border/60 hover:bg-mono-soft text-mono-text"
          >
            Seed Defaults
          </Button>
        </form>
      </div>

      {/* Grade reference bar */}
      <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
        {GRADE_BANDS.map((b) => (
          <div
            key={b.grade}
            className="flex items-center gap-1.5 bg-mono-soft dark:bg-mono-card border border-mono-border/30 rounded-xl px-3 py-1.5 shadow-sm"
          >
            <span
              className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${gradeColors[b.grade] ?? "bg-mono-soft text-mono-muted"}`}
            >
              {b.grade}
            </span>
            <span className="text-mono-muted dark:text-mono-muted">
              {b.label}
            </span>
            <span className="text-mono-muted dark:text-mono-muted">
              {b.minNormalized}–{b.maxNormalized}
            </span>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Slabs list */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-mono-text dark:text-mono-text">
              Active Hike Slabs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {slabs.length === 0 ? (
              <div className="text-center text-mono-muted py-16 text-sm font-medium">
                No increment slabs configured. Click &quot;Seed Defaults&quot;
                to populate standard parameters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <PerformanceTable className="w-full text-sm text-left">
                  <PerformanceTableHeader>
                    <PerformanceTableRow className="border-b border-mono-border bg-mono-soft dark:bg-mono-card text-xs font-bold text-mono-muted dark:text-mono-muted">
                      <PerformanceTableHead className="py-3 px-5 font-semibold">
                        Grade
                      </PerformanceTableHead>
                      <PerformanceTableHead className="px-5 py-3 font-semibold">
                        Label
                      </PerformanceTableHead>
                      <PerformanceTableHead className="px-5 py-3 font-semibold">
                        Rating Band
                      </PerformanceTableHead>
                      <PerformanceTableHead className="px-5 py-3 font-semibold">
                        Hike Percentage
                      </PerformanceTableHead>
                      <PerformanceTableHead className="px-5 py-3 font-semibold text-right">
                        Actions
                      </PerformanceTableHead>
                    </PerformanceTableRow>
                  </PerformanceTableHeader>
                  <PerformanceTableBody className="divide-y divide-outline-variant/60 font-medium text-mono-muted dark:text-mono-text">
                    {slabs.map((slab) => (
                      <PerformanceTableRow
                        key={slab.id}
                        className="hover:bg-mono-soft/30 dark:hover:bg-mono-card transition duration-150"
                      >
                        <PerformanceTableCell className="py-3 px-5">
                          <span
                            className={`font-bold px-2.5 py-0.5 rounded text-[10px] ${gradeColors[slab.grade] ?? "bg-mono-soft text-mono-muted"}`}
                          >
                            {slab.grade}
                          </span>
                        </PerformanceTableCell>
                        <PerformanceTableCell className="px-5 py-3 text-mono-muted dark:text-mono-muted">
                          {slab.label}
                        </PerformanceTableCell>
                        <PerformanceTableCell className="px-5 py-3 text-mono-muted font-semibold">
                          {slab.minRating}–{slab.maxRating}
                        </PerformanceTableCell>
                        <PerformanceTableCell className="px-5 py-3">
                          <span
                            className={`font-bold ${slab.hikePercent > 0 ? "text-[var(--mnx-success)] dark:text-[var(--mnx-success)]" : "text-[var(--mnx-danger)]"}`}
                          >
                            {slab.hikePercent > 0
                              ? `${slab.hikePercent}%`
                              : "Nil"}
                          </span>
                        </PerformanceTableCell>
                        <PerformanceTableCell className="px-5 py-3 text-right">
                          <form
                            action={deleteSlabAction}
                            className="inline-block"
                          >
                            <PerformanceControlInput
                              type="hidden"
                              name="id"
                              value={slab.id}
                            />
                            <PerformanceControlButton
                              type="submit"
                              className="text-[var(--mnx-danger)] hover:text-[var(--mnx-danger)] p-1.5 rounded-lg hover:bg-[var(--mnx-danger-bg)] transition duration-150"
                              title="Delete Slab"
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
          </CardContent>
        </Card>

        {/* Add slab form */}
        <div className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 font-semibold text-mono-text dark:text-mono-text">
                <Plus className="size-4 text-mono-accent" /> Add Custom Slab
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SlabForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
