import * as React from "react";
import { cn } from "@/lib/utils";
import {
  WorkspaceAction,
  type WorkspaceActionProps,
  WorkspaceTable,
  WorkspaceTextarea,
} from "@/components/layout/workspace";

export const PeopleControlButton = React.forwardRef<
  HTMLButtonElement,
  WorkspaceActionProps
>(({ variant = "secondary", ...props }, ref) => (
  <WorkspaceAction ref={ref} variant={variant} {...props} />
));

PeopleControlButton.displayName = "PeopleControlButton";

export const PeopleControlInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  const isChoice = type === "checkbox" || type === "radio";
  const isVisuallyManaged = type === "file" || type === "hidden";

  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        isChoice
          ? "mnx-choice-control"
          : isVisuallyManaged
            ? "mnx-managed-input"
            : "mnx-field-control",
        className,
      )}
      {...props}
    />
  );
});

PeopleControlInput.displayName = "PeopleControlInput";

export const PeopleToggleButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }
>(({ active, className, children, type = "button", ...props }, ref) => (
  <button
    ref={ref}
    aria-pressed={active}
    className={cn(
      "mnx-people-toggle",
      active && "is-active",
      className,
    )}
    type={type}
    {...props}
  >
    <span aria-hidden="true" />
    {children}
  </button>
));

PeopleToggleButton.displayName = "PeopleToggleButton";

export const PeopleControlTextarea = WorkspaceTextarea;
export const PeopleControlTable = WorkspaceTable;
