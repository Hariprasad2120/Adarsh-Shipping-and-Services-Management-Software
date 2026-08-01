import * as React from "react";
import { X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const alertVariants = cva("alert", {
  variants: {
    variant: {
      secondary: "",
      primary: "info-alert",
      destructive: "error-alert",
      success: "success-alert",
      info: "info-alert",
      mono: "",
      warning: "warning-alert",
    },
    appearance: {
      solid: "",
      outline: "",
      light: "",
      stroke: "",
    },
    size: {
      lg: "",
      md: "",
      sm: "",
    },
    icon: {
      primary: "",
      destructive: "",
      success: "",
      info: "",
      warning: "",
    },
  },
  defaultVariants: {
    variant: "secondary",
    appearance: "light",
    size: "md",
  },
});

interface AlertProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  close?: boolean;
  onClose?: () => void;
}

interface AlertIconProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {}

function Alert({ className, variant, size, icon, appearance, close = false, onClose, children, ...props }: AlertProps) {
  return (
    <div data-slot="alert" role="alert" className={cn(alertVariants({ variant, size, icon, appearance }), className)} {...props}>
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
