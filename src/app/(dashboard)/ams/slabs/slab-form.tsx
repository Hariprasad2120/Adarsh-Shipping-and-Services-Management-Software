"use client";

import { useActionState, useState } from "react";
import { createSlabAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SlabForm() {
  const [grade, setGrade] = useState<string>("A+");

  const [state, action, pending] = useActionState(
    async (_prev: any, fd: FormData) => {
      fd.set("grade", grade);
      return createSlabAction(fd);
    },
    null,
  );

  const selectClass = "flex h-11 w-full rounded-xl border border-[#00cec4]/55 bg-surface px-4 py-2.5 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/15 hover:border-[#00cec4]/85 transition";

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label>Label</Label>
        <Input name="label" placeholder="e.g. Grade A+ (Up to 15k)" className="mt-1.5" required />
      </div>
      <div>
        <Label>Grade</Label>
        <div className="mt-1.5">
          <select value={grade} onChange={(e) => setGrade(e.target.value)} className={selectClass}>
            {["A+", "A", "B+", "B", "C+", "C", "D"].map((g) => (
              <option key={g} value={g} className="bg-surface">{g}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Min Rating (0–100)</Label>
          <Input name="minRating" type="number" step="1" min="0" max="100" placeholder="0" className="mt-1.5" required />
        </div>
        <div>
          <Label>Max Rating (0–100)</Label>
          <Input name="maxRating" type="number" step="1" min="0" max="100" placeholder="100" className="mt-1.5" required />
        </div>
      </div>
      <div>
        <Label>Hike %</Label>
        <Input name="hikePercent" type="number" step="0.1" min="0" max="100" placeholder="10" className="mt-1.5" required />
      </div>
      {state && !state.ok && <p className="text-sm font-semibold text-rose-600">{state.error}</p>}
      {state && state.ok && <p className="text-sm font-semibold text-emerald-600">Slab created successfully.</p>}
      <Button type="submit" disabled={pending} className="w-full h-11 text-xs font-semibold rounded-xl bg-[#00cec4] hover:bg-[#00b8af] text-white">
        {pending ? "Saving..." : "Add Slab"}
      </Button>
    </form>
  );
}
