"use client";

import type { ImportJobTabId, TabCompletionState } from "../domain/import-job.types";

export const importJobTabs: { id: ImportJobTabId; label: string }[] = [
  { id: "be-main-details", label: "BE Main Details" },
  { id: "igm", label: "IGM" },
  { id: "invoice", label: "Invoice" },
  { id: "item-details", label: "Item Details" },
  { id: "declaration", label: "Declaration" },
  { id: "supporting-documents", label: "Supporting Document" },
  { id: "checklist", label: "CheckList" },
  { id: "flat-file", label: "Flat File" },
];

const stateLabel: Record<TabCompletionState, string> = {
  empty: "Empty",
  "in-progress": "In progress",
  complete: "Complete",
  invalid: "Errors",
};

type ImportJobTabNavigationProps = {
  activeTab: ImportJobTabId;
  states: Record<ImportJobTabId, TabCompletionState>;
  onChange: (tab: ImportJobTabId) => void;
};

export function ImportJobTabNavigation({
  activeTab,
  onChange,
  states,
}: ImportJobTabNavigationProps) {
  return (
    <div className="sticky top-0 z-10 -mx-2 overflow-x-auto border-y py-2 backdrop-blur">
      <div className="flex min-w-max gap-2 px-2" role="tablist" aria-label="Import job creation sections">
        {importJobTabs.map((tab) => (
          <button
            key={tab.id}
            aria-selected={activeTab === tab.id}
            className={`mnx-button mnx-button-compact ${
              activeTab === tab.id ? "mnx-button-primary" : "mnx-button-outline"
            }`}
            role="tab"
            type="button"
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
            <span className="mnx-badge mnx-badge-neutral">{stateLabel[states[tab.id]]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
