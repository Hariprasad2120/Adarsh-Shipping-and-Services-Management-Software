import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listAccounts } from "@/modules/crm/service";
import { deleteAccountAction } from "@/modules/crm/actions";
import { DeleteRecordButton } from "../_components/delete-record-button";
import {
  Building,
  Plus,
  Search,
  Mail,
  Phone,
  Eye,
  Edit2,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

interface SearchParams {
  search?: string;
}

export default async function CrmCustomersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
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

  const awaitedParams = await searchParams;
  const search = awaitedParams.search || "";

  // Fetch accounts (customers) from db
  const accounts = await listAccounts(orgId, { search });

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-b border-[#1c212a]/30 pb-5">
        <div>
          <h2 className="ds-h1 text-white">CUSTOMERS</h2>
          <p className="text-sm text-slate-400 mt-1">Manage customer profiles, address routing, outstanding balances, and linked contact authority.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/crm/customers/new"
            className="flex items-center gap-2 bg-[#00cec4] hover:bg-[#00b8af] text-white hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_rgba(0,184,175,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none cursor-pointer"
          >
            <Plus className="size-4" />
            <span>Create Customer</span>
          </Link>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#0f1319] p-4 rounded-xl border border-[#1c212a]/55 shadow-md">
        <form method="GET" className="flex flex-1 flex-col sm:flex-row gap-3 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-500" />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search customers by name, company, email..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm placeholder-slate-500 focus:outline-none focus:border-[#00cec4] text-white"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-1.5 bg-[#161f28] hover:bg-[#1f2d3a] border border-[#1c212a] text-slate-200 rounded-lg text-xs font-semibold cursor-pointer transition-all"
          >
            Search
          </button>
          
          {search && (
            <Link
              href="/crm/customers"
              className="px-3 py-1.5 text-slate-400 hover:text-white text-xs font-semibold flex items-center justify-center cursor-pointer transition-all"
            >
              Reset
            </Link>
          )}
        </form>
        
        <div className="text-xs text-slate-400 font-bold shrink-0">
          Showing {accounts.length} Customers
        </div>
      </div>

      {/* Customers Data Table */}
      <div className="bg-[#0f1319] border border-[#1c212a]/55 rounded-xl overflow-hidden shadow-2xl">
        {accounts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-4">
            <div className="size-12 rounded-full bg-[#00cec4]/10 text-[#00cec4] flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(0,206,196,0.15)]">
              <Building className="size-6" />
            </div>
            <h3 className="ds-h2 text-white">No Customers Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {search 
                ? `Your search "${search}" did not return any matches.` 
                : "Create a customer profile to manage address routing, credit terms, and invoices."
              }
            </p>
            {!search && (
              <Link
                href="/crm/customers/new"
                className="inline-flex items-center gap-1.5 text-[#00cec4] hover:underline text-xs font-bold"
              >
                <span>Onboard a new customer</span>
                <ArrowRight className="size-3.5" />
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto font-sans">
            <table className="ds-table w-full">
              <thead>
                <tr>
                  <th className="px-6 py-4">Customer Name</th>
                  <th className="px-6 py-4">Company Name</th>
                  <th className="px-6 py-4">Contact Info</th>
                  <th className="px-6 py-4">Outstanding Balance</th>
                  <th className="px-6 py-4">Currency</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc) => {
                  const unpaidInvoices = acc.invoices?.filter((inv: any) => inv.status !== "PAID" && inv.status !== "CANCELLED") || [];
                  const balance = unpaidInvoices.reduce((sum: number, inv: any) => sum + inv.total, 0);

                  return (
                    <tr key={acc.id} className="ds-row-link group">
                      <td className="px-6 py-4 font-bold text-white">
                        <Link href={`/crm/customers/${acc.id}`} className="hover:text-[#00cec4] transition-all block">
                          {acc.name}
                        </Link>
                        {acc.customerSubType && (
                          <span className="text-[10px] text-slate-400 block font-normal mt-0.5">{acc.customerSubType}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-300 font-medium">
                        {acc.companyName || <span className="text-slate-500 italic">None</span>}
                      </td>
                      <td className="px-6 py-4 text-slate-300 text-xs">
                        {acc.email && (
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Mail className="size-3.5 text-slate-500" />
                            <span>{acc.email}</span>
                          </div>
                        )}
                        {acc.phone && (
                          <div className="flex items-center gap-1.5 text-slate-300 mt-1">
                            <Phone className="size-3.5 text-slate-500" />
                            <span>{acc.phone}</span>
                          </div>
                        )}
                        {!acc.email && !acc.phone && (
                          <span className="text-slate-500 italic">No contact details</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-bold font-mono ds-numeric ${balance > 0 ? "text-[#fb923c]" : "text-slate-400"}`}>
                          {new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: "INR",
                            maximumFractionDigits: 2,
                          }).format(balance)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-400">
                        {acc.currency ? acc.currency.split("-")[0].trim() : "INR"}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-500/10 text-emerald-400 rounded uppercase tracking-wider">
                          {acc.status || "ACTIVE"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/crm/customers/${acc.id}`} className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800/40 cursor-pointer" title="View details">
                            <Eye className="size-4" />
                          </Link>
                          <Link href={`/crm/customers/${acc.id}/edit`} className="p-1.5 text-slate-400 hover:text-[#00cec4] rounded hover:bg-slate-800/40 cursor-pointer" title="Edit">
                            <Edit2 className="size-4" />
                          </Link>
                          <DeleteRecordButton
                            recordId={acc.id}
                            confirmMessage="Are you sure you want to delete this customer account? All linked contacts, deals, and projects will be affected."
                            deleteAction={deleteAccountAction}
                            className="p-1.5 text-slate-500 hover:text-red-400 rounded hover:bg-red-500/10 cursor-pointer transition-colors"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
