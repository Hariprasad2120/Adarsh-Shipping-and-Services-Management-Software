"use client";

import { useState, useTransition } from "react";
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle } from "lucide-react";
import { importWorkbookAction } from "./actions";
import {
  AdminButton,
  AdminInput,
  WorkspaceAlert,
} from "@/components/monolith";

export function WorkbookImportForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setMessage(null);
      setError(null);
    } else {
      setFileName(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await importWorkbookAction(formData);
      if (res.ok) {
        setMessage(res.message);
        setFileName(null);
        event.currentTarget.reset();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form className="mnx-admin-import-form" onSubmit={handleSubmit}>
      <label className="mnx-admin-file-drop">
        {fileName ? (
          <>
            <FileSpreadsheet aria-hidden="true" />
            <strong>
              {fileName}
            </strong>
            <small>Click to change workbook</small>
          </>
        ) : (
          <>
            <Upload aria-hidden="true" />
            <strong>
              Choose workbook file
            </strong>
            <small>
              Upload `.xlsx` with the required Users and Login sheets.
            </small>
          </>
        )}
        <AdminInput
          name="workbook"
          type="file"
          accept=".xlsx"
          onChange={handleFileChange}
          required
          className="sr-only"
        />
      </label>

      {message && (
        <WorkspaceAlert variant="success">
          <CheckCircle aria-hidden="true" />
          <span>{message}</span>
        </WorkspaceAlert>
      )}

      {error && (
        <WorkspaceAlert variant="danger">
          <AlertTriangle aria-hidden="true" />
          <span>{error}</span>
        </WorkspaceAlert>
      )}

      <AdminButton type="submit" disabled={pending || !fileName} variant="primary">
        {pending ? "Importing Workbook Data..." : "Import Workbook"}
      </AdminButton>
    </form>
  );
}
