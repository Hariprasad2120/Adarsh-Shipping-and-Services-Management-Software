import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listProducts } from "@/modules/crm/service";
import { requirePermission } from "@/lib/rbac";
import {
  Search,
  Package,
  ShieldAlert,
  Save
} from "lucide-react";
import { createProductAction, deleteProductAction } from "@/modules/crm/actions";
import { DeleteRecordButton } from "../_components/delete-record-button";

interface SearchParams {
  search?: string;
}

export default async function CrmProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
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
    await requirePermission(session.user.id, "crm.access");
  } catch (e) {
    return (
      <div className="p-8 text-center text-red-400">
        <ShieldAlert className="size-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-sm mt-1">You do not have permission to view CRM products.</p>
      </div>
    );
  }

  const awaitedParams = await searchParams;
  const search = awaitedParams.search || "";

  // Fetch products from db
  const products = await listProducts(orgId, { search });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-200">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Products List Table */}
        <div className="lg:col-span-2 bg-[#0f1319] border border-[#1c212a]/55 rounded-xl overflow-hidden shadow-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider">Product Catalog</h3>
            <span className="text-xs text-slate-400 font-bold">{products.length} service items</span>
          </div>

          <form method="GET" className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-500" />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search catalog by name or SKU..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm placeholder-slate-500 focus:outline-none focus:border-[#00c4b6] text-white"
            />
          </form>

          {products.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs italic">No items found in the service catalog.</div>
          ) : (
            <div className="divide-y divide-[#1c212a]/30">
              {products.map((product) => (
                <div key={product.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm block truncate">{product.name}</span>
                      <span className="px-1.5 py-0.5 text-[8.5px] font-bold bg-slate-800 text-slate-400 rounded uppercase tracking-wider shrink-0">
                        {product.sku}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 block mt-0.5">
                      Category: {product.category || "General"} • Tax: {product.taxPercent}% GST
                    </span>
                    {product.description && (
                      <p className="text-xs text-slate-500 mt-1 truncate">{product.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-sm font-black text-[#00c4b6] block">₹{product.price.toLocaleString("en-IN")}</span>
                    </div>
                    <DeleteRecordButton
                      recordId={product.id}
                      deleteAction={deleteProductAction}
                      confirmMessage="Are you sure you want to delete this product?"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Inline Create Product Form */}
        <div className="bg-[#0f1319] border border-[#1c212a]/55 rounded-xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-[#1c212a]/30 pb-2">
            <Package className="size-4.5 text-[#00c4b6]" />
            <h3 className="font-bold text-xs text-white uppercase tracking-wider">Add New Service Item</h3>
          </div>

          <form
            action={async (fd) => {
              "use server";
              await createProductAction(fd);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Product Name *</label>
              <input
                type="text"
                name="name"
                placeholder="e.g. FCL 20ft Ocean Freight"
                className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded text-xs text-white focus:outline-none focus:border-[#00c4b6]"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">SKU / Code *</label>
                <input
                  type="text"
                  name="sku"
                  placeholder="e.g. FRT-FCL-20"
                  className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded text-xs text-white focus:outline-none focus:border-[#00c4b6]"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Category</label>
                <input
                  type="text"
                  name="category"
                  placeholder="e.g. Ocean Freight"
                  className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded text-xs text-slate-300 focus:outline-none focus:border-[#00c4b6]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Base Price (INR) *</label>
                <input
                  type="number"
                  name="price"
                  placeholder="e.g. 45000"
                  className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded text-xs text-white focus:outline-none focus:border-[#00c4b6]"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">GST Rate (%)</label>
                <select
                  name="taxPercent"
                  defaultValue="18"
                  className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded text-xs text-slate-300 focus:outline-none focus:border-[#00c4b6]"
                >
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18% GST</option>
                  <option value="28">28%</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
              <textarea
                name="description"
                placeholder="Log service details..."
                rows={3}
                className="w-full p-2.5 bg-[#0a0d12] border border-[#1c212a] rounded text-xs text-white focus:outline-none focus:border-[#00c4b6]"
              />
            </div>
            <input type="hidden" name="active" value="true" />
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-[#00c4b6] hover:bg-[#00b0a3] text-white font-bold rounded-lg text-xs transition-all shadow-md shadow-[#00c4b6]/10 cursor-pointer"
            >
              <Save className="size-4" />
              <span>Save Product Item</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
