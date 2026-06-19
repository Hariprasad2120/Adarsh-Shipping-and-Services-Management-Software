import React from "react";
import { Info } from "lucide-react";

export function InventoryInfoBanner() {
  return (
    <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded px-4 py-3 text-xs text-blue-800">
      <Info size={15} className="flex-shrink-0 mt-0.5 text-blue-500" />
      <div>
        <p className="font-medium">Do you want to keep track of this item?</p>
        <p className="mt-0.5 text-blue-700">
          Enable Inventory to view its stock based on the sales and purchase transactions you record for it.
          Go to Settings &gt; Preferences &gt; Items and enable inventory.{" "}
          <button type="button" className="text-[#2563eb] hover:underline font-medium">
            Enable Inventory
          </button>
        </p>
      </div>
    </div>
  );
}
