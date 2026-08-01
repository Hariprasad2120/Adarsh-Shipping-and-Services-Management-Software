import type { Caps } from "@/lib/rbac";

export type AccountingOperationalArea =
  | "overview"
  | "approvals"
  | "sales"
  | "purchases"
  | "payments"
  | "ledger"
  | "recurring"
  | "depreciation"
  | "partners"
  | "outbox"
  | "readiness"
  | "configuration"
  | "capabilities";

export type AccountingRouteAccess = {
  area: AccountingOperationalArea;
  permissions: readonly string[];
};

const ROUTE_ACCESS: Array<{
  match: (pathname: string) => boolean;
  access: AccountingRouteAccess;
}> = [
  {
    match: (path) => path === "/accounting/approvals",
    access: {
      area: "approvals",
      permissions: [
        "accounting.document.approve",
        "accounting.payment.approve",
        "accounting.journal.approve",
      ],
    },
  },
  {
    match: (path) =>
      path.startsWith("/accounting/documents") ||
      path.startsWith("/accounting/quotations") ||
      path.startsWith("/accounting/sales-invoices") ||
      path.startsWith("/accounting/customer-receipts") ||
      path.startsWith("/accounting/credit-notes"),
    access: {
      area: "sales",
      permissions: [
        "accounting.document.read",
        "accounting.document.approve",
        "accounting.invoice.read",
        "accounting.payment.read",
        "accounting.sales-invoice.prepare",
        "accounting.receipt.prepare",
        "accounting.credit-note.prepare",
        "accounting.quotation.read",
        "accounting.quotation.create",
        "accounting.quotation.manage",
        "accounting.note.read",
        "accounting.correction.read",
      ],
    },
  },
  {
    match: (path) =>
      path.startsWith("/accounting/purchase-invoices") ||
      path.startsWith("/accounting/vendor-master") ||
      path.startsWith("/accounting/vendor-payments") ||
      path.startsWith("/accounting/debit-notes"),
    access: {
      area: "purchases",
      permissions: [
        "accounting.document.read",
        "accounting.invoice.read",
        "accounting.payment.read",
        "accounting.purchase-invoice.prepare",
        "accounting.payment.prepare",
        "accounting.debit-note.prepare",
      ],
    },
  },
  {
    match: (path) =>
      path.startsWith("/accounting/banking") ||
      path.startsWith("/accounting/payments") ||
      path.startsWith("/accounting/payment-entries") ||
      path.startsWith("/accounting/allocations"),
    access: {
      area: "payments",
      permissions: [
        "accounting.payment.read",
        "accounting.payment.approve",
        "accounting.payment.prepare",
        "accounting.payment.allocate",
      ],
    },
  },
  {
    match: (path) =>
      path.startsWith("/accounting/journal-entries") ||
      path.startsWith("/accounting/general-ledger") ||
      path.startsWith("/accounting/accounts") ||
      path.startsWith("/accounting/jobs") ||
      path.startsWith("/accounting/trial-balance") ||
      path.startsWith("/accounting/profit-loss") ||
      path.startsWith("/accounting/balance-sheet") ||
      path.startsWith("/accounting/reports"),
    access: {
      area: "ledger",
      permissions: [
        "accounting.ledger.read",
        "accounting.journal.read",
        "accounting.account.read",
        "accounting.reports.view",
      ],
    },
  },
  {
    match: (path) => path.startsWith("/accounting/recurring"),
    access: {
      area: "recurring",
      permissions: [
        "accounting.recurring-template.admin",
        "accounting.recurring-occurrence.process",
      ],
    },
  },
  {
    match: (path) =>
      path.startsWith("/accounting/depreciation") ||
      path.startsWith("/accounting/fixed-assets"),
    access: {
      area: "depreciation",
      permissions: ["accounting.depreciation.integrate"],
    },
  },
  {
    match: (path) => path.startsWith("/accounting/partners"),
    access: {
      area: "partners",
      permissions: ["accounting.partner-transaction.prepare"],
    },
  },
  {
    match: (path) =>
      path.startsWith("/accounting/outbox") ||
      path.startsWith("/accounting/manual-review"),
    access: {
      area: "outbox",
      permissions: [
        "accounting.audit.read",
        "accounting.integration.retry",
        "accounting.integration.manual-review",
        "accounting.outbox.retry",
        "accounting.outbox.manual-review",
      ],
    },
  },
  {
    match: (path) => path.startsWith("/accounting/readiness"),
    access: {
      area: "readiness",
      permissions: ["accounting.readiness.read"],
    },
  },
  {
    match: (path) => path.startsWith("/accounting/capabilities"),
    access: {
      area: "capabilities",
      permissions: [
        "accounting.capability-policy.read",
        "accounting.capability-policy.manage",
        "accounting.capability-policy.approve",
      ],
    },
  },
  {
    match: (path) =>
      path.startsWith("/accounting/bulk-update"),
    access: {
      area: "configuration",
      permissions: [
        "accounting.account.read",
        "accounting.journal.read",
        "accounting.settings.manage",
        "accounting.capability-policy.read",
        "accounting.recurring-template.admin",
        "accounting.recurring-occurrence.process",
        "accounting.depreciation.integrate",
      ],
    },
  },
  {
    match: (path) => path.startsWith("/accounting/currency-adjustments"),
    access: {
      area: "configuration",
      permissions: [
        "accounting.settings.manage",
        "accounting.exchange_rate.maintain",
      ],
    },
  },
  {
    match: (path) => path.startsWith("/accounting/transaction-locking"),
    access: {
      area: "configuration",
      permissions: [
        "accounting.settings.manage",
        "accounting.period_lock.request",
      ],
    },
  },
  {
    match: (path) =>
      path.startsWith("/accounting/configuration") ||
      path.startsWith("/accounting/settings"),
    access: {
      area: "configuration",
      permissions: [
        "accounting.settings.manage",
        "accounting.period_lock.request",
        "accounting.exchange_rate.maintain",
        "accounting.number_series.admin",
        "accounting.approval_policy.admin",
        "accounting.rounding_policy.admin",
        "accounting.capability-policy.read",
        "accounting.capability-policy.manage",
        "accounting.capability-policy.approve",
      ],
    },
  },
  {
    match: (path) =>
      path.startsWith("/accounting/invoices-sales") ||
      path.startsWith("/accounting/sales-orders") ||
      path.startsWith("/accounting/purchase-orders"),
    access: {
      area: "sales",
      permissions: ["crm.invoice.manage"],
    },
  },
  {
    match: () => true,
    access: {
      area: "overview",
      permissions: [
        "accounting.dashboard.view",
        "accounting.document.read",
        "accounting.payment.read",
        "accounting.ledger.read",
      ],
    },
  },
];

export function normalizeAccountingPath(pathname: string | null | undefined) {
  const normalized = (pathname || "/accounting").replace(/\/+$/, "");
  return normalized || "/accounting";
}

export function getAccountingRouteAccess(
  pathname: string | null | undefined,
): AccountingRouteAccess {
  const path = normalizeAccountingPath(pathname);
  return ROUTE_ACCESS.find(({ match }) => match(path))!.access;
}

export function hasAnyAccountingPermission(
  caps: Caps,
  permissions: readonly string[],
) {
  return permissions.some((permission) => caps[permission] === true);
}

export function canAccessAccountingRoute(
  caps: Caps,
  pathname: string | null | undefined,
) {
  return hasAnyAccountingPermission(
    caps,
    getAccountingRouteAccess(pathname).permissions,
  );
}
