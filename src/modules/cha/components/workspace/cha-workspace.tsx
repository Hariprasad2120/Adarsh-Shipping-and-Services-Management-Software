"use client";

import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CheckSquare,
  CreditCard,
  FileCog,
  Gauge,
  LoaderCircle,
  Settings2,
  UserPlus,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type {
  ComponentProps,
  CSSProperties,
  HTMLAttributes,
  ReactNode,
  TableHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownSelect,
  type DropdownSelectProps,
} from "@/components/ui/dropdown-select";
import { FilterMenu, type FilterMenuProps } from "@/components/forms/filter-menu";
import { Modal, type ModalProps } from "@/components/ui/modal";
import { NativeSelect } from "@/components/ui/native-select";
import {
  WarningIndicatorPopover,
  type WarningIndicatorPopoverProps,
} from "@/components/feedback/warning-indicator-popover";
import {
  WorkspaceDialogLayer,
  type WorkspaceDialogSize,
} from "@/components/layout/workspace-dialog";
import {
  WorkspaceAction,
  WorkspaceBadge,
  WorkspaceMetric,
  WorkspacePage,
  WorkspacePageHeader,
  WorkspacePanel,
  WorkspaceSectionHeading,
  WorkspaceState,
  WorkspaceTable,
} from "@/components/layout/workspace";

type ChaRouteMeta = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

const exactRouteMeta: Record<string, ChaRouteMeta> = {
  "/cha": {
    eyebrow: "Customs operations",
    title: "CHA command centre",
    description:
      "Coordinate customs jobs, approvals, filing progress, customer advances, and operational exceptions.",
    icon: Gauge,
  },
  "/cha/approvals": {
    eyebrow: "Controlled decisions",
    title: "Checklist approvals",
    description:
      "Review checklist submissions and job-deletion requests without bypassing approval policy.",
    icon: CheckSquare,
  },
  "/cha/customers": {
    eyebrow: "Customer operations",
    title: "CHA customers",
    description:
      "Maintain customs customer profiles, account ownership, KYC records, and portal access.",
    icon: Users,
  },
  "/cha/customers/new": {
    eyebrow: "Customer onboarding",
    title: "New customer",
    description:
      "Create a customs customer profile with contact, finance, KYC, and portal settings.",
    icon: UserPlus,
  },
  "/cha/expenses": {
    eyebrow: "CHA finance",
    title: "CHA expenses",
    description:
      "Raise, review, approve, disburse, and reconcile job-linked operational expenses.",
    icon: CreditCard,
  },
  "/cha/jobs": {
    eyebrow: "Customs operations",
    title: "CHA jobs",
    description:
      "Search and coordinate every customs-clearance job across its controlled workflow.",
    icon: BriefcaseBusiness,
  },
  "/cha/reports": {
    eyebrow: "Operational intelligence",
    title: "CHA reports",
    description:
      "Review filing delays, financial exposure, completed-job reports, and the audit feed.",
    icon: BarChart3,
  },
  "/cha/settings": {
    eyebrow: "CHA administration",
    title: "CHA settings",
    description:
      "Manage numbering, access policy, job taxonomy, teams, and document requirements.",
    icon: Settings2,
  },
  "/cha/settings/filing-workflows": {
    eyebrow: "Workflow configuration",
    title: "Filing workflow builder",
    description:
      "Configure filing nodes, gates, role access, required evidence, and controlled transitions.",
    icon: Workflow,
  },
  "/expense": {
    eyebrow: "Expense operations",
    title: "Expense workspace",
    description:
      "Manage operational expense requests, approvals, payments, proofs, and reconciliation.",
    icon: CreditCard,
  },
};

function normalizePathname(pathname: string | null) {
  if (!pathname) return "/";
  const normalized = pathname.replace(/\/+$/, "");
  return normalized || "/";
}

export function getChaRouteMeta(pathname: string | null): ChaRouteMeta {
  const path = normalizePathname(pathname);
  const exact = exactRouteMeta[path];
  if (exact) return exact;

  if (/^\/cha\/customers\/[^/]+\/edit$/.test(path)) {
    return {
      eyebrow: "Customer administration",
      title: "Edit customer",
      description:
        "Update customer identity, ownership, KYC, financial policy, and portal access.",
      icon: Building2,
    };
  }

  if (/^\/cha\/jobs\/[^/]+$/.test(path)) {
    return {
      eyebrow: "Customs job workspace",
      title: "Job operations",
      description:
        "Coordinate documents, additional data, checklist decisions, filing, advances, expenses, and audit history.",
      icon: FileCog,
    };
  }

  return path.startsWith("/expense")
    ? exactRouteMeta["/expense"]
    : exactRouteMeta["/cha"];
}

export function ChaWorkspaceFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isFilingBuilder =
    normalizePathname(pathname) === "/cha/settings/filing-workflows";

  return (
    <WorkspacePage
      className={cn(
        "mnx-cha-page",
        isFilingBuilder && "mnx-cha-page-workflow-builder",
      )}
      data-cha-workspace="true"
    >
      <div className="mnx-cha-content">{children}</div>
    </WorkspacePage>
  );
}

export function ChaRoutePageHeader({
  actions,
  className,
  description,
  eyebrow,
  graphic,
  title,
}: {
  actions?: ReactNode;
  className?: string;
  description?: ReactNode;
  eyebrow?: ReactNode;
  graphic?: ReactNode;
  icon?: ReactNode;
  title?: ReactNode;
}) {
  const pathname = usePathname();
  const meta = getChaRouteMeta(pathname);

  return (
    <WorkspacePageHeader
      className={cn("mnx-cha-page-header", className)}
      eyebrow={typeof eyebrow === "string" ? eyebrow : meta.eyebrow}
      title={title ?? meta.title}
      description={description ?? meta.description}
      graphic={graphic}
      actions={actions}
    />
  );
}

export function ChaMetrics({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn("mnx-workspace-metrics mnx-cha-metrics", className)}
      {...props}
    />
  );
}

export function ChaMetric({
  detail,
  href,
  label,
  value,
}: {
  detail?: ReactNode;
  href?: string;
  icon?: ReactNode;
  label: ReactNode;
  value: ReactNode;
}) {
  return (
    <WorkspaceMetric
      label={<span className="mnx-cha-metric-label">{label}</span>}
      value={value}
      detail={detail}
      href={href}
    />
  );
}

export function ChaSection({
  actions,
  badge,
  children,
  className,
  description,
  index,
  title,
}: {
  actions?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  index?: ReactNode;
  title: ReactNode;
}) {
  return (
    <section className="mnx-cha-section-block">
      <WorkspaceSectionHeading
        className="mnx-cha-outside-heading"
        index={index ?? ""}
        title={title}
        description={description}
        badge={badge ? <Badge variant="secondary">{badge}</Badge> : null}
        actions={actions}
      />
      <WorkspacePanel className={cn("mnx-cha-section", className)}>
        <div className="mnx-cha-section-content">{children}</div>
      </WorkspacePanel>
    </section>
  );
}

export function ChaPanel({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <WorkspacePanel className={cn("mnx-cha-panel", className)} {...props} />
  );
}

export function ChaToolbar({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mnx-cha-toolbar", className)} {...props} />;
}

export function ChaTabs({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mnx-cha-tabs", className)}
      role="tablist"
      {...props}
    />
  );
}

export function ChaTable({
  className,
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  return <WorkspaceTable className={cn("mnx-cha-table", className)} {...props} />;
}

export function ChaActionLink({
  children,
  className,
  href,
}: {
  children: ReactNode;
  className?: string;
  href: string;
}) {
  return (
    <ButtonLink className={className} href={href} variant="inverse">
      {children}
    </ButtonLink>
  );
}

export const ChaAction = WorkspaceAction;
export const ChaStatus = WorkspaceBadge;

export function ChaModal({ className, eyebrow, ...props }: ModalProps) {
  return (
    <Modal
      {...props}
      className={cn("mnx-cha-dialog", className)}
      eyebrow={eyebrow ?? "Customs operations"}
    />
  );
}

export function ChaDropdownSelect({
  contentClassName,
  ...props
}: DropdownSelectProps) {
  return (
    <DropdownSelect
      {...props}
      contentClassName={cn("mnx-cha-menu", contentClassName)}
    />
  );
}

export function ChaNativeSelect({
  className,
  ...props
}: ComponentProps<typeof NativeSelect>) {
  return (
    <NativeSelect
      {...props}
      className={cn("mnx-cha-native-select", className)}
    />
  );
}

export function ChaFilterMenu({
  contentClassName,
  ...props
}: FilterMenuProps) {
  return (
    <FilterMenu
      {...props}
      contentClassName={cn("mnx-cha-menu", contentClassName)}
    />
  );
}

export function ChaWarningIndicatorPopover({
  surfaceClassName,
  ...props
}: WarningIndicatorPopoverProps) {
  return (
    <WarningIndicatorPopover
      {...props}
      surfaceClassName={cn("mnx-cha-popover", surfaceClassName)}
    />
  );
}

export function ChaDialogLayer({
  children,
  className,
  labelledBy,
  onClose,
  open,
  size = "default",
  style,
}: {
  children: ReactNode;
  className?: string;
  labelledBy?: string;
  onClose: () => void;
  open: boolean;
  size?: WorkspaceDialogSize;
  style?: CSSProperties;
}) {
  return (
    <WorkspaceDialogLayer
      className={cn("mnx-cha-dialog", className)}
      labelledBy={labelledBy}
      onClose={onClose}
      open={open}
      size={size}
      style={style}
    >
      {children}
    </WorkspaceDialogLayer>
  );
}

export function ChaLoadingState({
  description = "Loading customs operations data.",
}: {
  description?: string;
}) {
  return (
    <WorkspaceState
      variant="loading"
      eyebrow="Customs operations"
      title="Loading workspace"
      description={description}
      icon={<LoaderCircle className="mnx-state-spinner" aria-hidden="true" />}
    />
  );
}

export function ChaErrorState({
  description,
  onRetry,
}: {
  description: string;
  onRetry?: () => void;
}) {
  return (
    <WorkspaceState
      variant="danger"
      eyebrow="Customs operations"
      title="This workspace could not be loaded"
      description={description}
      icon={<AlertTriangle aria-hidden="true" />}
      action={
        onRetry ? <WorkspaceAction onClick={onRetry}>Try again</WorkspaceAction> : null
      }
    />
  );
}
