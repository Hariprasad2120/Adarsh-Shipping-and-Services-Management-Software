import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listAccounts } from "@/modules/crm/service";
import { requirePermission } from "@/lib/rbac";
import {
  Search,
  Building,
  Plus,
  Phone,
  Mail,
  Eye,
  Globe,
  ShieldAlert,
  ArrowRight
} from "lucide-react";
import { deleteAccountAction } from "@/modules/crm/actions";
import { DeleteRecordButton } from "../_components/delete-record-button";

interface SearchParams {
  search?: string;
}

export default async function CrmAccountsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
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
    await requirePermission(session.user.id, "crm.contact.manage"); // maps to manage contacts/accounts in RBAC
  } catch (e) {
    return (
      <div className="p-8 text-center text-red-400">
        <ShieldAlert className="size-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-sm mt-1">You do not have permission to view CRM accounts.</p>
      </div>
    );
  }

  const awaitedParams = await searchParams;
  const search = awaitedParams.search || "";

  // Fetch accounts from db
  const accounts = await listAccounts(orgId, { search });

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#1c212a]/30 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Accounts Module</h2>
          <p className="text-slate-400 text-sm mt-1">Manage partner organizations, clients, and suppliers in your logistics network.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/crm/accounts/new"
            className="flex items-center gap-2 bg-[#00c4b6] hover:bg-[#00b0a3] text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-md shadow-[#00c4b6]/10 cursor-pointer"
          >
            <Plus className="size-4" />
            <span>Create Account</span>
          </Link>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#0f1319] p-4 rounded-xl border border-[#1c212a]/50">
        <form method="GET" className="flex flex-1 flex-col sm:flex-row gap-3 w-full">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-500" />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search accounts by name, website, tax ID..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm placeholder-slate-500 focus:outline-none focus:border-[#00c4b6] text-white"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-1.5 bg-[#161f28] hover:bg-[#1f2d3a] border border-[#1c212a] text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Search
          </button>
          
          {search && (
            <Link
              href="/crm/accounts"
              className="px-3 py-1.5 text-slate-400 hover:text-white text-xs font-semibold flex items-center justify-center"
            >
              Reset
            </Link>
          )}
        </form>
        
        <div className="text-xs text-slate-400 font-bold shrink-0">
          Showing {accounts.length} accounts
        </div>
      </div>

      {/* Accounts Data Table */}
      <div className="bg-[#0f1319] border border-[#1c212a]/50 rounded-xl overflow-hidden shadow-2xl">
        {accounts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-4">
            <div className="size-12 rounded-full bg-slate-800/40 text-slate-600 flex items-center justify-center mx-auto">
              <Building className="size-6" />
            </div>
            <h3 className="font-bold text-base text-white">No active accounts found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Create a fresh customer account to track deals and log financial logs.</p>
            <Link
              href="/crm/accounts/new"
              className="inline-flex items-center gap-1.5 text-[#00c4b6] hover:underline text-xs font-bold"
            >
              <span>Create first account</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-200">
              <thead>
                <tr className="border-b border-[#1c212a]/80 bg-[#0c0f14]/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4">Account Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Website</th>
                  <th className="px-6 py-4">Contact Info</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Owner</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c212a]/30">
                {accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-[#161f28]/35 transition-colors">
                    <td className="px-6 py-4 font-bold text-white">
                      <Link href={`/crm/accounts/${account.id}`} className="hover:text-[#00c4b6] transition-all block">
                        {account.name}
                      </Link>
                      {account.industry && (
                        <span className="text-[11px] text-slate-400 block font-normal">{account.industry}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-300">
                      {account.type || "Customer"}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {account.website ? (
                        <a
                          href={account.website}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[#00c4b6] hover:underline"
                        >
                          <Globe className="size-3.5" />
                          <span>Visit Web</span>
                        </a>
                      ) : (
                        <span className="text-slate-500 italic">No website</span>
                      )}
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      {account.email && (
                        <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                          <Mail className="size-3.5 text-slate-500" />
                          <span className="truncate">{account.email}</span>
                        </div>
                      )}
                      {account.phone && (
                        <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                          <Phone className="size-3.5 text-slate-500" />
                          <span>{account.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400">
                        {account.status || "ACTIVE"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-300 font-medium">
                      {account.owner.name}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/crm/accounts/${account.id}`}
                          className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800/40 cursor-pointer"
                          title="View 360 Details"
                        >
                          <Eye className="size-4" />
                        </Link>
                        <DeleteRecordButton
                          recordId={account.id}
                          deleteAction={deleteAccountAction}
                          confirmMessage="Are you sure you want to delete this account? This will cascade-delete child contacts too."
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
