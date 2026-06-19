"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { deleteAccountAction } from "@/modules/crm/actions";
import { NotesPanel } from "../../_components/notes-panel";
import { AttachmentsPanel } from "../../_components/attachments-panel";
import { ActivitiesPanel } from "../../_components/activities-panel";
import { TimelinePanel } from "../../_components/timeline-panel";
import {
  Edit2,
  Trash2,
  Users,
  Briefcase,
  FileText,
  Plus,
  Eye,
  Search,
  ChevronDown,
  X,
  Building,
  Mail,
  Phone,
  MapPin,
  FileText as StatementIcon,
  DollarSign,
  TrendingUp,
  User as UserIcon,
  MoreHorizontal,
  ArrowRight
} from "lucide-react";

interface AccountDetailWrapperProps {
  account: any;
  notes: any[];
  attachments: any[];
  activities: any[];
  timeline: any[];
  invoices: any[];
  accounts: any[];
  search: string;
}

export function AccountDetailWrapper({
  account,
  notes,
  attachments,
  activities,
  timeline,
  invoices,
  accounts,
  search: initialSearch,
}: AccountDetailWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const activeTabQuery = searchParams.get("tab");
  const isContactsTabOnly = activeTabQuery === "contacts";

  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "NOTES" | "TRANSACTIONS" | "STATEMENT" | "TIMELINE">("OVERVIEW");
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [showNewTxnDropdown, setShowNewTxnDropdown] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this customer? This will delete all linked contacts too!")) return;

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
    router.push(`/crm/customers/${account.id}?search=${encodeURIComponent(searchQuery)}`);
  };

  const handleSearchClear = () => {
    setSearchQuery("");
    router.push(`/crm/customers/${account.id}`);
  };

  // Integration Calculations
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const unpaidInvoices = invoices.filter(inv => inv.status !== "PAID" && inv.status !== "CANCELLED");
  const overdueTotal = unpaidInvoices.reduce((sum, inv) => sum + inv.total, 0);

  // Helper to format currency
  const fmtCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(val);
  };

  // Helper to compute balance for a list item
  const getListItemBalance = (acc: any) => {
    const listUnpaid = acc.invoices?.filter((inv: any) => inv.status !== "PAID" && inv.status !== "CANCELLED") || [];
    return listUnpaid.reduce((sum: number, inv: any) => sum + inv.total, 0);
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-56px)] h-[calc(100vh-56px)] bg-[#0d1117] text-[var(--color-on-surface)] overflow-hidden w-full font-sans">
      
      {/* ─── LEFT SIDEBAR: CUSTOMER LIST ────────────────────────────────── */}
      <div className="w-full lg:w-85 border-r border-[#1c212a]/50 flex flex-col shrink-0 bg-[#0c1015] h-full overflow-hidden">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-[#1c212a]/50 flex items-center justify-between gap-2 bg-[#0a0d12]">
          <div className="flex items-center gap-1.5">
            <span className="ds-h3 text-sm font-bold text-white tracking-wide">All Customers</span>
            <span className="px-2 py-0.5 rounded bg-[#161f28] border border-[#1c212a] text-[10px] text-slate-400 font-bold ds-numeric">
              {accounts.length}
            </span>
          </div>
          <Link
            href="/crm/customers/new"
            className="flex items-center justify-center bg-[#00cec4] hover:bg-[#00b8af] text-white p-2 rounded-xl transition-all shadow-[2px_2px_0px_0px_rgba(0,184,175,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none cursor-pointer"
            title="Create New Customer"
          >
            <Plus className="size-4" />
          </Link>
        </div>

        {/* Sidebar Search Bar */}
        <form onSubmit={handleSearchSubmit} className="p-3 border-b border-[#1c212a]/30 bg-[#0c1015] flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-6 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs placeholder-slate-500 text-white focus:outline-none focus:border-[#00cec4]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleSearchClear}
                className="absolute right-2 top-2 text-slate-500 hover:text-white cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-[#161f28] hover:bg-[#1f2d3a] border border-[#1c212a] text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Go
          </button>
        </form>

        {/* Scrollable Customer List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#1c212a]/20">
          {accounts.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs italic">No customers found.</div>
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
                      ? "bg-[#161f28]/60 border-l-4 border-l-[#00cec4]"
                      : "hover:bg-[#161f28]/25 border-l-4 border-l-transparent"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-1">
                      <span className={`text-xs font-bold block ${isActive ? "text-[#00cec4]" : "text-white group-hover:text-[#00cec4]"}`}>
                        {acc.name}
                      </span>
                      {acc.email && (
                        <span className="text-[10px] text-slate-400 block truncate max-w-[180px]">{acc.email}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold block ds-numeric ${balance > 0 ? "text-[#fb923c]" : "text-slate-400"}`}>
                        {balance > 0 ? fmtCurrency(balance) : "₹0.00"}
                      </span>
                      <span className="text-[8px] uppercase tracking-wider text-slate-500 block mt-0.5">Balance</span>
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
        <div className="p-6 border-b border-[#1c212a]/50 bg-[#0f1319] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-md">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#00cec4]/10 border border-[#00cec4]/20 text-[9px] font-bold text-[#00cec4] uppercase tracking-wider">
                {account.customerSubType || "Business"}
              </span>
              <span className="text-xs text-slate-400">ID: {account.id.substring(account.id.length - 8).toUpperCase()}</span>
            </div>
            <h1 className="ds-h1 text-white truncate max-w-xl">{account.name}</h1>
          </div>

          {/* Action Button Toolbar (Tactile 3D Styling) */}
          <div className="flex items-center gap-3 relative">
            <Link
              href={`/crm/customers/${account.id}/edit`}
              className="flex items-center gap-1.5 bg-[#161f28] hover:bg-[#1f2d3a] border border-[#1c212a] text-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none cursor-pointer"
            >
              <Edit2 className="size-3.5" />
              <span>Edit</span>
            </Link>

            {/* New Transaction Dropdown Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowNewTxnDropdown(!showNewTxnDropdown);
                  setShowMoreActions(false);
                }}
                className="flex items-center gap-1.5 bg-[#00cec4] hover:bg-[#00b8af] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-[2px_2px_0px_0px_rgba(0,184,175,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none cursor-pointer"
              >
                <span>New Transaction</span>
                <ChevronDown className="size-3.5" />
              </button>
              {showNewTxnDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-[#0f1319] border-2 border-[var(--color-outline)] rounded-xl py-1.5 z-20 shadow-2xl">
                  <Link
                    href={`/crm/quotes/new?customerId=${account.id}`}
                    className="block px-4 py-2 text-xs text-slate-200 hover:bg-[#161f28] hover:text-white"
                    onClick={() => setShowNewTxnDropdown(false)}
                  >
                    Create Quotation
                  </Link>
                  <Link
                    href={`/accounting/sales-invoices/new?customerId=${account.id}`}
                    className="block px-4 py-2 text-xs text-slate-200 hover:bg-[#161f28] hover:text-white"
                    onClick={() => setShowNewTxnDropdown(false)}
                  >
                    Create Sales Invoice
                  </Link>
                </div>
              )}
            </div>

            {/* More Action Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowMoreActions(!showMoreActions);
                  setShowNewTxnDropdown(false);
                }}
                className="flex items-center justify-center bg-[#161f28] hover:bg-[#1f2d3a] border border-[#1c212a] text-slate-400 p-2 rounded-xl transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none cursor-pointer"
                title="More Actions"
              >
                <MoreHorizontal className="size-4" />
              </button>
              {showMoreActions && (
                <div className="absolute right-0 mt-2 w-40 bg-[#0f1319] border-2 border-[var(--color-outline)] rounded-xl py-1.5 z-20 shadow-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreActions(false);
                      handleDelete();
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  >
                    Delete Customer
                  </button>
                </div>
              )}
            </div>
            
            <button
              onClick={() => router.push("/crm/customers")}
              className="flex items-center justify-center text-slate-500 hover:text-white p-1"
              title="Close View"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Conditional Layout for Contacts Only or Normal Views */}
        {isContactsTabOnly ? (
          /* ─── CONTACTS ONLY VIEW ────────────────────────────────────────── */
          <div className="flex-1 overflow-y-auto p-6 space-y-6 animate-in fade-in duration-200">
            {/* Split View simplified mode banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#161f28]/45 border border-[#1c212a]/55 rounded-xl p-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-white uppercase tracking-wider block">Simplified View</span>
                <span className="text-xs text-slate-400">Displaying only contact details linked to this customer profile.</span>
              </div>
              <button
                onClick={() => {
                  router.push(`/crm/customers/${account.id}`);
                }}
                className="bg-[#00cec4] hover:bg-[#00b8af] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_rgba(0,184,175,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none cursor-pointer"
              >
                View Full Profile
              </button>
            </div>

            {/* Primary Contact Details */}
            <div className="card-left-accent bg-[#0f1319] border border-[#1c212a]/50 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#1c212a]/30 pb-2 flex items-center gap-2">
                <UserIcon className="size-4.5 text-[#00cec4]" />
                <span>Primary Contact Info</span>
              </h3>
              {account.firstName || account.lastName ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Contact Name</span>
                    <span className="text-white font-semibold text-sm">
                      {account.salutation ? `${account.salutation} ` : ""}{account.firstName || ""} {account.lastName || ""}
                    </span>
                  </div>
                  {account.companyName && (
                    <div>
                      <span className="text-slate-400 block mb-0.5">Company Legal Name</span>
                      <span className="text-white font-semibold text-sm">{account.companyName}</span>
                    </div>
                  )}
                  {account.email && (
                    <div>
                      <span className="text-slate-400 block mb-0.5">Email Address</span>
                      <a href={`mailto:${account.email}`} className="text-[#00cec4] hover:underline font-semibold text-sm">{account.email}</a>
                    </div>
                  )}
                  {account.phone && (
                    <div>
                      <span className="text-slate-400 block mb-0.5">Phone Details</span>
                      <span className="text-white font-semibold text-sm">{account.phone}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-slate-400 text-xs italic py-2 flex items-center justify-between">
                  <span>There is no primary contact information.</span>
                  <Link href={`/crm/customers/${account.id}/edit`} className="text-[#00cec4] font-bold hover:underline">Add Contact Info</Link>
                </div>
              )}
            </div>

            {/* Linked Contact Persons List */}
            <div className="bg-[#0f1319] border border-[#1c212a]/50 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#1c212a]/30 pb-2 flex items-center gap-2">
                <Users className="size-4.5 text-[#00cec4]" />
                <span>Linked Contact Persons ({account.contacts?.length || 0})</span>
              </h3>
              
              {!account.contacts || account.contacts.length === 0 ? (
                <div className="text-slate-500 text-xs italic py-4 text-center">
                  No linked contact persons found for this customer.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="ds-table w-full">
                    <thead>
                      <tr>
                        <th className="px-4 py-2">Name</th>
                        <th className="px-4 py-2">Email</th>
                        <th className="px-4 py-2">Phone</th>
                        <th className="px-4 py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {account.contacts.map((c: any) => (
                        <tr key={c.id} className="ds-row-link" onClick={() => router.push(`/crm/contacts/${c.id}`)}>
                          <td className="px-4 py-2 font-bold text-white hover:text-[#00cec4] transition-all">
                            {c.firstName ? `${c.firstName} ` : ""}{c.lastName}
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-300">
                            {c.email || <span className="text-slate-500 italic">None</span>}
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-300">
                            {c.phone || <span className="text-slate-500 italic">None</span>}
                          </td>
                          <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                            <Link href={`/crm/contacts/${c.id}`} className="inline-flex items-center gap-1 text-xs text-[#00cec4] font-bold hover:underline">
                              <span>View</span>
                              <ArrowRight className="size-3" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ─── NORMAL FULL PROFILE VIEW ──────────────────────────────────── */
          <>
            {/* Sub-Header Tabs */}
            <div className="flex border-b border-[#1c212a]/50 bg-[#0a0d12] px-6 select-none shrink-0">
              <button
                onClick={() => setActiveTab("OVERVIEW")}
                className={`pb-3 pt-3 px-4 text-xs font-bold uppercase tracking-wider border-b-3 transition-all cursor-pointer ${
                  activeTab === "OVERVIEW" ? "border-[#00c4b6] text-white" : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab("NOTES")}
                className={`pb-3 pt-3 px-4 text-xs font-bold uppercase tracking-wider border-b-3 transition-all cursor-pointer ${
                  activeTab === "NOTES" ? "border-[#00c4b6] text-white" : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Comments ({notes.length})
              </button>
              <button
                onClick={() => setActiveTab("TRANSACTIONS")}
                className={`pb-3 pt-3 px-4 text-xs font-bold uppercase tracking-wider border-b-3 transition-all cursor-pointer ${
                  activeTab === "TRANSACTIONS" ? "border-[#00c4b6] text-white" : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Transactions ({invoices.length})
              </button>
              <button
                onClick={() => setActiveTab("STATEMENT")}
                className={`pb-3 pt-3 px-4 text-xs font-bold uppercase tracking-wider border-b-3 transition-all cursor-pointer ${
                  activeTab === "STATEMENT" ? "border-[#00c4b6] text-white" : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Statement
              </button>
              <button
                onClick={() => setActiveTab("TIMELINE")}
                className={`pb-3 pt-3 px-4 text-xs font-bold uppercase tracking-wider border-b-3 transition-all cursor-pointer ${
                  activeTab === "TIMELINE" ? "border-[#00c4b6] text-white" : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                History Log
              </button>
            </div>

            {/* Scrollable Tab Panel Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* OVERVIEW TAB */}
              {activeTab === "OVERVIEW" && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                  
                  {/* LEFT & MIDDLE COLUMNS: CARGO AND ADDRESS DETAILS */}
                  <div className="xl:col-span-2 space-y-6">
                    
                    {/* Primary Contact Details */}
                    <div className="card-left-accent bg-[#0f1319] border border-[#1c212a]/50 rounded-xl p-5 space-y-4">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#1c212a]/30 pb-2 flex items-center gap-2">
                        <UserIcon className="size-4.5 text-[#00cec4]" />
                        <span>Primary Contact Info</span>
                      </h3>
                      {account.firstName || account.lastName ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-slate-400 block mb-0.5">Contact Name</span>
                            <span className="text-white font-semibold text-sm">
                              {account.salutation ? `${account.salutation} ` : ""}{account.firstName || ""} {account.lastName || ""}
                            </span>
                          </div>
                          {account.companyName && (
                            <div>
                              <span className="text-slate-400 block mb-0.5">Company Legal Name</span>
                              <span className="text-white font-semibold text-sm">{account.companyName}</span>
                            </div>
                          )}
                          {account.email && (
                            <div>
                              <span className="text-slate-400 block mb-0.5">Email Address</span>
                              <a href={`mailto:${account.email}`} className="text-[#00cec4] hover:underline font-semibold text-sm">{account.email}</a>
                            </div>
                          )}
                          {account.phone && (
                            <div>
                              <span className="text-slate-400 block mb-0.5">Phone Details</span>
                              <span className="text-white font-semibold text-sm">{account.phone}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-slate-400 text-xs italic py-2 flex items-center justify-between">
                          <span>There is no primary contact information.</span>
                          <Link href={`/crm/customers/${account.id}/edit`} className="text-[#00cec4] font-bold hover:underline">Add Contact Info</Link>
                        </div>
                      )}
                    </div>

                    {/* Billing and Shipping Address Card */}
                    <div className="bg-[#0f1319] border border-[#1c212a]/50 rounded-xl p-5 space-y-4">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#1c212a]/30 pb-2 flex items-center gap-2">
                        <MapPin className="size-4.5 text-[#00cec4]" />
                        <span>Address Details</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs leading-relaxed">
                        <div className="space-y-1.5 p-3 rounded-lg bg-[#0a0d12]/50 border border-[#1c212a]/20">
                          <span className="text-[10px] font-bold text-[#00cec4] uppercase tracking-wider block border-b border-[#1c212a]/30 pb-1.5 mb-2">Billing Address</span>
                          {account.billingAddress ? (
                            <p className="whitespace-pre-line text-slate-300 font-medium">{account.billingAddress}</p>
                          ) : (
                            <span className="text-slate-500 italic block">No billing address saved.</span>
                          )}
                        </div>
                        <div className="space-y-1.5 p-3 rounded-lg bg-[#0a0d12]/50 border border-[#1c212a]/20">
                          <span className="text-[10px] font-bold text-[#00cec4] uppercase tracking-wider block border-b border-[#1c212a]/30 pb-1.5 mb-2">Shipping Address</span>
                          {account.shippingAddress ? (
                            <p className="whitespace-pre-line text-slate-300 font-medium">{account.shippingAddress}</p>
                          ) : (
                            <span className="text-slate-500 italic block">No shipping address saved.</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Other Profile Specifics */}
                    <div className="bg-[#0f1319] border border-[#1c212a]/50 rounded-xl p-5 space-y-4">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#1c212a]/30 pb-2 flex items-center gap-2">
                        <Building className="size-4.5 text-[#00cec4]" />
                        <span>Profile Specifications</span>
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div>
                          <span className="text-slate-400 block mb-0.5">GST Treatment</span>
                          <span className="text-white font-semibold">{account.gstTreatment || "Not Specified"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Place of Supply</span>
                          <span className="text-white font-semibold">{account.placeOfSupply || "Not Specified"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">PAN Number</span>
                          <span className="text-white font-semibold ds-numeric">{account.pan || "Not Specified"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Currency Preference</span>
                          <span className="text-white font-semibold">{account.currency || "INR - Indian Rupee"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Industry Segment</span>
                          <span className="text-white font-semibold">{account.industry || "Not Specified"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Language</span>
                          <span className="text-white font-semibold">{account.language || "English"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Portal Status</span>
                          <span className={`font-semibold ${account.isPortalEnabled ? "text-[#00cec4]" : "text-slate-400"}`}>
                            {account.isPortalEnabled ? "Portal Access Allowed" : "Portal Access Disabled"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Status</span>
                          <span className="text-emerald-400 font-bold uppercase">{account.status || "ACTIVE"}</span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* RIGHT COLUMN: FINANCIAL AND BALANCES SCREEN */}
                  <div className="space-y-6">
                    
                    {/* Financial Position Details */}
                    <div className="card-top-accent bg-[#0f1319] border border-[#1c212a]/50 rounded-xl p-5 space-y-4">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <DollarSign className="size-4.5 text-[#00cec4]" />
                        <span>Financial Status</span>
                      </h3>
                      
                      <div className="divide-y divide-[#1c212a]/30 space-y-3">
                        <div className="pt-2 flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-medium">Outstanding Balance</span>
                          <span className="text-white font-bold text-sm ds-numeric">{fmtCurrency(overdueTotal)}</span>
                        </div>
                        <div className="pt-3 flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-medium">Credit Limit</span>
                          <span className="text-white font-bold text-sm ds-numeric">
                            {account.creditLimit > 0 ? fmtCurrency(account.creditLimit) : "Unlimited"}
                          </span>
                        </div>
                        <div className="pt-3 flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-medium">Payment Terms</span>
                          <span className="text-white font-bold text-sm">{account.paymentTerms || "Due on Receipt"}</span>
                        </div>
                        <div className="pt-3 flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-medium">Total Billed</span>
                          <span className="text-[#00cec4] font-bold text-sm ds-numeric">{fmtCurrency(totalInvoiced)}</span>
                        </div>
                      </div>
                    </div>

                    {/* SVG mock billing chart matching Zoho Books style */}
                    <div className="bg-[#0f1319] border border-[#1c212a]/50 rounded-xl p-5 space-y-4">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <TrendingUp className="size-4.5 text-[#00cec4]" />
                        <span>Income Chart (Sales history)</span>
                      </h3>
                      <div className="h-44 w-full bg-[#0a0d12]/50 border border-[#1c212a]/20 rounded-lg flex flex-col justify-end p-2 relative overflow-hidden">
                        <svg className="w-full h-32 text-[#00cec4]" viewBox="0 0 300 100" fill="none" preserveAspectRatio="none">
                          <path
                            d="M0,80 Q50,40 100,60 T200,20 T300,50 L300,100 L0,100 Z"
                            fill="url(#gradient)"
                            opacity="0.15"
                          />
                          <path
                            d="M0,80 Q50,40 100,60 T200,20 T300,50"
                            stroke="#00cec4"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                          <defs>
                            <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#00cec4" />
                              <stop offset="100%" stopColor="#00cec4" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="flex justify-between text-[8px] text-slate-500 font-bold uppercase tracking-wider pt-2 border-t border-[#1c212a]/30">
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
                <NotesPanel relatedToType="ACCOUNT" relatedToId={account.id} initialNotes={notes} />
              )}

              {/* TRANSACTIONS TAB */}
              {activeTab === "TRANSACTIONS" && (
                <div className="bg-[#0f1319] border border-[#1c212a]/50 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#1c212a]/30 pb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4.5 text-[#00cec4]" />
                      <h3 className="font-bold text-sm text-white uppercase tracking-wider">Invoices & Quotations ({invoices.length})</h3>
                    </div>
                    <Link
                      href={`/crm/quotes/new?customerId=${account.id}`}
                      className="flex items-center gap-1.5 text-xs text-[#00cec4] font-bold hover:underline cursor-pointer"
                    >
                      <Plus className="size-3.5" />
                      <span>Create Quotation</span>
                    </Link>
                  </div>
                  {invoices.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 text-xs italic">No invoices or quotations issued for this customer.</div>
                  ) : (
                    <div className="space-y-2">
                      {invoices.map((inv: any) => {
                        const href = inv.type === "QUOTE"
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
                            className="p-3 bg-[#0a0d12]/50 border border-[#1c212a]/30 rounded-lg flex items-center justify-between gap-4 hover:border-[#00c4b6]/40 hover:bg-[#0a0d12]/80 transition-all group cursor-pointer"
                          >
                            <div>
                              <span className="font-bold text-white text-sm group-hover:text-[#00cec4] transition-colors">{inv.invoiceNumber}</span>
                              <span className="text-[11px] text-slate-400 block mt-0.5">
                                {inv.type} • Date: {new Date(inv.date).toLocaleDateString("en-IN")} • Amount: {fmtCurrency(inv.total)}
                              </span>
                            </div>
                            <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider ${
                              inv.status === "PAID" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                            }`}>
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
                <div className="bg-[#0f1319] border border-[#1c212a]/50 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-[#1c212a]/30 pb-3">
                    <StatementIcon className="size-4.5 text-[#00cec4]" />
                    <h3 className="font-bold text-sm text-white uppercase tracking-wider">Account Statement</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="ds-table w-full">
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
                            <td colSpan={5} className="text-center p-8 text-slate-500 italic text-xs">No records available to show.</td>
                          </tr>
                        ) : (
                          invoices.map((inv: any) => (
                            <tr key={inv.id} className="ds-row-link" onClick={() => {
                              const href = inv.type === "QUOTE" ? `/crm/quotes/${inv.id}` : `/crm/invoices/${inv.id}`;
                              router.push(href);
                            }}>
                              <td className="px-4 py-2 ds-numeric">{new Date(inv.date).toLocaleDateString("en-IN")}</td>
                              <td className="px-4 py-2 text-xs font-semibold">{inv.type}</td>
                              <td className="px-4 py-2 font-semibold text-white">{inv.invoiceNumber}</td>
                              <td className="px-4 py-2 ds-numeric font-bold">{fmtCurrency(inv.total)}</td>
                              <td className="px-4 py-2">
                                <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded uppercase tracking-wider ${
                                  inv.status === "PAID" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                                }`}>
                                  {inv.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TIMELINE / HISTORY LOG TAB */}
              {activeTab === "TIMELINE" && (
                <TimelinePanel events={timeline} />
              )}

            </div>
          </>
        )}

      </div>

    </div>
  );
}
