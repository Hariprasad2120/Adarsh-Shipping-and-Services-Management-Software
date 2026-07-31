"use client";

import { Download, FileJson, FileText, History, ShieldOff } from "lucide-react";
import {
  WorkspaceAction,
  WorkspaceAlert,
  WorkspaceCheckbox,
  WorkspaceField,
  WorkspaceInput,
  WorkspacePanel,
  WorkspacePanelHeader,
  WorkspaceTextarea,
} from "@/components/monolith";
import { buildStructuredTestFlatFile } from "../../domain/import-job-serializer";
import { useImportJobDraft } from "../../state/import-job-draft-context";
import { ImportJobValidationSummary } from "../import-job-validation-summary";

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function FlatFileTab() {
  const { dispatch, draft, isLocked } = useImportJobDraft();
  const options = draft.flatFileOptions;

  function generate() {
    const generatedAt = new Date().toISOString();
    const output = buildStructuredTestFlatFile(draft, generatedAt);
    dispatch({
      type: "update-flat-file",
      value: {
        lastGeneratedAt: generatedAt,
        lastChecksum: output.checksum,
        lastFlatFile: output.flatFile,
        lastJson: output.json,
        lastValidationReport: output.validationReport,
        history: [
          {
            id: `${generatedAt}-${output.checksum}`,
            generatedAt,
            checksum: output.checksum,
            validationErrorCount: output.validationReport === "No blocking validation findings." ? 0 : output.validationReport.split("\n").length,
          },
          ...options.history,
        ].slice(0, 10),
      },
    });
  }

  return (
    <div className="space-y-5">
      <WorkspacePanel className="space-y-5">
        <WorkspacePanelHeader
          title="Flat File Controls"
          actions={
            <>
              <WorkspaceAction disabled={isLocked} size="compact" onClick={generate}>Generate</WorkspaceAction>
              <WorkspaceAction disabled={!options.lastFlatFile} size="compact" variant="outline" onClick={() => downloadText("import-job-test-flat-file.txt", options.lastFlatFile, "text/plain")}>
                <FileText aria-hidden="true" />
                Download TXT
              </WorkspaceAction>
              <WorkspaceAction disabled={!options.lastJson} size="compact" variant="outline" onClick={() => downloadText("import-job-test-inspection.json", options.lastJson, "application/json")}>
                <FileJson aria-hidden="true" />
                Download JSON
              </WorkspaceAction>
              <WorkspaceAction disabled size="compact" variant="outline" title="Signing is unavailable in the lab.">
                <ShieldOff aria-hidden="true" />
                Sign
              </WorkspaceAction>
              <WorkspaceAction disabled size="compact" variant="outline" title="Signing tool integration is unavailable in the lab.">
                Sign Tool
              </WorkspaceAction>
              <WorkspaceAction size="compact" variant="outline" onClick={() => dispatch({ type: "set-active-tab", tab: "be-main-details" })}>Cancel</WorkspaceAction>
            </>
          }
        />
        <div className="grid gap-4 md:grid-cols-3">
          <WorkspaceField label="Job selector">
            <WorkspaceInput
              disabled={isLocked}
              value={options.selectedJobNo}
              onChange={(event) => dispatch({ type: "update-flat-file", value: { selectedJobNo: event.currentTarget.value } })}
            />
          </WorkspaceField>
          <WorkspaceField label="Job Date">
            <WorkspaceInput
              disabled={isLocked}
              type="date"
              value={options.jobDate}
              onChange={(event) => dispatch({ type: "update-flat-file", value: { jobDate: event.currentTarget.value } })}
            />
          </WorkspaceField>
          <WorkspaceField label="Dummy Job">
            <WorkspaceCheckbox
              checked={options.dummyJob}
              disabled={isLocked}
              label="Dummy Job"
              onChange={(event) => dispatch({ type: "update-flat-file", value: { dummyJob: event.currentTarget.checked } })}
            />
          </WorkspaceField>
        </div>
      </WorkspacePanel>
      <ImportJobValidationSummary draft={draft} />
      <WorkspaceAlert variant="warning">
        Real ICEGATE submission and digital signing are disabled. Generated files are test artifacts only.
      </WorkspaceAlert>
      <div className="grid gap-5 xl:grid-cols-2">
        <WorkspacePanel>
          <WorkspacePanelHeader title="Generated Flat File" />
          <WorkspaceTextarea readOnly rows={14} value={options.lastFlatFile || "Generate a test file to inspect the output."} />
          <p className="mnx-text-muted">Generated timestamp: {options.lastGeneratedAt || "-"} | Checksum: {options.lastChecksum || "-"}</p>
        </WorkspacePanel>
        <WorkspacePanel>
          <WorkspacePanelHeader title="Validation Report" />
          <WorkspaceTextarea readOnly rows={14} value={options.lastValidationReport || "No validation report generated yet."} />
        </WorkspacePanel>
      </div>
      <WorkspacePanel>
        <WorkspacePanelHeader title="History Drawer" actions={<History aria-hidden="true" />} />
        {options.history.length === 0 ? (
          <p className="mnx-text-muted">No generated history yet.</p>
        ) : (
          <div className="space-y-2">
            {options.history.map((entry) => (
              <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-2">
                <span>{entry.generatedAt}</span>
                <span>Checksum {entry.checksum}</span>
                <span>{entry.validationErrorCount} validation finding(s)</span>
                <WorkspaceAction size="compact" variant="outline" onClick={() => downloadText(`validation-${entry.checksum}.txt`, options.lastValidationReport, "text/plain")}>
                  <Download aria-hidden="true" />
                  Report
                </WorkspaceAction>
              </div>
            ))}
          </div>
        )}
      </WorkspacePanel>
    </div>
  );
}
