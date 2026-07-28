import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import {
  MonolithPage,
  MonolithSpecLabel,
  MonolithSurface,
} from "./foundation";

export function WorkspacePage({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <MonolithPage
      className={cn("mnx-workspace-page", className)}
      {...props}
    />
  );
}

interface WorkspacePageHeaderProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export function WorkspacePageHeader({
  actions,
  className,
  description,
  eyebrow,
  icon,
  title,
  ...props
}: WorkspacePageHeaderProps) {
  return (
    <header className={cn("mnx-page-header", className)} {...props}>
      <div className="mnx-page-header-copy">
        {icon ? <span className="mnx-page-header-icon">{icon}</span> : null}
        <div>
          <MonolithSpecLabel>{eyebrow}</MonolithSpecLabel>
          <h1>{title}</h1>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="mnx-page-header-actions">{actions}</div> : null}
    </header>
  );
}

export function WorkspacePanel({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return <MonolithSurface as="section" className={className} {...props} />;
}

interface WorkspacePanelHeaderProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

export function WorkspacePanelHeader({
  actions,
  className,
  description,
  eyebrow,
  title,
  ...props
}: WorkspacePanelHeaderProps) {
  return (
    <header className={cn("mnx-table-toolbar", className)} {...props}>
      <div>
        {eyebrow ? (
          <MonolithSpecLabel>{eyebrow}</MonolithSpecLabel>
        ) : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="mnx-panel-actions">{actions}</div> : null}
    </header>
  );
}

const workspaceActionVariants = cva("mnx-button", {
  variants: {
    variant: {
      primary: "mnx-button-primary",
      secondary: "mnx-button-secondary",
      destructive: "mnx-button-destructive",
    },
    size: {
      default: "",
      compact: "mnx-button-compact",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "default",
  },
});

export interface WorkspaceActionProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof workspaceActionVariants> {}

export const WorkspaceAction = React.forwardRef<
  HTMLButtonElement,
  WorkspaceActionProps
>(({ className, size, type = "button", variant, ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn(workspaceActionVariants({ size, variant }), className)}
    {...props}
  />
));

WorkspaceAction.displayName = "WorkspaceAction";

const workspaceBadgeVariants = cva("mnx-badge", {
  variants: {
    variant: {
      accent: "mnx-badge-accent",
      neutral: "mnx-badge-neutral",
      success: "mnx-badge-success",
      warning: "mnx-badge-warning",
      danger: "mnx-badge-danger",
    },
  },
  defaultVariants: {
    variant: "neutral",
  },
});

export interface WorkspaceBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof workspaceBadgeVariants> {}

export function WorkspaceBadge({
  className,
  variant,
  ...props
}: WorkspaceBadgeProps) {
  return (
    <span
      className={cn(workspaceBadgeVariants({ variant }), className)}
      {...props}
    />
  );
}

const workspaceAlertVariants = cva("mnx-workspace-alert", {
  variants: {
    variant: {
      danger: "mnx-workspace-alert-danger",
      info: "mnx-workspace-alert-info",
      success: "mnx-workspace-alert-success",
      warning: "mnx-workspace-alert-warning",
    },
  },
  defaultVariants: {
    variant: "info",
  },
});

export interface WorkspaceAlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof workspaceAlertVariants> {}

export function WorkspaceAlert({
  className,
  variant,
  ...props
}: WorkspaceAlertProps) {
  return (
    <div
      role="alert"
      className={cn(workspaceAlertVariants({ variant }), className)}
      {...props}
    />
  );
}

export function WorkspaceTable({
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="mnx-table-wrap">
      <table className={cn("mnx-workspace-table", className)} {...props} />
    </div>
  );
}

export function WorkspaceEmptyTableRow({
  children,
  colSpan,
}: {
  children: React.ReactNode;
  colSpan: number;
}) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <div className="mnx-empty-state mnx-table-empty-state">{children}</div>
      </td>
    </tr>
  );
}
