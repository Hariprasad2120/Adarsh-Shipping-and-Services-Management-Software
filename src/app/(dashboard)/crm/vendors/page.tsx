import {
  CrmButton,
  CrmInput,
  CrmConfigurationState,
  CrmPermissionState,
} from "@/modules/crm/components/workspace/crm-workspace";
import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listVendors } from "@/modules/crm/service";
import { requirePermission } from "@/lib/rbac";
import { Search, Plus, Phone, Mail } from "lucide-react";
import { deleteVendorAction } from "@/modules/crm/actions";
import { DeleteRecordButton } from "@/modules/crm/components/delete-record-button";

interface SearchParams {
  search?: string;
}

export default async function CrmVendorsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return (
      <CrmConfigurationState description="Missing organisation context." />
    );
  }

  // Permission Guard
  try {
    await requirePermission(session.user.id, "crm.vendor.manage");
  } catch {
    return (
      <CrmPermissionState description="You do not have permission to view CRM vendors." />
    );
  }

  const awaitedParams = await searchParams;
  const search = awaitedParams.search || "";

  const vendors = await listVendors(orgId, { search });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-end">
        <Link
          href="/crm/vendors/new"
          className="mnx-button mnx-button-primary inline-flex items-center gap-2"
        >
          <Plus className="size-4" />
          New vendor
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 items-start">
        <div className="bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/55 rounded-xl overflow-hidden shadow-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[var(--mnx-text-strong)] uppercase tracking-wider">
              Registered Vendors
            </h3>
            <span className="text-xs text-[var(--mnx-muted)] font-bold">
              {vendors.length} supplier nodes
            </span>
          </div>

          <form method="GET" className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-[var(--mnx-muted)]" />
            <CrmInput
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search vendors by name or service..."
              className="w-full pl-9 pr-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm placeholder:text-[var(--mnx-muted)] focus:outline-none focus:border-[var(--mnx-accent)] text-[var(--mnx-text-strong)]"
            />
          </form>

          {vendors.length === 0 ? (
            <div className="p-8 text-center text-[var(--mnx-muted)] text-xs italic">
              No vendors found.
            </div>
          ) : (
            <div className="divide-y divide-[var(--mnx-border)]/30">
              {vendors.map((vendor) => (
                <div
                  key={vendor.id}
                  className="py-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-[var(--mnx-text-strong)] text-sm block truncate">
                      {vendor.name}
                    </span>
                    <span className="text-xs text-[var(--mnx-muted)] block mt-0.5">
                      Contact: {vendor.contactName || "None"} • Services:{" "}
                      {vendor.services || "General logistics"}
                    </span>
                    <div className="flex gap-4 text-[10px] text-[var(--mnx-muted)] mt-1.5">
                      {vendor.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="size-3" /> {vendor.email}
                        </span>
                      )}
                      {vendor.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="size-3" /> {vendor.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <DeleteRecordButton
                    recordId={vendor.id}
                    deleteAction={deleteVendorAction}
                    confirmMessage="Are you sure you want to delete this vendor?"
                    className="p-1.5 text-[var(--mnx-muted)] hover:text-[var(--mnx-danger)] rounded hover:bg-[var(--mnx-danger-bg)] cursor-pointer shrink-0"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
