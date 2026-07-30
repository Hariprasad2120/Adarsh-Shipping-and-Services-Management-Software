import { CrmButton, CrmInput, CrmTextarea, CrmConfigurationState, CrmPermissionState } from "@/modules/crm/components/workspace/crm-workspace";
import { NativeSelect } from "@/components/ui/native-select";
import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listProducts } from "@/modules/crm/service";
import { requirePermission } from "@/lib/rbac";
import {
  Search,
  Package,
  Save
} from "lucide-react";
import { createProductAction, deleteProductAction } from "@/modules/crm/actions";
import { DeleteRecordButton } from "@/modules/crm/components/delete-record-button";

interface SearchParams {
  search?: string;
}

export default async function CrmProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return <CrmConfigurationState description="Missing organisation context." />;
  }

  // Permission Guard
  try {
    await requirePermission(session.user.id, "crm.access");
  } catch (e) {
    return <CrmPermissionState description="You do not have permission to view CRM products." />;
  }

  const awaitedParams = await searchParams;
  const search = awaitedParams.search || "";

  // Fetch products from db
  const products = await listProducts(orgId, { search });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Products List Table */}
        <div className="lg:col-span-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/55 rounded-xl overflow-hidden shadow-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-mono-text uppercase tracking-wider">Product Catalog</h3>
            <span className="text-xs text-mono-muted font-bold">{products.length} service items</span>
          </div>

          <form method="GET" className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-mono-muted" />
            <CrmInput
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search catalog by name or SKU..."
              className="w-full pl-9 pr-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm placeholder:text-mono-muted focus:outline-none focus:border-[var(--mnx-accent)] text-mono-text"
            />
          </form>

          {products.length === 0 ? (
            <div className="p-8 text-center text-mono-muted text-xs italic">No items found in the service catalog.</div>
          ) : (
            <div className="divide-y divide-[var(--mnx-border)]/30">
              {products.map((product) => (
                <div key={product.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-mono-text text-sm block truncate">{product.name}</span>
                      <span className="px-1.5 py-0.5 text-[8.5px] font-bold bg-mono-soft text-mono-muted rounded uppercase tracking-wider shrink-0">
                        {product.sku}
                      </span>
                    </div>
                    <span className="text-xs text-mono-muted block mt-0.5">
                      Category: {product.category || "General"} • Tax: {product.taxPercent}% GST
                    </span>
                    {product.description && (
                      <p className="text-xs text-mono-muted mt-1 truncate">{product.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-sm font-black text-[var(--mnx-accent)] block">₹{product.price.toLocaleString("en-IN")}</span>
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
        <div className="bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/55 rounded-xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--mnx-border)]/30 pb-2">
            <Package className="size-4.5 text-[var(--mnx-accent)]" />
            <h3 className="font-bold text-xs text-mono-text uppercase tracking-wider">Add New Service Item</h3>
          </div>

          <form
            action={async (fd) => {
              "use server";
              await createProductAction(fd);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wider mb-1.5">Product Name *</label>
              <CrmInput
                type="text"
                name="name"
                placeholder="e.g. FCL 20ft Ocean Freight"
                className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wider mb-1.5">SKU / Code *</label>
                <CrmInput
                  type="text"
                  name="sku"
                  placeholder="e.g. FRT-FCL-20"
                  className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wider mb-1.5">Category</label>
                <CrmInput
                  type="text"
                  name="category"
                  placeholder="e.g. Ocean Freight"
                  className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded text-xs text-mono-muted focus:outline-none focus:border-[var(--mnx-accent)]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wider mb-1.5">Base Price (INR) *</label>
                <CrmInput
                  type="number"
                  name="price"
                  placeholder="e.g. 45000"
                  className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wider mb-1.5">GST Rate (%)</label>
                <NativeSelect
                  name="taxPercent"
                  defaultValue="18"
                  className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded text-xs text-mono-muted focus:outline-none focus:border-[var(--mnx-accent)]"
                >
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18% GST</option>
                  <option value="28">28%</option>
                </NativeSelect>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wider mb-1.5">Description</label>
              <CrmTextarea
                name="description"
                placeholder="Log service details..."
                rows={3}
                className="w-full p-2.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
              />
            </div>
            <CrmInput type="hidden" name="active" value="true" />
            <CrmButton
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent)] text-mono-text font-bold rounded-lg text-xs transition-all shadow-md shadow-[var(--mnx-accent)]/10 cursor-pointer"
            >
              <Save className="size-4" />
              <span>Save Product Item</span>
            </CrmButton>
          </form>
        </div>
      </div>
    </div>
  );
}
