"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpenText,
  Boxes,
  BriefcaseBusiness,
  Calculator,
  FileBarChart,
  FileCheck2,
  FilePlus2,
  FileSpreadsheet,
  Landmark,
  LayoutDashboard,
  LoaderCircle,
  NotebookTabs,
  ReceiptText,
  Settings2,
  ShieldAlert,
  ShoppingCart,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
  TableHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";
import {
  WorkspaceAction,
  WorkspaceAlert,
  WorkspaceBadge,
  WorkspaceCheckbox,
  WorkspaceEmptyTableRow,
  WorkspaceField,
  WorkspaceInput,
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
import {
  WorkspaceDialog,
  type WorkspaceDialogSize,
} from "@/components/layout/workspace-dialog";

type AccountingRouteMeta = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

const exactRouteMeta: Record<string, AccountingRouteMeta> = {
  "/accounting": {
    eyebrow: "Finance operations",
    title: "Accounting command centre",
    description:
      "Monitor double-entry ledgers, liquidity, receivables, payables, financial controls, and period performance.",
    icon: LayoutDashboard,
  },
  "/accounting/accounts": {
    eyebrow: "Ledger administration",
    title: "Chart of accounts",
    description:
      "Maintain the controlled account hierarchy, branch mappings, opening balances, and posting classifications.",
    icon: NotebookTabs,
  },
  "/accounting/balance-sheet": {
    eyebrow: "Financial statements",
    title: "Balance sheet",
    description:
      "Review assets, liabilities, and equity as of the selected reporting date.",
    icon: FileBarChart,
  },
  "/accounting/banking": {
    eyebrow: "Treasury operations",
    title: "Banking and cash",
    description:
      "Review liquid accounts and record controlled transfers between bank and cash ledgers.",
    icon: Landmark,
  },
  "/accounting/general-ledger": {
    eyebrow: "Ledger reporting",
    title: "General ledger",
    description:
      "Trace posted debits and credits by account and reporting period.",
    icon: BookOpenText,
  },
  "/accounting/invoices-sales": {
    eyebrow: "Commercial documents",
    title: "Sales documents",
    description:
      "Track customer invoices through the shared commercial document workflow.",
    icon: ReceiptText,
  },
  "/accounting/invoices-sales/new": {
    eyebrow: "Commercial documents",
    title: "New sales invoice",
    description:
      "Create a customer invoice with ownership, pricing, tax, currency, and payment terms.",
    icon: FilePlus2,
  },
  "/accounting/items": {
    eyebrow: "Accounting catalogue",
    title: "Items and services",
    description:
      "Maintain billable services, inventory items, tax treatment, rates, and multi-currency prices.",
    icon: Boxes,
  },
  "/accounting/items/new": {
    eyebrow: "Accounting catalogue",
    title: "New item",
    description:
      "Register a product or service with its sales, purchase, tax, inventory, and logistics attributes.",
    icon: FilePlus2,
  },
  "/accounting/jobs": {
    eyebrow: "Job accounting",
    title: "Cargo job costing",
    description:
      "Compare contract value, invoiced revenue, purchase cost, and ledger postings for each cargo job.",
    icon: BriefcaseBusiness,
  },
  "/accounting/journal-entries": {
    eyebrow: "General journal",
    title: "Journal entries",
    description:
      "Review balanced vouchers and their draft, posted, cancelled, and reversal states.",
    icon: BookOpenText,
  },
  "/accounting/journal-entries/new": {
    eyebrow: "General journal",
    title: "New journal entry",
    description:
      "Create a balanced multi-line voucher with branch, reference, and posting controls.",
    icon: FilePlus2,
  },
  "/accounting/payment-entries": {
    eyebrow: "Receipts and payments",
    title: "Payment entries",
    description:
      "Track incoming receipts, outgoing payments, allocations, and ledger posting state.",
    icon: WalletCards,
  },
  "/accounting/payment-entries/new": {
    eyebrow: "Receipts and payments",
    title: "New payment entry",
    description:
      "Record a receipt or payment and allocate it against outstanding documents.",
    icon: FilePlus2,
  },
  "/accounting/profit-loss": {
    eyebrow: "Financial statements",
    title: "Profit and loss",
    description:
      "Review income, expenses, and net operating performance for the selected period.",
    icon: BarChart3,
  },
  "/accounting/purchase-invoices": {
    eyebrow: "Accounts payable",
    title: "Purchase invoices",
    description:
      "Track supplier bills, posting state, payment allocation, and outstanding balances.",
    icon: ShoppingCart,
  },
  "/accounting/purchase-invoices/new": {
    eyebrow: "Accounts payable",
    title: "New purchase invoice",
    description:
      "Capture a supplier bill with branch, items, tax, due date, and posting controls.",
    icon: FilePlus2,
  },
  "/accounting/purchase-orders": {
    eyebrow: "Commercial documents",
    title: "Purchase orders",
    description:
      "Track supplier purchase orders through the shared commercial document workflow.",
    icon: ShoppingCart,
  },
  "/accounting/purchase-orders/new": {
    eyebrow: "Commercial documents",
    title: "New purchase order",
    description:
      "Create a supplier order with ownership, pricing, tax, currency, and delivery terms.",
    icon: FilePlus2,
  },
  "/accounting/quotations": {
    eyebrow: "Commercial pipeline",
    title: "Quotations and customer notes",
    description:
      "Prepare quotations, convert accepted work to invoices, and manage customer debit or credit notes.",
    icon: FileCheck2,
  },
  "/accounting/reports": {
    eyebrow: "Financial intelligence",
    title: "Accounting reports",
    description:
      "Run statements, registers, ageing, GST, cash, journal, and job-profitability reports.",
    icon: FileSpreadsheet,
  },
  "/accounting/sales-invoices": {
    eyebrow: "Accounts receivable",
    title: "Sales invoices",
    description:
      "Track customer invoices, posting state, payment allocation, and outstanding balances.",
    icon: ReceiptText,
  },
  "/accounting/sales-invoices/new": {
    eyebrow: "Accounts receivable",
    title: "New sales invoice",
    description:
      "Create a customer invoice with branch, items, tax, due date, and posting controls.",
    icon: FilePlus2,
  },
  "/accounting/sales-orders": {
    eyebrow: "Commercial documents",
    title: "Sales orders",
    description:
      "Track customer sales orders through the shared commercial document workflow.",
    icon: FileCheck2,
  },
  "/accounting/sales-orders/new": {
    eyebrow: "Commercial documents",
    title: "New sales order",
    description:
      "Create a customer order with ownership, pricing, tax, currency, and delivery terms.",
    icon: FilePlus2,
  },
  "/accounting/settings": {
    eyebrow: "Accounting administration",
    title: "Accounting settings",
    description:
      "Configure numbering, financial year, transaction locks, default ledgers, and GST policy.",
    icon: Settings2,
  },
  "/accounting/trial-balance": {
    eyebrow: "Ledger reporting",
    title: "Trial balance",
    description:
      "Confirm debit and credit balances across the chart of accounts for the selected period.",
    icon: Calculator,
  },
};

function normalizePathname(pathname: string | null) {
  if (!pathname) return "/";
  const normalized = pathname.replace(/\/+$/, "");
  return normalized || "/";
}

export function getAccountingRouteMeta(
  pathname: string | null,
): AccountingRouteMeta {
  const path = normalizePathname(pathname);
  const exact = exactRouteMeta[path];
  if (exact) return exact;

  if (/^\/accounting\/items\/[^/]+$/.test(path)) {
    return {
      eyebrow: "Accounting catalogue",
      title: "Item details",
      description:
        "Review sales, purchase, tax, inventory, logistics, and multi-currency pricing information.",
      icon: Boxes,
    };
  }

  if (/^\/accounting\/journal-entries\/[^/]+$/.test(path)) {
    return {
      eyebrow: "General journal",
      title: "Journal entry details",
      description:
        "Review voucher lines, balance, audit references, posting state, and reversal controls.",
      icon: BookOpenText,
    };
  }

  if (/^\/accounting\/payment-entries\/[^/]+$/.test(path)) {
    return {
      eyebrow: "Receipts and payments",
      title: "Payment entry details",
      description:
        "Review payment direction, party, allocations, ledger accounts, and posting state.",
      icon: WalletCards,
    };
  }

  if (/^\/accounting\/purchase-invoices\/[^/]+$/.test(path)) {
    return {
      eyebrow: "Accounts payable",
      title: "Purchase invoice details",
      description:
        "Review supplier charges, taxes, totals, allocations, and posting controls.",
      icon: ShoppingCart,
    };
  }

  if (/^\/accounting\/sales-invoices\/[^/]+$/.test(path)) {
    return {
      eyebrow: "Accounts receivable",
      title: "Sales invoice details",
      description:
        "Review customer charges, taxes, totals, allocations, and posting controls.",
      icon: ReceiptText,
    };
  }

  return exactRouteMeta["/accounting"];
}

export function AccountingWorkspaceFrame({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <WorkspacePage
      className="mnx-accounting-page"
      data-accounting-workspace="true"
    >
      <div className="mnx-accounting-content">{children}</div>
    </WorkspacePage>
  );
}

export function AccountingRoutePageHeader({
  actions,
  className,
  description,
  eyebrow,
  icon,
  title,
}: {
  actions?: ReactNode;
  className?: string;
  description?: ReactNode;
  eyebrow?: string;
  icon?: ReactNode;
  title?: ReactNode;
}) {
  const pathname = usePathname();
  const meta = getAccountingRouteMeta(pathname);
  const MetaIcon = meta.icon;

  return (
    <WorkspacePageHeader
      className={cn("mnx-accounting-page-header", className)}
      eyebrow={eyebrow ?? meta.eyebrow}
      title={title ?? meta.title}
      description={description ?? meta.description}
      icon={icon ?? <MetaIcon aria-hidden="true" />}
      actions={actions}
    />
  );
}

export function AccountingMetrics({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn("mnx-workspace-metrics mnx-accounting-metrics", className)}
      {...props}
    />
  );
}

export const AccountingMetric = WorkspaceMetric;

export function AccountingSection({
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
    <WorkspacePanel className={cn("mnx-accounting-section", className)}>
      <WorkspacePanelHeader
        className="mnx-accounting-section-header"
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={actions}
      />
      <div className="mnx-accounting-section-content">{children}</div>
    </WorkspacePanel>
  );
}

export function AccountingPanel({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <WorkspacePanel
      className={cn("mnx-accounting-panel", className)}
      {...props}
    />
  );
}

export function AccountingToolbar({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mnx-accounting-toolbar", className)} {...props} />;
}

export function AccountingRecordCard({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn("mnx-accounting-record-card", className)}
      type="button"
      {...props}
    />
  );
}

export function AccountingTable({
  className,
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <WorkspaceTable
      className={cn("mnx-accounting-table", className)}
      {...props}
    />
  );
}

export function AccountingActionLink({
  children,
  className,
  href,
  variant = "secondary",
}: {
  children: ReactNode;
  className?: string;
  href: string;
  variant?: "primary" | "secondary" | "destructive";
}) {
  return (
    <Link
      className={cn(
        "mnx-button",
        variant === "primary"
          ? "mnx-button-primary"
          : variant === "destructive"
            ? "mnx-button-destructive"
            : "mnx-button-secondary",
        className,
      )}
      href={href}
    >
      {children}
    </Link>
  );
}

export function AccountingDialog({
  children,
  description,
  footer,
  onClose,
  open,
  size,
  title,
}: {
  children: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  open: boolean;
  size?: WorkspaceDialogSize;
  title: ReactNode;
}) {
  return (
    <WorkspaceDialog
      className="mnx-accounting-dialog"
      description={description}
      eyebrow="Accounting action"
      footer={footer}
      onClose={onClose}
      open={open}
      size={size}
      title={title}
    >
      {children}
    </WorkspaceDialog>
  );
}

export function AccountingDetailList({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDListElement>) {
  return (
    <dl className={cn("mnx-accounting-detail-list", className)} {...props}>
      {children}
    </dl>
  );
}

export function AccountingDetail({
  label,
  value,
}: {
  label: ReactNode;
  value: ReactNode;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value ?? "—"}</dd>
    </div>
  );
}

export function AccountingStatus({
  status,
}: {
  status: string | null | undefined;
}) {
  const normalized = (status ?? "UNKNOWN").toUpperCase();
  const variant =
    normalized.includes("PAID") ||
    normalized.includes("POSTED") ||
    normalized.includes("SUBMITTED") ||
    normalized.includes("ACTIVE") ||
    normalized.includes("OPEN") ||
    normalized.includes("APPROVED")
      ? "success"
      : normalized.includes("CANCEL") ||
          normalized.includes("REJECT") ||
          normalized.includes("INACTIVE") ||
          normalized.includes("OVERDUE")
        ? "danger"
        : normalized.includes("DRAFT") ||
            normalized.includes("PENDING") ||
            normalized.includes("PART")
          ? "warning"
          : "neutral";

  return <WorkspaceBadge variant={variant}>{normalized.replaceAll("_", " ")}</WorkspaceBadge>;
}

export function AccountingLoadingState() {
  return (
    <WorkspaceState
      variant="loading"
      icon={<LoaderCircle aria-hidden="true" />}
      eyebrow="Accounting workspace"
      title="Loading finance operations"
      description="Preparing ledgers, documents, controls, and reporting data."
    />
  );
}

export function AccountingErrorState({
  description,
  onRetry,
}: {
  description: ReactNode;
  onRetry: () => void;
}) {
  return (
    <WorkspaceState
      variant="danger"
      icon={<ShieldAlert aria-hidden="true" />}
      eyebrow="Accounting workspace"
      title="Accounting could not be loaded"
      description={description}
      action={<WorkspaceAction onClick={onRetry}>Try again</WorkspaceAction>}
    />
  );
}

export const AccountingAction = WorkspaceAction;
export const AccountingAlert = WorkspaceAlert;
export const AccountingBadge = WorkspaceBadge;
export const AccountingCheckbox = WorkspaceCheckbox;
export const AccountingEmptyTableRow = WorkspaceEmptyTableRow;
export const AccountingField = WorkspaceField;
export const AccountingInput = WorkspaceInput;
export const AccountingSelect = WorkspaceSelect;
export const AccountingTextarea = WorkspaceTextarea;
