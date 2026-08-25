"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  Database,
  FlaskConical,
  Gauge,
  KeyRound,
  LoaderCircle,
  MessageSquareText,
  Monitor,
  Settings2,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import * as React from "react";
import type {
  HTMLAttributes,
  ReactNode,
  TableHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";
import {
  WorkspaceAction,
  type WorkspaceActionProps,
  WorkspaceBadge,
  WorkspaceEmptyTableRow,
  WorkspaceField,
  WorkspaceMetric,
  WorkspacePage,
  WorkspacePageHeader,
  WorkspacePanel,
  WorkspacePanelHeader,
  WorkspaceSelect,
  WorkspaceState,
  WorkspaceTable,
  WorkspaceTextarea,
} from "@/components/layout/workspace";

type AdminRouteMeta = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

const exactRouteMeta: Record<string, AdminRouteMeta> = {
  "/admin": {
    eyebrow: "Organisation control",
    title: "Admin command centre",
    description:
      "Manage organisation access, operational settings, security, diagnostics, and controlled administration tools.",
    icon: Gauge,
  },
  "/admin/data-tools": {
    eyebrow: "Controlled data operations",
    title: "Data tools",
    description:
      "Import organisation workbooks through validated, permission-gated administration workflows.",
    icon: Database,
  },
  "/admin/google-chat": {
    eyebrow: "Integration administration",
    title: "Google Chat administration",
    description:
      "Monitor linked users, spaces, delivery state, and Google Chat connectivity.",
    icon: MessageSquareText,
  },
  "/admin/notifications": {
    eyebrow: "Notification operations",
    title: "Notification administration",
    description:
      "Inspect delivery state, filter organisation notifications, and retry eligible failures.",
    icon: Bell,
  },
  "/admin/passkeys": {
    eyebrow: "Access security",
    title: "Passkey resets",
    description:
      "Review employee reset requests and execute controlled passkey recovery actions.",
    icon: KeyRound,
  },
  "/admin/roles": {
    eyebrow: "Access control",
    title: "Roles and permissions",
    description:
      "Maintain organisation roles and their explicit permission assignments.",
    icon: Users,
  },
  "/admin/sessions": {
    eyebrow: "Session security",
    title: "Session monitor",
    description:
      "Review active sessions, sign-in history, security events, and inactivity controls.",
    icon: Monitor,
  },
  "/admin/settings": {
    eyebrow: "Configuration",
    title: "Organisation settings",
    description:
      "Configure appraisal policy and run dedicated organisation-level administration tools such as the Accounting demo bootstrap.",
    icon: Settings2,
  },
  "/admin/simulation": {
    eyebrow: "Controlled diagnostics",
    title: "Time simulation",
    description:
      "Freeze or advance the application clock for authorised workflow verification.",
    icon: FlaskConical,
  },
};

const navigationItems = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/roles", label: "Roles" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/passkeys", label: "Passkeys" },
  { href: "/admin/sessions", label: "Sessions" },
  { href: "/admin/data-tools", label: "Data tools" },
  { href: "/admin/simulation", label: "Simulation" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/google-chat", label: "Google Chat" },
] as const;

function normalizePathname(pathname: string | null) {
  if (!pathname) return "/";
  const normalized = pathname.replace(/\/+$/, "");
  return normalized || "/";
}

export function getAdminRouteMeta(pathname: string | null): AdminRouteMeta {
  return exactRouteMeta[normalizePathname(pathname)] ?? exactRouteMeta["/admin"];
}

export function AdminWorkspaceFrame({ children }: { children: ReactNode }) {
  const pathname = normalizePathname(usePathname());

  if (pathname === "/admin/design-system" || pathname.startsWith("/admin/design-system/")) {
    return <>{children}</>;
  }

  const meta = getAdminRouteMeta(pathname);
  const Icon = meta.icon;

  return (
    <WorkspacePage className="mnx-admin-page" data-admin-workspace="true">
      <WorkspacePageHeader
        className="mnx-admin-page-header"
        eyebrow={meta.eyebrow}
        title={meta.title}
        description={meta.description}
        icon={<Icon aria-hidden="true" />}
      />
      <nav className="mnx-admin-nav" aria-label="Administration workspace">
        {navigationItems.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mnx-admin-content">{children}</div>
    </WorkspacePage>
  );
}

export const AdminButton = React.forwardRef<
  HTMLButtonElement,
  WorkspaceActionProps
>(({ variant = "secondary", ...props }, ref) => (
  <WorkspaceAction ref={ref} variant={variant} {...props} />
));

AdminButton.displayName = "AdminButton";

export const AdminInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  const isChoice = type === "checkbox" || type === "radio";
  const isManaged = type === "file" || type === "hidden";
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        isChoice
          ? "mnx-choice-control"
          : isManaged
            ? "mnx-managed-input"
            : "mnx-field-control",
        className,
      )}
      {...props}
    />
  );
});

AdminInput.displayName = "AdminInput";

export const AdminTextarea = WorkspaceTextarea;
export const AdminSelect = WorkspaceSelect;
export const AdminField = WorkspaceField;
export const AdminBadge = WorkspaceBadge;

export function AdminPanel({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return <WorkspacePanel className={cn("mnx-admin-panel", className)} {...props} />;
}

export const AdminPanelHeader = WorkspacePanelHeader;
export const AdminMetric = WorkspaceMetric;

export function AdminTable({
  className,
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <WorkspaceTable className={cn("mnx-admin-table", className)} {...props} />
  );
}

export const AdminEmptyTableRow = WorkspaceEmptyTableRow;

export function AdminLoadingState({
  description = "Loading administration data.",
}: {
  description?: string;
}) {
  return (
    <WorkspaceState
      variant="loading"
      eyebrow="Administration"
      title="Loading workspace"
      description={description}
      icon={<LoaderCircle className="mnx-state-spinner" aria-hidden="true" />}
    />
  );
}

export function AdminErrorState({
  description,
  onRetry,
}: {
  description: string;
  onRetry?: () => void;
}) {
  return (
    <WorkspaceState
      variant="danger"
      eyebrow="Administration"
      title="This workspace could not be loaded"
      description={description}
      icon={<AlertTriangle aria-hidden="true" />}
      action={
        onRetry ? <WorkspaceAction onClick={onRetry}>Try again</WorkspaceAction> : null
      }
    />
  );
}

export function AdminPermissionState({ description }: { description: string }) {
  return (
    <WorkspaceState
      variant="permission"
      eyebrow="Administration"
      title="Access restricted"
      description={description}
      icon={<ShieldCheck aria-hidden="true" />}
    />
  );
}
