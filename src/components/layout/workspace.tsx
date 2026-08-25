import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import {
  MonolithPage,
  MonolithSpecLabel,
  MonolithSurface,
} from "@/components/ui/foundation";

export function WorkspacePage({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <MonolithPage
      className={cn("mnx-workspace-page", className)}
      data-workspace-surface="single"
      {...props}
    />
  );
}

interface WorkspacePageHeaderProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  graphic?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export function WorkspacePageHeader({
  actions,
  className,
  description,
  eyebrow,
  graphic,
  icon,
  title,
  ...props
}: WorkspacePageHeaderProps) {
  return (
    <header
      className={cn(
        "mnx-page-header",
        graphic ? "mnx-page-header-with-graphic" : null,
        className,
      )}
      {...props}
    >
      <div className="mnx-page-header-copy">
        {icon ? <span className="mnx-page-header-icon">{icon}</span> : null}
        <div className="mnx-page-header-copy-body">
          <MonolithSpecLabel>{eyebrow}</MonolithSpecLabel>
          <h1>{title}</h1>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      {graphic ? (
        <div className="mnx-page-header-graphic" aria-hidden="true">
          {graphic}
        </div>
      ) : null}
      {actions ? <div className="mnx-page-header-actions">{actions}</div> : null}
    </header>
  );
}

interface WorkspaceSectionHeadingProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  index: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  level?: 2 | 3 | 4 | 5 | 6;
}

export function WorkspaceSectionHeading({
  actions,
  badge,
  className,
  description,
  index,
  level = 2,
  title,
  ...props
}: WorkspaceSectionHeadingProps) {
  const Heading: React.ElementType = `h${level}`;

  return (
    <header className={cn("mnx-section-heading", className)} {...props}>
      <div className="mnx-section-heading-title">
        <span className="mnx-section-heading-index">{index}</span>
        <Heading>
          <span className="mnx-section-heading-text">{title}</span>
          {badge ? <span className="mnx-section-heading-badge">{badge}</span> : null}
        </Heading>
      </div>
      {description || actions ? (
        <div className="mnx-section-heading-aside">
          {description ? <p>{description}</p> : null}
          {actions ? <div className="mnx-section-heading-actions">{actions}</div> : null}
        </div>
      ) : null}
    </header>
  );
}

export function WorkspacePanel({
  className,
  interactive = false,
  ...props
}: React.HTMLAttributes<HTMLElement> & { interactive?: boolean }) {
  return (
    <MonolithSurface
      as="section"
      className={className}
      interactive={interactive}
      {...props}
    />
  );
}

interface WorkspaceMetricProps extends React.HTMLAttributes<HTMLElement> {
  actionIcon?: React.ReactNode;
  actionLabel?: string;
  href?: string;
  icon?: React.ReactNode;
  label: React.ReactNode;
  value: React.ReactNode;
  detail?: React.ReactNode;
}

export function WorkspaceMetric({
  actionIcon,
  actionLabel,
  className,
  detail,
  href,
  icon,
  label,
  value,
  ...props
}: WorkspaceMetricProps) {
  const content = (
    <>
      <div className="mnx-workspace-metric-header">
        <span className="mnx-workspace-metric-label">
          {icon ? <span className="mnx-workspace-metric-icon">{icon}</span> : null}
          <MonolithSpecLabel>{label}</MonolithSpecLabel>
        </span>
        {actionIcon ? (
          <span className="mnx-workspace-metric-action" aria-hidden="true">
            {actionIcon}
          </span>
        ) : null}
      </div>
      <div className="mnx-workspace-metric-body">
        <strong className="mnx-workspace-metric-value">{value}</strong>
        {detail ? <p className="mnx-workspace-metric-detail">{detail}</p> : null}
      </div>
    </>
  );

  const metricClassName = cn(
    "mnx-workspace-metric",
    href ? "is-actionable" : null,
    className,
  );

  if (href) {
    return (
      <a
        className={metricClassName}
        data-interactive="true"
        href={href}
        aria-label={actionLabel}
        {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {content}
      </a>
    );
  }

  return (
    <article className={metricClassName} data-interactive="false" {...props}>
      {content}
    </article>
  );
}

interface WorkspaceFieldProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  children: React.ReactNode;
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  required?: boolean;
}

export function WorkspaceField({
  children,
  className,
  hint,
  htmlFor,
  label,
  required,
  ...props
}: WorkspaceFieldProps) {
  return (
    <div className={cn("mnx-field", className)} {...props}>
      <label htmlFor={htmlFor}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {children}
      {hint ? <p>{hint}</p> : null}
    </div>
  );
}

export const WorkspaceInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn("mnx-field-control", className)}
    {...props}
  />
));

WorkspaceInput.displayName = "WorkspaceInput";

export const WorkspaceTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn("mnx-field-control mnx-field-textarea", className)}
    {...props}
  />
));

WorkspaceTextarea.displayName = "WorkspaceTextarea";

export const WorkspaceSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ children, className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn("mnx-field-control mnx-field-select", className)}
    {...props}
  >
    {children}
  </select>
));

WorkspaceSelect.displayName = "WorkspaceSelect";

interface WorkspaceCheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
}

export const WorkspaceCheckbox = React.forwardRef<
  HTMLInputElement,
  WorkspaceCheckboxProps
>(({ className, label, ...props }, ref) => (
  <label className={cn("mnx-checkbox", className)}>
    <input ref={ref} type="checkbox" {...props} />
    <span aria-hidden="true" />
    {label ? <em>{label}</em> : null}
  </label>
));

WorkspaceCheckbox.displayName = "WorkspaceCheckbox";

export function WorkspaceProgress({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const normalizedValue = Math.max(0, Math.min(100, value));

  return (
    <div
      className="mnx-progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={normalizedValue}
    >
      <span style={{ width: `${normalizedValue}%` }} />
    </div>
  );
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
      <div className="mnx-panel-header-copy">
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
      accent: "mnx-button-accent",
      secondary: "mnx-button-secondary",
      outline: "mnx-button-outline",
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
  scrollLabel,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement> & {
  scrollLabel?: string;
}) {
  return (
    <div
      className="mnx-table-wrap"
      role={scrollLabel ? "region" : undefined}
      aria-label={scrollLabel}
      tabIndex={scrollLabel ? 0 : undefined}
    >
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

const workspaceStateVariants = cva("mnx-workspace-state", {
  variants: {
    variant: {
      danger: "mnx-workspace-state-danger",
      empty: "mnx-workspace-state-empty",
      loading: "mnx-workspace-state-loading",
      permission: "mnx-workspace-state-permission",
    },
  },
  defaultVariants: {
    variant: "empty",
  },
});

interface WorkspaceStateProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title">,
    VariantProps<typeof workspaceStateVariants> {
  action?: React.ReactNode;
  description: React.ReactNode;
  eyebrow: string;
  icon: React.ReactNode;
  title: React.ReactNode;
}

export function WorkspaceState({
  action,
  className,
  description,
  eyebrow,
  icon,
  title,
  variant,
  ...props
}: WorkspaceStateProps) {
  return (
    <section
      className={cn(workspaceStateVariants({ variant }), className)}
      {...props}
    >
      <span className="mnx-workspace-state-icon">{icon}</span>
      <MonolithSpecLabel as="p">{eyebrow}</MonolithSpecLabel>
      <h1>{title}</h1>
      <p>{description}</p>
      {action ? <div className="mnx-workspace-state-action">{action}</div> : null}
    </section>
  );
}
