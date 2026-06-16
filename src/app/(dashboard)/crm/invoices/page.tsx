import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listInvoices } from "@/modules/crm/service";
import { requirePermission } from "@/lib/rbac";
import { FileText, Plus, Building, ShieldAlert, ArrowRight } from "lucide-react";
import { deleteInvoiceAction } from "@/modules/crm/actions";
import { DeleteRecordButton } from "../_components/delete-record-button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-table";
import { CrmListFilters } from "../_components/crm-list-filters";

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
  } catch {
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
      <div className="flex flex-col gap-4 border-b border-outline-variant/30 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-on-surface">Invoices & Billing</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Manage client quotes, logistics sales orders, supplier purchase orders, and standard GST invoices.</p>
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

      <CrmListFilters
        filterOptions={[
          {
            label: "Document type",
            paramKey: "type",
            placeholder: "All document types",
            options: [
              { value: "", label: "All document types" },
              { value: "QUOTE", label: "Quotes" },
              { value: "INVOICE", label: "Invoices" },
              { value: "SALES_ORDER", label: "Sales Orders" },
              { value: "PURCHASE_ORDER", label: "Purchase Orders" },
            ],
          },
        ]}
        resultCount={filteredInvoices.length}
        searchPlaceholder="Search by invoice number or account..."
        singularLabel="entry"
      />

      <DataTable>
        <DataTableHeader>
          <tr>
            <DataTableHead>Document Details</DataTableHead>
            <DataTableHead>Type</DataTableHead>
            <DataTableHead>Client Account</DataTableHead>
            <DataTableHead>Issue Date</DataTableHead>
            <DataTableHead>Total Amount</DataTableHead>
            <DataTableHead>Status</DataTableHead>
            <DataTableHead>Owner</DataTableHead>
            <DataTableHead className="text-right">Actions</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {filteredInvoices.length === 0 ? (
            <DataTableEmpty
              colSpan={8}
              className="px-6 py-12"
              message={
                <div className="space-y-4 text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
                    <FileText className="size-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-on-surface">No entries found</h3>
                    <p className="mx-auto max-w-sm text-xs text-on-surface-variant">
                      Create client quotes or standard billing sheets to start tracking won revenue.
                    </p>
                  </div>
                  <Link href="/crm/invoices/new" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00c4b6] hover:underline">
                    <span>Onboard a new invoice sheet</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              }
            />
          ) : (
            filteredInvoices.map((inv) => (
              <DataTableRow key={inv.id}>
                <DataTableCell className="font-medium text-on-surface">
                  <span>{inv.invoiceNumber}</span>
                </DataTableCell>
                <DataTableCell>
                  <span className="inline-flex rounded-full bg-surface-container px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    {inv.type.replaceAll("_", " ")}
                  </span>
                </DataTableCell>
                <DataTableCell className="text-on-surface">
                  {inv.account ? (
                    <div className="flex items-center gap-1.5 text-xs">
                      <Building className="size-3.5 text-on-surface-variant" />
                      <Link href={`/crm/accounts/${inv.account.id}`} className="hover:text-[#00c4b6] hover:underline">
                        {inv.account.name}
                      </Link>
                    </div>
                  ) : (
                    <span className="italic text-on-surface-variant">No account linked</span>
                  )}
                </DataTableCell>
                <DataTableCell className="text-xs text-on-surface-variant">
                  {new Date(inv.date).toLocaleDateString("en-IN")}
                </DataTableCell>
                <DataTableCell className="font-semibold text-[#00c4b6]">
                  ₹{inv.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </DataTableCell>
                <DataTableCell>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    inv.status === "PAID"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : inv.status === "CANCELLED"
                      ? "bg-red-500/10 text-red-500"
                      : "bg-amber-500/10 text-amber-600"
                  }`}>
                    {inv.status}
                  </span>
                </DataTableCell>
                <DataTableCell className="text-sm font-medium text-on-surface">
                  {inv.owner.name}
                </DataTableCell>
                <DataTableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <DeleteRecordButton
                      recordId={inv.id}
                      deleteAction={deleteInvoiceAction}
                      confirmMessage="Are you sure you want to delete this document entry?"
                      className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-red-500/10 hover:text-red-500"
                    />
                  </div>
                </DataTableCell>
              </DataTableRow>
            ))
          )}
        </DataTableBody>
      </DataTable>
    </div>
  );
}
