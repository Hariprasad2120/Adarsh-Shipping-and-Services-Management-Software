"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Modal } from "@/components/ui/modal";
import { WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { PeopleControlInput } from "@/modules/people/components";
import {
  createSalaryTemplateAction,
  deleteSalaryTemplateAction,
  duplicateSalaryTemplateAction,
} from "@/modules/payroll/salary-template-actions";

type SalaryComponentOption = { id: string; name: string; category: string };

type TemplateWithComponents = {
  id: string;
  name: string;
  description: string | null;
  components: { id: string; monthlyAmount: number; salaryComponent: { name: string; category: string } }[];
};

function formatMoney(value: number) {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function SalaryTemplatesClient({
  templates,
  earningComponents,
}: {
  templates: TemplateWithComponents[];
  earningComponents: SalaryComponentOption[];
}) {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [rows, setRows] = React.useState<{ salaryComponentId: string; monthlyAmount: string }[]>([
    { salaryComponentId: earningComponents[0]?.id ?? "", monthlyAmount: "" },
  ]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const monthlyTotal = rows.reduce((sum, row) => sum + (Number(row.monthlyAmount) || 0), 0);

  const resetForm = () => {
    setName("");
    setDescription("");
    setRows([{ salaryComponentId: earningComponents[0]?.id ?? "", monthlyAmount: "" }]);
  };

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      const response = await createSalaryTemplateAction({
        name,
        description,
        components: rows
          .filter((r) => r.salaryComponentId && Number(r.monthlyAmount) > 0)
          .map((r) => ({ salaryComponentId: r.salaryComponentId, monthlyAmount: Number(r.monthlyAmount) })),
      });
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      toast.success("Salary template created");
      setModalOpen(false);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    const response = await duplicateSalaryTemplateAction(id);
    if (!response.ok) toast.error(response.error);
    else toast.success("Template duplicated");
  };

  const handleDelete = async (id: string) => {
    const response = await deleteSalaryTemplateAction(id);
    if (!response.ok) toast.error(response.error);
  };

  if (templates.length === 0) {
    return (
      <WorkspacePanel className="space-y-4 p-8 text-center">
        <p className="text-sm font-medium text-[var(--mnx-text)]">
          You haven&apos;t created any salary templates yet.
        </p>
        <p className="text-sm text-[var(--mnx-muted)]">
          Create salary templates for commonly used salary structures and assign them to employees.
        </p>
        <div>
          <Button type="button" onClick={() => setModalOpen(true)} disabled={earningComponents.length === 0}>
            Create Salary Template
          </Button>
          {earningComponents.length === 0 ? (
            <p className="mt-2 text-xs text-[var(--mnx-muted)]">
              Add earning components under Salary Components first.
            </p>
          ) : null}
        </div>
        <div className="grid gap-4 pt-4 text-left sm:grid-cols-3">
          <div>
            <strong className="block text-sm text-[var(--mnx-text)]">Design</strong>
            <p className="text-xs text-[var(--mnx-muted)]">Design multiple salary structures for each designation.</p>
          </div>
          <div>
            <strong className="block text-sm text-[var(--mnx-text)]">Duplicate</strong>
            <p className="text-xs text-[var(--mnx-muted)]">Clone a template and modify it to create a new template.</p>
          </div>
          <div>
            <strong className="block text-sm text-[var(--mnx-text)]">Save Time</strong>
            <p className="text-xs text-[var(--mnx-muted)]">Associate predefined salary templates to complete employee profiles quickly.</p>
          </div>
        </div>
        {renderModal()}
      </WorkspacePanel>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setModalOpen(true)} disabled={earningComponents.length === 0}>
          Create Salary Template
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((template) => {
          const monthly = template.components.reduce((sum, c) => sum + c.monthlyAmount, 0);
          return (
            <WorkspacePanel key={template.id} className="space-y-3 p-5">
              <WorkspaceSectionHeading
                index=" "
                title={template.name}
                description={template.description || undefined}
              />
              <ul className="space-y-1 text-sm text-[var(--mnx-muted)]">
                {template.components.map((c) => (
                  <li key={c.id} className="flex justify-between">
                    <span>{c.salaryComponent.name}</span>
                    <span>{formatMoney(c.monthlyAmount)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between border-t border-[var(--mnx-border)] pt-2 text-sm font-semibold text-[var(--mnx-text)]">
                <span>Monthly CTC</span>
                <span>{formatMoney(monthly)}</span>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="inverse" size="sm" onClick={() => void handleDuplicate(template.id)}>
                  Duplicate
                </Button>
                <Button type="button" variant="destructive" size="sm" onClick={() => void handleDelete(template.id)}>
                  Delete
                </Button>
              </div>
            </WorkspacePanel>
          );
        })}
      </div>
      {renderModal()}
    </div>
  );

  function renderModal() {
    return (
      <Modal open={modalOpen} title="Create Salary Template" onClose={() => setModalOpen(false)}>
        <div className="space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-[var(--mnx-text)]">Template name</span>
            <PeopleControlInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Standard - Executive" />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-[var(--mnx-text)]">Description</span>
            <PeopleControlInput value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
          </label>
          <div className="space-y-2">
            <span className="text-sm font-medium text-[var(--mnx-text)]">Earnings</span>
            {rows.map((row, index) => (
              <div key={index} className="flex items-center gap-2">
                <NativeSelect
                  value={row.salaryComponentId}
                  onChange={(e) => {
                    const next = [...rows];
                    next[index]!.salaryComponentId = e.target.value;
                    setRows(next);
                  }}
                  className="flex-1"
                >
                  {earningComponents.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </NativeSelect>
                <PeopleControlInput
                  type="number"
                  value={row.monthlyAmount}
                  onChange={(e) => {
                    const next = [...rows];
                    next[index]!.monthlyAmount = e.target.value;
                    setRows(next);
                  }}
                  placeholder="Monthly amount"
                  className="w-40"
                />
                <Button
                  type="button"
                  variant="inverse"
                  size="sm"
                  onClick={() => setRows(rows.filter((_, i) => i !== index))}
                  disabled={rows.length === 1}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="inverse"
              size="sm"
              onClick={() => setRows([...rows, { salaryComponentId: earningComponents[0]?.id ?? "", monthlyAmount: "" }])}
            >
              Add component
            </Button>
          </div>
          <div className="flex justify-between border-t border-[var(--mnx-border)] pt-3 text-sm font-semibold text-[var(--mnx-text)]">
            <span>Monthly CTC</span>
            <span>{formatMoney(monthlyTotal)} ({formatMoney(monthlyTotal * 12)} / year)</span>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="inverse" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleCreate()} disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }
}
