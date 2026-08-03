import type { CarbonIconType } from "@carbon/icons-react";
import {
  Analytics,
  Calendar,
  Dashboard,
  DocumentAdd,
  Group,
  Report,
  Security,
  Settings,
  Task,
  Time,
  View,
} from "@carbon/icons-react";
import {
  BookOpenText,
  Boxes,
  BriefcaseBusiness,
  Calculator,
  ClipboardCheck,
  CreditCard,
  FileBarChart,
  FileCheck2,
  FileSpreadsheet,
  Landmark,
  LayoutDashboard,
  ReceiptText,
  RefreshCcw,
  Repeat2,
  Settings2,
  ShieldAlert,
  ShoppingCart,
  WalletCards,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { FolderIcon } from "@/components/ui/folder-icon";

const Folder = FolderIcon as unknown as CarbonIconType;

export type AccountingWorkspaceCatalogItem = {
  href: string;
  label: string;
  icon: CarbonIconType;
  sectionLabel?: string;
  permission?: string | string[];
  matchPaths?: string[];
  description: string;
  workflowIcon: LucideIcon;
};

export const ACCOUNTING_WORKSPACE_CATALOG: AccountingWorkspaceCatalogItem[] = [
  {
    href: "/accounting",
    label: "Overview",
    icon: View,
    permission: [
      "accounting.dashboard.view",
      "accounting.document.read",
      "accounting.payment.read",
      "accounting.ledger.read",
    ],
    matchPaths: ["/accounting"],
    description:
      "Return to the accounting command centre and current operational metrics.",
    workflowIcon: LayoutDashboard,
  },
  {
    href: "/accounting/approvals",
    label: "Approval Inbox",
    icon: Task,
    permission: [
      "accounting.document.approve",
      "accounting.payment.approve",
      "accounting.journal.approve",
    ],
    matchPaths: ["/accounting/approvals"],
    description:
      "Review accounting documents, journals, and payments that need checker action.",
    workflowIcon: ClipboardCheck,
  },
  {
    href: "/accounting/banking",
    label: "Overview",
    icon: Dashboard,
    sectionLabel: "Banking",
    permission: [
      "accounting.payment.read",
      "accounting.payment.prepare",
      "accounting.payment.allocate",
    ],
    matchPaths: ["/accounting/banking"],
    description:
      "Open the banking hub for transfers, cash movement, and settlement workflows.",
    workflowIcon: Landmark,
  },
  {
    href: "/accounting/payments",
    label: "Payments",
    icon: Time,
    sectionLabel: "Banking",
    permission: [
      "accounting.payment.read",
      "accounting.payment.prepare",
    ],
    matchPaths: ["/accounting/payments"],
    description:
      "Review the canonical payment register across receipts and disbursements.",
    workflowIcon: WalletCards,
  },
  {
    href: "/accounting/payment-entries",
    label: "Payment Entries",
    icon: Task,
    sectionLabel: "Banking",
    permission: [
      "accounting.payment.read",
      "accounting.payment.prepare",
      "accounting.payment.allocate",
    ],
    matchPaths: ["/accounting/payment-entries"],
    description:
      "Prepare and review payment entries before or after allocation work.",
    workflowIcon: CreditCard,
  },
  {
    href: "/accounting/customer-receipts",
    label: "Customer Receipts",
    icon: Time,
    sectionLabel: "Banking",
    permission: [
      "accounting.payment.read",
      "accounting.receipt.prepare",
    ],
    matchPaths: ["/accounting/customer-receipts"],
    description:
      "Track customer receipts, unapplied balances, and collection activity.",
    workflowIcon: ReceiptText,
  },
  {
    href: "/accounting/vendor-payments",
    label: "Vendor Payments",
    icon: Time,
    sectionLabel: "Banking",
    permission: [
      "accounting.payment.read",
      "accounting.payment.prepare",
    ],
    matchPaths: ["/accounting/vendor-payments"],
    description:
      "Track supplier disbursements and payable settlement activity.",
    workflowIcon: CreditCard,
  },
  {
    href: "/accounting/allocations",
    label: "Allocations",
    icon: Task,
    sectionLabel: "Banking",
    permission: [
      "accounting.payment.read",
      "accounting.payment.allocate",
    ],
    matchPaths: ["/accounting/allocations"],
    description:
      "Match receipts and payments to invoices, bills, and outstanding balances.",
    workflowIcon: Workflow,
  },
  {
    href: "/accounting/quotations",
    label: "Sales - Quotations",
    icon: DocumentAdd,
    permission: [
      "accounting.quotation.read",
      "accounting.quotation.create",
      "accounting.quotation.manage",
      "accounting.note.read",
      "accounting.correction.read",
    ],
    matchPaths: ["/accounting/quotations"],
    description:
      "Prepare quotations, customer notes, and conversion-ready commercial records.",
    workflowIcon: FileCheck2,
  },
  {
    href: "/accounting/sales-invoices",
    label: "Sales - Invoices",
    icon: DocumentAdd,
    permission: [
      "accounting.document.read",
      "accounting.invoice.read",
      "accounting.sales-invoice.prepare",
    ],
    matchPaths: ["/accounting/sales-invoices"],
    description:
      "Review receivables, customer invoices, and their posting lifecycle.",
    workflowIcon: ReceiptText,
  },
  {
    href: "/accounting/credit-notes",
    label: "Sales - Credit Notes",
    icon: DocumentAdd,
    permission: [
      "accounting.document.read",
      "accounting.credit-note.prepare",
    ],
    matchPaths: ["/accounting/credit-notes"],
    description:
      "Handle receivable-side correction documents and credit adjustments.",
    workflowIcon: RefreshCcw,
  },
  {
    href: "/accounting/purchase-invoices",
    label: "Purchases - Invoices",
    icon: DocumentAdd,
    permission: [
      "accounting.document.read",
      "accounting.invoice.read",
      "accounting.purchase-invoice.prepare",
    ],
    matchPaths: ["/accounting/purchase-invoices"],
    description:
      "Review payables, supplier bills, and purchase-side posting status.",
    workflowIcon: ShoppingCart,
  },
  {
    href: "/accounting/debit-notes",
    label: "Purchases - Debit Notes",
    icon: DocumentAdd,
    permission: [
      "accounting.document.read",
      "accounting.debit-note.prepare",
    ],
    matchPaths: ["/accounting/debit-notes"],
    description:
      "Handle payable-side correction documents and debit adjustments.",
    workflowIcon: RefreshCcw,
  },
  {
    href: "/accounting/vendor-master",
    label: "Vendor Master",
    icon: DocumentAdd,
    permission: [
      "accounting.document.read",
      "accounting.invoice.read",
    ],
    matchPaths: ["/accounting/vendor-master"],
    description:
      "Maintain the shared supplier catalogue used by payable workflows.",
    workflowIcon: Boxes,
  },
  {
    href: "/accounting/journal-entries",
    label: "Manual Journals",
    icon: DocumentAdd,
    sectionLabel: "Accountant",
    permission: [
      "accounting.journal.read",
      "accounting.ledger.read",
    ],
    matchPaths: ["/accounting/journal-entries"],
    description:
      "Create and review balanced manual journals with approval controls.",
    workflowIcon: BookOpenText,
  },
  {
    href: "/accounting/general-ledger",
    label: "Ledger - General Ledger",
    icon: Report,
    permission: [
      "accounting.ledger.read",
      "accounting.reports.view",
    ],
    matchPaths: ["/accounting/general-ledger"],
    description:
      "Inspect posted ledger activity account by account and period by period.",
    workflowIcon: BookOpenText,
  },
  {
    href: "/accounting/accounts",
    label: "Chart of Accounts",
    icon: Folder,
    sectionLabel: "Accountant",
    permission: "accounting.account.read",
    matchPaths: ["/accounting/accounts"],
    description:
      "Manage the chart of accounts, group structure, and ledger controls.",
    workflowIcon: BookOpenText,
  },
  {
    href: "/accounting/bulk-update",
    label: "Bulk Update",
    icon: Settings,
    sectionLabel: "Accountant",
    permission: [
      "accounting.account.read",
      "accounting.settings.manage",
      "accounting.capability-policy.read",
    ],
    matchPaths: ["/accounting/bulk-update"],
    description:
      "Open controlled accountant maintenance workspaces and batch-ready admin tasks.",
    workflowIcon: Settings2,
  },
  {
    href: "/accounting/currency-adjustments",
    label: "Currency Adjustments",
    icon: Analytics,
    sectionLabel: "Accountant",
    permission: [
      "accounting.exchange_rate.maintain",
      "accounting.settings.manage",
    ],
    matchPaths: ["/accounting/currency-adjustments"],
    description:
      "Review FX readiness, exchange-rate setup, and adjustment controls.",
    workflowIcon: Calculator,
  },
  {
    href: "/accounting/transaction-locking",
    label: "Transaction Locking",
    icon: Security,
    sectionLabel: "Accountant",
    permission: [
      "accounting.period_lock.request",
      "accounting.settings.manage",
    ],
    matchPaths: ["/accounting/transaction-locking"],
    description:
      "Protect closed periods and manage transaction lock policy safely.",
    workflowIcon: ShieldAlert,
  },
  {
    href: "/accounting/fixed-assets",
    label: "Fixed Assets",
    icon: Analytics,
    sectionLabel: "Accountant",
    permission: "accounting.depreciation.integrate",
    matchPaths: ["/accounting/fixed-assets"],
    description:
      "Inspect fixed-asset readiness and connected accounting controls.",
    workflowIcon: Calculator,
  },
  {
    href: "/accounting/depreciation",
    label: "Depreciation Runs",
    icon: Analytics,
    sectionLabel: "Accountant",
    permission: "accounting.depreciation.integrate",
    matchPaths: ["/accounting/depreciation"],
    description:
      "Review depreciation policy gates and asset-source readiness before use.",
    workflowIcon: Calculator,
  },
  {
    href: "/accounting/trial-balance",
    label: "Reporting - Trial Balance",
    icon: Analytics,
    permission: "accounting.reports.view",
    matchPaths: ["/accounting/trial-balance"],
    description:
      "Verify debit and credit balances across the full ledger.",
    workflowIcon: FileBarChart,
  },
  {
    href: "/accounting/profit-loss",
    label: "Reporting - Profit & Loss",
    icon: Analytics,
    permission: "accounting.reports.view",
    matchPaths: ["/accounting/profit-loss"],
    description: "Open the current profit and loss reporting workspace.",
    workflowIcon: FileBarChart,
  },
  {
    href: "/accounting/balance-sheet",
    label: "Reporting - Balance Sheet",
    icon: Analytics,
    permission: "accounting.reports.view",
    matchPaths: ["/accounting/balance-sheet"],
    description: "Open the current balance sheet reporting workspace.",
    workflowIcon: FileBarChart,
  },
  {
    href: "/accounting/items",
    label: "Master Data - Items",
    icon: Folder,
    permission: "accounting.dashboard.view",
    matchPaths: ["/accounting/items"],
    description:
      "Maintain the shared accounting item and service catalogue.",
    workflowIcon: Boxes,
  },
  {
    href: "/accounting/reports",
    label: "Reporting - Reports Hub",
    icon: Report,
    permission: "accounting.reports.view",
    matchPaths: ["/accounting/reports"],
    description:
      "Run the wider accounting statements, registers, and analysis reports.",
    workflowIcon: FileSpreadsheet,
  },
  {
    href: "/accounting/jobs",
    label: "Operations - Job Costing",
    icon: Task,
    permission: [
      "accounting.dashboard.view",
      "accounting.document.read",
      "accounting.ledger.read",
    ],
    matchPaths: ["/accounting/jobs"],
    description:
      "Review cargo job costing, profitability, and revenue-versus-cost performance.",
    workflowIcon: BriefcaseBusiness,
  },
  {
    href: "/accounting/recurring",
    label: "Recurring Journals",
    icon: Calendar,
    sectionLabel: "Accountant",
    permission: [
      "accounting.recurring-template.admin",
      "accounting.recurring-occurrence.process",
    ],
    matchPaths: ["/accounting/recurring"],
    description:
      "Manage recurring journal templates, due runs, and scheduled attention.",
    workflowIcon: Repeat2,
  },
  {
    href: "/accounting/partners",
    label: "Operations - Partners",
    icon: Group,
    permission: "accounting.partner-transaction.prepare",
    matchPaths: ["/accounting/partners"],
    description:
      "Review partner transaction readiness and partnership accounting records.",
    workflowIcon: Workflow,
  },
  {
    href: "/accounting/outbox",
    label: "Integration - Outbox",
    icon: Report,
    permission: [
      "accounting.audit.read",
      "accounting.outbox.retry",
      "accounting.outbox.manual-review",
    ],
    matchPaths: ["/accounting/outbox"],
    description:
      "Monitor integration events, retries, publication issues, and outbox health.",
    workflowIcon: Workflow,
  },
  {
    href: "/accounting/manual-review",
    label: "Integration - Review",
    icon: Security,
    permission: [
      "accounting.integration.manual-review",
      "accounting.outbox.manual-review",
    ],
    matchPaths: ["/accounting/manual-review"],
    description:
      "Resolve posting issues and investigate manual-review integration cases.",
    workflowIcon: ShieldAlert,
  },
  {
    href: "/accounting/readiness",
    label: "Governance - Readiness",
    icon: Security,
    permission: "accounting.readiness.read",
    matchPaths: ["/accounting/readiness"],
    description:
      "Inspect readiness evidence, policy gates, and production authorization status.",
    workflowIcon: ShieldAlert,
  },
  {
    href: "/accounting/capabilities",
    label: "Configuration - Capabilities",
    icon: Settings,
    permission: [
      "accounting.capability-policy.read",
      "accounting.capability-policy.manage",
      "accounting.capability-policy.approve",
    ],
    matchPaths: ["/accounting/capabilities"],
    description:
      "Review capability policies, approvals, and governance controls.",
    workflowIcon: ShieldAlert,
  },
  {
    href: "/accounting/configuration",
    label: "Configuration",
    icon: Settings,
    permission: [
      "accounting.settings.manage",
      "accounting.period_lock.request",
      "accounting.exchange_rate.maintain",
      "accounting.number_series.admin",
      "accounting.approval_policy.admin",
      "accounting.capability-policy.read",
    ],
    matchPaths: ["/accounting/configuration"],
    description:
      "Manage accounting master configuration, periods, policies, and controls.",
    workflowIcon: Settings2,
  },
  {
    href: "/accounting/configuration/admin",
    label: "Configuration Admin",
    icon: Settings,
    permission: [
      "accounting.settings.manage",
      "accounting.period_lock.request",
      "accounting.exchange_rate.maintain",
      "accounting.number_series.admin",
      "accounting.approval_policy.admin",
      "accounting.capability-policy.read",
    ],
    matchPaths: ["/accounting/configuration/admin"],
    description:
      "Open the full configuration administration workspace for accounting masters, policies, and control records.",
    workflowIcon: Settings2,
  },
  {
    href: "/accounting/settings",
    label: "Configuration - Legacy Settings",
    icon: Settings,
    permission: "accounting.settings.manage",
    matchPaths: ["/accounting/settings"],
    description:
      "Open the legacy settings workspace and related administration controls.",
    workflowIcon: Settings2,
  },
  {
    href: "/accounting/invoices-sales",
    label: "CRM - Invoices & Sales",
    icon: DocumentAdd,
    permission: "crm.invoice.manage",
    matchPaths: ["/accounting/invoices-sales"],
    description:
      "Review the CRM-linked commercial sales document workspace.",
    workflowIcon: ReceiptText,
  },
  {
    href: "/accounting/sales-orders",
    label: "Sales - Orders",
    icon: DocumentAdd,
    permission: "crm.invoice.manage",
    matchPaths: ["/accounting/sales-orders"],
    description:
      "Track customer sales orders through the commercial document flow.",
    workflowIcon: FileCheck2,
  },
  {
    href: "/accounting/purchase-orders",
    label: "Purchases - Orders",
    icon: DocumentAdd,
    permission: "crm.invoice.manage",
    matchPaths: ["/accounting/purchase-orders"],
    description:
      "Track supplier purchase orders through the commercial document flow.",
    workflowIcon: ShoppingCart,
  },
];

export function getAccountingWorkspaceCatalogItem(href: string) {
  return (
    ACCOUNTING_WORKSPACE_CATALOG.find((item) => item.href === href) ?? null
  );
}
