import * as React from "react";
import {
  AlertTriangle,
  Inbox,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DsButtonLink } from "./ds-button";

/**
 * State blocks — every data-bearing DS component should render one of these
 * instead of a blank surface:
 *
 *   <LoadingState />        while a request is in flight (spinner or skeleton)
 *   <EmptyState />          request succeeded, nothing to show
 *   <ErrorState />          request failed
 *   <PermissionState />     caller lacks the capability
 *
 * They inherit colour from their container, so they read correctly inside a
 * dark panel too.
 */
interface StateAction {
  href: string;
  label: string;
}

interface BaseStateProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: StateAction;
  className?: string;
}

function StateShell({
  tone,
  icon,
  title,
  description,
  action,
  className,
  role,
}: BaseStateProps & {
  tone?: "error" | "permission";
  icon: React.ReactNode;
  role?: string;
}) {
  return (
    <div
      className={cn("ds-state", className)}
      data-tone={tone}
      role={role}
    >
      <span className="ds-state-icon">{icon}</span>
      <p className="ds-state-title">{title}</p>
      {description ? <p className="ds-state-desc">{description}</p> : null}
      {action ? (
        <DsButtonLink href={action.href} variant="outlined" size="sm">
          {action.label}
        </DsButtonLink>
      ) : null}
    </div>
  );
}

export function LoadingState({
  title = "Loading",
  description,
  className,
}: Partial<BaseStateProps>) {
  return (
    <div className={cn("ds-state", className)} role="status" aria-live="polite">
      <span className="ds-state-icon">
        <LoaderCircle
          size={20}
          aria-hidden="true"
          style={{ animation: "ds-spin 0.9s linear infinite" }}
        />
      </span>
      <p className="ds-state-title">{title}</p>
      {description ? <p className="ds-state-desc">{description}</p> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
  icon,
}: BaseStateProps & { icon?: React.ReactNode }) {
  return (
    <StateShell
      icon={icon ?? <Inbox size={20} aria-hidden="true" />}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  action,
  className,
}: Partial<BaseStateProps>) {
  return (
    <StateShell
      tone="error"
      role="alert"
      icon={<AlertTriangle size={20} aria-hidden="true" />}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

export function PermissionState({
  title = "You don’t have access",
  description,
  action,
  className,
}: Partial<BaseStateProps>) {
  return (
    <StateShell
      tone="permission"
      icon={<LockKeyhole size={20} aria-hidden="true" />}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

/**
 * Skeleton — a single shimmering placeholder line/box. Compose several to
 * pre-shape a loading card.
 */
export interface SkeletonProps extends React.HTMLAttributes<HTMLSpanElement> {
  width?: string | number;
  height?: string | number;
  radius?: string | number;
}
export function Skeleton({
  width = "100%",
  height = "1rem",
  radius,
  className,
  style,
  ...rest
}: SkeletonProps) {
  return (
    <span
      className={cn("ds-skeleton", className)}
      aria-hidden="true"
      style={{ width, height, borderRadius: radius, ...style }}
      {...rest}
    />
  );
}
