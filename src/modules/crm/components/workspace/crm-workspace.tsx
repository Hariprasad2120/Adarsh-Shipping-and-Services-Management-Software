"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Boxes,
  Building2,
  CalendarClock,
  CheckSquare,
  CircleDollarSign,
  ClipboardCheck,
  ContactRound,
  FileText,
  FolderKanban,
  Gauge,
  Handshake,
  Headphones,
  Inbox,
  Landmark,
  LoaderCircle,
  Mail,
  MapPin,
  Megaphone,
  MessageSquareText,
  PackageSearch,
  Phone,
  ReceiptIndianRupee,
  Settings2,
  Share2,
  ShoppingCart,
  Sparkles,
  Target,
  TicketCheck,
  Truck,
  UserPlus,
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
import { Button } from "@/components/ui/button";
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
  WorkspaceState,
} from "@/components/layout/workspace";
import {
  WorkspaceDialog,
  WorkspaceDialogLayer,
  type WorkspaceDialogSize,
} from "@/components/layout/workspace-dialog";

type CrmRouteMeta = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  hideHeaderIcon?: boolean;
};

const exactRouteMeta: Record<string, CrmRouteMeta> = {
  "/crm": {
    eyebrow: "Customer operations",
    title: "CRM",
    description: "Track customers, sales, and service work.",
    icon: Gauge,
  },
  "/crm/dashboard": {
    eyebrow: "Customer operations",
    title: "CRM",
    description: "Review pipeline, activity, and follow-ups.",
    icon: Gauge,
  },
  "/crm/approvals": {
    eyebrow: "Commercial control",
    title: "Approvals",
    description: "Review quotes, invoices, and sales orders.",
    icon: ClipboardCheck,
  },
  "/crm/calls": {
    eyebrow: "Relationship activity",
    title: "Calls",
    description: "Review calls and follow-ups.",
    icon: Phone,
  },
  "/crm/campaigns": {
    eyebrow: "Demand generation",
    title: "Campaigns",
    description: "Track campaigns and sales response.",
    icon: Megaphone,
  },
  "/crm/contacts": {
    eyebrow: "Relationship directory",
    title: "Contacts",
    description: "Manage contacts and account links.",
    icon: ContactRound,
  },
  "/crm/contacts/new": {
    eyebrow: "Relationship directory",
    title: "New contact",
    description: "Create a new contact.",
    icon: UserPlus,
  },
  "/crm/customers": {
    eyebrow: "Account operations",
    title: "Customers",
    description: "Manage customer accounts and ownership.",
    icon: Building2,
  },
  "/crm/customers/new": {
    eyebrow: "Account operations",
    title: "New customer",
    description: "Create a new customer account.",
    icon: Building2,
  },
  "/crm/deals": {
    eyebrow: "Sales pipeline",
    title: "Deals",
    description: "Track opportunities, stages, and value.",
    icon: Handshake,
  },
  "/crm/deals/new": {
    eyebrow: "Sales pipeline",
    title: "New deal",
    description: "Create a new deal.",
    icon: CircleDollarSign,
  },
  "/crm/documents": {
    eyebrow: "Relationship records",
    title: "Documents",
    description: "Store customer and commercial documents.",
    icon: FolderKanban,
  },
  "/crm/efficiency": {
    eyebrow: "Sales intelligence",
    title: "Sales efficiency",
    description: "Review CRM team performance.",
    icon: BarChart3,
  },
  "/crm/enquiries": {
    eyebrow: "Demand intake",
    title: "Enquiries",
    description: "Qualify and track incoming enquiries.",
    icon: Inbox,
  },
  "/crm/freight-forwarding": {
    eyebrow: "Demand intake",
    title: "Freight forwarding",
    description: "Track freight enquiries and handoffs.",
    icon: Truck,
  },
  "/crm/customs-clearance": {
    eyebrow: "Demand intake",
    title: "Customs clearance",
    description: "Track customs enquiries and handoffs.",
    icon: ClipboardCheck,
  },
  "/crm/events": {
    eyebrow: "Relationship activity",
    title: "Events",
    description: "Track meetings, visits, and reviews.",
    icon: CalendarClock,
  },
  "/crm/forecasts": {
    eyebrow: "Sales intelligence",
    title: "Forecasts",
    description: "Review pipeline and revenue outlook.",
    icon: Target,
  },
  "/crm/incentives": {
    eyebrow: "Sales incentives",
    title: "Incentives",
    description: "Track incentive inputs for payout review.",
    icon: CircleDollarSign,
  },
  "/crm/invoices": {
    eyebrow: "Commercial documents",
    title: "Invoices",
    description: "Prepare and track customer invoices.",
    icon: ReceiptIndianRupee,
  },
  "/crm/invoices/new": {
    eyebrow: "Commercial documents",
    title: "New invoice",
    description: "Create a new invoice.",
    icon: ReceiptIndianRupee,
  },
  "/crm/items": {
    eyebrow: "Commercial catalogue",
    title: "Items",
    description: "Manage items, pricing, and tax setup.",
    icon: Boxes,
  },
  "/crm/items/new": {
    eyebrow: "Commercial catalogue",
    title: "New item",
    description: "Create a new item.",
    icon: PackageSearch,
  },
  "/crm/lead-sources": {
    eyebrow: "Demand intake",
    title: "Lead sources",
    description: "Manage sources and imports.",
    icon: Settings2,
  },
  "/crm/lead-sources/justdial": {
    eyebrow: "Demand integration",
    title: "JustDial configuration",
    description: "Manage JustDial lead intake.",
    icon: Settings2,
  },
  "/crm/lead-sources/logs": {
    eyebrow: "Demand integration",
    title: "Import history",
    description: "Review import runs and errors.",
    icon: FileText,
  },
  "/crm/leads": {
    eyebrow: "Demand qualification",
    title: "Leads",
    description: "Track prospects and qualification.",
    icon: Users,
    hideHeaderIcon: true,
  },
  "/crm/leads/new": {
    eyebrow: "Demand qualification",
    title: "New lead",
    description: "Create a new lead.",
    icon: UserPlus,
  },
  "/crm/price-books": {
    eyebrow: "Commercial catalogue",
    title: "Price books",
    description: "Manage tariffs and rate books.",
    icon: BookOpen,
  },
  "/crm/masters": {
    eyebrow: "Master data",
    title: "Masters",
    description: "Manage shared CRM master data.",
    icon: Settings2,
  },
  "/crm/products": {
    eyebrow: "Commercial catalogue",
    title: "Products and services",
    description: "Manage products and services.",
    icon: PackageSearch,
  },
  "/crm/projects": {
    eyebrow: "Customer delivery",
    title: "Projects",
    description: "Track customer projects and owners.",
    icon: FolderKanban,
  },
  "/crm/purchase-orders": {
    eyebrow: "Commercial documents",
    title: "Purchase orders",
    description: "Track supplier purchases and allocations.",
    icon: Truck,
  },
  "/crm/quotes": {
    eyebrow: "Commercial documents",
    title: "Quotes",
    description: "Prepare and track customer quotes.",
    icon: FileText,
  },
  "/crm/quotes/new": {
    eyebrow: "Commercial documents",
    title: "New quote",
    description: "Create a new quote.",
    icon: FileText,
  },
  "/crm/sales-inbox": {
    eyebrow: "Relationship communication",
    title: "Sales inbox",
    description: "Review customer email threads.",
    icon: Mail,
  },
  "/crm/sales-orders": {
    eyebrow: "Commercial documents",
    title: "Sales orders",
    description: "Track customer orders and fulfilment.",
    icon: ShoppingCart,
  },
  "/crm/services": {
    eyebrow: "Customer delivery",
    title: "Services",
    description: "Track managed services and accounts.",
    icon: Headphones,
  },
  "/crm/settings": {
    eyebrow: "Commercial configuration",
    title: "CRM settings",
    description: "Manage CRM settings and controls.",
    icon: Settings2,
  },
  "/crm/social": {
    eyebrow: "Relationship communication",
    title: "Social channels",
    description: "Track customer messaging channels.",
    icon: Share2,
  },
  "/crm/solutions": {
    eyebrow: "Customer service",
    title: "Solutions",
    description: "Manage reusable customer guidance.",
    icon: Sparkles,
  },
  "/crm/tasks": {
    eyebrow: "Relationship activity",
    title: "Tasks",
    description: "Track follow-ups and action items.",
    icon: CheckSquare,
  },
  "/crm/tickets": {
    eyebrow: "Customer service",
    title: "Support cases",
    description: "Track customer issues and resolution.",
    icon: TicketCheck,
  },
  "/crm/tickets/new": {
    eyebrow: "Customer service",
    title: "New support case",
    description: "Create a new support case.",
    icon: TicketCheck,
  },
  "/crm/vendors": {
    eyebrow: "Partner directory",
    title: "Vendors",
    description: "Manage vendors and service partners.",
    icon: Truck,
  },
  "/crm/visits": {
    eyebrow: "Relationship activity",
    title: "Visits",
    description: "Track visits and field outcomes.",
    icon: MapPin,
  },
  "/crm/voc": {
    eyebrow: "Customer intelligence",
    title: "Voice of customer",
    description: "Track feedback and improvement items.",
    icon: MessageSquareText,
  },
};

function normalizePathname(pathname: string | null) {
  if (!pathname) return "/";
  const normalized = pathname.replace(/\/+$/, "");
  return normalized || "/";
}

export function getCrmRouteMeta(pathname: string | null): CrmRouteMeta {
  const path = normalizePathname(pathname);
  const exact = exactRouteMeta[path];
  if (exact) return exact;

  if (/^\/crm\/contacts\/[^/]+\/edit$/.test(path)) {
    return {
      eyebrow: "Relationship directory",
      title: "Edit contact",
      description: "Update contact details and links.",
      icon: ContactRound,
    };
  }
  if (/^\/crm\/contacts\/[^/]+$/.test(path)) {
    return {
      eyebrow: "Relationship record",
      title: "Contact detail",
      description: "Review contact activity and details.",
      icon: ContactRound,
    };
  }
  if (/^\/crm\/customers\/[^/]+\/edit$/.test(path)) {
    return {
      eyebrow: "Account operations",
      title: "Edit customer",
      description: "Update customer details and access.",
      icon: Building2,
    };
  }
  if (/^\/crm\/customers\/[^/]+$/.test(path)) {
    return {
      eyebrow: "Account record",
      title: "Customer detail",
      description: "Review customer activity and history.",
      icon: Building2,
    };
  }
  if (/^\/crm\/deals\/[^/]+\/edit$/.test(path)) {
    return {
      eyebrow: "Sales pipeline",
      title: "Edit deal",
      description: "Update deal stage and details.",
      icon: Handshake,
    };
  }
  if (/^\/crm\/deals\/[^/]+$/.test(path)) {
    return {
      eyebrow: "Opportunity record",
      title: "Deal detail",
      description: "Review deal progress and history.",
      icon: Handshake,
    };
  }
  if (/^\/crm\/enquiries\/[^/]+$/.test(path)) {
    return {
      eyebrow: "Demand record",
      title: "Enquiry detail",
      description: "Review enquiry details and ownership.",
      icon: Inbox,
    };
  }
  if (/^\/crm\/freight-forwarding\/[^/]+$/.test(path)) {
    return {
      eyebrow: "Demand record",
      title: "Freight forwarding enquiry",
      description: "Review the freight enquiry and links.",
      icon: Truck,
    };
  }
  if (/^\/crm\/customs-clearance\/[^/]+$/.test(path)) {
    return {
      eyebrow: "Demand record",
      title: "Customs clearance enquiry",
      description: "Review the customs enquiry and links.",
      icon: ClipboardCheck,
    };
  }
  if (/^\/crm\/invoices\/[^/]+$/.test(path)) {
    return {
      eyebrow: "Commercial document",
      title: "Invoice detail",
      description: "Review invoice totals and status.",
      icon: ReceiptIndianRupee,
    };
  }
  if (/^\/crm\/items\/[^/]+$/.test(path)) {
    return {
      eyebrow: "Commercial catalogue",
      title: "Item detail",
      description: "Review item pricing and setup.",
      icon: Boxes,
    };
  }
  if (/^\/crm\/leads\/[^/]+\/edit$/.test(path)) {
    return {
      eyebrow: "Demand qualification",
      title: "Edit lead",
      description: "Update lead details and status.",
      icon: Users,
    };
  }
  if (/^\/crm\/leads\/[^/]+$/.test(path)) {
    return {
      eyebrow: "Prospect record",
      title: "Lead detail",
      description: "Review lead activity and progress.",
      icon: Users,
    };
  }
  if (/^\/crm\/quotes\/[^/]+\/edit$/.test(path)) {
    return {
      eyebrow: "Commercial document",
      title: "Edit quote",
      description: "Update quote details and pricing.",
      icon: FileText,
    };
  }
  if (/^\/crm\/quotes\/[^/]+$/.test(path)) {
    return {
      eyebrow: "Commercial document",
      title: "Quote detail",
      description: "Review quote totals and status.",
      icon: FileText,
    };
  }
  if (/^\/crm\/tickets\/[^/]+$/.test(path)) {
    return {
      eyebrow: "Customer service record",
      title: "Support case detail",
      description: "Review issue status and history.",
      icon: TicketCheck,
    };
  }

  return {
    eyebrow: "Customer operations",
    title: "CRM workspace",
    description: "Track customer, sales, and service work.",
    icon: Landmark,
  };
}

export function CrmWorkspaceFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const meta = getCrmRouteMeta(pathname);
  const Icon = meta.icon;

  return (
    <WorkspacePage className="mnx-crm-page" data-crm-workspace="true">
      <WorkspacePageHeader
        className="mnx-crm-page-header"
        eyebrow={meta.eyebrow}
        title={meta.title}
        description={meta.description}
        icon={meta.hideHeaderIcon ? undefined : <Icon aria-hidden="true" />}
      />
      <div className="mnx-crm-content">{children}</div>
    </WorkspacePage>
  );
}

// Honest guidance for workspaces that are on the roadmap but not built yet.
// Each entry names the capability and points to the closest tool that works today.
const CRM_PLANNED_WORKSPACES: Record<
  string,
  { summary: string; detail: string; useInstead?: { href: string; label: string } }
> = {
  "/crm/campaigns": {
    summary: "Campaign tracking is on the roadmap.",
    detail: "Channel and origin attribution is available today under Lead Sources.",
    useInstead: { href: "/crm/lead-sources", label: "Go to Lead Sources" },
  },
  "/crm/documents": {
    summary: "A central CRM document library is on the roadmap.",
    detail:
      "Files can be attached directly to each Lead, Deal, Customer and Quote record today.",
    useInstead: { href: "/crm/customers", label: "Open Customers" },
  },
  "/crm/price-books": {
    summary: "Price books are on the roadmap.",
    detail: "Rate cards and standard buy rates are maintained today under Masters.",
    useInstead: { href: "/crm/masters", label: "Go to Masters" },
  },
  "/crm/services": {
    summary: "A dedicated service catalog is on the roadmap.",
    detail: "Service lines are maintained today under Products & Services.",
    useInstead: { href: "/crm/products", label: "Go to Products & Services" },
  },
  "/crm/sales-inbox": {
    summary: "A unified sales inbox is on the roadmap.",
    detail: "Inbound demand is captured today under Enquiries.",
    useInstead: { href: "/crm/enquiries", label: "Go to Enquiries" },
  },
  "/crm/solutions": {
    summary: "A solutions knowledge base is on the roadmap.",
    detail: "Customer issues are tracked today under Support Cases.",
    useInstead: { href: "/crm/tickets", label: "Go to Support Cases" },
  },
  "/crm/social": {
    summary: "Social lead capture is on the roadmap.",
    detail: "Channel attribution is available today under Lead Sources.",
    useInstead: { href: "/crm/lead-sources", label: "Go to Lead Sources" },
  },
  "/crm/voc": {
    summary: "Voice-of-Customer surveys are on the roadmap.",
    detail: "Structured customer feedback is captured today under Support Cases.",
    useInstead: { href: "/crm/tickets", label: "Go to Support Cases" },
  },
  "/crm/visits": {
    summary: "Field-visit logging inside CRM is on the roadmap.",
    detail:
      "Customer visits are logged today through Location & Field Tracking in the HRMS module.",
  },
};

export function CrmRouteOverview() {
  const pathname = usePathname();
  const meta = getCrmRouteMeta(pathname);
  const Icon = meta.icon;
  const planned = CRM_PLANNED_WORKSPACES[normalizePathname(pathname)];

  return (
    <CrmSection
      eyebrow={meta.eyebrow}
      title={meta.title}
      description={meta.description}
    >
      <CrmPanel className="mnx-crm-placeholder">
        <span className="mnx-crm-placeholder-icon">
          <Icon aria-hidden="true" />
        </span>
        <div>
          <CrmStatus variant={planned ? "warning" : "success"}>
            {planned ? "Planned — not yet available" : "Synchronised and live"}
          </CrmStatus>
          <h3>{planned ? `${meta.title} is coming soon` : `${meta.title} is active`}</h3>
          <p>
            {planned
              ? `${planned.summary} ${planned.detail}`
              : "Records remain organisation-scoped and permission-aware in the shared customer operations workspace."}
          </p>
          {planned?.useInstead ? (
            <p>
              <Link className="mnx-crm-inline-link" href={planned.useInstead.href}>
                {planned.useInstead.label} →
              </Link>
            </p>
          ) : null}
        </div>
      </CrmPanel>
    </CrmSection>
  );
}

export function CrmMetrics({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn("mnx-workspace-metrics mnx-crm-metrics", className)}
      {...props}
    />
  );
}

export function CrmMetric({
  detail,
  href,
  icon,
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
      label={label}
      value={value}
      detail={detail}
      icon={icon}
      href={href}
    />
  );
}

export function CrmSection({
  actions,
  children,
  className,
  description,
  eyebrow,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  eyebrow?: string;
  title: ReactNode;
}) {
  return (
    <WorkspacePanel className={cn("mnx-crm-section", className)}>
      <WorkspacePanelHeader
        className="mnx-crm-section-header"
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={actions}
      />
      <div className="mnx-crm-section-content">{children}</div>
    </WorkspacePanel>
  );
}

export function CrmPanel({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return <WorkspacePanel className={cn("mnx-crm-panel", className)} {...props} />;
}

export function CrmToolbar({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mnx-crm-toolbar", className)} {...props} />;
}

export function CrmTabs({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mnx-crm-tabs", className)} role="tablist" {...props} />
  );
}

export const CrmButton = React.forwardRef<
  HTMLButtonElement,
  WorkspaceActionProps
>(({ className, variant = "secondary", ...props }, ref) => (
  <WorkspaceAction
    ref={ref}
    variant={variant}
    className={cn("mnx-crm-button", className)}
    {...props}
  />
));

CrmButton.displayName = "CrmButton";

export const CrmInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  const isChoice = type === "checkbox" || type === "radio";
  const isRange = type === "range";
  const isManaged = type === "file" || type === "hidden";
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        isChoice
          ? "mnx-choice-control"
          : isRange
            ? "mnx-range-control"
            : isManaged
              ? "mnx-managed-input"
              : "mnx-field-control",
        className,
      )}
      {...props}
    />
  );
});

CrmInput.displayName = "CrmInput";

export const CrmSelect = React.forwardRef<
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

CrmSelect.displayName = "CrmSelect";

export const CrmTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn("mnx-field-control mnx-field-textarea", className)}
    {...props}
  />
));

CrmTextarea.displayName = "CrmTextarea";

export const CrmTable = React.forwardRef<
  HTMLTableElement,
  TableHTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <table ref={ref} className={cn("mnx-workspace-table mnx-crm-table", className)} {...props} />
));

CrmTable.displayName = "CrmTable";

export function CrmEmptyTableRow({
  children,
  colSpan,
}: {
  children: ReactNode;
  colSpan: number;
}) {
  return (
    <WorkspaceEmptyTableRow colSpan={colSpan}>
      {children}
    </WorkspaceEmptyTableRow>
  );
}

export function CrmActionLink({
  children,
  className,
  href,
  primary = false,
  size = "compact",
}: {
  children: ReactNode;
  className?: string;
  href: string;
  primary?: boolean;
  size?: "default" | "compact";
}) {
  const router = useRouter();

  return (
    <Button
      className={className}
      variant={primary ? "default" : "inverse"}
      size={size === "compact" ? "sm" : "md"}
      onClick={() => router.push(href)}
    >
      {children}
    </Button>
  );
}

export function CrmRecordLink({
  children,
  className,
  href,
}: {
  children: ReactNode;
  className?: string;
  href: string;
}) {
  return (
    <Link className={cn("mnx-crm-record-link", className)} href={href}>
      {children}
    </Link>
  );
}

export function CrmDialogLayer({
  children,
  className,
  labelledBy,
  onClose,
  open,
  size = "default",
}: {
  children: ReactNode;
  className?: string;
  labelledBy?: string;
  onClose: () => void;
  open: boolean;
  size?: WorkspaceDialogSize;
}) {
  return (
    <WorkspaceDialogLayer
      className={cn("mnx-crm-dialog", className)}
      labelledBy={labelledBy}
      onClose={onClose}
      open={open}
      size={size}
    >
      {children}
    </WorkspaceDialogLayer>
  );
}

export function CrmDialog({
  children,
  className,
  description,
  footer,
  onClose,
  open,
  size = "default",
  title,
}: {
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  open: boolean;
  size?: WorkspaceDialogSize;
  title: ReactNode;
}) {
  return (
    <WorkspaceDialog
      className={cn("mnx-crm-dialog", className)}
      eyebrow="Customer operations"
      title={title}
      description={description}
      footer={footer}
      onClose={onClose}
      open={open}
      size={size}
    >
      {children}
    </WorkspaceDialog>
  );
}

export function CrmPermissionState({
  description = "You do not have permission to open this CRM workspace.",
}: {
  description?: string;
}) {
  return (
    <WorkspaceState
      variant="permission"
      eyebrow="Customer operations"
      title="Access restricted"
      description={description}
      icon={<AlertTriangle aria-hidden="true" />}
    />
  );
}

export function CrmConfigurationState({
  description = "The current session is missing the organisation context required by CRM.",
}: {
  description?: string;
}) {
  return (
    <WorkspaceState
      variant="danger"
      eyebrow="Customer operations"
      title="Configuration required"
      description={description}
      icon={<AlertTriangle aria-hidden="true" />}
    />
  );
}

export function CrmLoadingState({
  description = "Loading customer operations data.",
}: {
  description?: string;
}) {
  return (
    <WorkspaceState
      variant="loading"
      eyebrow="Customer operations"
      title="Loading workspace"
      description={description}
      icon={<LoaderCircle className="mnx-state-spinner" aria-hidden="true" />}
    />
  );
}

export function CrmEmptyState({
  description,
  title = "No records found",
}: {
  description: string;
  title?: string;
}) {
  return (
    <WorkspaceState
      variant="empty"
      eyebrow="Customer operations"
      title={title}
      description={description}
      icon={<Sparkles aria-hidden="true" />}
    />
  );
}

export function CrmErrorState({
  description,
  onRetry,
}: {
  description: string;
  onRetry?: () => void;
}) {
  return (
    <WorkspaceState
      variant="danger"
      eyebrow="Customer operations"
      title="This workspace could not be loaded"
      description={description}
      icon={<AlertTriangle aria-hidden="true" />}
      action={
        onRetry ? <WorkspaceAction onClick={onRetry}>Try again</WorkspaceAction> : null
      }
    />
  );
}

export const CrmField = WorkspaceField;
export const CrmStatus = WorkspaceBadge;
