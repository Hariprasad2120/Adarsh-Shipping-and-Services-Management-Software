"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PeopleControlInput } from "@/modules/people/components";
import { updatePayrollEmployeeStatutoryDetailsAction } from "@/modules/payroll/employee-personal-statutory-actions";

export type StatutoryDetailsFormInitial = {
  employeeId: string;
  pfAccountNumber: string;
  uan: string;
  contributeToEps: boolean;
  esiInsuranceNumber: string;
  professionalTaxOptIn: boolean;
};

export function EditStatutoryDetailsForm({ initial }: { initial: StatutoryDetailsFormInitial }) {
  const router = useRouter();
  const [form, setForm] = React.useState({
    pfAccountNumber: initial.pfAccountNumber,
    uan: initial.uan,
    contributeToEps: initial.contributeToEps,
    esiInsuranceNumber: initial.esiInsuranceNumber,
    professionalTaxOptIn: initial.professionalTaxOptIn,
  });
  const [isSaving, setIsSaving] = React.useState(false);

  const backHref = `/payroll/employees/${initial.employeeId}`;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await updatePayrollEmployeeStatutoryDetailsAction({
        employeeId: initial.employeeId,
        ...form,
      });
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      toast.success("Statutory details saved");
      router.push(backHref);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-[var(--mnx-text)]">
          Employees&apos; Provident Fund
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-[var(--mnx-text)]">PF Account Number</span>
            <PeopleControlInput
              value={form.pfAccountNumber}
              onChange={(e) => setForm((f) => ({ ...f, pfAccountNumber: e.target.value }))}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-[var(--mnx-text)]">UAN</span>
            <PeopleControlInput
              value={form.uan}
              onChange={(e) => setForm((f) => ({ ...f, uan: e.target.value }))}
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <PeopleControlInput
            type="checkbox"
            checked={form.contributeToEps}
            onChange={(e) => setForm((f) => ({ ...f, contributeToEps: e.target.checked }))}
          />
          <span className="text-[var(--mnx-text)]">Contribute to Employee Pension Scheme</span>
        </label>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-[var(--mnx-text)]">
          Employees&apos; State Insurance
        </legend>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-[var(--mnx-text)]">ESI Insurance Number</span>
          <PeopleControlInput
            value={form.esiInsuranceNumber}
            onChange={(e) => setForm((f) => ({ ...f, esiInsuranceNumber: e.target.value }))}
          />
          <span className="text-xs text-[var(--mnx-muted)]">
            Note: ESI deductions will be made only if the employee&apos;s monthly salary is less
            than or equal to ₹21,000.
          </span>
        </label>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-[var(--mnx-text)]">Professional Tax</legend>
        <label className="flex items-center gap-2 text-sm">
          <PeopleControlInput
            type="checkbox"
            checked={form.professionalTaxOptIn}
            onChange={(e) => setForm((f) => ({ ...f, professionalTaxOptIn: e.target.checked }))}
          />
          <span className="text-[var(--mnx-text)]">Deduct Professional Tax for this employee</span>
        </label>
      </fieldset>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="inverse" onClick={() => router.push(backHref)}>
          Cancel
        </Button>
        <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
