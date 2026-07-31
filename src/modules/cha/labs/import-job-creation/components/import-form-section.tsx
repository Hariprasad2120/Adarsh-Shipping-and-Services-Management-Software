"use client";

import * as React from "react";
import {
  WorkspaceCheckbox,
  WorkspaceField,
  WorkspaceInput,
  WorkspacePanel,
  WorkspacePanelHeader,
  WorkspaceSelect,
  WorkspaceTextarea,
} from "@/components/monolith";
import type { FixtureOption } from "../fixtures/import-master-data";

export type LabFieldConfig<T extends string = string> = {
  name: T;
  label: string;
  required?: boolean;
  type?: "text" | "date" | "number" | "textarea" | "select" | "checkbox";
  options?: FixtureOption[];
  readOnly?: boolean;
};

type ImportFormSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
};

export function ImportFormSection({
  actions,
  children,
  description,
  title,
}: ImportFormSectionProps) {
  return (
    <WorkspacePanel className="space-y-5">
      <WorkspacePanelHeader
        actions={actions}
        description={description}
        title={title}
      />
      {children}
    </WorkspacePanel>
  );
}

type FieldGridProps = {
  fields: LabFieldConfig[];
  values: Record<string, unknown>;
  errors?: Partial<Record<string, string>>;
  disabled?: boolean;
  onChange: (name: string, value: string | boolean) => void;
};

export function FieldGrid({
  disabled,
  errors = {},
  fields,
  onChange,
  values,
}: FieldGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {fields.map((field) => {
        const value = values[field.name];
        const error = errors[field.name];
        const isDisabled = disabled || field.readOnly;

        if (field.type === "checkbox") {
          return (
            <WorkspaceField key={field.name} label={field.label}>
              <WorkspaceCheckbox
                checked={Boolean(value)}
                disabled={isDisabled}
                label={field.label}
                onChange={(event) => onChange(field.name, event.currentTarget.checked)}
              />
              {error ? <p className="mnx-text-danger">{error}</p> : null}
            </WorkspaceField>
          );
        }

        if (field.type === "select") {
          return (
            <WorkspaceField
              key={field.name}
              label={field.label}
              required={field.required}
            >
              <WorkspaceSelect
                disabled={isDisabled}
                value={String(value ?? "")}
                onChange={(event) => onChange(field.name, event.currentTarget.value)}
              >
                <option value="">Select</option>
                {(field.options ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </WorkspaceSelect>
              {error ? <p className="mnx-text-danger">{error}</p> : null}
            </WorkspaceField>
          );
        }

        if (field.type === "textarea") {
          return (
            <WorkspaceField
              key={field.name}
              className="md:col-span-2 xl:col-span-3"
              label={field.label}
              required={field.required}
            >
              <WorkspaceTextarea
                disabled={isDisabled}
                rows={3}
                value={String(value ?? "")}
                onChange={(event) => onChange(field.name, event.currentTarget.value)}
              />
              {error ? <p className="mnx-text-danger">{error}</p> : null}
            </WorkspaceField>
          );
        }

        return (
          <WorkspaceField
            key={field.name}
            label={field.label}
            required={field.required}
          >
            <WorkspaceInput
              disabled={isDisabled}
              type={field.type === "date" ? "date" : "text"}
              value={String(value ?? "")}
              onChange={(event) => onChange(field.name, event.currentTarget.value)}
            />
            {error ? <p className="mnx-text-danger">{error}</p> : null}
          </WorkspaceField>
        );
      })}
    </div>
  );
}
