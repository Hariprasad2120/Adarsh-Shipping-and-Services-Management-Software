import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listInvoices } from "@/modules/crm/service";
import { requirePermission } from "@/lib/rbac";
import { DeleteRecordButton } from "@/app/(dashboard)/crm/_components/delete-record-button";
import { deleteInvoiceAction } from "@/modules/crm/actions";
import {
  ArrowRight,
  Building,
  FileText,
  Plus,
  Search,
  ShieldAlert,
} from "lucide-react";

interface CommercialDocumentsPageProps {
  title: string;
  description: string;
  basePath: string;
  createHref: string;
  typeFilter?: string;
  showTypeFilter?: boolean;
  searchParams: Promise<SearchParams>;
}

interface SearchParams {
  type?: string;
  search?: string;
  accountId?: string;
}

export async function CommercialDocumentsPage({
  title,
  description,
  basePath,
  createHref,
  typeFilter,
  showTypeFilter = true,
  searchParams,
}: CommercialDocumentsPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return (
      <div className="p-8 text-center text-red-400">
        <ShieldAlert className="mx-auto mb-4 size-12" />
        <h2 className="text-xl font-bold">Configuration Error</h2>
        <p className="mt-1 text-sm">Missing organisation context.</p>
      </div>
    );
  }

  try {
    await requirePermission(session.user.id, "crm.invoice.manage");
  } catch {
    return (
      <div className="p-8 text-center text-red-400">
        <ShieldAlert className="mx-auto mb-4 size-12" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="mt-1 text-sm">You do not have permission to view commercial documents.</p>
      </div>
    );
  }

  const awaitedParams = await searchParams;
  const selectedType = typeFilter || awaitedParams.type || "";
  const searchFilter = awaitedParams.search || "";
  const accountIdFilter = awaitedParams.accountId || "";

  // All filtering pushed to DB — no JS-side scan of all records
  const filteredInvoices = await listInvoices(orgId, {
    type: selectedType || undefined,
    search: searchFilter || undefined,
    accountId: accountIdFilter || undefined,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-[#1c212a]/30 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="ds-h1 text-white">{title}</h2>
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={createHref}
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-[#00c4b6] px-4 py-2 text-sm font-bold text-white shadow-md shadow-[#00c4b6]/10 transition-all hover:bg-[#00b0a3]"
          >
            <Plus className="size-4" />
            <span>Generate Document</span>
          </Link>
        </div>
      </div>

      <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-[#1c212a]/55 bg-[#0f1319] p-4 md:flex-row">
        <form method="GET" className="flex w-full flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-500" />
            <input
              type="text"
              name="search"
              defaultValue={searchFilter}
              placeholder="Search by document number or account..."
              className="w-full rounded-lg border border-[#1c212a] bg-[#0a0d12] py-1.5 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-[#00c4b6] focus:outline-none"
            />
          </div>

          {showTypeFilter && !typeFilter ? (
            <div className="relative min-w-[200px]">
              <select
                name="type"
                defaultValue={selectedType}
                className="w-full rounded-lg border border-[#1c212a] bg-[#0a0d12] py-1.5 pl-3 pr-8 text-sm text-slate-300 focus:border-[#00c4b6] focus:outline-none"
              >
                <option value="">All Document Types</option>
                <option value="QUOTE">Quotes</option>
                <option value="INVOICE">Invoices</option>
                <option value="SALES_ORDER">Sales Orders</option>
                <option value="PURCHASE_ORDER">Purchase Orders</option>
              </select>
            </div>
          ) : null}

          <button
            type="submit"
            className="cursor-pointer rounded-lg border border-[#1c212a] bg-[#161f28] px-4 py-1.5 text-xs font-semibold text-slate-200 hover:bg-[#1f2d3a]"
          >
            Apply Filters
          </button>

          {(searchFilter || (!typeFilter && selectedType)) && (
            <Link
              href={basePath}
              className="flex items-center justify-center px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Reset
            </Link>
          )}
        </form>

        <div className="shrink-0 text-xs font-bold text-slate-400">Showing {filteredInvoices.length} entries</div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#1c212a]/55 bg-[#0f1319] shadow-2xl">
        {filteredInvoices.length === 0 ? (
          <div className="space-y-4 p-12 text-center text-slate-500">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-800/40 text-slate-600">
              <FileText className="size-6" />
            </div>
            <h3 className="text-base font-bold text-white">No entries found</h3>
            <p className="mx-auto max-w-sm text-xs text-slate-500">
              Create commercial documents to start tracking orders and customer billing records.
            </p>
            <Link href={createHref} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00c4b6] hover:underline">
              <span>Create a new document</span>
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
                  <tr key={inv.id} className="transition-colors hover:bg-[#161f28]/35">
                    <td className="px-6 py-4 font-bold text-white">{inv.invoiceNumber}</td>
                    <td className="px-6 py-4">
                      <span className="rounded bg-[#161f28] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                        {inv.type.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {inv.account ? (
                        <div className="flex items-center gap-1.5 text-xs">
                          <Building className="size-3.5 text-slate-500" />
                          <Link href={`/crm/customers/${inv.account.id}`} className="hover:text-[#00c4b6] hover:underline">
                            {inv.account.name}
                          </Link>
                        </div>
                      ) : (
                        <span className="italic text-slate-500">No account linked</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(inv.date).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-6 py-4 font-bold text-[#00c4b6]">
                      ₹{inv.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          inv.status === "PAID"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : inv.status === "CANCELLED"
                              ? "bg-red-500/10 text-red-400"
                              : "bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-300">{inv.owner.name}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <DeleteRecordButton
                          recordId={inv.id}
                          deleteAction={deleteInvoiceAction}
                          confirmMessage="Are you sure you want to delete this document entry?"
                          className="cursor-pointer rounded p-1.5 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
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
