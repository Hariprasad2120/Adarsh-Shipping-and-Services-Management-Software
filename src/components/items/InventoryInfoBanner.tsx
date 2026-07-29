import { CrmButton } from "@/components/monolith/crm-workspace";
import React from "react";
import { Info } from "lucide-react";

export function InventoryInfoBanner() {
  return (
    <div className="flex gap-3 bg-[var(--mnx-accent-soft)] border border-[var(--mnx-accent)] rounded px-4 py-3 text-xs text-[var(--mnx-accent-text)]">
      <Info size={15} className="flex-shrink-0 mt-0.5 text-[var(--mnx-accent-text)]" />
      <div>
        <p className="font-medium">Do you want to keep track of this item?</p>
        <p className="mt-0.5 text-[var(--mnx-accent-text)]">
          Enable Inventory to view its stock based on the sales and purchase transactions you record for it.
          Go to Settings &gt; Preferences &gt; Items and enable inventory.{" "}
          <CrmButton type="button" className="text-[var(--mnx-accent)] hover:underline font-medium">
            Enable Inventory
          </CrmButton>
        </p>
      </div>
    </div>
  );
}
