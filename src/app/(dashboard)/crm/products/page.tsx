import {
  CrmButton,
  CrmConfigurationState,
  CrmField,
  CrmInput,
  CrmPanel,
  CrmPermissionState,
  CrmSection,
  CrmTextarea,
} from "@/modules/crm/components/workspace/crm-workspace";
import { NativeSelect } from "@/components/ui/native-select";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listProducts } from "@/modules/crm/service";
import { requirePermission } from "@/lib/rbac";
import { Search, Package, Save } from "lucide-react";
import { createProductAction, deleteProductAction } from "@/modules/crm/actions";
import { DeleteRecordButton } from "@/modules/crm/components/delete-record-button";
import { EditProductButton } from "@/modules/crm/components/edit-product-button";

interface SearchParams {
  search?: string;
}

export default async function CrmProductsPage({
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
    await requirePermission(session.user.id, "crm.access");
  } catch (e) {
    return (
      <CrmPermissionState description="You do not have permission to view CRM products." />
    );
  }

  const awaitedParams = await searchParams;
  const search = awaitedParams.search || "";

  // Fetch products from db
  const products = await listProducts(orgId, { search });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
      <CrmSection
        className="lg:col-span-2"
        title="Product catalog"
        description="Reusable catalog items available for quotes and invoices."
        actions={
          <span className="text-xs font-semibold text-[var(--mnx-muted)]">
            {products.length} items
          </span>
        }
      >
        <div className="space-y-4">
          <form method="GET" className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-[var(--mnx-muted)]" />
            <CrmInput
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search catalog by name or SKU..."
              className="w-full rounded-lg border border-[var(--mnx-border)] bg-[var(--mnx-surface)] py-1.5 pl-9 pr-3 text-sm text-[var(--mnx-text-strong)] placeholder:text-[var(--mnx-muted)] focus:border-[var(--mnx-accent)] focus:outline-none"
            />
          </form>

          {products.length === 0 ? (
            <div className="p-8 text-center text-xs italic text-[var(--mnx-muted)]">
              No items found in the service catalog.
            </div>
          ) : (
            <div className="divide-y divide-[var(--mnx-border)]/30">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="block truncate text-sm font-bold text-[var(--mnx-text-strong)]">
                        {product.name}
                      </span>
                      <span className="shrink-0 rounded bg-[var(--mnx-soft)] px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-[var(--mnx-muted)]">
                        {product.sku}
                      </span>
                    </div>
                    <span className="mt-0.5 block text-xs text-[var(--mnx-muted)]">
                      Category: {product.category || "General"} • Tax:{" "}
                      {product.taxPercent}% GST
                    </span>
                    {product.description && (
                      <p className="mt-1 truncate text-xs text-[var(--mnx-muted)]">
                        {product.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <div className="text-right">
                      <span className="block text-sm font-black text-[var(--mnx-accent)]">
                        ₹{product.price.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <EditProductButton product={product} />
                      <DeleteRecordButton
                        recordId={product.id}
                        deleteAction={deleteProductAction}
                        confirmMessage="Are you sure you want to delete this product?"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CrmSection>

      <CrmPanel className="p-6">
        <div className="mb-4 flex items-center gap-2 border-b border-[var(--mnx-border)]/50 pb-3">
          <Package className="size-4.5 text-[var(--mnx-accent)]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--mnx-text-strong)]">
            Add new service item
          </h3>
        </div>

        <form
          action={async (fd) => {
            "use server";
            await createProductAction(fd);
          }}
          className="space-y-4"
        >
          <CrmField label="Product Name" htmlFor="product-name" required>
            <CrmInput
              id="product-name"
              type="text"
              name="name"
              placeholder="e.g. FCL 20ft Ocean Freight"
              className="w-full rounded-lg border border-[var(--mnx-border)] bg-[var(--mnx-surface)] px-3 py-1.5 text-xs text-[var(--mnx-text-strong)] focus:border-[var(--mnx-accent)] focus:outline-none"
              required
            />
          </CrmField>
          <div className="grid grid-cols-2 gap-3">
            <CrmField label="SKU / Code" htmlFor="product-sku" required>
              <CrmInput
                id="product-sku"
                type="text"
                name="sku"
                placeholder="e.g. FRT-FCL-20"
                className="w-full rounded border border-[var(--mnx-border)] bg-[var(--mnx-surface)] px-3 py-1.5 text-xs text-[var(--mnx-text-strong)] focus:border-[var(--mnx-accent)] focus:outline-none"
                required
              />
            </CrmField>
            <CrmField label="Category" htmlFor="product-category">
              <CrmInput
                id="product-category"
                type="text"
                name="category"
                placeholder="e.g. Ocean Freight"
                className="w-full rounded border border-[var(--mnx-border)] bg-[var(--mnx-surface)] px-3 py-1.5 text-xs text-[var(--mnx-muted)] focus:border-[var(--mnx-accent)] focus:outline-none"
              />
            </CrmField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <CrmField label="Base Price (INR)" htmlFor="product-price" required>
              <CrmInput
                id="product-price"
                type="number"
                name="price"
                placeholder="e.g. 45000"
                className="w-full rounded border border-[var(--mnx-border)] bg-[var(--mnx-surface)] px-3 py-1.5 text-xs text-[var(--mnx-text-strong)] focus:border-[var(--mnx-accent)] focus:outline-none"
                required
              />
            </CrmField>
            <CrmField label="GST Rate (%)" htmlFor="product-tax">
              <NativeSelect
                id="product-tax"
                name="taxPercent"
                defaultValue="18"
                className="w-full rounded border border-[var(--mnx-border)] bg-[var(--mnx-surface)] px-3 py-1.5 text-xs text-[var(--mnx-muted)] focus:border-[var(--mnx-accent)] focus:outline-none"
              >
                <option value="0">0%</option>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18% GST</option>
                <option value="28">28%</option>
              </NativeSelect>
            </CrmField>
          </div>
          <CrmField label="Description" htmlFor="product-description">
            <CrmTextarea
              id="product-description"
              name="description"
              placeholder="Log service details..."
              rows={3}
              className="w-full rounded border border-[var(--mnx-border)] bg-[var(--mnx-surface)] p-2.5 text-xs text-[var(--mnx-text-strong)] focus:border-[var(--mnx-accent)] focus:outline-none"
            />
          </CrmField>
          <CrmInput type="hidden" name="active" value="true" />
          <CrmButton
            type="submit"
            className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[var(--mnx-accent)] py-2 text-xs font-bold text-[var(--mnx-text-strong)] mnx-shadow-panel transition-all hover:bg-[var(--mnx-accent)]"
          >
            <Save className="size-4" />
            <span>Save Product Item</span>
          </CrmButton>
        </form>
      </CrmPanel>
    </div>
  );
}
