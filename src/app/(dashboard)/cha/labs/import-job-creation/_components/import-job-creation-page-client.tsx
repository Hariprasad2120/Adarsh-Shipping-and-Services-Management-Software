"use client";

import * as React from "react";
import { WorkspacePage, WorkspaceSectionHeading } from "@/components/monolith";
import { BeMainDetailsTab } from "@/modules/cha/labs/import-job-creation/components/tabs/be-main-details-tab";
import { ChecklistTab } from "@/modules/cha/labs/import-job-creation/components/tabs/checklist-tab";
import { DeclarationTab } from "@/modules/cha/labs/import-job-creation/components/tabs/declaration-tab";
import { FlatFileTab } from "@/modules/cha/labs/import-job-creation/components/tabs/flat-file-tab";
import { IgmTab } from "@/modules/cha/labs/import-job-creation/components/tabs/igm-tab";
import { InvoiceTab } from "@/modules/cha/labs/import-job-creation/components/tabs/invoice-tab";
import { ItemDetailsTab } from "@/modules/cha/labs/import-job-creation/components/tabs/item-details-tab";
import { SupportingDocumentsTab } from "@/modules/cha/labs/import-job-creation/components/tabs/supporting-documents-tab";
import { ImportJobHeader } from "@/modules/cha/labs/import-job-creation/components/import-job-header";
import {
  ImportJobTabNavigation,
  importJobTabs,
} from "@/modules/cha/labs/import-job-creation/components/import-job-tab-navigation";
import { ImportJobSummaryCards } from "@/modules/cha/labs/import-job-creation/components/import-job-summary-cards";
import { ImportJobDraftProvider, useImportJobDraft } from "@/modules/cha/labs/import-job-creation/state/import-job-draft-context";
import type { ImportJobTabId, TabCompletionState } from "@/modules/cha/labs/import-job-creation/domain/import-job.types";
import { importMainDetailsSchema } from "@/modules/cha/labs/import-job-creation/domain/import-job.schemas";
import { buildValidationReport } from "@/modules/cha/labs/import-job-creation/domain/import-job-serializer";

function getTabStates(draft: ReturnType<typeof useImportJobDraft>["draft"]): Record<ImportJobTabId, TabCompletionState> {
  const mainValidation = importMainDetailsSchema.safeParse(draft.mainDetails);
  const flatFileErrors = buildValidationReport(draft);

  return {
    "be-main-details": mainValidation.success
      ? "complete"
      : Object.values(draft.mainDetails).some(Boolean)
        ? "invalid"
        : "empty",
    igm: draft.igmRecords.length > 0 ? "complete" : "empty",
    invoice: draft.invoiceRecords.length > 0 ? "complete" : "empty",
    "item-details": draft.itemRecords.length > 0 ? "complete" : draft.invoiceRecords.length > 0 ? "in-progress" : "empty",
    declaration: draft.declarationRecords.length > 0 ? "complete" : "empty",
    "supporting-documents": draft.supportingDocumentRecords.length > 0 ? "complete" : "empty",
    checklist: draft.checklistOptions.printGeneratedAt ? "complete" : "in-progress",
    "flat-file": flatFileErrors.length > 0 ? "invalid" : draft.flatFileOptions.lastGeneratedAt ? "complete" : "in-progress",
  };
}

const tabPanels: Record<ImportJobTabId, React.ReactNode> = {
  "be-main-details": <BeMainDetailsTab />,
  igm: <IgmTab />,
  invoice: <InvoiceTab />,
  "item-details": <ItemDetailsTab />,
  declaration: <DeclarationTab />,
  "supporting-documents": <SupportingDocumentsTab />,
  checklist: <ChecklistTab />,
  "flat-file": <FlatFileTab />,
};

function ImportJobCreationWorkspace() {
  const {
    dispatch,
    draft,
    hasUnsavedChanges,
    isHydrated,
    isLocked,
    manualSave,
    resetDraft,
  } = useImportJobDraft();
  const tabStates = getTabStates(draft);

  function handleReset() {
    const confirmation = window.prompt("Type RESET LAB DRAFT to clear only this local lab draft.");
    if (confirmation === "RESET LAB DRAFT") resetDraft();
  }

  if (!isHydrated) {
    return <WorkspacePage>Restoring local import lab draft...</WorkspacePage>;
  }

  return (
    <WorkspacePage className="space-y-8">
      <ImportJobHeader
        canReset
        hasUnsavedChanges={hasUnsavedChanges}
        isLocked={isLocked}
        updatedAt={draft.updatedAt}
        onLoadSample={() => dispatch({ type: "load-sample" })}
        onLockToggle={() => dispatch({ type: isLocked ? "unlock" : "lock" })}
        onManualSave={manualSave}
        onReset={handleReset}
      />
      <ImportJobSummaryCards draft={draft} />
      <WorkspaceSectionHeading
        index="01"
        title="Import test workspace"
        description="Tabs are independent. Move between them without losing data; the local draft is saved outside production CHA tables."
      />
      <ImportJobTabNavigation
        activeTab={draft.activeTab}
        states={tabStates}
        onChange={(tab) => dispatch({ type: "set-active-tab", tab })}
      />
      {importJobTabs.map((tab) => (
        <section
          key={tab.id}
          aria-labelledby={`${tab.id}-tab-heading`}
          className="space-y-5"
          hidden={draft.activeTab !== tab.id}
          role="tabpanel"
        >
          <h2 id={`${tab.id}-tab-heading`} className="sr-only">
            {tab.label}
          </h2>
          {tabPanels[tab.id]}
        </section>
      ))}
    </WorkspacePage>
  );
}

export function ImportJobCreationPageClient() {
  return (
    <ImportJobDraftProvider>
      <ImportJobCreationWorkspace />
    </ImportJobDraftProvider>
  );
}
