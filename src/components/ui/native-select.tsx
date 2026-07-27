"use client";

import * as React from "react";
import { DropdownSelect } from "@/components/ui/dropdown-select";

type NativeSelectProps = {
  children?: React.ReactNode;
  className?: string;
  defaultValue?: string | number | readonly string[];
  disabled?: boolean;
  id?: string;
  name?: string;
  onBlur?: (event: { target: { name?: string; value: string } }) => void;
  onChange?: (event: { target: { name?: string; value: string } }) => void;
  required?: boolean;
  value?: string | number | readonly string[];
  [key: string]: unknown;
};

function nodeText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return nodeText(node.props.children);
  return "";
}

function scalarValue(value: NativeSelectProps["value"] | NativeSelectProps["defaultValue"]) {
  return Array.isArray(value) ? String(value[0] ?? "") : value === undefined ? undefined : String(value);
}

export function NativeSelect({
  children,
  className,
  defaultValue,
  disabled,
  id,
  name,
  onBlur,
  onChange,
  required,
  value,
  ...props
}: NativeSelectProps) {
  const options = React.Children.toArray(children)
    .filter(React.isValidElement)
    .filter((child) => child.type === "option")
    .map((child) => {
      const optionProps = child.props as {
        children?: React.ReactNode;
        disabled?: boolean;
        selected?: boolean;
        value?: string | number;
      };
      const label = nodeText(optionProps.children);
      return {
        disabled: Boolean(optionProps.disabled),
        label,
        selected: Boolean(optionProps.selected),
        value: optionProps.value === undefined ? label : String(optionProps.value),
      };
    });
  const fallbackDefault = options.find((option) => option.selected)?.value;

  return (
    <DropdownSelect
      ariaLabel={String(props["aria-label"] ?? props["aria-labelledby"] ?? name ?? id ?? "Select option")}
      className={className}
      contentClassName={String(props["data-dropdown-content-class"] ?? "")}
      defaultValue={scalarValue(defaultValue) ?? fallbackDefault ?? options[0]?.value ?? ""}
      disabled={disabled}
      id={id}
      name={name}
      onValueChange={(nextValue) => {
        const event = { target: { name, value: nextValue } };
        onChange?.(event);
        onBlur?.(event);
      }}
      options={options}
      required={required}
      triggerClassName={className}
      value={scalarValue(value)}
    />
  );
}
