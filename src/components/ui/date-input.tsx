"use client";

import * as React from "react";
import { CalendarDays } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

type DateInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function formatDisplayValue(value?: string) {
  if (!value) return "";

  try {
    return format(parseISO(value), "MMMM d, yyyy");
  } catch {
    return value;
  }
}

function createSyntheticChangeEvent(
  value: string,
  name?: string,
): React.ChangeEvent<HTMLInputElement> {
  const target = { value, name } as HTMLInputElement;

  return {
    target,
    currentTarget: target,
    bubbles: true,
    cancelable: false,
    defaultPrevented: false,
    eventPhase: 3,
    isTrusted: false,
    nativeEvent: new Event("change"),
    preventDefault() {},
    isDefaultPrevented: () => false,
    stopPropagation() {},
    isPropagationStopped: () => false,
    persist() {},
    timeStamp: Date.now(),
    type: "change",
  } as React.ChangeEvent<HTMLInputElement>;
}

export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  (
    {
      className,
      defaultOpen = false,
      defaultValue,
      disabled = false,
      id,
      max,
      min,
      name,
      onChange,
      onOpenChange,
      open,
      placeholder = "Select date",
      required,
      value,
      form,
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const hiddenInputId = `${inputId}-value`;
    const calendarId = `${inputId}-calendar`;
    const isControlled = value !== undefined;
    const isOpenControlled = open !== undefined;
    const [uncontrolledValue, setUncontrolledValue] = React.useState(
      typeof defaultValue === "string" ? defaultValue : "",
    );
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
    const selectedValue = isControlled ? String(value ?? "") : uncontrolledValue;
    const resolvedOpen = isOpenControlled ? open : uncontrolledOpen;

    function setOpen(nextOpen: boolean) {
      if (!isOpenControlled) {
        setUncontrolledOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    }

    function commitValue(nextValue: string) {
      if (!isControlled) {
        setUncontrolledValue(nextValue);
      }
      onChange?.(createSyntheticChangeEvent(nextValue, name));
      setOpen(false);
    }

    return (
      <div className="mnx-date-input-shell">
        <input
          ref={ref}
          id={hiddenInputId}
          type="hidden"
          form={form}
          name={name}
          value={selectedValue}
          required={required}
        />
        <DropdownMenu modal={false} open={resolvedOpen} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <button
              id={inputId}
              type="button"
            className={cn("mnx-field-trigger", className)}
            disabled={disabled}
            aria-haspopup="dialog"
            aria-expanded={resolvedOpen}
            aria-controls={calendarId}
          >
            <span>{selectedValue ? formatDisplayValue(selectedValue) : placeholder}</span>
            <CalendarDays size={16} aria-hidden="true" />
          </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="mnx-calendar-content"
            sideOffset={8}
          >
            <Calendar
              id={calendarId}
              key={selectedValue || "empty"}
              initialMonth={selectedValue ? parseISO(selectedValue) : undefined}
              max={typeof max === "string" ? max : undefined}
              min={typeof min === "string" ? min : undefined}
              selectedDate={selectedValue}
              onSelectDate={commitValue}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  },
);

DateInput.displayName = "DateInput";
