"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Input } from "@/components/ui/input";
import { PeopleControlButton as MnxAction } from "@/modules/people/components";

type FieldType = "TEXT" | "TEXTAREA" | "NUMBER" | "DATE" | "SELECT" | "BOOLEAN";

type WorkReportField = {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options: unknown;
  position: number;
  active: boolean;
};

type Settings = {
  approvalLevels: 1 | 2;
  requireApprovedReportForOt: boolean;
};

type FieldForm = {
  label: string;
  type: FieldType;
  required: boolean;
  options: string;
  position: string;
  active: boolean;
};

const defaultSettings: Settings = {
  approvalLevels: 1,
  requireApprovedReportForOt: false,
};

const emptyField: FieldForm = {
  label: "",
  type: "TEXT",
  required: false,
  options: "",
  position: "0",
  active: true,
};

function errorMessage(result: unknown, fallback: string) {
  if (
    result &&
    typeof result === "object" &&
    "error" in result &&
    result.error &&
    typeof result.error === "object" &&
    "message" in result.error &&
    typeof result.error.message === "string"
  ) {
    return result.error.message;
  }
  return fallback;
}

export function WorkReportSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [fields, setFields] = useState<WorkReportField[]>([]);
  const [fieldForm, setFieldForm] = useState<FieldForm>(emptyField);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingField, setSavingField] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/hrms/settings/work-reports");
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(
          errorMessage(result, "Unable to load work report settings"),
        );
      }
      setSettings({
        approvalLevels: result.data.settings.approvalLevels === 2 ? 2 : 1,
        requireApprovedReportForOt:
          result.data.settings.requireApprovedReportForOt === true,
      });
      setFields(result.data.fields);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to load work report settings",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function saveSettings() {
    setSavingSettings(true);
    try {
      const response = await fetch("/api/hrms/settings/work-reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(errorMessage(result, "Unable to save settings"));
      }
      toast.success("Work report workflow settings saved.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save settings",
      );
    } finally {
      setSavingSettings(false);
    }
  }

  function editField(field: WorkReportField) {
    setEditingId(field.id);
    setFieldForm({
      label: field.label,
      type: field.type,
      required: field.required,
      options: Array.isArray(field.options) ? field.options.join(", ") : "",
      position: String(field.position),
      active: field.active,
    });
  }

  function resetField() {
    setEditingId(null);
    setFieldForm(emptyField);
  }

  async function saveField() {
    if (!fieldForm.label.trim()) {
      toast.error("Field label is required.");
      return;
    }
    const options = fieldForm.options
      .split(",")
      .map((option) => option.trim())
      .filter(Boolean);
    if (fieldForm.type === "SELECT" && options.length === 0) {
      toast.error("Add at least one comma-separated select option.");
      return;
    }

    setSavingField(true);
    try {
      const response = await fetch(
        editingId
          ? `/api/hrms/settings/work-reports/${editingId}`
          : "/api/hrms/settings/work-reports",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: fieldForm.label,
            type: fieldForm.type,
            required: fieldForm.required,
            options,
            position: Number(fieldForm.position) || 0,
            active: fieldForm.active,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(errorMessage(result, "Unable to save field"));
      }
      toast.success(
        editingId ? "Work report field updated." : "Work report field added.",
      );
      resetField();
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save field",
      );
    } finally {
      setSavingField(false);
    }
  }

  async function removeField(field: WorkReportField) {
    if (!window.confirm(`Delete “${field.label}” from future work reports?`)) {
      return;
    }
    try {
      const response = await fetch(
        `/api/hrms/settings/work-reports/${field.id}`,
        { method: "DELETE" },
      );
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(errorMessage(result, "Unable to delete field"));
      }
      toast.success("Work report field deleted.");
      if (editingId === field.id) resetField();
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to delete field",
      );
    }
  }

  return (
    <section className="mnx-panel mnx-accent-edge border border-mono-border/40 bg-mono-card p-6 shadow-ambient">
      <div className="mb-5 flex items-start gap-3">
        <ClipboardCheck className="mt-0.5 size-5 text-mono-text" />
        <div>
          <h2 className="mnx-title-2 text-mono-text">Work report setup</h2>
          <p className="mt-1 text-xs text-mono-muted">
            Configure approvals, OT eligibility, and additional fields shown on
            every daily report.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="py-8 text-sm text-mono-muted">
          Loading work report configuration…
        </p>
      ) : (
        <>
          <div className="space-y-4">
            <SettingField label="Approval route">
              <DropdownSelect
                ariaLabel="Work report approval route"
                value={String(settings.approvalLevels)}
                onValueChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    approvalLevels: value === "2" ? 2 : 1,
                  }))
                }
                options={[
                  {
                    value: "1",
                    label: "One level — primary manager",
                  },
                  {
                    value: "2",
                    label: "Two levels — primary, then secondary",
                  },
                ]}
                triggerClassName="w-full"
              />
            </SettingField>

            <label className="flex items-start gap-3 rounded-xl border border-mono-border/40 p-3 text-xs text-mono-text">
              <Input
                type="checkbox"
                className="mt-0.5"
                checked={settings.requireApprovedReportForOt}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    requireApprovedReportForOt: event.target.checked,
                  }))
                }
              />
              <span>
                <span className="block font-semibold">
                  Require an approved report for daily OT
                </span>
                <span className="mt-1 block leading-relaxed text-mono-muted">
                  OT is zero for that day until the report completes every
                  configured approval level.
                </span>
              </span>
            </label>

            <MnxAction
              variant="primary"
              onClick={saveSettings}
              disabled={savingSettings}
            >
              <Save className="size-4" />
              {savingSettings ? "Saving…" : "Save workflow"}
            </MnxAction>
          </div>

          <div className="mt-6 border-t border-mono-border/40 pt-5">
            <div className="mb-4 flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 text-mono-accent" />
              <div>
                <h3 className="mnx-title-3 text-mono-text">
                  Additional report fields
                </h3>
                <p className="mt-1 text-xs text-mono-muted">
                  Add fields such as client, vessel, quantity, or next action.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SettingField label="Field label">
                <Input
                  value={fieldForm.label}
                  onChange={(event) =>
                    setFieldForm((current) => ({
                      ...current,
                      label: event.target.value,
                    }))
                  }
                  placeholder="e.g. Next action"
                />
              </SettingField>
              <SettingField label="Field type">
                <DropdownSelect
                  ariaLabel="Work report field type"
                  value={fieldForm.type}
                  onValueChange={(value) =>
                    setFieldForm((current) => ({
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
              </SettingField>
              <SettingField label="Display order">
                <Input
                  type="number"
                  min="0"
                  value={fieldForm.position}
                  onChange={(event) =>
                    setFieldForm((current) => ({
                      ...current,
                      position: event.target.value,
                    }))
                  }
                />
              </SettingField>
              {fieldForm.type === "SELECT" ? (
                <SettingField label="Options (comma-separated)">
                  <Input
                    value={fieldForm.options}
                    onChange={(event) =>
                      setFieldForm((current) => ({
                        ...current,
                        options: event.target.value,
                      }))
                    }
                    placeholder="Pending, Done, Blocked"
                  />
                </SettingField>
              ) : null}
              <label className="flex items-center gap-2 text-xs text-mono-text">
                <Input
                  type="checkbox"
                  checked={fieldForm.required}
                  onChange={(event) =>
                    setFieldForm((current) => ({
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
                  checked={fieldForm.active}
                  onChange={(event) =>
                    setFieldForm((current) => ({
                      ...current,
                      active: event.target.checked,
                    }))
                  }
                />
                Active
              </label>
            </div>

            <div className="mt-4 flex gap-2">
              <MnxAction
                variant="primary"
                onClick={saveField}
                disabled={savingField}
              >
                {editingId ? (
                  <Pencil className="size-4" />
                ) : (
                  <Plus className="size-4" />
                )}
                {editingId ? "Update field" : "Add field"}
              </MnxAction>
              {editingId ? (
                <MnxAction onClick={resetField}>Cancel</MnxAction>
              ) : null}
            </div>

            <div className="mt-5 space-y-2">
              {fields.length === 0 ? (
                <p className="text-sm text-mono-muted">
                  No additional work report fields yet.
                </p>
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
                        {field.required ? (
                          <span className="mnx-badge mnx-badge-accent">
                            Required
                          </span>
                        ) : null}
                        {!field.active ? (
                          <span className="mnx-badge mnx-badge-neutral">
                            Inactive
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-mono-muted">
                        {field.type.toLowerCase()} · key: {field.key}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <MnxAction
                        aria-label={`Edit ${field.label}`}
                        onClick={() => editField(field)}
                      >
                        <Pencil className="size-4" />
                      </MnxAction>
                      <MnxAction
                        aria-label={`Delete ${field.label}`}
                        variant="destructive"
                        onClick={() => removeField(field)}
                      >
                        <Trash2 className="size-4" />
                      </MnxAction>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function SettingField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-mono-muted">
      {label}
      {children}
    </label>
  );
}
