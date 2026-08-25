"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PeopleControlInput } from "@/modules/people/components";
import {
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
} from "@/modules/people/components";
import { savePtSlabAction, deletePtSlabAction } from "@/modules/payroll/statutory-pt-actions";

export type PtSlab = {
  id: string;
  state: string;
  minGross: number;
  maxGross: number | null;
  monthlyAmount: number;
};

export function PtSlabsClient({ slabs }: { slabs: PtSlab[] }) {
  const router = useRouter();
  const [form, setForm] = React.useState({ state: "", minGross: "0", maxGross: "", monthlyAmount: "" });
  const [isSaving, setIsSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const handleAdd = async () => {
    setIsSaving(true);
    try {
      const response = await savePtSlabAction({
        state: form.state,
        minGross: Number(form.minGross) || 0,
        maxGross: form.maxGross.trim() === "" ? null : Number(form.maxGross),
        monthlyAmount: Number(form.monthlyAmount) || 0,
      });
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      toast.success("PT slab added");
      setForm({ state: "", minGross: "0", maxGross: "", monthlyAmount: "" });
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const response = await deletePtSlabAction(id);
      if (!response.ok) toast.error(response.error);
      else {
        toast.success("PT slab removed");
        router.refresh();
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--mnx-muted)]">
        Professional Tax slabs vary by state and change by state government notification — enter your
        organisation&apos;s actual current slabs. Nothing is pre-filled. Matched against each employee&apos;s
        branch state.
      </p>

      {slabs.length === 0 ? (
        <p className="text-sm text-[var(--mnx-muted)]">No PT slabs configured yet.</p>
      ) : (
        <PeopleTable>
          <PeopleTableHeader>
            <PeopleTableRow>
              <PeopleTableHead>State</PeopleTableHead>
              <PeopleTableHead>Min Gross</PeopleTableHead>
              <PeopleTableHead>Max Gross</PeopleTableHead>
              <PeopleTableHead>Monthly PT</PeopleTableHead>
              <PeopleTableHead>Actions</PeopleTableHead>
            </PeopleTableRow>
          </PeopleTableHeader>
          <PeopleTableBody>
            {slabs.map((slab) => (
              <PeopleTableRow key={slab.id}>
                <PeopleTableCell>{slab.state}</PeopleTableCell>
                <PeopleTableCell>₹{slab.minGross.toLocaleString("en-IN")}</PeopleTableCell>
                <PeopleTableCell>{slab.maxGross == null ? "No limit" : `₹${slab.maxGross.toLocaleString("en-IN")}`}</PeopleTableCell>
                <PeopleTableCell>₹{slab.monthlyAmount.toLocaleString("en-IN")}</PeopleTableCell>
                <PeopleTableCell>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={deletingId === slab.id}
                    onClick={() => void handleDelete(slab.id)}
                  >
                    {deletingId === slab.id ? "Removing…" : "Remove"}
                  </Button>
                </PeopleTableCell>
              </PeopleTableRow>
            ))}
          </PeopleTableBody>
        </PeopleTable>
      )}

      <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-4">
        <p className="mb-3 text-sm font-medium text-[var(--mnx-text)]">Add PT slab</p>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--mnx-muted)]">State</span>
            <PeopleControlInput value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--mnx-muted)]">Min Gross (₹)</span>
            <PeopleControlInput type="number" value={form.minGross} onChange={(e) => setForm((f) => ({ ...f, minGross: e.target.value }))} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--mnx-muted)]">Max Gross (₹, blank = no limit)</span>
            <PeopleControlInput type="number" value={form.maxGross} onChange={(e) => setForm((f) => ({ ...f, maxGross: e.target.value }))} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--mnx-muted)]">Monthly PT (₹)</span>
            <PeopleControlInput type="number" value={form.monthlyAmount} onChange={(e) => setForm((f) => ({ ...f, monthlyAmount: e.target.value }))} />
          </label>
        </div>
        <Button type="button" className="mt-3" onClick={() => void handleAdd()} disabled={isSaving || !form.state.trim()}>
          {isSaving ? "Adding…" : "Add Slab"}
        </Button>
      </div>
    </div>
  );
}
