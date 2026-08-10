"use client";

import React, {
  InputHTMLAttributes,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface MonolithCheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  indeterminate?: boolean;
  label?: React.ReactNode;
}

const NeonCheckbox = React.forwardRef<HTMLInputElement, MonolithCheckboxProps>(
  (
    {
      checked: controlledChecked,
      className = "",
      defaultChecked,
      disabled,
      id,
      indeterminate = false,
      label,
      onChange,
      ...props
    },
    ref,
  ) => {
    const [internalChecked, setInternalChecked] = useState(Boolean(defaultChecked));
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const localRef = useRef<HTMLInputElement | null>(null);
    const isControlled = controlledChecked !== undefined;
    const isChecked = isControlled ? controlledChecked : internalChecked;

    useEffect(() => {
      if (localRef.current) {
        localRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) setInternalChecked(event.target.checked);
      onChange?.(event);
    };

    return (
      <label
        htmlFor={inputId}
        className={cn("mnx-checkbox", className)}
        data-state={
          disabled
            ? "disabled"
            : indeterminate
              ? "indeterminate"
              : isChecked
                ? "checked"
                : "unchecked"
        }
      >
        <input
          {...props}
          ref={(node) => {
            localRef.current = node;
            if (typeof ref === "function") {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          id={inputId}
          type="checkbox"
          checked={isChecked}
          disabled={disabled}
          aria-checked={indeterminate ? "mixed" : isChecked}
          onChange={handleChange}
        />
        <span className="mnx-checkbox-box" aria-hidden="true">
          {indeterminate ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M2 5h6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          ) : isChecked ? (
            <Check size={11} strokeWidth={2.4} />
          ) : null}
        </span>
        {label ? <em>{label}</em> : null}
      </label>
    );
  },
);

NeonCheckbox.displayName = "NeonCheckbox";

export { NeonCheckbox };
