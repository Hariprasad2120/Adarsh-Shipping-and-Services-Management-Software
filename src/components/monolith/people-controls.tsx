import * as React from "react";
import { cn } from "@/lib/utils";
import {
  WorkspaceAction,
  type WorkspaceActionProps,
  WorkspaceTable,
  WorkspaceTextarea,
} from "./workspace";

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

export const PeopleControlTextarea = WorkspaceTextarea;
export const PeopleControlTable = WorkspaceTable;
