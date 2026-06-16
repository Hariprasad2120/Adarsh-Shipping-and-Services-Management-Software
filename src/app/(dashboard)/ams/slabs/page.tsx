import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SlabForm } from "./slab-form";
import { deleteSlabAction, seedSlabsAction } from "./actions";
import { GRADE_BANDS } from "@/modules/ams/criteria-config";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Layers, Plus, Trash2 } from "lucide-react";

const gradeColors: Record<string, string> = {
  "A+": "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  "A":  "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  "B+": "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  "B":  "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  "C+": "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300",
  "C":  "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  "D":  "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
};

export const metadata = {
  title: "Increment Slabs | AMS | Adarsh Shipping",
};

export default async function SlabsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  await requirePermission(session.user.id, "ams.cycle.manage");

  const slabs = await db.incrementSlab.findMany({
    orderBy: [
      { grade: "asc" },
      { minRating: "desc" },
      { hikePercent: "desc" }
    ],
  });

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Configure recommended appraisal hike percentages based on employee performance grades and rating bands.
          </p>
        </div>

        <form action={seedSlabsAction}>
          <Button type="submit" variant="outline" className="h-10 text-xs font-semibold rounded-xl border-outline-variant/60 hover:bg-surface-container-low text-on-surface">
            Seed Defaults
          </Button>
        </form>
      </div>

      {/* Grade reference bar */}
      <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
        {GRADE_BANDS.map((b) => (
          <div key={b.grade} className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/40 border border-outline-variant/30 rounded-xl px-3 py-1.5 shadow-sm">
            <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${gradeColors[b.grade] ?? "bg-slate-100 text-slate-600"}`}>
              {b.grade}
            </span>
            <span className="text-slate-500 dark:text-slate-400">{b.label}</span>
            <span className="text-slate-400 dark:text-slate-500">{b.minNormalized}–{b.maxNormalized}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Slabs list */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200">
              Active Hike Slabs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {slabs.length === 0 ? (
              <div className="text-center text-slate-400/80 py-16 text-sm font-medium">
                No increment slabs configured. Click &quot;Seed Defaults&quot; to populate standard parameters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-outline-variant bg-slate-50 dark:bg-slate-800/30 text-xs font-bold text-slate-500 dark:text-slate-400">
                      <th className="py-3 px-5 font-semibold">Grade</th>
                      <th className="px-5 py-3 font-semibold">Label</th>
                      <th className="px-5 py-3 font-semibold">Rating Band</th>
                      <th className="px-5 py-3 font-semibold">Hike Percentage</th>
                      <th className="px-5 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/60 font-medium text-slate-700 dark:text-slate-300">
                    {slabs.map((slab) => (
                      <tr key={slab.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/5 transition duration-150">
                        <td className="py-3 px-5">
                          <span className={`font-bold px-2.5 py-0.5 rounded text-[10px] ${gradeColors[slab.grade] ?? "bg-slate-100 text-slate-600"}`}>
                            {slab.grade}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                          {slab.label}
                        </td>
                        <td className="px-5 py-3 text-slate-500 font-semibold">
                          {slab.minRating}–{slab.maxRating}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`font-bold ${slab.hikePercent > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                            {slab.hikePercent > 0 ? `${slab.hikePercent}%` : "Nil"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <form action={deleteSlabAction} className="inline-block">
                            <input type="hidden" name="id" value={slab.id} />
                            <button type="submit" className="text-rose-600 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50/50 transition duration-150" title="Delete Slab">
                              <Trash2 className="size-4" />
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add slab form */}
        <div className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                <Plus className="size-4 text-[#00cec4]" /> Add Custom Slab
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
