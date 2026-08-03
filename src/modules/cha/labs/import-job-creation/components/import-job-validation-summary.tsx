"use client";

import { AlertTriangle } from "lucide-react";
import { WorkspaceAlert } from "@/components/monolith";
import { buildValidationReport } from "../domain/import-job-serializer";
import { validateParentChildIntegrity } from "../domain/import-job-summary";
import type { ImportJobDraft } from "../domain/import-job.types";

export function ImportJobValidationSummary({ draft }: { draft: ImportJobDraft }) {
  const validationMessages = buildValidationReport(draft);
  const integrityWarnings = validateParentChildIntegrity(draft);

  if (validationMessages.length === 0 && integrityWarnings.length === 0) {
    return (
      <WorkspaceAlert variant="success">
        Validation report is clear for the current lab draft.
      </WorkspaceAlert>
    );
  }

  return (
    <WorkspaceAlert variant="warning">
      <div className="flex items-start gap-3">
        <AlertTriangle aria-hidden="true" />
        <div>
          <strong>Validation summary</strong>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {validationMessages.map((message) => (
              <li key={message}>{message}</li>
            ))}
            {integrityWarnings.map((warning) => (
              <li key={warning.message}>{warning.message}</li>
            ))}
          </ul>
        </div>
      </div>
    </WorkspaceAlert>
  );
}
