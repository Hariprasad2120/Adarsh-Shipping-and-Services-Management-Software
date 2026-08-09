import * as React from "react";
import { X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const alertVariants = cva("mnx-workspace-alert", {
  variants: {
    variant: {
      secondary: "",
      primary: "mnx-workspace-alert-info",
      destructive: "mnx-workspace-alert-danger",
      success: "mnx-workspace-alert-success",
      info: "mnx-workspace-alert-info",
      mono: "",
      warning: "mnx-workspace-alert-warning",
    },
  },
  defaultVariants: {
    variant: "secondary",
  },
});

interface AlertProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  close?: boolean;
  onClose?: () => void;
}

interface AlertIconProps extends React.HTMLAttributes<HTMLDivElement> {}

function Alert({ className, variant, close = false, onClose, children, ...props }: AlertProps) {
  return (
    <div data-slot="alert" role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
      {children}
      {close ? (
        <Button size="sm" variant="inverse" mode="icon" onClick={onClose} aria-label="Dismiss" data-slot="alert-close">
          <X className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}

function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <div data-slot="alert-title" className={cn("font-semibold", className)} {...props} />;
}

function AlertIcon({ children, className, ...props }: AlertIconProps) {
  return <div data-slot="alert-icon" className={cn("shrink-0", className)} {...props}>{children}</div>;
}

function AlertToolbar({ children, className, ...props }: AlertIconProps) {
  return <div data-slot="alert-toolbar" className={cn(className)} {...props}>{children}</div>;
}

function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <div data-slot="alert-description" className={cn("text-sm", className)} {...props} />;
}

function AlertContent({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <div data-slot="alert-content" className={cn("grid gap-1", className)} {...props} />;
}

export { Alert, AlertContent, AlertDescription, AlertIcon, AlertTitle, AlertToolbar };
