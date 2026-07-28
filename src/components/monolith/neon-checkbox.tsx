"use client";

import React, { InputHTMLAttributes, useState } from "react";
import { cn } from "@/lib/utils";

interface MonolithCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
}

const NeonCheckbox: React.FC<MonolithCheckboxProps> = ({ label, className = "", checked: controlledChecked, defaultChecked, onChange, ...props }) => {
  const [internalChecked, setInternalChecked] = useState(Boolean(defaultChecked));
  const isControlled = controlledChecked !== undefined;
  const isChecked = isControlled ? controlledChecked : internalChecked;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) setInternalChecked(event.target.checked);
    onChange?.(event);
  };

  return (
    <label className={cn("monolith-checkbox", className)}>
      <input type="checkbox" checked={isChecked} onChange={handleChange} {...props} />
      <span aria-hidden="true">{isChecked ? "✓" : ""}</span>
      {label ? <em>{label}</em> : null}
    </label>
  );
};

export { NeonCheckbox };
