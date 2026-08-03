"use client";

import { Printer, Save } from "lucide-react";
import { WorkspaceAction, WorkspaceCheckbox, WorkspaceField, WorkspaceInput, WorkspacePanel, WorkspacePanelHeader } from "@/components/monolith";
import { buildChecklistSummary } from "../../domain/import-job-summary";
import { useImportJobDraft } from "../../state/import-job-draft-context";
import { ImportJobSummaryCards } from "../import-job-summary-cards";

function SummaryList({ items }: { items: Record<string, string | number> }) {
  return (
    <dl className="grid gap-3 md:grid-cols-2">
      {Object.entries(items).map(([key, value]) => (
        <div key={key}>
          <dt className="mnx-dashboard-spec-label">{key.replace(/([A-Z])/g, " $1")}</dt>
          <dd>{String(value || "-")}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ChecklistTab() {
  const { dispatch, draft, isLocked } = useImportJobDraft();
  const summary = buildChecklistSummary(draft);

  function generatePrintView() {
    dispatch({
      type: "update-checklist",
      value: { printGeneratedAt: new Date().toISOString() },
    });
  }

  return (
    <div className="space-y-5">
      <WorkspacePanel className="space-y-5">
        <WorkspacePanelHeader
          title="Checklist Controls"
          actions={
            <>
              <WorkspaceAction disabled={isLocked} size="compact" onClick={generatePrintView}>Generate Print View</WorkspaceAction>
              <WorkspaceAction size="compact" variant="outline" onClick={() => window.print()}>
                <Printer aria-hidden="true" />
                Print / Save as PDF
              </WorkspaceAction>
              <WorkspaceAction size="compact" variant="outline" onClick={() => dispatch({ type: "set-active-tab", tab: "be-main-details" })}>Cancel</WorkspaceAction>
            </>
          }
        />
        <div className="grid gap-4 md:grid-cols-3">
          <WorkspaceField label="Job selector">
            <WorkspaceInput
              disabled={isLocked}
              value={draft.checklistOptions.selectedJobNo}
              onChange={(event) => dispatch({ type: "update-checklist", value: { selectedJobNo: event.currentTarget.value } })}
            />
          </WorkspaceField>
          <WorkspaceField label="Job Date">
            <WorkspaceInput
              disabled={isLocked}
              type="date"
              value={draft.checklistOptions.jobDate}
              onChange={(event) => dispatch({ type: "update-checklist", value: { jobDate: event.currentTarget.value } })}
            />
          </WorkspaceField>
          <WorkspaceField label="With Declaration">
            <WorkspaceCheckbox
              checked={draft.checklistOptions.withDeclaration}
              disabled={isLocked}
              label="With Declaration"
              onChange={(event) => dispatch({ type: "update-checklist", value: { withDeclaration: event.currentTarget.checked } })}
            />
          </WorkspaceField>
        </div>
      </WorkspacePanel>
      <div className="print:block">
        <ImportJobSummaryCards draft={draft} />
        <div className="grid gap-5 xl:grid-cols-3">
          <WorkspacePanel>
            <WorkspacePanelHeader title="Card 1" />
            <SummaryList items={summary.card1} />
          </WorkspacePanel>
          <WorkspacePanel>
            <WorkspacePanelHeader title="Card 2" />
            <SummaryList items={summary.card2} />
          </WorkspacePanel>
          <WorkspacePanel>
            <WorkspacePanelHeader title="Card 3" />
            <SummaryList items={summary.card3} />
          </WorkspacePanel>
        </div>
      </div>
      {draft.checklistOptions.printGeneratedAt ? (
        <p className="mnx-text-muted">
          <Save aria-hidden="true" className="inline" /> Print view generated at {draft.checklistOptions.printGeneratedAt}.
        </p>
      ) : null}
    </div>
  );
}
