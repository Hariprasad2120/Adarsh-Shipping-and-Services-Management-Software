"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Input } from "@/components/ui/input";
import { PeopleControlButton as MnxAction } from "@/modules/people/components";

type FieldType =
  | "TEXT"
  | "TEXTAREA"
  | "NUMBER"
  | "DATE"
  | "SELECT"
  | "BOOLEAN";

type EmployeeField = {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  section: string;
  required: boolean;
  options: unknown;
  position: number;
  active: boolean;
};

type FieldForm = {
  label: string;
  type: FieldType;
  section: string;
  required: boolean;
  options: string;
  position: string;
  active: boolean;
};

const emptyForm: FieldForm = {
  label: "",
  type: "TEXT",
  section: "Custom Details",
  required: false,
  options: "",
  position: "0",
  active: true,
};

export function EmployeeProfileFields() {
  const [fields, setFields] = useState<EmployeeField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FieldForm>(emptyForm);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/hrms/settings/employee-fields");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to load fields");
      setFields(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load fields");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/hrms/settings/employee-fields")
      .then(async (response) => ({
        response,
        result: await response.json(),
      }))
      .then(({ response, result }) => {
        if (!active) return;
        if (!response.ok)
          throw new Error(result.error ?? "Unable to load fields");
        setFields(result);
      })
      .catch((error: unknown) => {
        if (active) {
          toast.error(
            error instanceof Error ? error.message : "Unable to load fields",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function edit(field: EmployeeField) {
    setEditingId(field.id);
    setForm({
      label: field.label,
      type: field.type,
      section: field.section,
      required: field.required,
      options: Array.isArray(field.options) ? field.options.join(", ") : "",
      position: String(field.position),
      active: field.active,
    });
  }

  function reset() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function save() {
    if (!form.label.trim() || !form.section.trim()) {
      toast.error("Field label and section are required.");
      return;
    }
    const options = form.options
      .split(",")
      .map((option) => option.trim())
      .filter(Boolean);
    if (form.type === "SELECT" && options.length === 0) {
      toast.error("Add at least one comma-separated select option.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        editingId
          ? `/api/hrms/settings/employee-fields/${editingId}`
          : "/api/hrms/settings/employee-fields",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: form.label,
            type: form.type,
            section: form.section,
            required: form.required,
            options,
            position: Number(form.position) || 0,
            active: form.active,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to save field");
      toast.success(editingId ? "Employee field updated." : "Employee field added.");
      reset();
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save field");
    } finally {
      setSaving(false);
    }
  }

  async function remove(field: EmployeeField) {
    if (
      !window.confirm(
        `Delete “${field.label}”? Existing employee values for this field will no longer be shown.`,
      )
    )
      return;
    try {
      const response = await fetch(
        `/api/hrms/settings/employee-fields/${field.id}`,
        { method: "DELETE" },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to delete field");
      toast.success("Employee field deleted.");
      if (editingId === field.id) reset();
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete field");
    }
  }

  return (
    <section className="mnx-panel mnx-accent-edge border border-mono-border/40 bg-mono-card p-6 shadow-ambient">
      <div className="mb-5 flex items-start gap-3">
        <Settings2 className="mt-0.5 size-5 text-mono-text" />
        <div>
          <h2 className="mnx-title-2 text-mono-text">Employee profile fields</h2>
          <p className="mt-1 text-xs text-mono-muted">
            Add organisation-specific fields that appear on every HRMS employee profile.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Field label">
          <Input
            value={form.label}
            onChange={(event) =>
              setForm((current) => ({ ...current, label: event.target.value }))
            }
            placeholder="e.g. T-shirt size"
          />
        </Field>
        <Field label="Field type">
          <DropdownSelect
            ariaLabel="Field type"
            value={form.type}
            onValueChange={(value) =>
              setForm((current) => ({
                ...current,
                type: value as FieldType,
              }))
            }
            options={[
              { value: "TEXT", label: "Text" },
              { value: "TEXTAREA", label: "Long text" },
              { value: "NUMBER", label: "Number" },
              { value: "DATE", label: "Date" },
              { value: "SELECT", label: "Select" },
              { value: "BOOLEAN", label: "Yes / No" },
            ]}
            triggerClassName="w-full"
          />
        </Field>
        <Field label="Profile section">
          <Input
            value={form.section}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                section: event.target.value,
              }))
            }
            placeholder="Custom Details"
          />
        </Field>
        <Field label="Display order">
          <Input
            type="number"
            min="0"
            value={form.position}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                position: event.target.value,
              }))
            }
          />
        </Field>
        {form.type === "SELECT" ? (
          <div className="sm:col-span-2">
            <Field label="Select options (comma-separated)">
              <Input
                value={form.options}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    options: event.target.value,
                  }))
                }
                placeholder="Small, Medium, Large"
              />
            </Field>
          </div>
        ) : null}
        <label className="flex items-center gap-2 text-xs text-mono-text">
          <Input
            type="checkbox"
            checked={form.required}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                required: event.target.checked,
              }))
            }
          />
          Required
        </label>
        <label className="flex items-center gap-2 text-xs text-mono-text">
          <Input
            type="checkbox"
            checked={form.active}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                active: event.target.checked,
              }))
            }
          />
          Active
        </label>
      </div>

      <div className="mt-4 flex gap-2">
        <MnxAction variant="primary" onClick={save} disabled={saving}>
          {editingId ? <Pencil className="size-4" /> : <Plus className="size-4" />}
          {editingId ? "Update field" : "Add field"}
        </MnxAction>
        {editingId ? <MnxAction onClick={reset}>Cancel</MnxAction> : null}
      </div>

      <div className="mt-6 space-y-2 border-t border-mono-border/40 pt-5">
        {loading ? (
          <p className="text-sm text-mono-muted">Loading employee fields…</p>
        ) : fields.length === 0 ? (
          <p className="text-sm text-mono-muted">No custom employee fields yet.</p>
        ) : (
          fields.map((field) => (
            <div
              key={field.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-mono-border/40 p-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-mono-text">
                    {field.label}
                  </span>
                  {!field.active ? (
                    <span className="mnx-badge mnx-badge-neutral">Inactive</span>
                  ) : null}
                  {field.required ? (
                    <span className="mnx-badge mnx-badge-accent">Required</span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-mono-muted">
                  {field.section} · {field.type.toLowerCase()} · key: {field.key}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <MnxAction aria-label={`Edit ${field.label}`} onClick={() => edit(field)}>
                  <Pencil className="size-4" />
                </MnxAction>
                <MnxAction
                  aria-label={`Delete ${field.label}`}
                  variant="destructive"
                  onClick={() => remove(field)}
                >
                  <Trash2 className="size-4" />
                </MnxAction>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-mono-muted">
      {label}
      {children}
    </label>
  );
}
