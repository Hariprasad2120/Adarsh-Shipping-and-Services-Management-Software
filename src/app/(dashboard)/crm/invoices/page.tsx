import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listInvoices } from "@/modules/crm/service";
import { requirePermission } from "@/lib/rbac";
import {
  Search,
  FileText,
  Plus,
  Calendar,
  DollarSign,
  Eye,
  Building,
  ShieldAlert,
  ArrowRight
} from "lucide-react";
import { deleteInvoiceAction } from "@/modules/crm/actions";
import { DeleteRecordButton } from "../_components/delete-record-button";

interface SearchParams {
  type?: string;
  search?: string;
}

export default async function CrmInvoicesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return (
      <div className="p-8 text-center text-red-400">
        <ShieldAlert className="size-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Configuration Error</h2>
        <p className="text-sm mt-1">Missing organisation context.</p>
      </div>
    );
  }

  // Permission Guard
  try {
    await requirePermission(session.user.id, "crm.invoice.manage");
  } catch (e) {
    return (
      <div className="p-8 text-center text-red-400">
        <ShieldAlert className="size-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-sm mt-1">You do not have permission to view CRM billing/invoices.</p>
      </div>
    );
  }

  const awaitedParams = await searchParams;
  const typeFilter = awaitedParams.type || "";
  const searchFilter = awaitedParams.search || "";

  // Fetch invoices from db
  const invoices = await listInvoices(orgId, { type: typeFilter || undefined });

  // Filter based on search (number)
  const filteredInvoices = invoices.filter(inv =>
    inv.invoiceNumber.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (inv.account?.name || "").toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#1c212a]/30 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Invoices & Billing</h2>
          <p className="text-slate-400 text-sm mt-1">Manage client quotes, logistics sales orders, supplier purchase orders, and standard GST invoices.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/crm/invoices/new"
            className="flex items-center gap-2 bg-[#00c4b6] hover:bg-[#00b0a3] text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-md shadow-[#00c4b6]/10 cursor-pointer"
          >
            <Plus className="size-4" />
            <span>Generate Document</span>
          </Link>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#0f1319] p-4 rounded-xl border border-[#1c212a]/55">
        <form method="GET" className="flex flex-1 flex-col sm:flex-row gap-3 w-full">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-500" />
            <input
              type="text"
              name="search"
              defaultValue={searchFilter}
              placeholder="Search by invoice number or account..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm placeholder-slate-500 focus:outline-none focus:border-[#00c4b6] text-white"
            />
          </div>

          {/* Type Filter */}
          <div className="relative min-w-[200px]">
            <select
              name="type"
              defaultValue={typeFilter}
              className="w-full pl-3 pr-8 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-slate-300 focus:outline-none focus:border-[#00c4b6]"
            >
              <option value="">All Document Types</option>
              <option value="QUOTE">Quotes</option>
              <option value="INVOICE">Invoices</option>
              <option value="SALES_ORDER">Sales Orders</option>
              <option value="PURCHASE_ORDER">Purchase Orders</option>
            </select>
          </div>

          <button
            type="submit"
            className="px-4 py-1.5 bg-[#161f28] hover:bg-[#1f2d3a] border border-[#1c212a] text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Apply Filters
          </button>
          
          {(searchFilter || typeFilter) && (
            <Link
              href="/crm/invoices"
              className="px-3 py-1.5 text-slate-400 hover:text-white text-xs font-semibold flex items-center justify-center"
            >
              Reset
            </Link>
          )}
        </form>
        
        <div className="text-xs text-slate-400 font-bold shrink-0">
          Showing {filteredInvoices.length} entries
        </div>
      </div>

      {/* Invoices Data Table */}
      <div className="bg-[#0f1319] border border-[#1c212a]/55 rounded-xl overflow-hidden shadow-2xl">
        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-4">
            <div className="size-12 rounded-full bg-slate-800/40 text-slate-600 flex items-center justify-center mx-auto">
              <FileText className="size-6" />
            </div>
            <h3 className="font-bold text-base text-white">No entries found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Create client quotes or standard billing sheets to start tracking won revenue.</p>
            <Link
              href="/crm/invoices/new"
              className="inline-flex items-center gap-1.5 text-[#00c4b6] hover:underline text-xs font-bold"
            >
              <span>Onboard a new invoice sheet</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-200">
              <thead>
                <tr className="border-b border-[#1c212a]/80 bg-[#0c0f14]/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4">Document Details</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Client Account</th>
                  <th className="px-6 py-4">Issue Date</th>
                  <th className="px-6 py-4">Total Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Owner</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c212a]/30">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#161f28]/35 transition-colors">
                    <td className="px-6 py-4 font-bold text-white">
                      <span>{inv.invoiceNumber}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#161f28] text-slate-300 uppercase tracking-wider">
                        {inv.type.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {inv.account ? (
                        <div className="flex items-center gap-1.5 text-xs">
                          <Building className="size-3.5 text-slate-500" />
                          <Link href={`/crm/accounts/${inv.account.id}`} className="hover:underline hover:text-[#00c4b6]">
                            {inv.account.name}
                          </Link>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">No account linked</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(inv.date).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-6 py-4 font-bold text-[#00c4b6]">
                      ₹{inv.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        inv.status === "PAID"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : inv.status === "CANCELLED"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-300 font-medium">
                      {inv.owner.name}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <DeleteRecordButton
                          recordId={inv.id}
                          deleteAction={deleteInvoiceAction}
                          confirmMessage="Are you sure you want to delete this document entry?"
                          className="p-1.5 text-slate-500 hover:text-red-400 rounded hover:bg-red-500/10 cursor-pointer transition-colors"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
