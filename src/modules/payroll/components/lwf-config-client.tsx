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
import { saveLwfConfigAction, deleteLwfConfigAction } from "@/modules/payroll/statutory-lwf-actions";

export type LwfConfigRow = {
  id: string;
  state: string;
  enabled: boolean;
  employeeAmount: number;
  employerAmount: number;
};

export function LwfConfigClient({ configs }: { configs: LwfConfigRow[] }) {
  const router = useRouter();
  const [form, setForm] = React.useState({ state: "", employeeAmount: "", employerAmount: "" });
  const [isSaving, setIsSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const handleAdd = async () => {
    setIsSaving(true);
    try {
      const response = await saveLwfConfigAction({
        state: form.state,
        enabled: true,
        employeeAmount: Number(form.employeeAmount) || 0,
        employerAmount: Number(form.employerAmount) || 0,
      });
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      toast.success("LWF configuration saved");
      setForm({ state: "", employeeAmount: "", employerAmount: "" });
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const response = await deleteLwfConfigAction(id);
      if (!response.ok) toast.error(response.error);
      else {
        toast.success("LWF configuration removed");
        router.refresh();
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--mnx-muted)]">
        LWF is a flat contribution that varies by state and, in some states, is deducted only in specific
        months (e.g. half-yearly). This engine applies it every month it&apos;s configured — enter your state&apos;s
        correct pro-rated monthly equivalent if your state uses a non-monthly cycle. Matched against each
        employee&apos;s branch state.
      </p>

      {configs.length === 0 ? (
        <p className="text-sm text-[var(--mnx-muted)]">No LWF configuration yet.</p>
      ) : (
        <PeopleTable>
          <PeopleTableHeader>
            <PeopleTableRow>
              <PeopleTableHead>State</PeopleTableHead>
              <PeopleTableHead>Employee (₹/mo)</PeopleTableHead>
              <PeopleTableHead>Employer (₹/mo)</PeopleTableHead>
              <PeopleTableHead>Actions</PeopleTableHead>
            </PeopleTableRow>
          </PeopleTableHeader>
          <PeopleTableBody>
            {configs.map((config) => (
              <PeopleTableRow key={config.id}>
                <PeopleTableCell>{config.state}</PeopleTableCell>
                <PeopleTableCell>₹{config.employeeAmount.toLocaleString("en-IN")}</PeopleTableCell>
                <PeopleTableCell>₹{config.employerAmount.toLocaleString("en-IN")}</PeopleTableCell>
                <PeopleTableCell>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={deletingId === config.id}
                    onClick={() => void handleDelete(config.id)}
                  >
                    {deletingId === config.id ? "Removing…" : "Remove"}
                  </Button>
                </PeopleTableCell>
              </PeopleTableRow>
            ))}
          </PeopleTableBody>
        </PeopleTable>
      )}

      <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-4">
        <p className="mb-3 text-sm font-medium text-[var(--mnx-text)]">Add / update state</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--mnx-muted)]">State</span>
            <PeopleControlInput value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--mnx-muted)]">Employee amount (₹)</span>
            <PeopleControlInput type="number" value={form.employeeAmount} onChange={(e) => setForm((f) => ({ ...f, employeeAmount: e.target.value }))} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--mnx-muted)]">Employer amount (₹)</span>
            <PeopleControlInput type="number" value={form.employerAmount} onChange={(e) => setForm((f) => ({ ...f, employerAmount: e.target.value }))} />
          </label>
        </div>
        <Button type="button" className="mt-3" onClick={() => void handleAdd()} disabled={isSaving || !form.state.trim()}>
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
