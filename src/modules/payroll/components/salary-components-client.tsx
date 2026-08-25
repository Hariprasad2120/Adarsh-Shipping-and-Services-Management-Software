"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Modal } from "@/components/ui/modal";
import { WorkspaceBadge } from "@/components/layout/workspace";
import {
  PeopleControlInput,
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
} from "@/modules/people/components";
import {
  createSalaryComponentAction,
  seedStandardSalaryComponentsAction,
  toggleSalaryComponentActiveAction,
  type CalculationType,
  type SalaryComponentCategory,
} from "@/modules/payroll/salary-component-actions";

type SalaryComponent = {
  id: string;
  category: string;
  name: string;
  componentType: string;
  calculationType: string;
  considerForEpf: boolean;
  considerForEsi: boolean;
  active: boolean;
};

const CATEGORIES: { value: SalaryComponentCategory; label: string }[] = [
  { value: "EARNING", label: "Earnings" },
  { value: "DEDUCTION", label: "Deductions" },
  { value: "BENEFIT", label: "Benefits" },
  { value: "REIMBURSEMENT", label: "Reimbursements" },
];

const CALCULATION_LABELS: Record<string, string> = {
  FIXED_FLAT: "Fixed; Flat Amount",
  FIXED_PERCENT: "Fixed; % of Basic",
  VARIABLE_FLAT: "Variable; Flat Amount",
  VARIABLE_PERCENT: "Variable; % of Basic",
};

export function SalaryComponentsClient({ components }: { components: SalaryComponent[] }) {
  const [activeCategory, setActiveCategory] = React.useState<SalaryComponentCategory>("EARNING");
  const [modalOpen, setModalOpen] = React.useState(false);
  const [isSeeding, setIsSeeding] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    componentType: "",
    calculationType: "FIXED_FLAT" as CalculationType,
    considerForEpf: false,
    considerForEsi: false,
    includeInCtc: true,
    taxable: true,
    fbpEligible: false,
  });

  const visible = components.filter((c) => c.category === activeCategory);

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      const response = await seedStandardSalaryComponentsAction();
      if (!response.ok) toast.error(response.error);
      else toast.success("Standard components loaded");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    const response = await toggleSalaryComponentActiveAction(id, active);
    if (!response.ok) toast.error(response.error);
  };

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      const response = await createSalaryComponentAction({ category: activeCategory, ...form });
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      toast.success("Component added");
      setModalOpen(false);
      setForm({ name: "", componentType: "", calculationType: "FIXED_FLAT", considerForEpf: false, considerForEsi: false, includeInCtc: true, taxable: true, fbpEligible: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Salary component categories" className="flex flex-wrap gap-1 rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-1">
          {CATEGORIES.map((category) => (
            // eslint-disable-next-line no-restricted-syntax -- custom segmented-tab control, not a standard action button
            <button
              key={category.value}
              type="button"
              onClick={() => setActiveCategory(category.value)}
              className={
                activeCategory === category.value
                  ? "rounded-[var(--mn-radius-control)] bg-[var(--mnx-surface)] px-3 py-1.5 text-sm font-medium text-[var(--mnx-accent-strong)] shadow-sm"
                  : "rounded-[var(--mn-radius-control)] px-3 py-1.5 text-sm font-medium text-[var(--mnx-muted)] hover:text-[var(--mnx-text)]"
              }
            >
              {category.label}
            </button>
          ))}
        </nav>
        <div className="flex gap-2">
          {components.length === 0 ? (
            <Button type="button" variant="inverse" onClick={() => void handleSeed()} disabled={isSeeding}>
              {isSeeding ? "Loading…" : "Load standard components"}
            </Button>
          ) : null}
          <Button type="button" onClick={() => setModalOpen(true)}>
            Add Component
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-[var(--mnx-muted)]">
          No {CATEGORIES.find((c) => c.value === activeCategory)?.label.toLowerCase()} configured yet.
        </p>
      ) : (
        <PeopleTable>
          <PeopleTableHeader>
            <PeopleTableRow>
              <PeopleTableHead>Name</PeopleTableHead>
              <PeopleTableHead>Type</PeopleTableHead>
              <PeopleTableHead>Calculation Type</PeopleTableHead>
              <PeopleTableHead>Consider for EPF</PeopleTableHead>
              <PeopleTableHead>Consider for ESI</PeopleTableHead>
              <PeopleTableHead>Status</PeopleTableHead>
            </PeopleTableRow>
          </PeopleTableHeader>
          <PeopleTableBody>
            {visible.map((component) => (
              <PeopleTableRow key={component.id}>
                <PeopleTableCell>{component.name}</PeopleTableCell>
                <PeopleTableCell>{component.componentType}</PeopleTableCell>
                <PeopleTableCell>{CALCULATION_LABELS[component.calculationType] ?? component.calculationType}</PeopleTableCell>
                <PeopleTableCell>{component.considerForEpf ? "Yes" : "No"}</PeopleTableCell>
                <PeopleTableCell>{component.considerForEsi ? "Yes" : "No"}</PeopleTableCell>
                <PeopleTableCell>
                  {/* eslint-disable-next-line no-restricted-syntax -- badge-shaped toggle, not a standard action button */}
                  <button
                    type="button"
                    onClick={() => void handleToggle(component.id, !component.active)}
                  >
                    <WorkspaceBadge variant={component.active ? "success" : "neutral"}>
                      {component.active ? "Active" : "Inactive"}
                    </WorkspaceBadge>
                  </button>
                </PeopleTableCell>
              </PeopleTableRow>
            ))}
          </PeopleTableBody>
        </PeopleTable>
      )}

      <Modal
        open={modalOpen}
        title={`Add ${CATEGORIES.find((c) => c.value === activeCategory)?.label.slice(0, -1)} Component`}
        onClose={() => setModalOpen(false)}
      >
        <div className="space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-[var(--mnx-text)]">Name</span>
            <PeopleControlInput
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Special Allowance"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-[var(--mnx-text)]">Component type</span>
            <PeopleControlInput
              value={form.componentType}
              onChange={(e) => setForm((f) => ({ ...f, componentType: e.target.value }))}
              placeholder="e.g. Custom Allowance"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-[var(--mnx-text)]">Calculation type</span>
            <NativeSelect
              value={form.calculationType}
              onChange={(e) => setForm((f) => ({ ...f, calculationType: e.target.value as CalculationType }))}
            >
              {Object.entries(CALCULATION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </NativeSelect>
          </label>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="flex items-center gap-2">
              {/* eslint-disable-next-line no-restricted-syntax -- boolean toggle, not a text field */}
              <input
                type="checkbox"
                checked={form.considerForEpf}
                onChange={(e) => setForm((f) => ({ ...f, considerForEpf: e.target.checked }))}
              />
              Consider for EPF
            </label>
            <label className="flex items-center gap-2">
              {/* eslint-disable-next-line no-restricted-syntax -- boolean toggle, not a text field */}
              <input
                type="checkbox"
                checked={form.considerForEsi}
                onChange={(e) => setForm((f) => ({ ...f, considerForEsi: e.target.checked }))}
              />
              Consider for ESI
            </label>
            <label className="flex items-center gap-2">
              {/* eslint-disable-next-line no-restricted-syntax -- boolean toggle, not a text field */}
              <input
                type="checkbox"
                checked={form.includeInCtc}
                onChange={(e) => setForm((f) => ({ ...f, includeInCtc: e.target.checked }))}
              />
              Include in CTC
            </label>
            <label className="flex items-center gap-2">
              {/* eslint-disable-next-line no-restricted-syntax -- boolean toggle, not a text field */}
              <input
                type="checkbox"
                checked={form.taxable}
                onChange={(e) => setForm((f) => ({ ...f, taxable: e.target.checked }))}
              />
              Taxable
            </label>
            {activeCategory === "REIMBURSEMENT" ? (
              <label className="flex items-center gap-2">
                {/* eslint-disable-next-line no-restricted-syntax -- boolean toggle, not a text field */}
                <input
                  type="checkbox"
                  checked={form.fbpEligible}
                  onChange={(e) => setForm((f) => ({ ...f, fbpEligible: e.target.checked }))}
                />
                FBP component
              </label>
            ) : null}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="inverse" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleCreate()} disabled={isSubmitting || !form.name.trim()}>
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
