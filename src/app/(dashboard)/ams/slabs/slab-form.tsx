"use client";

import { NativeSelect } from "@/components/monolith/native-select";
import { useActionState, useState } from "react";
import { createSlabAction } from "./actions";
import { Button } from "@/components/monolith/button";
import { Input } from "@/components/monolith/input";
import { Label } from "@/components/monolith/label";

export function SlabForm() {
  const [grade, setGrade] = useState<string>("A+");

  const [state, action, pending] = useActionState(
    async (_prev: any, fd: FormData) => {
      fd.set("grade", grade);
      return createSlabAction(fd);
    },
    null,
  );

  const selectClass = "flex h-11 w-full rounded-xl border border-[#F9D972]/55 bg-mono-card px-4 py-2.5 text-mono-text focus:outline-none focus:ring-2 focus:ring-primary/15 hover:border-[#F9D972]/85 transition";

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label>Label</Label>
        <Input name="label" placeholder="e.g. Grade A+ (Up to 15k)" className="mt-1.5" required />
      </div>
      <div>
        <Label>Grade</Label>
        <div className="mt-1.5">
          <NativeSelect value={grade} onChange={(e) => setGrade(e.target.value)} className={selectClass}>
            {["A+", "A", "B+", "B", "C+", "C", "D"].map((g) => (
              <option key={g} value={g} className="bg-mono-card">{g}</option>
            ))}
          </NativeSelect>
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
      <Button type="submit" disabled={pending} className="w-full h-11 text-xs font-semibold rounded-xl bg-[#F9D972] hover:bg-[#E8C85D] text-white">
        {pending ? "Saving..." : "Add Slab"}
      </Button>
    </form>
  );
}
