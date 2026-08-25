"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { PeopleControlInput } from "@/modules/people/components";
import { updatePayrollEmployeePersonalDetailsAction } from "@/modules/payroll/employee-personal-statutory-actions";

// Zoho reference page 00138: standard disability categories under the
// Rights of Persons with Disabilities Act, 2016 — the same list Zoho
// Payroll's "Differently Abled Type" dropdown offers.
const DIFFERENTLY_ABLED_TYPES = [
  "Blindness",
  "Low Vision",
  "Leprosy Cured Persons",
  "Hearing Impairment",
  "Locomotor Disability",
  "Dwarfism",
  "Intellectual Disability",
  "Mental Illness",
  "Autism Spectrum Disorder",
  "Cerebral Palsy",
  "Muscular Dystrophy",
  "Chronic Neurological Conditions",
  "Specific Learning Disabilities",
  "Multiple Sclerosis",
  "Speech and Language Disability",
  "Thalassemia",
  "Hemophilia",
  "Sickle Cell Disease",
  "Multiple Disabilities",
  "Acid Attack Victim",
  "Parkinson's Disease",
];

export type PersonalDetailsFormInitial = {
  employeeId: string;
  dob: string | null;
  pan: string | null;
  fatherName: string;
  differentlyAbledType: string;
  personalEmail: string;
  presentAddress: string;
  presentStateCode: string;
};

export function EditPersonalDetailsForm({ initial }: { initial: PersonalDetailsFormInitial }) {
  const router = useRouter();
  const [form, setForm] = React.useState({
    fatherName: initial.fatherName,
    differentlyAbledType: initial.differentlyAbledType,
    personalEmail: initial.personalEmail,
    presentAddress: initial.presentAddress,
    presentStateCode: initial.presentStateCode,
  });
  const [isSaving, setIsSaving] = React.useState(false);

  const backHref = `/payroll/employees/${initial.employeeId}`;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await updatePayrollEmployeePersonalDetailsAction({
        employeeId: initial.employeeId,
        ...form,
      });
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      toast.success("Personal details saved");
      router.push(backHref);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-[var(--mnx-text)]">Date of Birth</span>
          <PeopleControlInput value={initial.dob ?? ""} disabled placeholder="dd/mm/yyyy" />
          <span className="text-xs text-[var(--mnx-muted)]">
            Synced from the HRMS employee profile — edit there to change it.
          </span>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-[var(--mnx-text)]">PAN</span>
          <PeopleControlInput value={initial.pan ?? ""} disabled placeholder="AAAAA0000A" />
          <span className="text-xs text-[var(--mnx-muted)]">
            Synced from the HRMS employee profile — edit there to change it.
          </span>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-[var(--mnx-text)]">Father&apos;s Name *</span>
          <PeopleControlInput
            value={form.fatherName}
            onChange={(e) => setForm((f) => ({ ...f, fatherName: e.target.value }))}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-[var(--mnx-text)]">Differently Abled Type</span>
          <NativeSelect
            value={form.differentlyAbledType}
            onChange={(e) => setForm((f) => ({ ...f, differentlyAbledType: e.target.value }))}
          >
            <option value="">None</option>
            {DIFFERENTLY_ABLED_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </NativeSelect>
        </label>
      </div>

      <label className="block space-y-1 text-sm">
        <span className="font-medium text-[var(--mnx-text)]">Personal Email Address</span>
        <PeopleControlInput
          type="email"
          value={form.personalEmail}
          onChange={(e) => setForm((f) => ({ ...f, personalEmail: e.target.value }))}
          placeholder="abc@xyz.com"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block space-y-1 text-sm sm:col-span-2">
          <span className="font-medium text-[var(--mnx-text)]">Residential Address</span>
          <PeopleControlInput
            value={form.presentAddress}
            onChange={(e) => setForm((f) => ({ ...f, presentAddress: e.target.value }))}
            placeholder="Address line"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-[var(--mnx-text)]">State</span>
          <PeopleControlInput
            value={form.presentStateCode}
            onChange={(e) => setForm((f) => ({ ...f, presentStateCode: e.target.value }))}
          />
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="inverse" onClick={() => router.push(backHref)}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving || !form.fatherName.trim()}
        >
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
