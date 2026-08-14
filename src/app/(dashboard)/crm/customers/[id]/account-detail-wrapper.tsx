"use client";

import {
  CrmButton,
  CrmInput,
  CrmTable,
} from "@/modules/crm/components/workspace/crm-workspace";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { deleteAccountAction } from "@/modules/crm/actions";
import { NotesPanel } from "@/modules/crm/components/records/notes-panel";
import { TimelinePanel } from "@/modules/crm/components/records/timeline-panel";
import {
  Edit2,
  Users,
  FileText,
  Plus,
  Search,
  ChevronDown,
  X,
  Building,
  MapPin,
  FileText as StatementIcon,
  DollarSign,
  TrendingUp,
  User as UserIcon,
  MoreHorizontal,
  ArrowRight,
} from "lucide-react";

type CustomerContact = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
};

type CustomerInvoice = {
  id: string;
  invoiceNumber?: string | null;
  type?: string | null;
  status?: string | null;
  total?: number | null;
  date?: string | Date | null;
};

type CustomerAccountListItem = {
  id: string;
  name?: string | null;
  email?: string | null;
  invoices?: CustomerInvoice[] | null;
};

type CustomerAccountDetail = CustomerAccountListItem & {
  billingAddress?: string | null;
  companyName?: string | null;
  contacts?: CustomerContact[] | null;
  creditLimit?: number | null;
  currency?: string | null;
  customerSubType?: string | null;
  firstName?: string | null;
  gstTreatment?: string | null;
  industry?: string | null;
  language?: string | null;
  lastName?: string | null;
  pan?: string | null;
  paymentTerms?: string | null;
  phone?: string | null;
  placeOfSupply?: string | null;
  salutation?: string | null;
  shippingAddress?: string | null;
  status?: string | null;
};

interface AccountDetailWrapperProps {
  account: CustomerAccountDetail;
  notes: unknown[];
  attachments: unknown[];
  activities: unknown[];
  timeline: unknown[];
  invoices: CustomerInvoice[];
  accounts: CustomerAccountListItem[];
  search: string;
}

export function AccountDetailWrapper({
  account,
  notes,
  timeline,
  invoices,
  accounts,
  search: initialSearch,
}: AccountDetailWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeTabQuery = searchParams.get("tab");
  const isContactsTabOnly = activeTabQuery === "contacts";

  const [activeTab, setActiveTab] = useState<
    "OVERVIEW" | "NOTES" | "TRANSACTIONS" | "STATEMENT" | "TIMELINE"
  >("OVERVIEW");
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [openDropdown, setOpenDropdown] = useState<"newTxn" | "moreActions" | null>(null);
  const newTxnRef = useRef<HTMLDivElement | null>(null);
  const moreActionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !newTxnRef.current?.contains(target) &&
        !moreActionsRef.current?.contains(target)
      ) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this customer? This will delete all linked contacts too!",
      )
    )
      return;

    const res = await deleteAccountAction(account.id);
    if (res.ok) {
      toast.success("Customer deleted successfully");
      router.push("/crm/customers");
    } else {
      toast.error(res.error);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(
      `/crm/customers/${account.id}?search=${encodeURIComponent(searchQuery)}`,
    );
  };

  const handleSearchClear = () => {
    setSearchQuery("");
    router.push(`/crm/customers/${account.id}`);
  };

  // Integration Calculations
  const totalInvoiced = invoices.reduce(
    (sum, inv) => sum + (inv.total ?? 0),
    0,
  );
  const unpaidInvoices = invoices.filter(
    (inv) => inv.status !== "PAID" && inv.status !== "CANCELLED",
  );
  const overdueTotal = unpaidInvoices.reduce(
    (sum, inv) => sum + (inv.total ?? 0),
    0,
  );

  // Helper to format currency
  const fmtCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(val);
  };

  // Helper to compute balance for a list item
  const getListItemBalance = (acc: CustomerAccountListItem) => {
    const listUnpaid =
      acc.invoices?.filter(
        (inv) => inv.status !== "PAID" && inv.status !== "CANCELLED",
      ) || [];
    return listUnpaid.reduce((sum, inv) => sum + (inv.total ?? 0), 0);
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-56px)] h-[calc(100vh-56px)] bg-[var(--mnx-surface)] text-[var(--color-on-surface)] overflow-hidden w-full font-sans">
      {/* ─── LEFT SIDEBAR: CUSTOMER LIST ────────────────────────────────── */}
      <div className="w-full lg:w-85 border-r border-[var(--mnx-border)]/50 flex flex-col shrink-0 bg-[var(--mnx-surface)] h-full overflow-hidden">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-[var(--mnx-border)]/50 flex items-center justify-between gap-2 bg-[var(--mnx-surface)]">
          <div className="flex items-center gap-1.5">
            <span className="mnx-title-3 text-sm font-bold text-[var(--mnx-text-strong)] tracking-wide">
              All Customers
            </span>
            <span className="px-2 py-0.5 rounded bg-[var(--mnx-surface)] border border-[var(--mnx-border)] text-[10px] text-[var(--mnx-muted)] font-bold mnx-numeric">
              {accounts.length}
            </span>
          </div>
          <Link
            href="/crm/customers/new"
            className="flex items-center justify-center bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent)] text-[var(--mnx-text-strong)] p-2 rounded-xl transition-all mnx-shadow-panel hover:-translate-y-0.5 active:translate-y-0 active:shadow-none cursor-pointer"
            title="Create New Customer"
          >
            <Plus className="size-4" />
          </Link>
        </div>

        {/* Sidebar Search Bar */}
        <form
          onSubmit={handleSearchSubmit}
          className="p-3 border-b border-[var(--mnx-border)]/30 bg-[var(--mnx-surface)] flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-[var(--mnx-muted)]" />
            <CrmInput
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-6 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs placeholder:text-[var(--mnx-muted)] text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
            />
            {searchQuery && (
              <CrmButton
                type="button"
                onClick={handleSearchClear}
                className="absolute right-2 top-2 text-[var(--mnx-muted)] hover:text-[var(--mnx-text-strong)] cursor-pointer"
              >
                <X className="size-3.5" />
              </CrmButton>
            )}
          </div>
          <CrmButton
            type="submit"
            className="px-3 py-1.5 bg-[var(--mnx-surface)] hover:bg-[var(--mnx-text-muted)] border border-[var(--mnx-border)] text-[var(--mnx-muted)] rounded-lg text-xs font-semibold cursor-pointer"
          >
            Go
          </CrmButton>
        </form>

        {/* Scrollable Customer List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--mnx-border)]/20">
          {accounts.length === 0 ? (
            <div className="p-8 text-center text-[var(--mnx-muted)] text-xs italic">
              No customers found.
            </div>
          ) : (
            accounts.map((acc) => {
              const isActive = acc.id === account.id;
              const balance = getListItemBalance(acc);
              return (
                <Link
                  key={acc.id}
                  href={`/crm/customers/${acc.id}${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ""}${isContactsTabOnly ? "?tab=contacts" : ""}`}
                  className={`block p-4 transition-all cursor-pointer ${
                    isActive
                      ? "bg-[var(--mnx-surface)]/60 border-l-4 border-l-[var(--mnx-accent)]"
                      : "hover:bg-[var(--mnx-surface)]/25 border-l-4 border-l-transparent"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-1">
                      <span
                        className={`text-xs font-bold block ${isActive ? "text-[var(--mnx-accent)]" : "text-[var(--mnx-text-strong)] group-hover:text-[var(--mnx-accent)]"}`}
                      >
                        {acc.name}
                      </span>
                      {acc.email && (
                        <span className="text-[10px] text-[var(--mnx-muted)] block truncate max-w-[180px]">
                          {acc.email}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-xs font-bold block mnx-numeric ${balance > 0 ? "text-[var(--mnx-accent)]" : "text-[var(--mnx-muted)]"}`}
                      >
                        {balance > 0 ? fmtCurrency(balance) : "₹0.00"}
                      </span>
                      <span className="text-[8px] uppercase tracking-wider text-[var(--mnx-muted)] block mt-0.5">
                        Balance
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* ─── RIGHT PANEL: SELECTED CUSTOMER DETAIL ──────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden h-full">
        {/* Detail Panel Header */}
        <div className="p-6 border-b border-[var(--mnx-border)]/50 bg-[var(--mnx-surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-md">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[var(--mnx-accent)]/10 border border-[var(--mnx-accent)]/20 text-[9px] font-bold text-[var(--mnx-accent)] uppercase tracking-wider">
                {account.customerSubType || "Business"}
              </span>
            </div>
            <h1 className="mnx-title-1 text-[var(--mnx-text-strong)] truncate max-w-xl">
              {account.name}
            </h1>
          </div>

          {/* Action Button Toolbar (Tactile 3D Styling) */}
          <div className="flex items-center gap-3 relative">
            <Link
              href={`/crm/customers/${account.id}/edit`}
              className="flex items-center gap-1.5 bg-[var(--mnx-surface)] hover:bg-[var(--mnx-text-muted)] border border-[var(--mnx-border)] text-[var(--mnx-muted)] px-4 py-2 rounded-xl text-xs font-bold transition-all mnx-shadow-panel hover:-translate-y-0.5 active:translate-y-0 active:shadow-none cursor-pointer"
            >
              <Edit2 className="size-3.5" />
              <span>Edit</span>
            </Link>

            {/* New Transaction Dropdown Trigger */}
            <div className="relative" ref={newTxnRef}>
              <CrmButton
                type="button"
                onClick={() =>
                  setOpenDropdown((current) => (current === "newTxn" ? null : "newTxn"))
                }
                className="flex items-center gap-1.5 bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent)] text-[var(--mnx-text-strong)] px-4 py-2 rounded-xl text-xs font-bold transition-all mnx-shadow-panel hover:-translate-y-0.5 active:translate-y-0 active:shadow-none cursor-pointer"
              >
                <span>New Transaction</span>
                <ChevronDown className="size-3.5" />
              </CrmButton>
              {openDropdown === "newTxn" && (
                <div className="absolute right-0 mt-2 w-48 bg-[var(--mnx-surface)] border-2 border-[var(--mnx-border)] rounded-xl py-1.5 z-20 shadow-2xl">
                  <Link
                    href={`/crm/quotes/new?customerId=${account.id}`}
                    className="block px-4 py-2 text-xs text-[var(--mnx-muted)] hover:bg-[var(--mnx-surface)] hover:text-[var(--mnx-text-strong)]"
                    onClick={() => setOpenDropdown(null)}
                  >
                    Create Quotation
                  </Link>
                  <Link
                    href={`/accounting/sales-invoices/new?customerId=${account.id}`}
                    className="block px-4 py-2 text-xs text-[var(--mnx-muted)] hover:bg-[var(--mnx-surface)] hover:text-[var(--mnx-text-strong)]"
                    onClick={() => setOpenDropdown(null)}
                  >
                    Create Sales Invoice
                  </Link>
                </div>
              )}
            </div>

            {/* More Action Dropdown */}
            <div className="relative" ref={moreActionsRef}>
              <CrmButton
                type="button"
                onClick={() =>
                  setOpenDropdown((current) => (current === "moreActions" ? null : "moreActions"))
                }
                className="flex items-center justify-center bg-[var(--mnx-surface)] hover:bg-[var(--mnx-text-muted)] border border-[var(--mnx-border)] text-[var(--mnx-muted)] p-2 rounded-xl transition-all mnx-shadow-panel hover:-translate-y-0.5 active:translate-y-0 active:shadow-none cursor-pointer"
                title="More Actions"
              >
                <MoreHorizontal className="size-4" />
              </CrmButton>
              {openDropdown === "moreActions" && (
                <div className="absolute right-0 mt-2 w-40 bg-[var(--mnx-surface)] border-2 border-[var(--mnx-border)] rounded-xl py-1.5 z-20 shadow-2xl">
                  <CrmButton
                    type="button"
                    onClick={() => {
                      setOpenDropdown(null);
                      handleDelete();
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-[var(--mnx-danger)] hover:bg-[var(--mnx-danger-bg)] hover:text-[var(--mnx-danger)]"
                  >
                    Delete Customer
                  </CrmButton>
                </div>
              )}
            </div>

            <CrmButton
              onClick={() => router.push("/crm/customers")}
              className="flex items-center justify-center text-[var(--mnx-muted)] hover:text-[var(--mnx-text-strong)] p-1"
              title="Close View"
            >
              <X className="size-5" />
            </CrmButton>
          </div>
        </div>

        {/* Conditional Layout for Contacts Only or Normal Views */}
        {isContactsTabOnly ? (
          /* ─── CONTACTS ONLY VIEW ────────────────────────────────────────── */
          <div className="flex-1 overflow-y-auto p-6 space-y-6 animate-in fade-in duration-200">
            {/* Split View simplified mode banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[var(--mnx-surface)]/45 border border-[var(--mnx-border)]/55 rounded-xl p-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-[var(--mnx-text-strong)] uppercase tracking-wider block">
                  Simplified View
                </span>
                <span className="text-xs text-[var(--mnx-muted)]">
                  Displaying only contact details linked to this customer
                  profile.
                </span>
              </div>
              <CrmButton
                onClick={() => {
                  router.push(`/crm/customers/${account.id}`);
                }}
                className="bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent)] text-[var(--mnx-text-strong)] px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all mnx-shadow-panel hover:-translate-y-0.5 active:translate-y-0 active:shadow-none cursor-pointer"
              >
                View Full Profile
              </CrmButton>
            </div>

            {/* Primary Contact Details */}
            <div className="mnx-crm-panel-surface  bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/50 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-[var(--mnx-text-strong)] uppercase tracking-wider border-b border-[var(--mnx-border)]/30 pb-2 flex items-center gap-2">
                <UserIcon className="size-4.5 text-[var(--mnx-accent)]" />
                <span>Primary Contact Info</span>
              </h3>
              {account.firstName || account.lastName ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[var(--mnx-muted)] block mb-0.5">
                      Contact Name
                    </span>
                    <span className="text-[var(--mnx-text-strong)] font-semibold text-sm">
                      {account.salutation ? `${account.salutation} ` : ""}
                      {account.firstName || ""} {account.lastName || ""}
                    </span>
                  </div>
                  {account.companyName && (
                    <div>
                      <span className="text-[var(--mnx-muted)] block mb-0.5">
                        Company Legal Name
                      </span>
                      <span className="text-[var(--mnx-text-strong)] font-semibold text-sm">
                        {account.companyName}
                      </span>
                    </div>
                  )}
                  {account.email && (
                    <div>
                      <span className="text-[var(--mnx-muted)] block mb-0.5">
                        Email Address
                      </span>
                      <a
                        href={`mailto:${account.email}`}
                        className="text-[var(--mnx-accent)] hover:underline font-semibold text-sm"
                      >
                        {account.email}
                      </a>
                    </div>
                  )}
                  {account.phone && (
                    <div>
                      <span className="text-[var(--mnx-muted)] block mb-0.5">
                        Phone Details
                      </span>
                      <span className="text-[var(--mnx-text-strong)] font-semibold text-sm">
                        {account.phone}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[var(--mnx-muted)] text-xs italic py-2 flex items-center justify-between">
                  <span>There is no primary contact information.</span>
                  <Link
                    href={`/crm/customers/${account.id}/edit`}
                    className="text-[var(--mnx-accent)] font-bold hover:underline"
                  >
                    Add Contact Info
                  </Link>
                </div>
              )}
            </div>

            {/* Linked Contact Persons List */}
            <div className="bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/50 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-[var(--mnx-text-strong)] uppercase tracking-wider border-b border-[var(--mnx-border)]/30 pb-2 flex items-center gap-2">
                <Users className="size-4.5 text-[var(--mnx-accent)]" />
                <span>
                  Linked Contact Persons ({account.contacts?.length || 0})
                </span>
              </h3>

              {!account.contacts || account.contacts.length === 0 ? (
                <div className="text-[var(--mnx-muted)] text-xs italic py-4 text-center">
                  No linked contact persons found for this customer.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <CrmTable className="mnx-crm-table w-full">
                    <thead>
                      <tr>
                        <th className="px-4 py-2">Name</th>
                        <th className="px-4 py-2">Email</th>
                        <th className="px-4 py-2">Phone</th>
                        <th className="px-4 py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {account.contacts.map((c) => (
                        <tr
                          key={c.id}
                          className="mnx-row-link"
                          onClick={() => router.push(`/crm/contacts/${c.id}`)}
                        >
                          <td className="px-4 py-2 font-bold text-[var(--mnx-text-strong)] hover:text-[var(--mnx-accent)] transition-all">
                            {c.firstName ? `${c.firstName} ` : ""}
                            {c.lastName}
                          </td>
                          <td className="px-4 py-2 text-xs text-[var(--mnx-muted)]">
                            {c.email || (
                              <span className="text-[var(--mnx-muted)] italic">
                                None
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-xs text-[var(--mnx-muted)]">
                            {c.phone || (
                              <span className="text-[var(--mnx-muted)] italic">
                                None
                              </span>
                            )}
                          </td>
                          <td
                            className="px-4 py-2 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link
                              href={`/crm/contacts/${c.id}`}
                              className="inline-flex items-center gap-1 text-xs text-[var(--mnx-accent)] font-bold hover:underline"
                            >
                              <span>View</span>
                              <ArrowRight className="size-3" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </CrmTable>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ─── NORMAL FULL PROFILE VIEW ──────────────────────────────────── */
          <>
            {/* Sub-Header Tabs */}
            <div className="flex border-b border-[var(--mnx-border)]/50 bg-[var(--mnx-surface)] px-6 select-none shrink-0">
              <CrmButton
                onClick={() => setActiveTab("OVERVIEW")}
                className={`pb-3 pt-3 px-4 text-xs font-bold uppercase tracking-wider border-b-3 transition-all cursor-pointer ${
                  activeTab === "OVERVIEW"
                    ? "border-[var(--mnx-accent)] text-[var(--mnx-text-strong)]"
                    : "border-transparent text-[var(--mnx-muted)] hover:text-[var(--mnx-text-strong)]"
                }`}
              >
                Overview
              </CrmButton>
              <CrmButton
                onClick={() => setActiveTab("NOTES")}
                className={`pb-3 pt-3 px-4 text-xs font-bold uppercase tracking-wider border-b-3 transition-all cursor-pointer ${
                  activeTab === "NOTES"
                    ? "border-[var(--mnx-accent)] text-[var(--mnx-text-strong)]"
                    : "border-transparent text-[var(--mnx-muted)] hover:text-[var(--mnx-text-strong)]"
                }`}
              >
                Comments ({notes.length})
              </CrmButton>
              <CrmButton
                onClick={() => setActiveTab("TRANSACTIONS")}
                className={`pb-3 pt-3 px-4 text-xs font-bold uppercase tracking-wider border-b-3 transition-all cursor-pointer ${
                  activeTab === "TRANSACTIONS"
                    ? "border-[var(--mnx-accent)] text-[var(--mnx-text-strong)]"
                    : "border-transparent text-[var(--mnx-muted)] hover:text-[var(--mnx-text-strong)]"
                }`}
              >
                Transactions ({invoices.length})
              </CrmButton>
              <CrmButton
                onClick={() => setActiveTab("STATEMENT")}
                className={`pb-3 pt-3 px-4 text-xs font-bold uppercase tracking-wider border-b-3 transition-all cursor-pointer ${
                  activeTab === "STATEMENT"
                    ? "border-[var(--mnx-accent)] text-[var(--mnx-text-strong)]"
                    : "border-transparent text-[var(--mnx-muted)] hover:text-[var(--mnx-text-strong)]"
                }`}
              >
                Statement
              </CrmButton>
              <CrmButton
                onClick={() => setActiveTab("TIMELINE")}
                className={`pb-3 pt-3 px-4 text-xs font-bold uppercase tracking-wider border-b-3 transition-all cursor-pointer ${
                  activeTab === "TIMELINE"
                    ? "border-[var(--mnx-accent)] text-[var(--mnx-text-strong)]"
                    : "border-transparent text-[var(--mnx-muted)] hover:text-[var(--mnx-text-strong)]"
                }`}
              >
                History Log
              </CrmButton>
            </div>

            {/* Scrollable Tab Panel Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* OVERVIEW TAB */}
              {activeTab === "OVERVIEW" && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                  {/* LEFT & MIDDLE COLUMNS: CARGO AND ADDRESS DETAILS */}
                  <div className="xl:col-span-2 space-y-6">
                    {/* Primary Contact Details */}
                    <div className="mnx-crm-panel-surface  bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/50 rounded-xl p-5 space-y-4">
                      <h3 className="text-xs font-bold text-[var(--mnx-text-strong)] uppercase tracking-wider border-b border-[var(--mnx-border)]/30 pb-2 flex items-center gap-2">
                        <UserIcon className="size-4.5 text-[var(--mnx-accent)]" />
                        <span>Primary Contact Info</span>
                      </h3>
                      {account.firstName || account.lastName ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-[var(--mnx-muted)] block mb-0.5">
                              Contact Name
                            </span>
                            <span className="text-[var(--mnx-text-strong)] font-semibold text-sm">
                              {account.salutation
                                ? `${account.salutation} `
                                : ""}
                              {account.firstName || ""} {account.lastName || ""}
                            </span>
                          </div>
                          {account.companyName && (
                            <div>
                              <span className="text-[var(--mnx-muted)] block mb-0.5">
                                Company Legal Name
                              </span>
                              <span className="text-[var(--mnx-text-strong)] font-semibold text-sm">
                                {account.companyName}
                              </span>
                            </div>
                          )}
                          {account.email && (
                            <div>
                              <span className="text-[var(--mnx-muted)] block mb-0.5">
                                Email Address
                              </span>
                              <a
                                href={`mailto:${account.email}`}
                                className="text-[var(--mnx-accent)] hover:underline font-semibold text-sm"
                              >
                                {account.email}
                              </a>
                            </div>
                          )}
                          {account.phone && (
                            <div>
                              <span className="text-[var(--mnx-muted)] block mb-0.5">
                                Phone Details
                              </span>
                              <span className="text-[var(--mnx-text-strong)] font-semibold text-sm">
                                {account.phone}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-[var(--mnx-muted)] text-xs italic py-2 flex items-center justify-between">
                          <span>There is no primary contact information.</span>
                          <Link
                            href={`/crm/customers/${account.id}/edit`}
                            className="text-[var(--mnx-accent)] font-bold hover:underline"
                          >
                            Add Contact Info
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* Billing and Shipping Address Card */}
                    <div className="bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/50 rounded-xl p-5 space-y-4">
                      <h3 className="text-xs font-bold text-[var(--mnx-text-strong)] uppercase tracking-wider border-b border-[var(--mnx-border)]/30 pb-2 flex items-center gap-2">
                        <MapPin className="size-4.5 text-[var(--mnx-accent)]" />
                        <span>Address Details</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs leading-relaxed">
                        <div className="space-y-1.5 p-3 rounded-lg bg-[var(--mnx-surface)]/50 border border-[var(--mnx-border)]/20">
                          <span className="text-[10px] font-bold text-[var(--mnx-accent)] uppercase tracking-wider block border-b border-[var(--mnx-border)]/30 pb-1.5 mb-2">
                            Billing Address
                          </span>
                          {account.billingAddress ? (
                            <p className="whitespace-pre-line text-[var(--mnx-muted)] font-medium">
                              {account.billingAddress}
                            </p>
                          ) : (
                            <span className="text-[var(--mnx-muted)] italic block">
                              No billing address saved.
                            </span>
                          )}
                        </div>
                        <div className="space-y-1.5 p-3 rounded-lg bg-[var(--mnx-surface)]/50 border border-[var(--mnx-border)]/20">
                          <span className="text-[10px] font-bold text-[var(--mnx-accent)] uppercase tracking-wider block border-b border-[var(--mnx-border)]/30 pb-1.5 mb-2">
                            Shipping Address
                          </span>
                          {account.shippingAddress ? (
                            <p className="whitespace-pre-line text-[var(--mnx-muted)] font-medium">
                              {account.shippingAddress}
                            </p>
                          ) : (
                            <span className="text-[var(--mnx-muted)] italic block">
                              No shipping address saved.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Other Profile Specifics */}
                    <div className="bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/50 rounded-xl p-5 space-y-4">
                      <h3 className="text-xs font-bold text-[var(--mnx-text-strong)] uppercase tracking-wider border-b border-[var(--mnx-border)]/30 pb-2 flex items-center gap-2">
                        <Building className="size-4.5 text-[var(--mnx-accent)]" />
                        <span>Profile Specifications</span>
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div>
                          <span className="text-[var(--mnx-muted)] block mb-0.5">
                            GST Treatment
                          </span>
                          <span className="text-[var(--mnx-text-strong)] font-semibold">
                            {account.gstTreatment || "Not Specified"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[var(--mnx-muted)] block mb-0.5">
                            Place of Supply
                          </span>
                          <span className="text-[var(--mnx-text-strong)] font-semibold">
                            {account.placeOfSupply || "Not Specified"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[var(--mnx-muted)] block mb-0.5">
                            PAN Number
                          </span>
                          <span className="text-[var(--mnx-text-strong)] font-semibold mnx-numeric">
                            {account.pan || "Not Specified"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[var(--mnx-muted)] block mb-0.5">
                            Currency Preference
                          </span>
                          <span className="text-[var(--mnx-text-strong)] font-semibold">
                            {account.currency || "INR - Indian Rupee"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[var(--mnx-muted)] block mb-0.5">
                            Industry Segment
                          </span>
                          <span className="text-[var(--mnx-text-strong)] font-semibold">
                            {account.industry || "Not Specified"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[var(--mnx-muted)] block mb-0.5">
                            Language
                          </span>
                          <span className="text-[var(--mnx-text-strong)] font-semibold">
                            {account.language || "English"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[var(--mnx-muted)] block mb-0.5">
                            Status
                          </span>
                          <span className="text-[var(--mnx-success)] font-bold uppercase">
                            {account.status || "ACTIVE"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: FINANCIAL AND BALANCES SCREEN */}
                  <div className="space-y-6">
                    {/* Financial Position Details */}
                    <div className="mnx-crm-panel-surface  bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/50 rounded-xl p-5 space-y-4">
                      <h3 className="text-xs font-bold text-[var(--mnx-text-strong)] uppercase tracking-wider flex items-center gap-2">
                        <DollarSign className="size-4.5 text-[var(--mnx-accent)]" />
                        <span>Financial Status</span>
                      </h3>

                      <div className="divide-y divide-[var(--mnx-border)]/30 space-y-3">
                        <div className="pt-2 flex justify-between items-center text-xs">
                          <span className="text-[var(--mnx-muted)] font-medium">
                            Outstanding Balance
                          </span>
                          <span className="text-[var(--mnx-text-strong)] font-bold text-sm mnx-numeric">
                            {fmtCurrency(overdueTotal)}
                          </span>
                        </div>
                        <div className="pt-3 flex justify-between items-center text-xs">
                          <span className="text-[var(--mnx-muted)] font-medium">
                            Credit Limit
                          </span>
                          <span className="text-[var(--mnx-text-strong)] font-bold text-sm mnx-numeric">
                            {(account.creditLimit ?? 0) > 0
                              ? fmtCurrency(account.creditLimit ?? 0)
                              : "Unlimited"}
                          </span>
                        </div>
                        <div className="pt-3 flex justify-between items-center text-xs">
                          <span className="text-[var(--mnx-muted)] font-medium">
                            Payment Terms
                          </span>
                          <span className="text-[var(--mnx-text-strong)] font-bold text-sm">
                            {account.paymentTerms || "Due on Receipt"}
                          </span>
                        </div>
                        <div className="pt-3 flex justify-between items-center text-xs">
                          <span className="text-[var(--mnx-muted)] font-medium">
                            Total Billed
                          </span>
                          <span className="text-[var(--mnx-accent)] font-bold text-sm mnx-numeric">
                            {fmtCurrency(totalInvoiced)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* SVG mock billing chart matching Zoho Books style */}
                    <div className="bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/50 rounded-xl p-5 space-y-4">
                      <h3 className="text-xs font-bold text-[var(--mnx-text-strong)] uppercase tracking-wider flex items-center gap-2">
                        <TrendingUp className="size-4.5 text-[var(--mnx-accent)]" />
                        <span>Income Chart (Sales history)</span>
                      </h3>
                      <div className="h-44 w-full bg-[var(--mnx-surface)]/50 border border-[var(--mnx-border)]/20 rounded-lg flex flex-col justify-end p-2 relative overflow-hidden">
                        <svg
                          className="w-full h-32 text-[var(--mnx-accent)]"
                          viewBox="0 0 300 100"
                          fill="none"
                          preserveAspectRatio="none"
                        >
                          <path
                            d="M0,80 Q50,40 100,60 T200,20 T300,50 L300,100 L0,100 Z"
                            fill="url(#gradient)"
                            opacity="0.15"
                          />
                          <path
                            d="M0,80 Q50,40 100,60 T200,20 T300,50"
                            stroke="var(--mnx-accent)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                          <defs>
                            <linearGradient
                              id="gradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop offset="0%" stopColor="var(--mnx-accent)" />
                              <stop
                                offset="100%"
                                stopColor="var(--mnx-accent)"
                                stopOpacity="0"
                              />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="flex justify-between text-[8px] text-[var(--mnx-muted)] font-bold uppercase tracking-wider pt-2 border-t border-[var(--mnx-border)]/30">
                          <span>Dec</span>
                          <span>Feb</span>
                          <span>Apr</span>
                          <span>Jun</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* NOTES / COMMENTS TAB */}
              {activeTab === "NOTES" && (
                <NotesPanel
                  relatedToType="ACCOUNT"
                  relatedToId={account.id}
                  initialNotes={notes as any}
                />
              )}

              {/* TRANSACTIONS TAB */}
              {activeTab === "TRANSACTIONS" && (
                <div className="bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/50 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-[var(--mnx-border)]/30 pb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4.5 text-[var(--mnx-accent)]" />
                      <h3 className="font-bold text-sm text-[var(--mnx-text-strong)] uppercase tracking-wider">
                        Invoices & Quotations ({invoices.length})
                      </h3>
                    </div>
                    <Link
                      href={`/crm/quotes/new?customerId=${account.id}`}
                      className="flex items-center gap-1.5 text-xs text-[var(--mnx-accent)] font-bold hover:underline cursor-pointer"
                    >
                      <Plus className="size-3.5" />
                      <span>Create Quotation</span>
                    </Link>
                  </div>
                  {invoices.length === 0 ? (
                    <div className="p-12 text-center text-[var(--mnx-muted)] text-xs italic">
                      No invoices or quotations issued for this customer.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {invoices.map((inv) => {
                        const href =
                          inv.type === "QUOTE"
                            ? `/crm/quotes/${inv.id}`
                            : inv.type === "SALES_ORDER"
                              ? `/crm/sales-orders/${inv.id}`
                              : inv.type === "PURCHASE_ORDER"
                                ? `/crm/purchase-orders/${inv.id}`
                                : `/crm/invoices/${inv.id}`;
                        return (
                          <Link
                            key={inv.id}
                            href={href}
                            className="p-3 bg-[var(--mnx-surface)]/50 border border-[var(--mnx-border)]/30 rounded-lg flex items-center justify-between gap-4 hover:border-[var(--mnx-accent)]/40 hover:bg-[var(--mnx-surface)]/80 transition-all group cursor-pointer"
                          >
                            <div>
                              <span className="font-bold text-[var(--mnx-text-strong)] text-sm group-hover:text-[var(--mnx-accent)] transition-colors">
                                {inv.invoiceNumber}
                              </span>
                              <span className="text-[11px] text-[var(--mnx-muted)] block mt-0.5">
                                {inv.type} • Date:{" "}
                                {inv.date
                                  ? new Date(inv.date).toLocaleDateString(
                                      "en-IN",
                                    )
                                  : "-"}{" "}
                                • Amount: {fmtCurrency(inv.total ?? 0)}
                              </span>
                            </div>
                            <span
                              className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider ${
                                inv.status === "PAID"
                                  ? "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]"
                                  : "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]"
                              }`}
                            >
                              {inv.status}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* STATEMENT TAB */}
              {activeTab === "STATEMENT" && (
                <div className="bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/50 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-[var(--mnx-border)]/30 pb-3">
                    <StatementIcon className="size-4.5 text-[var(--mnx-accent)]" />
                    <h3 className="font-bold text-sm text-[var(--mnx-text-strong)] uppercase tracking-wider">
                      Account Statement
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <CrmTable className="mnx-crm-table w-full">
                      <thead>
                        <tr>
                          <th className="px-4 py-2">Date</th>
                          <th className="px-4 py-2">Transaction Type</th>
                          <th className="px-4 py-2">Doc Number</th>
                          <th className="px-4 py-2">Total Amount</th>
                          <th className="px-4 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="text-center p-8 text-[var(--mnx-muted)] italic text-xs"
                            >
                              No records available to show.
                            </td>
                          </tr>
                        ) : (
                          invoices.map((inv) => (
                            <tr
                              key={inv.id}
                              className="mnx-row-link"
                              onClick={() => {
                                const href =
                                  inv.type === "QUOTE"
                                    ? `/crm/quotes/${inv.id}`
                                    : `/crm/invoices/${inv.id}`;
                                router.push(href);
                              }}
                            >
                              <td className="px-4 py-2 mnx-numeric">
                                {inv.date
                                  ? new Date(inv.date).toLocaleDateString(
                                      "en-IN",
                                    )
                                  : "-"}
                              </td>
                              <td className="px-4 py-2 text-xs font-semibold">
                                {inv.type}
                              </td>
                              <td className="px-4 py-2 font-semibold text-[var(--mnx-text-strong)]">
                                {inv.invoiceNumber}
                              </td>
                              <td className="px-4 py-2 mnx-numeric font-bold">
                                {fmtCurrency(inv.total ?? 0)}
                              </td>
                              <td className="px-4 py-2">
                                <span
                                  className={`px-1.5 py-0.5 text-[8px] font-bold rounded uppercase tracking-wider ${
                                    inv.status === "PAID"
                                      ? "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]"
                                      : "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]"
                                  }`}
                                >
                                  {inv.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </CrmTable>
                  </div>
                </div>
              )}

              {/* TIMELINE / HISTORY LOG TAB */}
              {activeTab === "TIMELINE" && (
                <TimelinePanel events={timeline as any} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
