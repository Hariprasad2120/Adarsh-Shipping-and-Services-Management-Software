import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listVendors } from "@/modules/crm/service";
import { requirePermission } from "@/lib/rbac";
import {
  Search,
  Truck,
  Phone,
  Mail,
  ShieldAlert,
  Save,
} from "lucide-react";
import { createVendorAction, deleteVendorAction } from "@/modules/crm/actions";
import { DeleteRecordButton } from "../_components/delete-record-button";

interface SearchParams {
  search?: string;
}

export default async function CrmVendorsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
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
    await requirePermission(session.user.id, "crm.vendor.manage");
  } catch (e) {
    return (
      <div className="p-8 text-center text-red-400">
        <ShieldAlert className="size-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-sm mt-1">You do not have permission to view CRM vendors.</p>
      </div>
    );
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
    <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-200">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Vendors list table */}
        <div className="lg:col-span-2 bg-[#0f1319] border border-[#1c212a]/55 rounded-xl overflow-hidden shadow-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider">Registered Vendors</h3>
            <span className="text-xs text-slate-400 font-bold">{vendors.length} supplier nodes</span>
          </div>

          <form method="GET" className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-500" />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search vendors by name or service..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm placeholder-slate-500 focus:outline-none focus:border-[#00c4b6] text-white"
            />
          </form>

          {vendors.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs italic">No vendors found.</div>
          ) : (
            <div className="divide-y divide-[#1c212a]/30">
              {vendors.map((vendor) => (
                <div key={vendor.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-white text-sm block truncate">{vendor.name}</span>
                    <span className="text-xs text-slate-400 block mt-0.5">
                      Contact: {vendor.contactName || "None"} • Services: {vendor.services || "General logistics"}
                    </span>
                    <div className="flex gap-4 text-[10px] text-slate-500 mt-1.5">
                      {vendor.email && <span className="flex items-center gap-1"><Mail className="size-3" /> {vendor.email}</span>}
                      {vendor.phone && <span className="flex items-center gap-1"><Phone className="size-3" /> {vendor.phone}</span>}
                    </div>
                  </div>
                    <DeleteRecordButton
                      recordId={vendor.id}
                      deleteAction={deleteVendorAction}
                      confirmMessage="Are you sure you want to delete this vendor?"
                      className="p-1.5 text-slate-500 hover:text-red-400 rounded hover:bg-red-500/10 cursor-pointer shrink-0"
                    />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Inline Create Vendor Form */}
        <div className="bg-[#0f1319] border border-[#1c212a]/55 rounded-xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-[#1c212a]/30 pb-2">
            <Truck className="size-4.5 text-[#00c4b6]" />
            <h3 className="font-bold text-xs text-white uppercase tracking-wider">Add New Vendor</h3>
          </div>

          <form
            action={async (fd) => {
              "use server";
              await createVendorAction(fd);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Vendor Company Name *</label>
              <input
                type="text"
                name="name"
                placeholder="e.g. South Linehaul Packers"
                className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded text-xs text-white focus:outline-none focus:border-[#00c4b6]"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Contact Person</label>
              <input
                type="text"
                name="contactName"
                placeholder="e.g. Ramesh Kumar"
                className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded text-xs text-white focus:outline-none focus:border-[#00c4b6]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Phone</label>
                <input
                  type="text"
                  name="phone"
                  placeholder="e.g. +91 94440 12345"
                  className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded text-xs text-white focus:outline-none focus:border-[#00c4b6]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email</label>
                <input
                  type="email"
                  name="email"
                  placeholder="e.g. ramesh@vendor.com"
                  className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded text-xs text-white focus:outline-none focus:border-[#00c4b6]"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">GSTIN / Tax ID</label>
              <input
                type="text"
                name="gstin"
                placeholder="e.g. 33AABCA1234F1Z1"
                className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded text-xs text-white focus:outline-none focus:border-[#00c4b6]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Services Provided</label>
              <input
                type="text"
                name="services"
                placeholder="e.g. Custom clearance, Linehaul trucking"
                className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded text-xs text-white focus:outline-none focus:border-[#00c4b6]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Address</label>
              <input
                type="text"
                name="address"
                placeholder="Street office address..."
                className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded text-xs text-white focus:outline-none focus:border-[#00c4b6]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Vendor Owner *</label>
              <select
                name="ownerId"
                className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded text-xs text-slate-300 focus:outline-none focus:border-[#00c4b6]"
                required
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-[#00c4b6] hover:bg-[#00b0a3] text-white font-bold rounded-lg text-xs transition-all shadow-md shadow-[#00c4b6]/10 cursor-pointer"
            >
              <Save className="size-4" />
              <span>Save Vendor Details</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
