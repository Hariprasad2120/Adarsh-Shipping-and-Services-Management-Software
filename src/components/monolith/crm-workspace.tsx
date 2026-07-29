"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "./workspace";
import {
  WorkspaceDialog,
  WorkspaceDialogLayer,
  type WorkspaceDialogSize,
} from "./workspace-dialog";

type CrmRouteMeta = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

const exactRouteMeta: Record<string, CrmRouteMeta> = {
  "/crm": {
    eyebrow: "Customer operations",
    title: "CRM command centre",
    description:
      "Coordinate acquisition, customer relationships, commercial documents, service activity, and sales outcomes.",
    icon: Gauge,
  },
  "/crm/dashboard": {
    eyebrow: "Customer operations",
    title: "CRM command centre",
    description:
      "Monitor relationship health, active opportunities, commercial activity, and follow-up signals.",
    icon: Gauge,
  },
  "/crm/approvals": {
    eyebrow: "Commercial control",
    title: "Approvals",
    description:
      "Review quotes, invoices, and sales orders through the configured commercial approval workflow.",
    icon: ClipboardCheck,
  },
  "/crm/calls": {
    eyebrow: "Relationship activity",
    title: "Calls",
    description:
      "Review customer conversations, recording outcomes, follow-ups, and owner activity.",
    icon: Phone,
  },
  "/crm/campaigns": {
    eyebrow: "Demand generation",
    title: "Campaigns",
    description:
      "Coordinate campaigns, acquisition channels, trade-show activity, and return on sales investment.",
    icon: Megaphone,
  },
  "/crm/contacts": {
    eyebrow: "Relationship directory",
    title: "Contacts",
    description:
      "Maintain people, roles, communication details, ownership, and account relationships.",
    icon: ContactRound,
  },
  "/crm/contacts/new": {
    eyebrow: "Relationship directory",
    title: "New contact",
    description:
      "Create a contact and connect the person to an account, owner, and communication context.",
    icon: UserPlus,
  },
  "/crm/customers": {
    eyebrow: "Account operations",
    title: "Customers",
    description:
      "Maintain customer accounts, relationship ownership, portal access, and commercial context.",
    icon: Building2,
  },
  "/crm/customers/new": {
    eyebrow: "Account operations",
    title: "New customer",
    description:
      "Create an account with its identity, contacts, ownership, addresses, and commercial settings.",
    icon: Building2,
  },
  "/crm/deals": {
    eyebrow: "Sales pipeline",
    title: "Deals",
    description:
      "Manage qualified opportunities, stages, value, probability, ownership, and expected close dates.",
    icon: Handshake,
  },
  "/crm/deals/new": {
    eyebrow: "Sales pipeline",
    title: "New deal",
    description:
      "Open a qualified opportunity with the account, owner, value, stage, and forecast context.",
    icon: CircleDollarSign,
  },
  "/crm/documents": {
    eyebrow: "Relationship records",
    title: "Documents",
    description:
      "Keep agreements, proposals, operating documents, and customer records in one controlled workspace.",
    icon: FolderKanban,
  },
  "/crm/efficiency": {
    eyebrow: "Sales intelligence",
    title: "Sales efficiency",
    description:
      "Review conversion, response, ownership, activity, and commercial performance across the CRM team.",
    icon: BarChart3,
  },
  "/crm/enquiries": {
    eyebrow: "Demand intake",
    title: "Enquiries",
    description:
      "Qualify incoming customer requests and coordinate their conversion into active sales work.",
    icon: Inbox,
  },
  "/crm/events": {
    eyebrow: "Relationship activity",
    title: "Events",
    description:
      "Plan customer meetings, site visits, reviews, and commercial coordination checkpoints.",
    icon: CalendarClock,
  },
  "/crm/forecasts": {
    eyebrow: "Sales intelligence",
    title: "Forecasts",
    description:
      "Review weighted pipeline, expected revenue, team targets, and closing confidence.",
    icon: Target,
  },
  "/crm/invoices": {
    eyebrow: "Commercial documents",
    title: "Invoices",
    description:
      "Prepare, approve, issue, and track customer invoices without losing their commercial audit trail.",
    icon: ReceiptIndianRupee,
  },
  "/crm/invoices/new": {
    eyebrow: "Commercial documents",
    title: "New invoice",
    description:
      "Prepare a customer invoice with controlled items, tax, terms, ownership, and approval context.",
    icon: ReceiptIndianRupee,
  },
  "/crm/items": {
    eyebrow: "Commercial catalogue",
    title: "Items",
    description:
      "Maintain saleable and purchasable items, pricing, logistics, inventory, and tax metadata.",
    icon: Boxes,
  },
  "/crm/items/new": {
    eyebrow: "Commercial catalogue",
    title: "New item",
    description:
      "Create a catalogue item with its commercial, inventory, purchasing, and logistics settings.",
    icon: PackageSearch,
  },
  "/crm/lead-sources": {
    eyebrow: "Demand intake",
    title: "Lead sources",
    description:
      "Configure acquisition sources, imports, integration state, and ingestion history.",
    icon: Settings2,
  },
  "/crm/lead-sources/justdial": {
    eyebrow: "Demand integration",
    title: "JustDial configuration",
    description:
      "Configure controlled JustDial lead ingestion, ownership, scheduling, and duplicate policy.",
    icon: Settings2,
  },
  "/crm/lead-sources/logs": {
    eyebrow: "Demand integration",
    title: "Import history",
    description:
      "Review lead-import runs, outcomes, duplicate handling, and integration errors.",
    icon: FileText,
  },
  "/crm/leads": {
    eyebrow: "Demand qualification",
    title: "Leads",
    description:
      "Prioritise new prospects, follow-up windows, qualification status, ownership, and conversion.",
    icon: Users,
  },
  "/crm/leads/new": {
    eyebrow: "Demand qualification",
    title: "New lead",
    description:
      "Create a prospective relationship with its source, ownership, contact details, and qualification context.",
    icon: UserPlus,
  },
  "/crm/price-books": {
    eyebrow: "Commercial catalogue",
    title: "Price books",
    description:
      "Maintain reusable customer tariffs, freight lanes, service bundles, and negotiated rate schedules.",
    icon: BookOpen,
  },
  "/crm/products": {
    eyebrow: "Commercial catalogue",
    title: "Products and services",
    description:
      "Maintain the sellable product and service catalogue used by opportunities and commercial documents.",
    icon: PackageSearch,
  },
  "/crm/projects": {
    eyebrow: "Customer delivery",
    title: "Projects",
    description:
      "Coordinate customer projects, accountable owners, dates, value, and delivery status.",
    icon: FolderKanban,
  },
  "/crm/purchase-orders": {
    eyebrow: "Commercial documents",
    title: "Purchase orders",
    description:
      "Coordinate approved supplier purchases, outsourced services, and carrier allocations.",
    icon: Truck,
  },
  "/crm/quotes": {
    eyebrow: "Commercial documents",
    title: "Quotes",
    description:
      "Prepare, approve, issue, and track customer proposals with controlled pricing and tax calculations.",
    icon: FileText,
  },
  "/crm/quotes/new": {
    eyebrow: "Commercial documents",
    title: "New quote",
    description:
      "Prepare a proposal with customer, service, pricing, tax, terms, and approval context.",
    icon: FileText,
  },
  "/crm/sales-inbox": {
    eyebrow: "Relationship communication",
    title: "Sales inbox",
    description:
      "Coordinate customer email threads with their account, contact, lead, and owner context.",
    icon: Mail,
  },
  "/crm/sales-orders": {
    eyebrow: "Commercial documents",
    title: "Sales orders",
    description:
      "Manage approved customer orders and the transition from commercial commitment to fulfilment.",
    icon: ShoppingCart,
  },
  "/crm/services": {
    eyebrow: "Customer delivery",
    title: "Services",
    description:
      "Coordinate recurring logistics services and managed offerings attached to customer accounts.",
    icon: Headphones,
  },
  "/crm/social": {
    eyebrow: "Relationship communication",
    title: "Social channels",
    description:
      "Track customer communication across messaging channels and operational notifications.",
    icon: Share2,
  },
  "/crm/solutions": {
    eyebrow: "Customer service",
    title: "Solutions",
    description:
      "Maintain reusable answers, operating procedures, customs guidance, and customer service knowledge.",
    icon: Sparkles,
  },
  "/crm/tasks": {
    eyebrow: "Relationship activity",
    title: "Tasks",
    description:
      "Coordinate follow-ups, owner assignments, due dates, priorities, and sales action items.",
    icon: CheckSquare,
  },
  "/crm/tickets": {
    eyebrow: "Customer service",
    title: "Support cases",
    description:
      "Triage customer issues, ownership, priority, status, communication, and resolution history.",
    icon: TicketCheck,
  },
  "/crm/tickets/new": {
    eyebrow: "Customer service",
    title: "New support case",
    description:
      "Register a customer issue with its account, requester, severity, owner, and initial evidence.",
    icon: TicketCheck,
  },
  "/crm/vendors": {
    eyebrow: "Partner directory",
    title: "Vendors",
    description:
      "Maintain suppliers, carriers, service partners, ownership, contact details, and commercial context.",
    icon: Truck,
  },
  "/crm/visits": {
    eyebrow: "Relationship activity",
    title: "Visits",
    description:
      "Coordinate customer meetings, site inspections, field outcomes, and relationship touchpoints.",
    icon: MapPin,
  },
  "/crm/voc": {
    eyebrow: "Customer intelligence",
    title: "Voice of customer",
    description:
      "Capture satisfaction, pain points, service feedback, and accountable improvement opportunities.",
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
      description:
        "Update the contact, account relationship, ownership, communication details, and role.",
      icon: ContactRound,
    };
  }
  if (/^\/crm\/contacts\/[^/]+$/.test(path)) {
    return {
      eyebrow: "Relationship record",
      title: "Contact detail",
      description:
        "Review relationship context, activity, notes, attachments, and account connections.",
      icon: ContactRound,
    };
  }
  if (/^\/crm\/customers\/[^/]+\/edit$/.test(path)) {
    return {
      eyebrow: "Account operations",
      title: "Edit customer",
      description:
        "Update identity, ownership, contacts, addresses, portal access, and commercial settings.",
      icon: Building2,
    };
  }
  if (/^\/crm\/customers\/[^/]+$/.test(path)) {
    return {
      eyebrow: "Account record",
      title: "Customer detail",
      description:
        "Review contacts, opportunities, activity, notes, attachments, and relationship history.",
      icon: Building2,
    };
  }
  if (/^\/crm\/deals\/[^/]+\/edit$/.test(path)) {
    return {
      eyebrow: "Sales pipeline",
      title: "Edit deal",
      description:
        "Update qualification, account, owner, value, stage, probability, and closing context.",
      icon: Handshake,
    };
  }
  if (/^\/crm\/deals\/[^/]+$/.test(path)) {
    return {
      eyebrow: "Opportunity record",
      title: "Deal detail",
      description:
        "Review stage, value, customer context, activity, notes, attachments, and commercial history.",
      icon: Handshake,
    };
  }
  if (/^\/crm\/enquiries\/[^/]+$/.test(path)) {
    return {
      eyebrow: "Demand record",
      title: "Enquiry detail",
      description:
        "Review the request, ownership, qualification, communication, and conversion context.",
      icon: Inbox,
    };
  }
  if (/^\/crm\/invoices\/[^/]+$/.test(path)) {
    return {
      eyebrow: "Commercial document",
      title: "Invoice detail",
      description:
        "Review customer, items, tax, totals, approval state, communication, and audit history.",
      icon: ReceiptIndianRupee,
    };
  }
  if (/^\/crm\/items\/[^/]+$/.test(path)) {
    return {
      eyebrow: "Commercial catalogue",
      title: "Item detail",
      description:
        "Review pricing, inventory, purchasing, logistics, tax, and catalogue configuration.",
      icon: Boxes,
    };
  }
  if (/^\/crm\/leads\/[^/]+\/edit$/.test(path)) {
    return {
      eyebrow: "Demand qualification",
      title: "Edit lead",
      description:
        "Update identity, source, owner, contact details, status, and qualification context.",
      icon: Users,
    };
  }
  if (/^\/crm\/leads\/[^/]+$/.test(path)) {
    return {
      eyebrow: "Prospect record",
      title: "Lead detail",
      description:
        "Coordinate qualification, calls, remarks, follow-ups, conversion, notes, and relationship history.",
      icon: Users,
    };
  }
  if (/^\/crm\/quotes\/[^/]+\/edit$/.test(path)) {
    return {
      eyebrow: "Commercial document",
      title: "Edit quote",
      description:
        "Update customer, items, pricing, tax, terms, attachments, and approval context.",
      icon: FileText,
    };
  }
  if (/^\/crm\/quotes\/[^/]+$/.test(path)) {
    return {
      eyebrow: "Commercial document",
      title: "Quote detail",
      description:
        "Review the proposal, customer, line items, totals, approval state, delivery, and audit history.",
      icon: FileText,
    };
  }
  if (/^\/crm\/tickets\/[^/]+$/.test(path)) {
    return {
      eyebrow: "Customer service record",
      title: "Support case detail",
      description:
        "Coordinate the issue, priority, ownership, communication, status, and resolution history.",
      icon: TicketCheck,
    };
  }

  return {
    eyebrow: "Customer operations",
    title: "CRM workspace",
    description:
      "Coordinate relationship, commercial, and service work through the shared customer operations system.",
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
        icon={<Icon aria-hidden="true" />}
      />
      <div className="mnx-crm-content">{children}</div>
    </WorkspacePage>
  );
}

export function CrmRouteOverview() {
  const pathname = usePathname();
  const meta = getCrmRouteMeta(pathname);
  const Icon = meta.icon;

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
          <CrmStatus variant="success">Synchronised and live</CrmStatus>
          <h3>{meta.title} is active</h3>
          <p>
            Records remain organisation-scoped and permission-aware in the
            shared customer operations workspace.
          </p>
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
}: {
  children: ReactNode;
  className?: string;
  href: string;
  primary?: boolean;
}) {
  return (
    <Link
      className={cn(
        "mnx-button",
        primary ? "mnx-button-primary" : "mnx-button-secondary",
        className,
      )}
      href={href}
    >
      {children}
    </Link>
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
