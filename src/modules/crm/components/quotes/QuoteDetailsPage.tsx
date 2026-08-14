"use client";

import {
  CrmButton,
  CrmDialog,
  CrmInput,
  CrmPanel,
  CrmSection,
  CrmSelect,
  CrmStatus,
  CrmTable,
  CrmTextarea,
} from "@/modules/crm/components/workspace/crm-workspace";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowLeft,
  BellRing,
  BriefcaseBusiness,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileOutput,
  FileText,
  Mail,
  MoreHorizontal,
  Loader2,
  Pencil,
  Plus,
  Search,
  Send,
  ShieldAlert,
  ShipWheel,
  Share2,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { quoteDetails } from "@/modules/crm/components/quotes/lib/quote-details-data";
import { quoteViews } from "@/modules/crm/components/quotes/lib/quote-list-data";
import { bankAccounts } from "@/modules/crm/components/quotes/lib/mock-data";
import type { QuoteDetailRecord, QuoteListStatus, QuoteRecord } from "@/modules/crm/components/quotes/lib/types";
import { ApprovalActionBar, ApprovalLogList, type ApprovalCaps, type ApprovalLogEntry } from "@/modules/crm/components/ApprovalActionBar";
import type { ApprovalStatus } from "@/modules/crm/approval-workflow";
import { toast } from "sonner";
import { deleteInvoiceAction } from "@/modules/crm/actions";
import { actionSubmitForApproval } from "@/modules/crm/approval-actions";
import { getStateCodeForLocation } from "@/modules/crm/components/quotes/lib/gst-states";
import { useCollapsiblePanel } from "@/modules/core/hooks/use-collapsible-panel";
import { QuoteMoreActionsMenu } from "@/modules/crm/components/quotes/QuoteMoreActionsMenu";
import { actionDuplicateQuote, actionSendQuoteEmail } from "@/modules/crm/actions";
import { Copy, Printer } from "lucide-react";
import { useRouter } from "next/navigation";

// Map mock QuoteListStatus (lowercase-hyphenated) → ApprovalStatus (UPPER_SNAKE)
function toApprovalStatus(s: Exclude<QuoteListStatus, "all">): ApprovalStatus {
  const map: Record<string, ApprovalStatus> = {
    draft: "DRAFT",
    "pending-manager-approval": "PENDING_MANAGER_APPROVAL",
    "pending-customer-approval": "PENDING_CUSTOMER_APPROVAL",
    "customer-approved": "CUSTOMER_APPROVED",
    "booking-created": "BOOKING_CREATED",
    "pending-approval": "PENDING_APPROVAL",
    approved: "APPROVED",
    sent: "SENT",
    "customer-viewed": "CUSTOMER_VIEWED",
    accepted: "ACCEPTED",
    invoiced: "INVOICED",
    declined: "DECLINED",
    rework: "REWORK",
  };
  return map[s] ?? "DRAFT";
}

const statusTone: Record<Exclude<QuoteListStatus, "all">, string> = {
  draft: "bg-[var(--mnx-surface)] text-[var(--mnx-text-muted)]",
  "pending-manager-approval":
    "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]",
  "pending-customer-approval":
    "bg-[var(--mnx-accent-soft)] text-[var(--mnx-accent)]",
  "customer-approved":
    "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]",
  "booking-created":
    "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]",
  "pending-approval": "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]",
  approved: "bg-[var(--mnx-accent-soft)] text-[var(--mnx-accent-text)]",
  sent: "bg-[var(--mnx-accent-soft)] text-[var(--mnx-accent-text)]",
  "customer-viewed":
    "bg-[var(--mnx-accent-soft)] text-[var(--mnx-accent-text)]",
  accepted: "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]",
  invoiced: "bg-[var(--mnx-accent-soft)] text-[var(--mnx-accent-text)]",
  declined: "bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)]",
  rework: "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]",
};

function formatStatus(status: Exclude<QuoteListStatus, "all">) {
  return status
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB").format(new Date(value));
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatOptionalValue(value?: string | number | null) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number") {
    return value > 0 ? String(value) : "-";
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : "-";
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function departmentLabel(value: "FREIGHT_FORWARDING" | "CUSTOMS_CLEARANCE") {
  return value === "FREIGHT_FORWARDING"
    ? "Freight Forwarding"
    : "Customs Clearance";
}

type DepartmentView = "FREIGHT_FORWARDING" | "CUSTOMS_CLEARANCE";

const DEPARTMENT_ITEM_KEYWORDS: Record<DepartmentView, string[]> = {
  FREIGHT_FORWARDING: [
    "ocean freight",
    "freight",
    "cfs",
    "vgm",
    "container pickup",
    "insurance",
  ],
  CUSTOMS_CLEARANCE: [
    "customs clearance",
    "clearance",
    "do charges",
    "bl charges",
    "documentation",
  ],
};

function classifyItemDepartment(name: string, description?: string | null) {
  const haystack = `${name} ${description || ""}`.toLowerCase();
  if (
    DEPARTMENT_ITEM_KEYWORDS.FREIGHT_FORWARDING.some((keyword) =>
      haystack.includes(keyword),
    )
  ) {
    return "FREIGHT_FORWARDING" as const;
  }
  if (
    DEPARTMENT_ITEM_KEYWORDS.CUSTOMS_CLEARANCE.some((keyword) =>
      haystack.includes(keyword),
    )
  ) {
    return "CUSTOMS_CLEARANCE" as const;
  }
  return null;
}

function buildDepartmentQuoteView(
  quote: QuoteDetailRecord,
  department: DepartmentView,
) {
  const items = quote.items.filter(
    (item) => classifyItemDepartment(item.name, item.description) === department,
  );
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const taxRatio = quote.subtotal > 0 ? subtotal / quote.subtotal : 0;
  const taxes = quote.taxes.map((tax, index) => {
    const proportionalAmount = Number((tax.amount * taxRatio).toFixed(2));
    const isLast = index === quote.taxes.length - 1;
    const previous = quote.taxes
      .slice(0, index)
      .reduce((sum, row) => sum + Number((row.amount * taxRatio).toFixed(2)), 0);

    return {
      ...tax,
      amount: isLast
        ? Number((quote.total - quote.subtotal).toFixed(2)) * taxRatio - previous
        : proportionalAmount,
    };
  });
  const taxTotal = taxes.reduce((sum, tax) => sum + tax.amount, 0);
  const total = subtotal + taxTotal;

  return {
    ...quote,
    items,
    subtotal,
    taxes,
    total,
    discount: 0,
    adjustment: 0,
    roundOff: 0,
  };
}

function matchesSearch(record: QuoteRecord, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  return [
    record.quoteNumber,
    record.customerName,
    record.referenceNumber ?? "",
    record.location,
  ].some((value) => value.toLowerCase().includes(normalized));
}

export function QuoteDetailsPage({
  quote,
  caps,
  allQuotes,
}: {
  quote: QuoteDetailRecord & {
    approvalLogs?: ApprovalLogEntry[];
    reworkNote?: string | null;
    slaDeadline?: string | null;
  };
  caps?: ApprovalCaps;
  allQuotes?: QuoteRecord[];
}) {
  const defaultCaps: ApprovalCaps = {
    canSubmit: false,
    canApprove: false,
    canSend: false,
    canManage: false,
    canAdminRestore: false,
  };
  const effectiveCaps = caps ?? defaultCaps;
  const router = useRouter();
  const approvalFlow = quote.workflowContext?.approvalFlow ?? null;
  const conversion = quote.workflowContext?.conversion ?? null;
  const pendingActions = (() => {
    switch (quote.status) {
      case "draft":
        return approvalFlow?.lastRejectedStage === "CUSTOMER"
          ? ["Edit the quotation", "Resubmit for manager approval", "Collect fresh customer approval after manager approval"]
          : approvalFlow?.lastRejectedStage === "MANAGER"
            ? ["Edit the quotation", "Resubmit for manager approval"]
            : ["Edit the quotation", "Submit for manager approval"];
      case "pending-manager-approval":
        return ["Await manager decision"];
      case "pending-customer-approval":
        return ["Record customer approval or rejection on behalf of the customer"];
      case "customer-approved":
        return ["Create booking", "Route Freight Forwarding and CHA records"];
      case "booking-created":
        return ["Continue in Freight Forwarding", "Continue in CHA"];
      default:
        return [];
    }
  })();
  const [search, setSearch] = useState("");
  const [activeView, setActiveView] = useState<QuoteListStatus>("all");
  const [activeTab, setActiveTab] = useState<"details" | "activity">("details");
  const {
    collapsed: pdfPanelCollapsed,
    toggle: togglePdfPanel,
  } = useCollapsiblePanel("quotePdfPanelCollapsed");
  const [displayCurrency, setDisplayCurrency] = useState<"INR" | "foreign">(
    "INR",
  );
  const [activeDepartmentView, setActiveDepartmentView] =
    useState<DepartmentView>("FREIGHT_FORWARDING");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [mailDialogOpen, setMailDialogOpen] = useState(false);
  const [mailTo, setMailTo] = useState(quote.customerEmail || "");
  const [mailSubject, setMailSubject] = useState(`Quote ${quote.quoteNumber}`);
  const [mailMessage, setMailMessage] = useState("Please find the attached quotation.");
  const [isSendingMail, setIsSendingMail] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const canSubmitForApproval =
    quote.status === "draft" && effectiveCaps.canSubmit;
  const filterRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!filterRef.current?.contains(event.target as Node)) {
        setFilterOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this draft quote?")) {
      setIsDeleting(true);
      try {
        const res = await deleteInvoiceAction(quote.id);
        if (res.ok) {
          toast.success("Quote deleted successfully.");
          window.location.href = "/crm/quotes";
        } else {
          toast.error(res.error || "Failed to delete quote.");
        }
      } catch (err) {
        const error = err as Error;
        toast.error(error.message || "An error occurred.");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleDuplicate = async () => {
    setIsDuplicating(true);
    try {
      const res = await actionDuplicateQuote(quote.id);
      if (res.ok && res.data?.id) {
        toast.success("Quote duplicated successfully.");
        router.push(`/crm/quotes/${res.data.id}`);
      } else {
        toast.error(res.ok ? "Failed to duplicate quote." : res.error);
      }
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || "An error occurred.");
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleSendMail = async () => {
    if (!mailTo.trim()) {
      toast.error("Recipient email is required.");
      return;
    }
    setIsSendingMail(true);
    try {
      const res = await actionSendQuoteEmail(quote.id, {
        to: mailTo,
        subject: mailSubject,
        message: mailMessage,
      });
      if (res.ok) {
        toast.success("Quote emailed successfully.");
        setMailDialogOpen(false);
      } else {
        toast.error(res.error);
      }
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || "An error occurred.");
    } finally {
      setIsSendingMail(false);
    }
  };

  const listData = allQuotes || quoteDetails;
  const filteredQuotes = useMemo(() => {
    return listData.filter((record) => {
      const matchesView =
        activeView === "all" ? true : record.status === activeView;
      return matchesView && matchesSearch(record as QuoteRecord, search);
    });
  }, [activeView, search, listData]);

  const activeViewLabel =
    quoteViews.find((view) => view.id === activeView)?.label ?? "All";
  const notifications = approvalFlow?.notifications ?? [];
  const includedDepartments = quote.workflowContext?.includedDepartments ?? [];
  const pendingDepartments = quote.workflowContext?.pendingDepartments ?? [];
  const inferredDepartments = Array.from(
    new Set(
      quote.items
        .map((item) => classifyItemDepartment(item.name, item.description))
        .filter((value): value is DepartmentView => value !== null),
    ),
  );
  const availableDepartments = includedDepartments.length
    ? includedDepartments
    : inferredDepartments;
  const departmentViewStates: Record<
    DepartmentView,
    "available" | "pending" | "unavailable"
  > = {
    FREIGHT_FORWARDING: availableDepartments.includes("FREIGHT_FORWARDING")
      ? "available"
      : pendingDepartments.includes("FREIGHT_FORWARDING")
        ? "pending"
        : "unavailable",
    CUSTOMS_CLEARANCE: availableDepartments.includes("CUSTOMS_CLEARANCE")
      ? "available"
      : pendingDepartments.includes("CUSTOMS_CLEARANCE")
        ? "pending"
        : "unavailable",
  };
  const resolvedDepartmentView =
    departmentViewStates[activeDepartmentView] !== "unavailable"
      ? activeDepartmentView
      : departmentViewStates.FREIGHT_FORWARDING !== "unavailable"
        ? "FREIGHT_FORWARDING"
        : "CUSTOMS_CLEARANCE";
  const selectedDepartmentState = departmentViewStates[resolvedDepartmentView];
  const selectedDepartmentQuote =
    selectedDepartmentState === "available"
      ? buildDepartmentQuoteView(quote, resolvedDepartmentView)
      : null;

  return (
    <div className="flex min-w-0 flex-col gap-6 text-[var(--mnx-text-strong)]">
      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
        <aside
          className={cn(
            "sticky top-0 flex w-full min-w-0 shrink-0 flex-col overflow-hidden rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface)] transition-all mnx-shadow-panel",
            isSidebarCollapsed ? "lg:w-[132px]" : "lg:w-full",
          )}
        >
          <div className="border-b border-[var(--mnx-border)] px-4 py-4">
            {!isSidebarCollapsed ? (
              <div ref={filterRef} className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <CrmButton
                    type="button"
                    onClick={() => setFilterOpen((current) => !current)}
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] px-4 py-2 text-sm font-semibold text-[var(--mnx-text-strong)]"
                  >
                    <span>{activeViewLabel} Quotes</span>
                    <ChevronDown
                      className={cn(
                        "size-4 text-[var(--mnx-text-muted)] transition-transform",
                        filterOpen ? "rotate-180" : "",
                      )}
                    />
                  </CrmButton>
                  <div className="flex items-center gap-2">
                    <CrmButton
                      type="button"
                      onClick={() => {
                        setFilterOpen(false);
                        setIsSidebarCollapsed(true);
                      }}
                      className="inline-flex size-10 items-center justify-center rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] text-[var(--mnx-text-muted)]"
                      aria-label="Collapse quote sidebar"
                      title="Collapse quote sidebar"
                    >
                      <ChevronLeft className="size-4" />
                    </CrmButton>
                    <Link
                      href="/crm/quotes/new"
                      className="inline-flex size-10 items-center justify-center rounded-xl bg-[var(--mnx-accent)] text-[var(--mnx-text-strong)] transition-colors hover:bg-[var(--mnx-accent)]/90"
                      aria-label="Create quote"
                    >
                      <Plus className="size-4" />
                    </Link>
                    <QuoteMoreActionsMenu
                      items={[
                        {
                          key: "duplicate",
                          label: isDuplicating ? "Duplicating..." : "Duplicate quote",
                          icon: Copy,
                          disabled: isDuplicating,
                          onClick: handleDuplicate,
                        },
                        {
                          key: "print",
                          label: "Print",
                          icon: Printer,
                          onClick: () =>
                            window.open(`/api/crm/quotes/${quote.id}/pdf`, "_blank"),
                        },
                        ...(quote.status === "draft"
                          ? [
                              {
                                key: "delete",
                                label: isDeleting ? "Deleting..." : "Delete draft",
                                icon: Trash2,
                                disabled: isDeleting,
                                danger: true,
                                onClick: handleDelete,
                              },
                            ]
                          : []),
                      ]}
                    />
                  </div>
                </div>

                {filterOpen ? (
                  <div className="flex flex-wrap gap-2">
                    {quoteViews.map((view) => (
                      <CrmButton
                        key={view.id}
                        type="button"
                        onClick={() => {
                          setActiveView(view.id);
                          setFilterOpen(false);
                        }}
                        className={cn(
                          "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                          activeView === view.id
                            ? "bg-[var(--mnx-accent)]/10 text-[var(--mnx-accent)]"
                            : "bg-[var(--mnx-surface)] text-[var(--mnx-text-muted)] hover:bg-[var(--mnx-border)]",
                        )}
                      >
                        {view.label}
                      </CrmButton>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-1">
                <div className="rounded-2xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] px-4 py-3 text-center text-sm font-semibold text-[var(--mnx-text-strong)]">
                  Quotes
                </div>
                <div className="flex flex-col items-center gap-2">
                  <CrmButton
                    type="button"
                    onClick={() => setIsSidebarCollapsed(false)}
                    className="inline-flex size-10 items-center justify-center rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] text-[var(--mnx-text-muted)]"
                    aria-label="Expand quote sidebar"
                    title="Expand quote sidebar"
                  >
                    <ChevronRight className="size-4" />
                  </CrmButton>
                  <Link
                    href="/crm/quotes/new"
                    className="inline-flex size-10 items-center justify-center rounded-xl bg-[var(--mnx-accent)] text-[var(--mnx-text-strong)] transition-colors hover:bg-[var(--mnx-accent)]/90"
                    aria-label="Create quote"
                  >
                    <Plus className="size-4" />
                  </Link>
                  <QuoteMoreActionsMenu
                    items={[
                      {
                        key: "duplicate",
                        label: isDuplicating ? "Duplicating..." : "Duplicate quote",
                        icon: Copy,
                        disabled: isDuplicating,
                        onClick: handleDuplicate,
                      },
                      {
                        key: "print",
                        label: "Print",
                        icon: Printer,
                        onClick: () =>
                          window.open(`/api/crm/quotes/${quote.id}/pdf`, "_blank"),
                      },
                      ...(quote.status === "draft"
                        ? [
                            {
                              key: "delete",
                              label: isDeleting ? "Deleting..." : "Delete draft",
                              icon: Trash2,
                              disabled: isDeleting,
                              danger: true,
                              onClick: handleDelete,
                            },
                          ]
                        : []),
                    ]}
                    triggerClassName="inline-flex size-10 items-center justify-center rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] text-[var(--mnx-text-muted)]"
                  />
                </div>
              </div>
            )}
          </div>

          {!isSidebarCollapsed ? (
            <div className="border-b border-[var(--mnx-border)] px-4 py-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-[var(--mnx-text-muted)]" />
                <CrmInput
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search quotes"
                  className="h-11 w-full rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] pl-10 pr-3 text-sm text-[var(--mnx-text-strong)] outline-none focus:border-[var(--mnx-accent)] focus:ring-2 focus:ring-[var(--mnx-accent)]/20"
                />
              </div>
            </div>
          ) : null}

          {!isSidebarCollapsed ? (
            <div className="flex-1 overflow-y-auto">
            {filteredQuotes.map((record) => {
              const active = record.id === quote.id;
              return (
                <Link
                  key={record.id}
                  href={`/crm/quotes/${record.id}`}
                  className={cn(
                    "block border-b border-[var(--mnx-border)] px-4 py-4 transition-colors",
                    active
                      ? "bg-[var(--mnx-accent)]/5 mnx-shadow-panel"
                      : "hover:bg-[var(--mnx-surface)]",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-1 block size-4 rounded border border-[var(--mnx-border)] bg-[var(--mnx-surface)]"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-[var(--mnx-text-strong)]">
                          {record.customerName}
                        </p>
                        <span className="shrink-0 text-sm font-semibold text-[var(--mnx-text-strong)]">
                          {formatAmount(record.amount)}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--mnx-text-muted)]">
                        <span className="font-medium text-[var(--mnx-accent)]">
                          {record.quoteNumber}
                        </span>
                        <span className="size-1 rounded-full bg-[var(--mnx-border)]" />
                        <span>{formatDate(record.date)}</span>
                      </div>
                      <div className="mt-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold",
                            statusTone[
                              record.status as Exclude<QuoteListStatus, "all">
                            ],
                          )}
                        >
                          {formatStatus(
                            record.status as Exclude<QuoteListStatus, "all">,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
            </div>
          ) : (
            <div className="flex flex-1 items-start justify-center px-3 py-4 xl:py-6">
              <div className="rounded-2xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--mnx-text-muted)]">
                List
              </div>
            </div>
          )}
        </aside>

        <div className="min-w-0 space-y-6">
          <CrmPanel
            className={cn(
              "relative overflow-visible border border-[var(--mnx-border)] bg-[var(--mnx-surface)]",
              actionsOpen ? "z-20" : "",
            )}
          >
            <div className="border-b border-[var(--mnx-border)] px-4 py-5 sm:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex items-start gap-3">
                  <Link
                    href="/crm/quotes"
                    className="mt-1 inline-flex size-10 items-center justify-center rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] text-[var(--mnx-text-muted)] transition-colors hover:bg-[var(--mnx-border)]/35"
                    aria-label="Back to quote list"
                  >
                    <ArrowLeft className="size-4" />
                  </Link>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--mnx-text-muted)]">
                      Location: {quote.location}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <h1 className="text-[clamp(1.8rem,3vw,2.5rem)] font-semibold tracking-[-0.03em] text-[var(--mnx-text-strong)]">
                        {quote.quoteNumber}
                      </h1>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                          statusTone[quote.status],
                        )}
                      >
                        {formatStatus(quote.status)}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-sm font-medium text-[var(--mnx-text-muted)] lg:text-right">
                  Total {formatAmount(quote.total)} for {quote.customerName}
                </p>
              </div>
            </div>

            <div
              className={cn(
                "px-4 py-4 sm:px-6",
                actionsOpen ? "pb-28" : "",
              )}
            >
              <div className="flex flex-wrap items-center gap-2 text-[var(--mnx-text-muted)]">
                {quote.status === "draft" ? (
                  <Link
                    href={`/crm/quotes/${quote.id}/edit`}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] px-3.5 text-sm font-medium text-[var(--mnx-text-muted)] shadow-sm hover:bg-[var(--mnx-surface)]"
                  >
                    <Pencil className="size-4 text-[var(--mnx-text-muted)]" />
                    <span>Edit</span>
                  </Link>
                ) : (
                  <CrmButton
                    disabled
                    type="button"
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] px-3.5 text-sm font-medium text-[var(--mnx-text-muted)] shadow-sm opacity-50 cursor-not-allowed"
                  >
                    <Pencil className="size-4 text-[var(--mnx-text-muted)]" />
                    <span>Edit</span>
                  </CrmButton>
                )}
                <CrmButton
                  type="button"
                  onClick={() => {
                    if (!canSubmitForApproval) return;
                    setSubmitDialogOpen(true);
                  }}
                  disabled={!canSubmitForApproval}
                  className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-medium shadow-sm",
                    canSubmitForApproval
                      ? "bg-[var(--mnx-accent)] text-[var(--mnx-text-strong)] hover:bg-[var(--mnx-accent)]/90"
                      : "cursor-not-allowed border border-[var(--mnx-border)] bg-[var(--mnx-surface)] text-[var(--mnx-text-muted)] opacity-50",
                  )}
                >
                  <Send className="size-4" />
                  <span>Submit For Approval</span>
                </CrmButton>
                <ToolbarButton
                  icon={Mail}
                  label="Mails"
                  onClick={() => setMailDialogOpen(true)}
                />
                <ToolbarButton
                  icon={Share2}
                  label="Share"
                  onClick={() =>
                    toast.info("Quote sharing is coming soon (pending a database update).")
                  }
                />
                <ToolbarButton
                  icon={FileOutput}
                  label="PDF/Print"
                  onClick={() => window.open(`/api/crm/quotes/${quote.id}/pdf`, "_blank")}
                />
                {/* Approval actions replace the static buttons */}
                <div className="relative">
                  <CrmButton
                    type="button"
                    onClick={() => setActionsOpen((current) => !current)}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] px-3 text-sm font-medium text-[var(--mnx-text-muted)] shadow-sm hover:bg-[var(--mnx-surface)]"
                    aria-label="More quote actions"
                  >
                    <MoreHorizontal className="size-4" />
                  </CrmButton>
                  {actionsOpen ? (
                    <div className="absolute right-0 top-12 z-30 w-60 overflow-hidden rounded-2xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] mnx-shadow-panel">
                      {quote.status === "draft" && (
                        <ActionMenuButton
                          icon={Trash2}
                          label={isDeleting ? "Deleting..." : "Delete"}
                          disabled={isDeleting}
                          onClick={handleDelete}
                        />
                      )}
                      <div className="border-t border-[var(--mnx-border)] p-2">
                        <CrmButton
                          type="button"
                          onClick={() => {
                            setActionsOpen(false);
                            toast.info("Workflow preferences are coming soon (pending a database update).");
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-[var(--mnx-text-muted)] hover:bg-[var(--mnx-surface)]"
                        >
                          <span className="flex size-6 items-center justify-center rounded-full border border-[var(--mnx-border)] text-[var(--mnx-text-muted)]">
                            <ChevronRight className="size-3" />
                          </span>
                          Workflow preferences
                        </CrmButton>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </CrmPanel>

          {mailDialogOpen ? (
            <CrmDialog
              open
              onClose={() => setMailDialogOpen(false)}
              title="Email Quote"
              size="compact"
              footer={
                <div className="flex justify-end gap-3">
                  <CrmButton onClick={() => setMailDialogOpen(false)} variant="secondary">
                    Cancel
                  </CrmButton>
                  <CrmButton onClick={handleSendMail} disabled={isSendingMail}>
                    {isSendingMail ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                    Send
                  </CrmButton>
                </div>
              }
            >
              <div className="space-y-4">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[var(--mnx-text-muted)]">
                    To
                  </span>
                  <CrmInput
                    type="email"
                    value={mailTo}
                    onChange={(event) => setMailTo(event.target.value)}
                    placeholder="customer@example.com"
                    className="h-11 w-full rounded-xl"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[var(--mnx-text-muted)]">
                    Subject
                  </span>
                  <CrmInput
                    value={mailSubject}
                    onChange={(event) => setMailSubject(event.target.value)}
                    className="h-11 w-full rounded-xl"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[var(--mnx-text-muted)]">
                    Message
                  </span>
                  <CrmTextarea
                    value={mailMessage}
                    onChange={(event) => setMailMessage(event.target.value)}
                    rows={5}
                    className="w-full rounded-xl"
                  />
                </label>
                <p className="text-xs text-[var(--mnx-text-muted)]">
                  The quote will be attached as a PDF.
                </p>
              </div>
            </CrmDialog>
          ) : null}

          <div className="space-y-6">
            <div className="grid gap-6">
              {quote.versionNumber ? (
                <CrmSection
                  title="Versioning"
                  description={
                    <>
                      Base quotation{" "}
                      <span className="font-semibold text-[var(--mnx-text-strong)]">
                        {quote.rootQuoteNumber || quote.quoteNumber}
                      </span>{" "}
                      is currently on{" "}
                      <span className="font-semibold text-[var(--mnx-text-strong)]">
                        V{quote.versionNumber}
                      </span>
                      .
                    </>
                  }
                  actions={
                    <CrmStatus variant="accent">V{quote.versionNumber}</CrmStatus>
                  }
                >
                  <div className="space-y-4">
                    {quote.workflowContext?.pendingDepartments?.length ? (
                      <CrmPanel className="border-[var(--mnx-warning)]/35 bg-[var(--mnx-warning-bg)]/35 p-4">
                        <p className="text-sm text-[var(--mnx-warning)]">
                          Pending department rates:{" "}
                          {quote.workflowContext.pendingDepartments
                            .map((item) =>
                              item === "FREIGHT_FORWARDING"
                                ? "Freight Forwarding"
                                : "Customs Clearance",
                            )
                            .join(", ")}
                        </p>
                      </CrmPanel>
                    ) : null}

                    {quote.versionHistory?.length ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        {quote.versionHistory.map((entry) => (
                          <Link
                            key={entry.id}
                            href={`/crm/quotes/${entry.id}`}
                            className={cn(
                              "rounded-xl border border-[var(--mnx-border)] px-4 py-3 text-sm transition-colors",
                              entry.id === quote.id
                                ? "bg-[var(--mnx-accent)]/8"
                                : "bg-[var(--mnx-surface)] hover:bg-[var(--mnx-surface)]/70",
                            )}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-semibold text-[var(--mnx-text-strong)]">
                                {entry.quoteNumber}
                              </span>
                              <CrmStatus
                                variant={
                                  entry.id === quote.id ? "accent" : "neutral"
                                }
                              >
                                {formatStatus(entry.status)}
                              </CrmStatus>
                            </div>
                            <div className="mt-1 text-xs text-[var(--mnx-text-muted)]">
                              {formatDate(entry.createdAt)}
                              {entry.createdBy ? ` · ${entry.createdBy}` : ""}
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </CrmSection>
              ) : null}

              <CrmSection
                title="Workflow"
                description="Review approval ownership, timing, and downstream operational conversion status."
              >
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <DetailPair
                      label="Approval status"
                      value={formatStatus(quote.status)}
                    />
                    <DetailPair
                      label="Selected manager"
                      value={approvalFlow?.selectedManagerName || "-"}
                    />
                    <DetailPair
                      label="Manager updated"
                      value={formatDateTime(approvalFlow?.managerDecisionAt)}
                    />
                    <DetailPair
                      label="Customer updated"
                      value={formatDateTime(approvalFlow?.customerDecisionAt)}
                    />
                  </div>
                  <ApprovalActionBar
                    invoiceId={quote.id}
                    entityType="QUOTE"
                    approvalStatus={toApprovalStatus(quote.status)}
                    caps={effectiveCaps}
                    reworkNote={quote.reworkNote}
                    managerOptions={quote.managerOptions}
                    workflowContext={quote.workflowContext}
                    externalSubmitDialogOpen={submitDialogOpen}
                    onExternalSubmitDialogClose={() => setSubmitDialogOpen(false)}
                    onSuccess={() => router.refresh()}
                  />
                </div>
              </CrmSection>

              <div className="grid gap-6 xl:grid-cols-2">
                <InfoPanel
                  title="Manager Approval Details"
                  icon={UserCheck}
                  rows={[
                    ["Approving manager", approvalFlow?.selectedManagerName || "-"],
                    ["Submission", formatDateTime(approvalFlow?.submittedAt)],
                    [
                      "Decision",
                      approvalFlow?.managerStatus
                        ? approvalFlow.managerStatus
                        : "Not recorded",
                    ],
                    [
                      "Remarks",
                      approvalFlow?.managerRemarks || quote.reworkNote || "-",
                    ],
                  ]}
                />
                <InfoPanel
                  title="Customer Approval Details"
                  icon={Users}
                  rows={[
                    [
                      "Decision",
                      approvalFlow?.customerStatus
                        ? approvalFlow.customerStatus
                        : quote.status === "pending-customer-approval"
                          ? "Pending"
                          : "Not recorded",
                    ],
                    [
                      "Recorded by",
                      approvalFlow?.customerDecisionByName || "-",
                    ],
                    [
                      "Decision date",
                      formatDateTime(approvalFlow?.customerDecisionAt),
                    ],
                    [
                      "Remarks",
                      approvalFlow?.customerRemarks || "-",
                    ],
                  ]}
                />
                <InfoPanel
                  title="Pending Actions"
                  icon={BriefcaseBusiness}
                  rows={pendingActions.map((item, index) => [
                    `Action ${index + 1}`,
                    item,
                  ])}
                />
                <InfoPanel
                  title="Notifications"
                  icon={BellRing}
                  rows={(notifications.length ? notifications : ["No pending notifications"]).map(
                    (item, index) => [`Notice ${index + 1}`, item],
                  )}
                />
              </div>

              <section className="grid gap-6 xl:grid-cols-2">
                <InfoPanel
                  title="Booking And Job Conversion Status"
                  icon={ShipWheel}
                  rows={[
                    [
                      "Included services",
                      quote.workflowContext?.includedDepartments?.length
                        ? quote.workflowContext.includedDepartments
                            .map(departmentLabel)
                            .join(", ")
                        : "Not available",
                    ],
                    [
                      "Freight booking",
                      conversion?.freightBookingNumber
                        ? `${conversion.freightBookingNumber} (${conversion.freightStatus || "Pending"})`
                        : "Not created",
                    ],
                    [
                      "CHA job",
                      conversion?.chaJobNumber
                        ? `${conversion.chaJobNumber} (${conversion.chaStatus || "Created"})`
                        : "Not created",
                    ],
                    ["Created", formatDateTime(conversion?.createdAt)],
                  ]}
                />
                <InfoPanel
                  title="Audit Trail Summary"
                  icon={FileText}
                  rows={[
                    [
                      "Created",
                      formatDate(quote.creationDate),
                    ],
                    [
                      "Approval steps",
                      String(approvalFlow?.auditTrail?.length || quote.approvalLogs?.length || 0),
                    ],
                    [
                      "Quotation version",
                      quote.versionNumber ? `V${quote.versionNumber}` : "V1",
                    ],
                    [
                      "Latest actor",
                      quote.approvalLogs?.[0]?.actor.name || "-",
                    ],
                  ]}
                />
              </section>

              <CrmSection
                title={activeTab === "details" ? "Quote Details" : "Activity Logs"}
                description={
                  activeTab === "details"
                    ? "Switch between department views, currency context, and printable output."
                    : "Review the quote approval and activity trail."
                }
                actions={
                  <div className="flex flex-wrap items-center gap-2">
                    <CrmButton
                      type="button"
                      variant={activeTab === "details" ? "accent" : "secondary"}
                      size="compact"
                      onClick={() => setActiveTab("details")}
                    >
                      Quote Details
                    </CrmButton>
                    <CrmButton
                      type="button"
                      variant={activeTab === "activity" ? "accent" : "secondary"}
                      size="compact"
                      onClick={() => setActiveTab("activity")}
                    >
                      Activity Logs
                    </CrmButton>
                  </div>
                }
              >
              <section className="overflow-hidden border border-[var(--mnx-border)] bg-[var(--mnx-surface)] mnx-shadow-panel">
                <div className="border-b border-[var(--mnx-border)] px-5 pt-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    {activeTab === "details" ? (
                      <div className="mb-3 flex flex-wrap items-center gap-3">
                        <div className="inline-flex items-center rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] p-1">
                          {(
                            [
                              "FREIGHT_FORWARDING",
                              "CUSTOMS_CLEARANCE",
                            ] as const
                          ).map((department) => {
                            const state = departmentViewStates[department];
                            const isActive = resolvedDepartmentView === department;

                            return (
                              <CrmButton
                                key={department}
                                type="button"
                                onClick={() =>
                                  state !== "unavailable"
                                    ? setActiveDepartmentView(department)
                                    : undefined
                                }
                                disabled={state === "unavailable"}
                                className={cn(
                                  "rounded-lg px-4 py-2 text-left transition-colors",
                                  isActive
                                    ? "bg-[var(--mnx-surface)] shadow-sm"
                                    : "text-[var(--mnx-text-muted)]",
                                  state === "unavailable" &&
                                    "cursor-not-allowed opacity-45",
                                )}
                              >
                                <div className="text-sm font-semibold">
                                  {department === "FREIGHT_FORWARDING"
                                    ? "Freight Quote"
                                    : "Clearance Quote"}
                                </div>
                                <div
                                  className={cn(
                                    "text-[11px] uppercase tracking-[0.12em]",
                                    state === "pending"
                                      ? "text-[var(--mnx-warning)]"
                                      : state === "available"
                                        ? "text-[var(--mnx-success)]"
                                        : "text-[var(--mnx-text-muted)]",
                                  )}
                                >
                                  {state === "pending"
                                    ? "Yet to receive"
                                    : state === "available"
                                      ? "Available"
                                      : "Not available"}
                                </div>
                              </CrmButton>
                            );
                          })}
                        </div>
                        <div className="inline-flex items-center rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] p-1">
                          <CrmButton
                            type="button"
                            onClick={() => setDisplayCurrency("INR")}
                            className={cn(
                              "rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors",
                              displayCurrency === "INR"
                                ? "bg-[var(--mnx-accent)] text-[var(--mnx-text-strong)] shadow-sm"
                                : "text-[var(--mnx-text-muted)]",
                            )}
                          >
                            INR
                          </CrmButton>
                          <CrmButton
                            type="button"
                            onClick={() => setDisplayCurrency("foreign")}
                            className={cn(
                              "rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors",
                              displayCurrency === "foreign"
                                ? "bg-[var(--mnx-accent)] text-[var(--mnx-text-strong)] shadow-sm"
                                : "text-[var(--mnx-text-muted)]",
                            )}
                          >
                            Foreign
                          </CrmButton>
                        </div>
                        <CrmButton
                          type="button"
                          onClick={togglePdfPanel}
                          className="inline-flex items-center gap-2 rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] px-3 py-2 text-sm font-medium text-[var(--mnx-text-muted)]"
                          aria-label={pdfPanelCollapsed ? "Show PDF preview" : "Hide PDF preview"}
                          title={pdfPanelCollapsed ? "Show PDF preview" : "Hide PDF preview"}
                        >
                          <FileText className="size-4" />
                          <span>PDF Preview</span>
                          {pdfPanelCollapsed ? (
                            <ChevronLeft className="size-4" />
                          ) : (
                            <ChevronRight className="size-4" />
                          )}
                        </CrmButton>
                      </div>
                    ) : null}
                  </div>
                </div>

                {activeTab === "details" ? (
                  <div
                    className={cn(
                      "grid items-start gap-0 lg:grid-cols-[minmax(0,1fr)_var(--mnx-pdf-panel-width)]",
                    )}
                    style={
                      {
                        "--mnx-pdf-panel-width": pdfPanelCollapsed ? "48px" : "420px",
                      } as React.CSSProperties
                    }
                  >
                    <div className="space-y-6 p-5">
                      {(quote.status === "sent" ||
                        quote.status === "customer-viewed") &&
                        quote.slaDeadline &&
                        new Date() > new Date(quote.slaDeadline) && (
                          <div className="flex items-start gap-4 p-4 rounded-2xl bg-[var(--mnx-warning-bg)] border border-[var(--mnx-warning)] text-[var(--mnx-warning)] shadow-sm">
                            <span
                              className="mnx-crm-icon-badge mt-0.5 flex-shrink-0"
                              style={{
                                background: "var(--mnx-warning-bg)",
                                color: "var(--mnx-accent)",
                              }}
                            >
                              <ShieldAlert size={18} />
                            </span>
                            <div>
                              <h4 className="mnx-title-3 font-semibold text-[var(--mnx-warning)]">
                                2-Day Response SLA Breached
                              </h4>
                              <p className="text-sm text-[var(--mnx-warning)] mt-1">
                                No update has been received from the customer on
                                this quote within 2 business days. The owner and
                                accounts department have been notified.
                              </p>
                            </div>
                          </div>
                        )}
                      <section className="rounded-2xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] p-4">
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          <DetailPair
                            label="Quote Number"
                            value={quote.quoteNumber}
                          />
                          <DetailPair
                            label="Quote Date"
                            value={formatDate(quote.date)}
                          />
                          <DetailPair
                            label="Creation Date"
                            value={formatDate(quote.creationDate)}
                          />
                          <DetailPair
                            label="Salesperson"
                            value={quote.salesperson || "-"}
                          />
                          <DetailPair
                            label="Place of Supply"
                            value={quote.placeOfSupply}
                          />
                          <DetailPair
                            label="PDF Template"
                            value={quote.pdfTemplate}
                          />
                        </div>
                      </section>

                      <section className="rounded-2xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] p-5">
                        <div className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--mnx-text-muted)]">
                          Customer Details
                        </div>
                        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr_1fr]">
                          <div>
                            <div className="flex items-center gap-3">
                              <div className="flex size-10 items-center justify-center rounded-full bg-[var(--mnx-accent)]/10 text-sm font-semibold text-[var(--mnx-accent)]">
                                {quote.customerInitial}
                              </div>
                              <div>
                                <p className="font-semibold text-[var(--mnx-text-strong)]">
                                  {quote.customerName}
                                </p>
                                <p className="text-sm text-[var(--mnx-text-muted)]">
                                  {quote.referenceNumber}
                                </p>
                              </div>
                            </div>
                          </div>
                          <AddressBlock
                            label="Billing Address"
                            value={quote.billingAddress}
                          />
                          <AddressBlock
                            label="Shipping Address"
                            value={quote.shippingAddress}
                          />
                        </div>
                      </section>

                      <section className="rounded-2xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] p-5">
                        <div className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--mnx-text-muted)]">
                          Logistics Details
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          <DetailPair
                            label="Port of Loading"
                            value={formatOptionalValue(quote.portOfLoading)}
                          />
                          <DetailPair
                            label="Loading Country"
                            value={formatOptionalValue(quote.portOfLoadingCountry)}
                          />
                          <DetailPair
                            label="Port of Discharge"
                            value={formatOptionalValue(quote.portOfDischarge)}
                          />
                          <DetailPair
                            label="Destination Country"
                            value={formatOptionalValue(quote.portOfDestinationCountry)}
                          />
                          <DetailPair
                            label="Incoterm"
                            value={formatOptionalValue(quote.incoterm)}
                          />
                          <DetailPair
                            label="Container Type"
                            value={formatOptionalValue(quote.containerType)}
                          />
                          <DetailPair
                            label="No. of Containers"
                            value={formatOptionalValue(quote.numberOfContainers)}
                          />
                          <DetailPair
                            label="Commodity"
                            value={formatOptionalValue(quote.commodity)}
                          />
                          <DetailPair
                            label="Weight"
                            value={formatOptionalValue(quote.weight)}
                          />
                        </div>
                      </section>

                      {selectedDepartmentState !== "available" ||
                      !selectedDepartmentQuote ? (
                        <section className="rounded-2xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] p-8 text-center">
                          <p className="text-lg font-semibold text-[var(--mnx-text-strong)]">
                            {resolvedDepartmentView === "FREIGHT_FORWARDING"
                              ? selectedDepartmentState === "pending"
                                ? "Freight quote yet to receive"
                                : "Freight quote not available"
                              : selectedDepartmentState === "pending"
                                ? "Clearance quote yet to receive"
                                : "Clearance quote not available"}
                          </p>
                          <p className="mt-2 text-sm text-[var(--mnx-text-muted)]">
                            {selectedDepartmentState === "pending"
                              ? "This department is part of the shipment, but the quotation details are still pending from the team."
                              : "This shipment does not include that department quotation."}
                          </p>
                        </section>
                      ) : (
                      <section className="rounded-2xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)]">
                        <div className="flex items-center justify-between border-b border-[var(--mnx-border)] px-5 py-4">
                          <div className="flex items-center gap-3">
                            <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--mnx-text-strong)]">
                              Items
                            </h2>
                            <span className="rounded-full bg-[var(--mnx-accent)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--mnx-accent)]">
                              {selectedDepartmentQuote.items.length}
                            </span>
                          </div>
                          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--mnx-surface)] px-3 py-1.5 text-xs font-medium text-[var(--mnx-text-muted)]">
                            <FileText className="size-4" />
                            {resolvedDepartmentView === "FREIGHT_FORWARDING"
                              ? "Freight Details View"
                              : "Clearance Details View"}
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <CrmTable className="w-full min-w-[760px]">
                            <thead className="bg-[var(--mnx-surface)] text-left text-[11px] uppercase tracking-[0.12em] text-[var(--mnx-text-muted)]">
                              <tr>
                                <th className="px-5 py-3">S.No</th>
                                <th className="px-5 py-3">Item</th>
                                <th className="px-5 py-3">HSN/SAC</th>
                                <th className="px-5 py-3 text-right">Qty</th>
                                <th className="px-5 py-3 text-right">Price</th>
                                <th className="px-5 py-3 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--mnx-border)] text-sm">
                              {selectedDepartmentQuote.items.map((item, index) => {
                                const showForeign =
                                  displayCurrency === "foreign" &&
                                  item.currency &&
                                  item.currency !== "INR";
                                const formattedPrice = showForeign
                                  ? (() => {
                                      try {
                                        return new Intl.NumberFormat("en-US", {
                                          style: "currency",
                                          currency: item.currency,
                                          minimumFractionDigits: 2,
                                        }).format(item.price);
                                      } catch {
                                        return `${item.price.toFixed(2)} ${item.currency}`;
                                      }
                                    })()
                                  : formatAmount(
                                      item.price * (item.exchangeRate || 1),
                                    );

                                const formattedAmountVal = showForeign
                                  ? (() => {
                                      try {
                                        return new Intl.NumberFormat("en-US", {
                                          style: "currency",
                                          currency: item.currency,
                                          minimumFractionDigits: 2,
                                        }).format(item.quantity * item.price);
                                      } catch {
                                        return `${(item.quantity * item.price).toFixed(2)} ${item.currency}`;
                                      }
                                    })()
                                  : formatAmount(item.amount);

                                return (
                                  <tr key={item.id}>
                                    <td className="px-5 py-4 text-[var(--mnx-text-muted)]">
                                      {index + 1}
                                    </td>
                                    <td className="px-5 py-4">
                                      <div className="font-medium text-[var(--mnx-text-strong)]">
                                        {item.name}
                                      </div>
                                      {item.description ? (
                                        <div className="mt-1 text-xs text-[var(--mnx-text-muted)]">
                                          {item.description}
                                        </div>
                                      ) : null}
                                      {showForeign && (
                                        <div className="mt-1 text-[11px] text-[var(--mnx-text-muted)]">
                                          Ex. Rate: 1 {item.currency} = ₹
                                          {item.exchangeRate ?? 1} INR
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-5 py-4 text-[var(--mnx-text-muted)]">
                                      {item.hsnSac || "—"}
                                    </td>
                                    <td className="px-5 py-4 text-right text-[var(--mnx-text-muted)]">
                                      {item.quantity}
                                    </td>
                                    <td className="px-5 py-4 text-right text-[var(--mnx-text-muted)] font-mono">
                                      {formattedPrice}
                                    </td>
                                    <td className="px-5 py-4 text-right font-medium text-[var(--mnx-text-strong)] font-mono">
                                      {formattedAmountVal}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </CrmTable>
                        </div>

                        <div className="border-t border-[var(--mnx-border)] px-5 py-5">
                          <div className="ml-auto w-full max-w-[360px] space-y-3 text-sm">
                            <SummaryRow
                              label="Sub Total"
                              value={formatAmount(selectedDepartmentQuote.subtotal)}
                              strong
                            />
                            {selectedDepartmentQuote.taxes.map((tax) => (
                              <SummaryRow
                                key={tax.label}
                                label={tax.label}
                                value={formatAmount(tax.amount)}
                              />
                            ))}
                            <SummaryRow
                              label="Discount"
                              value={formatAmount(selectedDepartmentQuote.discount)}
                            />
                            <SummaryRow
                              label="Adjustment"
                              value={String(selectedDepartmentQuote.adjustment)}
                            />
                            <SummaryRow
                              label="Round Off"
                              value={formatAmount(selectedDepartmentQuote.roundOff)}
                            />
                            <div className="mt-3 flex items-center justify-between border-t border-[var(--mnx-border)] pt-3 text-base font-semibold text-[var(--mnx-text-strong)]">
                              <span>Total</span>
                              <span>{formatAmount(selectedDepartmentQuote.total)}</span>
                            </div>
                          </div>
                        </div>
                      </section>
                      )}

                      <section className="rounded-2xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] p-5">
                        <div className="grid gap-6 xl:grid-cols-2">
                          <div>
                            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--mnx-text-muted)]">
                              Notes
                            </div>
                            <p className="text-sm leading-7 text-[var(--mnx-text-muted)]">
                              {quote.notes || "No notes added."}
                            </p>
                          </div>
                          <div>
                            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--mnx-text-muted)]">
                              Terms and Conditions
                            </div>
                            <p className="text-sm leading-7 text-[var(--mnx-text-muted)]">
                              {quote.terms || "No Terms and Conditions"}
                            </p>
                          </div>
                        </div>
                        {(() => {
                          const bank = bankAccounts.find(
                            (b) => b.id === quote.bankDetailsId,
                          );
                          if (!bank) return null;
                          return (
                            <div className="mt-5 border-t border-[var(--mnx-border)] pt-5">
                              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--mnx-text-muted)]">
                                Bank Details
                              </div>
                              <div className="grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
                                <div>
                                  <span className="text-[var(--mnx-text-muted)]">
                                    Bank:{" "}
                                  </span>
                                  <span className="font-medium text-[var(--mnx-text-strong)]">
                                    {bank.bankName}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[var(--mnx-text-muted)]">
                                    Account Name:{" "}
                                  </span>
                                  <span className="font-medium text-[var(--mnx-text-strong)]">
                                    {bank.accountName}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[var(--mnx-text-muted)]">
                                    Account No:{" "}
                                  </span>
                                  <span className="font-medium text-[var(--mnx-text-strong)]">
                                    {bank.accountNumber}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[var(--mnx-text-muted)]">
                                    IFSC:{" "}
                                  </span>
                                  <span className="font-medium text-[var(--mnx-text-strong)]">
                                    {bank.ifsc}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[var(--mnx-text-muted)]">
                                    Branch:{" "}
                                  </span>
                                  <span className="font-medium text-[var(--mnx-text-strong)]">
                                    {bank.branch}
                                  </span>
                                </div>
                                {bank.upi && (
                                  <div>
                                    <span className="text-[var(--mnx-text-muted)]">
                                      UPI:{" "}
                                    </span>
                                    <span className="font-medium text-[var(--mnx-text-strong)]">
                                      {bank.upi}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </section>
                    </div>

                    <aside
                      className={cn(
                        "sticky top-0 flex min-w-0 flex-col overflow-hidden border-l border-[var(--mnx-border)] bg-[var(--mnx-surface)] transition-all",
                      )}
                    >
                      {pdfPanelCollapsed ? (
                        <button
                          type="button"
                          onClick={togglePdfPanel}
                          className="flex h-full min-h-[240px] flex-1 items-center justify-center py-4"
                          aria-label="Show PDF preview"
                          title="Show PDF preview"
                        >
                          <span className="rounded-2xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--mnx-text-muted)] [writing-mode:vertical-rl]">
                            PDF Preview
                          </span>
                        </button>
                      ) : selectedDepartmentState === "available" &&
                        selectedDepartmentQuote ? (
                        <div className="flex-1 overflow-y-auto p-4">
                          <QuotePdfPreview
                            quote={selectedDepartmentQuote}
                            displayCurrency={displayCurrency}
                          />
                        </div>
                      ) : (
                        <div className="p-6 text-center">
                          <p className="text-sm font-semibold text-[var(--mnx-text-strong)]">
                            {resolvedDepartmentView === "FREIGHT_FORWARDING"
                              ? selectedDepartmentState === "pending"
                                ? "Freight PDF yet to receive"
                                : "Freight PDF not available"
                              : selectedDepartmentState === "pending"
                                ? "Clearance PDF yet to receive"
                                : "Clearance PDF not available"}
                          </p>
                          <p className="mt-2 text-xs text-[var(--mnx-text-muted)]">
                            {selectedDepartmentState === "pending"
                              ? "The department quotation has not been submitted yet."
                              : "This shipment does not have a quotation for the selected department."}
                          </p>
                        </div>
                      )}
                    </aside>
                  </div>
                ) : (
                  <div className="p-6 bg-[var(--mnx-surface)] rounded-2xl border border-[var(--mnx-border)]">
                    <ApprovalLogList logs={quote.approvalLogs || []} />
                  </div>
                )}
              </section>
              </CrmSection>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  dropdown = false,
  onClick,
  disabled = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  dropdown?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <CrmButton
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] px-3.5 text-sm font-medium text-[var(--mnx-text-muted)] shadow-sm hover:bg-[var(--mnx-surface)] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Icon className="size-4 text-[var(--mnx-text-muted)]" />
      <span>{label}</span>
      {dropdown ? (
        <ChevronDown className="size-4 text-[var(--mnx-text-muted)]" />
      ) : null}
    </CrmButton>
  );
}

function ActionMenuButton({
  icon: Icon,
  label,
  active = false,
  onClick,
  disabled = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <CrmButton
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors",
        active
          ? "bg-[var(--mnx-accent)] text-[var(--mnx-text-strong)]"
          : "text-[var(--mnx-text-muted)] hover:bg-[var(--mnx-surface)]",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <Icon className="size-4" />
      {label}
    </CrmButton>
  );
}

function InfoPanel({
  title,
  icon: Icon,
  rows,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  rows: Array<[string, string]>;
}) {
  const safeRows = rows.length ? rows : [["Status", "No details available"]];
  return (
    <CrmPanel className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--mnx-accent)]/10 text-[var(--mnx-accent)]">
          <Icon className="size-4" />
        </span>
        <h2 className="text-base font-semibold text-[var(--mnx-text-strong)]">
          {title}
        </h2>
      </div>
      <div className="space-y-3">
        {safeRows.map(([label, value]) => (
          <div
            key={`${title}-${label}`}
            className="flex flex-col gap-1 rounded-xl bg-[var(--mnx-surface)] px-4 py-3"
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mnx-text-muted)]">
              {label}
            </span>
            <span className="text-sm text-[var(--mnx-text-strong)]">
              {value}
            </span>
          </div>
        ))}
      </div>
    </CrmPanel>
  );
}

function DetailPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[var(--mnx-surface)] px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mnx-text-muted)]">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-[var(--mnx-text-strong)]">
        {value}
      </div>
    </div>
  );
}

function AddressBlock({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-2xl bg-[var(--mnx-surface)] px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mnx-text-muted)]">
        {label}
      </div>
      <div className="mt-2 text-sm leading-6 text-[var(--mnx-text-muted)]">
        {value || "-"}
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4",
        strong
          ? "font-semibold text-[var(--mnx-text-strong)]"
          : "text-[var(--mnx-text-muted)]",
      )}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function QuotePdfPreview({
  quote,
  displayCurrency,
}: {
  quote: QuoteDetailRecord;
  displayCurrency: "INR" | "foreign";
}) {
  const supplierStateCode = quote.location
    ? getStateCodeForLocation(quote.location)
    : "";
  const isSameState =
    supplierStateCode && supplierStateCode === quote.placeOfSupply;

  return (
    <div className="overflow-auto bg-[var(--mnx-surface)] p-6 sm:p-8">
      <div className=" mx-auto w-full max-w-[1120px] border border-[var(--mnx-border)] bg-[var(--mnx-surface)] p-6 mnx-shadow-panel sm:p-10">
        <div className="relative mx-auto max-w-[920px] border border-[var(--mnx-border)] bg-[var(--mnx-surface)] overflow-hidden">
          <StatusWatermark status={quote.status} />

          <div className="grid grid-cols-[220px_1fr_200px] border-b border-[var(--mnx-border)]">
            <div className="flex items-center justify-center border-r border-[var(--mnx-border)] px-4 py-6">
              <Image
                src="/Logo.png"
                alt="Adarsh Shipping & Services"
                width={220}
                height={72}
                className="h-auto w-[180px]"
              />
            </div>
            <div className="px-5 py-5 text-[17px] leading-8 text-[var(--mnx-text-strong)]">
              <div className="font-semibold">Adarsh shipping and services</div>
              <div>CHOOLAI</div>
              <div>Chennai Tamil Nadu 600112</div>
              <div>India</div>
              <div>GSTIN 33AAAFA4117G1Z5</div>
            </div>
            <div className="flex items-center justify-center px-5 py-5 text-[34px] tracking-wide text-[var(--mnx-text-strong)]">
              QUOTE
            </div>
          </div>

          <div className="grid grid-cols-2 border-b border-[var(--mnx-border)] text-[14px] text-[var(--mnx-text-strong)]">
            <div className="border-r border-[var(--mnx-border)]">
              <PdfMetaRow label="#" value={quote.quoteNumber} />
              <PdfMetaRow label="Quote Date" value={formatDate(quote.date)} />
            </div>
            <div>
              <PdfMetaRow label="Place Of Supply" value={quote.placeOfSupply} />
            </div>
          </div>

          <div className="border-b border-[var(--mnx-border)] px-3 py-2 text-[13px] font-semibold text-[var(--mnx-text-strong)]">
            Bill To
          </div>
          <div className="border-b border-[var(--mnx-border)] px-3 py-2 text-[15px] font-semibold text-[var(--mnx-accent)]">
            {quote.customerName}
          </div>

          <div className="overflow-x-auto w-full">
            <CrmTable className="w-full border-collapse text-[13px] text-[var(--mnx-text-strong)] min-w-[920px]">
              <thead>
                <tr className="bg-[var(--mnx-surface)]">
                  <PdfCell
                    as="th"
                    className="w-[42px] text-center font-semibold"
                  >
                    #
                  </PdfCell>
                  <PdfCell
                    as="th"
                    className="min-w-[200px] text-left font-semibold"
                  >
                    Item & Description
                  </PdfCell>
                  <PdfCell as="th" className="w-[90px] text-left font-semibold">
                    Unit
                  </PdfCell>
                  <PdfCell as="th" className="w-[80px] text-left font-semibold">
                    HSN/SAC
                  </PdfCell>
                  <PdfCell
                    as="th"
                    className="w-[70px] text-right font-semibold"
                  >
                    Qty
                  </PdfCell>
                  <PdfCell
                    as="th"
                    className="w-[90px] text-right font-semibold"
                  >
                    Rate
                  </PdfCell>
                  {isSameState ? (
                    <>
                      <PdfCell
                        as="th"
                        className="w-[50px] text-right font-semibold"
                      >
                        %
                      </PdfCell>
                      <PdfCell
                        as="th"
                        className="w-[74px] text-right font-semibold"
                      >
                        CGST Amt
                      </PdfCell>
                      <PdfCell
                        as="th"
                        className="w-[50px] text-right font-semibold"
                      >
                        %
                      </PdfCell>
                      <PdfCell
                        as="th"
                        className="w-[74px] text-right font-semibold"
                      >
                        SGST Amt
                      </PdfCell>
                    </>
                  ) : (
                    <>
                      <PdfCell
                        as="th"
                        className="w-[60px] text-right font-semibold"
                      >
                        %
                      </PdfCell>
                      <PdfCell
                        as="th"
                        className="w-[80px] text-right font-semibold"
                      >
                        IGST Amt
                      </PdfCell>
                    </>
                  )}
                  <PdfCell
                    as="th"
                    className="w-[100px] text-right font-semibold"
                  >
                    Amount
                  </PdfCell>
                </tr>
              </thead>
              <tbody>
                {quote.items.map((item, index) => {
                  const taxPercent = parseFloat(
                    String(item.tax).match(/[\d.]+/)?.[0] ?? "18",
                  );
                  const totalTaxAmount = item.amount * (taxPercent / 100);
                  const unit =
                    item.unit || (index % 2 === 0 ? "Container" : "Shipment");
                  const hsn = item.hsnSac || "—";

                  const showForeign =
                    displayCurrency === "foreign" &&
                    item.currency &&
                    item.currency !== "INR";
                  const formattedPrice = showForeign
                    ? (() => {
                        try {
                          return new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: item.currency,
                            minimumFractionDigits: 2,
                          }).format(item.price);
                        } catch {
                          return `${item.price.toFixed(2)} ${item.currency}`;
                        }
                      })()
                    : formatPdfMoney(item.price * (item.exchangeRate || 1));

                  const formattedAmountVal = showForeign
                    ? (() => {
                        try {
                          return new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: item.currency,
                            minimumFractionDigits: 2,
                          }).format(item.quantity * item.price);
                        } catch {
                          return `${(item.quantity * item.price).toFixed(2)} ${item.currency}`;
                        }
                      })()
                    : formatPdfMoney(item.amount);

                  return (
                    <tr key={item.id}>
                      <PdfCell className="align-top text-center">
                        {index + 1}
                      </PdfCell>
                      <PdfCell className="align-top">
                        <div>{item.name}</div>
                        {item.description ? (
                          <div className="mt-1 text-[12px] text-[var(--mnx-text-muted)]">
                            {item.description}
                          </div>
                        ) : null}
                        {showForeign && (
                          <div className="mt-1 text-[10px] text-[var(--mnx-text-muted)]">
                            Ex. Rate: 1 {item.currency} = ₹
                            {item.exchangeRate ?? 1} INR
                          </div>
                        )}
                      </PdfCell>
                      <PdfCell className="align-top">{unit}</PdfCell>
                      <PdfCell className="align-top">{hsn}</PdfCell>
                      <PdfCell className="align-top text-right">
                        {item.quantity.toFixed(2)}
                      </PdfCell>
                      <PdfCell className="align-top text-right font-mono">
                        {formattedPrice}
                      </PdfCell>
                      {isSameState ? (
                        <>
                          <PdfCell className="align-top text-right">
                            {(taxPercent / 2).toFixed(1)}%
                          </PdfCell>
                          <PdfCell className="align-top text-right">
                            {formatPdfMoney(totalTaxAmount / 2)}
                          </PdfCell>
                          <PdfCell className="align-top text-right">
                            {(taxPercent / 2).toFixed(1)}%
                          </PdfCell>
                          <PdfCell className="align-top text-right">
                            {formatPdfMoney(totalTaxAmount / 2)}
                          </PdfCell>
                        </>
                      ) : (
                        <>
                          <PdfCell className="align-top text-right">
                            {taxPercent.toFixed(1)}%
                          </PdfCell>
                          <PdfCell className="align-top text-right">
                            {formatPdfMoney(totalTaxAmount)}
                          </PdfCell>
                        </>
                      )}
                      <PdfCell className="align-top text-right font-mono">
                        {formattedAmountVal}
                      </PdfCell>
                    </tr>
                  );
                })}
                <tr>
                  <td
                    colSpan={isSameState ? 11 : 9}
                    className="border border-[var(--mnx-border)] p-0"
                  >
                    <div className="ml-auto max-w-[360px] space-y-2 px-4 py-4 text-[13px]">
                      <PdfSummaryRow
                        label="Sub Total"
                        value={formatPdfMoney(quote.subtotal)}
                        strong
                      />
                      {quote.taxes.map((tax) => (
                        <PdfSummaryRow
                          key={tax.label}
                          label={tax.label}
                          value={formatPdfMoney(tax.amount)}
                        />
                      ))}
                      <PdfSummaryRow
                        label="Discount"
                        value={formatPdfMoney(quote.discount)}
                      />
                      <PdfSummaryRow
                        label="Adjustment"
                        value={String(quote.adjustment)}
                      />
                      <PdfSummaryRow
                        label="Round Off"
                        value={formatPdfMoney(quote.roundOff)}
                      />
                      <div className="mt-3 flex items-center justify-between border-t border-[var(--mnx-border)] pt-3 text-[16px] font-semibold">
                        <span>Total</span>
                        <span>{formatPdfMoney(quote.total)}</span>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </CrmTable>
          </div>

          <div className="border-t border-[var(--mnx-border)] px-4 py-4 text-[13px] text-[var(--mnx-text-strong)]">
            <div className="mb-2 font-semibold">Notes</div>
            <div>{quote.notes || "Looking forward for your business."}</div>
          </div>

          <div className="border-t border-[var(--mnx-border)] px-4 py-4 text-[13px] text-[var(--mnx-text-strong)]">
            <div className="mb-2 font-semibold">Terms and Conditions</div>
            <div>{quote.terms || "No Terms and Conditions"}</div>
          </div>
          {(() => {
            const bank = bankAccounts.find((b) => b.id === quote.bankDetailsId);
            if (!bank) return null;
            return (
              <div className="border-t border-[var(--mnx-border)] px-4 py-4 text-[13px] text-[var(--mnx-text-strong)]">
                <div className="mb-2 font-semibold">Bank Details</div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  <div>
                    <span className="text-[var(--mnx-text-muted)]">Bank: </span>
                    {bank.bankName}
                  </div>
                  <div>
                    <span className="text-[var(--mnx-text-muted)]">
                      Account Name:{" "}
                    </span>
                    {bank.accountName}
                  </div>
                  <div>
                    <span className="text-[var(--mnx-text-muted)]">
                      Account No:{" "}
                    </span>
                    {bank.accountNumber}
                  </div>
                  <div>
                    <span className="text-[var(--mnx-text-muted)]">IFSC: </span>
                    {bank.ifsc}
                  </div>
                  <div>
                    <span className="text-[var(--mnx-text-muted)]">
                      Branch:{" "}
                    </span>
                    {bank.branch}
                  </div>
                  {bank.upi && (
                    <div>
                      <span className="text-[var(--mnx-text-muted)]">
                        UPI:{" "}
                      </span>
                      {bank.upi}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

function PdfMetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[170px_1fr] border-b border-[var(--mnx-border)] last:border-b-0">
      <div className="px-3 py-2">{label}</div>
      <div className="px-3 py-2 font-semibold">: {value}</div>
    </div>
  );
}

function PdfCell({
  as = "td",
  className,
  children,
}: {
  as?: "td" | "th";
  className?: string;
  children: React.ReactNode;
}) {
  const Comp = as;
  return (
    <Comp
      className={cn("border border-[var(--mnx-border)] px-2 py-2", className)}
    >
      {children}
    </Comp>
  );
}

function PdfSummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4",
        strong ? "font-semibold" : "",
      )}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function formatPdfMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

const watermarkConfig: Record<
  Exclude<QuoteListStatus, "all">,
  { from: string; via: string; to: string; shadow: string; text: string }
> = {
  draft: {
    from: "var(--mnx-text-muted)",
    via: "var(--mnx-text-muted)",
    to: "var(--mnx-text-muted)",
    shadow: "var(--mnx-accent-soft)",
    text: "var(--mnx-text-muted)",
  },
  "pending-manager-approval": {
    from: "var(--mnx-warning)",
    via: "var(--mnx-warning)",
    to: "var(--mnx-warning)",
    shadow: "var(--mnx-warning-bg)",
    text: "var(--mnx-warning-bg)",
  },
  "pending-customer-approval": {
    from: "var(--mnx-accent)",
    via: "var(--mnx-accent)",
    to: "var(--mnx-accent)",
    shadow: "var(--mnx-accent-soft)",
    text: "var(--mnx-text-muted)",
  },
  "customer-approved": {
    from: "var(--mnx-success)",
    via: "var(--mnx-success)",
    to: "var(--mnx-success)",
    shadow: "var(--mnx-success-bg)",
    text: "var(--mnx-success-bg)",
  },
  "booking-created": {
    from: "var(--mnx-success)",
    via: "var(--mnx-success)",
    to: "var(--mnx-success)",
    shadow: "var(--mnx-success-bg)",
    text: "var(--mnx-success-bg)",
  },
  "pending-approval": {
    from: "var(--mnx-warning)",
    via: "var(--mnx-warning)",
    to: "var(--mnx-warning)",
    shadow: "var(--mnx-warning-bg)",
    text: "var(--mnx-warning-bg)",
  },
  approved: {
    from: "var(--mnx-success)",
    via: "var(--mnx-success)",
    to: "var(--mnx-success)",
    shadow: "var(--mnx-success-bg)",
    text: "var(--mnx-success-bg)",
  },
  sent: {
    from: "var(--mnx-accent)",
    via: "var(--mnx-accent)",
    to: "var(--mnx-accent)",
    shadow: "var(--mnx-accent-soft)",
    text: "var(--mnx-text-muted)",
  },
  "customer-viewed": {
    from: "var(--mnx-accent)",
    via: "var(--mnx-accent)",
    to: "var(--mnx-accent)",
    shadow: "var(--mnx-accent-soft)",
    text: "var(--mnx-text-muted)",
  },
  accepted: {
    from: "var(--mnx-success)",
    via: "var(--mnx-success)",
    to: "var(--mnx-success)",
    shadow: "var(--mnx-success-bg)",
    text: "var(--mnx-success-bg)",
  },
  invoiced: {
    from: "var(--mnx-accent)",
    via: "var(--mnx-accent)",
    to: "var(--mnx-accent)",
    shadow: "var(--mnx-accent-soft)",
    text: "var(--mnx-text-muted)",
  },
  declined: {
    from: "var(--mnx-danger)",
    via: "var(--mnx-danger)",
    to: "var(--mnx-danger)",
    shadow: "var(--mnx-danger-bg)",
    text: "var(--mnx-danger-bg)",
  },
  rework: {
    from: "var(--mnx-accent)",
    via: "var(--mnx-warning)",
    to: "var(--mnx-warning)",
    shadow: "var(--mnx-warning-bg)",
    text: "var(--mnx-warning-bg)",
  },
};

function StatusWatermark({
  status,
}: {
  status: Exclude<QuoteListStatus, "all">;
}) {
  const cfg = watermarkConfig[status];
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        top: "20px",
        right: "-32px",
        width: "148px",
        zIndex: 20,
        transform: "rotate(45deg)",
        background: `linear-gradient(180deg, ${cfg.from} 0%, ${cfg.via} 50%, ${cfg.to} 100%)`,
        boxShadow: [
          `0 4px 12px ${cfg.shadow}`,
          `0 1px 3px var(--mnx-border)`,
          `inset 0 1px 0 var(--mnx-accent-soft)`,
          `inset 0 -1px 0 var(--mnx-border)`,
        ].join(", "),
        padding: "5px 0 4px",
        textAlign: "center",
        color: cfg.text,
        fontWeight: 700,
        fontSize: "10px",
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        textShadow: `0 1px 3px var(--mnx-border)`,
        borderTop: `1px solid var(--mnx-accent-soft)`,
        borderBottom: `1px solid var(--mnx-border)`,
      }}
    >
      {formatStatus(status)}
    </div>
  );
}
