import { CrmButton, CrmInput, CrmConfigurationState, CrmPermissionState } from "@/modules/crm/components/workspace/crm-workspace";
import { NativeSelect } from "@/components/ui/native-select";
import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { listVendors } from "@/modules/crm/service";
import { requirePermission } from "@/lib/rbac";
import {
  Search,
  Truck,
  Phone,
  Mail,
  Save,
} from "lucide-react";
import { createVendorAction, deleteVendorAction } from "@/modules/crm/actions";
import { DeleteRecordButton } from "@/modules/crm/components/delete-record-button";

interface SearchParams {
  search?: string;
}

export default async function CrmVendorsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return <CrmConfigurationState description="Missing organisation context." />;
  }

  // Permission Guard
  try {
    await requirePermission(session.user.id, "crm.vendor.manage");
  } catch (e) {
    return <CrmPermissionState description="You do not have permission to view CRM vendors." />;
  }

  const awaitedParams = await searchParams;
  const search = awaitedParams.search || "";

  // Fetch vendors from db
  const vendors = await listVendors(orgId, { search });

  // Fetch users for owner dropdown
  const employees = await db.user.findMany({
    where: { orgId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Vendors list table */}
        <div className="lg:col-span-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/55 rounded-xl overflow-hidden shadow-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-mono-text uppercase tracking-wider">Registered Vendors</h3>
            <span className="text-xs text-mono-muted font-bold">{vendors.length} supplier nodes</span>
          </div>

          <form method="GET" className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-mono-muted" />
            <CrmInput
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search vendors by name or service..."
              className="w-full pl-9 pr-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm placeholder:text-mono-muted focus:outline-none focus:border-[var(--mnx-accent)] text-mono-text"
            />
          </form>

          {vendors.length === 0 ? (
            <div className="p-8 text-center text-mono-muted text-xs italic">No vendors found.</div>
          ) : (
            <div className="divide-y divide-[var(--mnx-border)]/30">
              {vendors.map((vendor) => (
                <div key={vendor.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-mono-text text-sm block truncate">{vendor.name}</span>
                    <span className="text-xs text-mono-muted block mt-0.5">
                      Contact: {vendor.contactName || "None"} • Services: {vendor.services || "General logistics"}
                    </span>
                    <div className="flex gap-4 text-[10px] text-mono-muted mt-1.5">
                      {vendor.email && <span className="flex items-center gap-1"><Mail className="size-3" /> {vendor.email}</span>}
                      {vendor.phone && <span className="flex items-center gap-1"><Phone className="size-3" /> {vendor.phone}</span>}
                    </div>
                  </div>
                    <DeleteRecordButton
                      recordId={vendor.id}
                      deleteAction={deleteVendorAction}
                      confirmMessage="Are you sure you want to delete this vendor?"
                      className="p-1.5 text-mono-muted hover:text-[var(--mnx-danger)] rounded hover:bg-[var(--mnx-danger-bg)] cursor-pointer shrink-0"
                    />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Inline Create Vendor Form */}
        <div className="bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/55 rounded-xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--mnx-border)]/30 pb-2">
            <Truck className="size-4.5 text-[var(--mnx-accent)]" />
            <h3 className="font-bold text-xs text-mono-text uppercase tracking-wider">Add New Vendor</h3>
          </div>

          <form
            action={async (fd) => {
              "use server";
              await createVendorAction(fd);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wider mb-1.5">Vendor Company Name *</label>
              <CrmInput
                type="text"
                name="name"
                placeholder="e.g. South Linehaul Packers"
                className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wider mb-1.5">Contact Person</label>
              <CrmInput
                type="text"
                name="contactName"
                placeholder="e.g. Ramesh Kumar"
                className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wider mb-1.5">Phone</label>
                <CrmInput
                  type="text"
                  name="phone"
                  placeholder="e.g. +91 94440 12345"
                  className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wider mb-1.5">Email</label>
                <CrmInput
                  type="email"
                  name="email"
                  placeholder="e.g. ramesh@vendor.com"
                  className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wider mb-1.5">GSTIN / Tax ID</label>
              <CrmInput
                type="text"
                name="gstin"
                placeholder="e.g. 33AABCA1234F1Z1"
                className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wider mb-1.5">Services Provided</label>
              <CrmInput
                type="text"
                name="services"
                placeholder="e.g. Custom clearance, Linehaul trucking"
                className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wider mb-1.5">Address</label>
              <CrmInput
                type="text"
                name="address"
                placeholder="Street office address..."
                className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wider mb-1.5">Vendor Owner *</label>
              <NativeSelect
                name="ownerId"
                className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded text-xs text-mono-muted focus:outline-none focus:border-[var(--mnx-accent)]"
                required
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </NativeSelect>
            </div>
            <CrmButton
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent)] text-mono-text font-bold rounded-lg text-xs transition-all shadow-md shadow-[var(--mnx-accent)]/10 cursor-pointer"
            >
              <Save className="size-4" />
              <span>Save Vendor Details</span>
            </CrmButton>
          </form>
        </div>
      </div>
    </div>
  );
}
