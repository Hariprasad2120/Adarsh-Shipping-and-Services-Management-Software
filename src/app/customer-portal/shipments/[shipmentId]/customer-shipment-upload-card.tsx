"use client";

import { useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/monolith/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/monolith/card";
import { FileUploadField } from "@/components/monolith/file-upload-field";
import { Input } from "@/components/monolith/input";

type UploadState = {
  file: File | null;
  documentName: string;
  description: string;
};

const INITIAL_STATE: UploadState = {
  file: null,
  documentName: "",
  description: "",
};

export function CustomerShipmentUploadCard({ shipmentId }: { shipmentId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<UploadState>(INITIAL_STATE);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setForm((current) => ({ ...current, file }));
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.file) {
      setError("Choose a file to upload.");
      return;
    }
    if (!form.documentName.trim()) {
      setError("Add a document name before uploading.");
      return;
    }

    setError(null);
    setSuccess(null);

    const payload = new FormData();
    payload.set("documentName", form.documentName.trim());
    payload.set("description", form.description.trim());
    payload.set("file", form.file);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/customer-portal/shipments/${shipmentId}/documents`, {
          method: "POST",
          body: payload,
        });
        const body = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;

        if (!response.ok) {
          setError(body?.error || "The document could not be uploaded right now.");
          return;
        }

        setForm(INITIAL_STATE);
        setSuccess(body?.message || "Document uploaded successfully.");
        router.refresh();
      } catch {
        setError("The document could not be uploaded right now.");
      }
    });
  };

  return (
    <Card className="rounded-xl border border-mono-border/45">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="monolith-icon-badge">
              <UploadCloud size={16} />
            </span>
            <div>
              <CardTitle>Share Additional Document</CardTitle>
              <p className="text-xs text-mono-muted">
                Upload any extra customer document, clarification, or supporting file for this shipment.
              </p>
            </div>
          </div>
          <Button
            type="submit"
            size="sm"
            form="customer-shipment-upload-form"
            disabled={isPending}
            className="sm:mt-1"
          >
            {isPending ? "Uploading..." : "Upload Document"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form id="customer-shipment-upload-form" className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="customer-upload-name" className="monolith-label">
                Document Name
              </label>
              <Input
                id="customer-upload-name"
                value={form.documentName}
                onChange={(event) => {
                  setForm((current) => ({ ...current, documentName: event.target.value }));
                  setError(null);
                  setSuccess(null);
                }}
                placeholder="Example: Supplier Clarification"
                maxLength={120}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="customer-upload-description" className="monolith-label">
                Description
              </label>
              <textarea
                id="customer-upload-description"
                value={form.description}
                onChange={(event) => {
                  setForm((current) => ({ ...current, description: event.target.value }));
                  setError(null);
                  setSuccess(null);
                }}
                placeholder="Add context so the CHA team knows what this file is for."
                maxLength={500}
                rows={3}
                disabled={isPending}
                className="min-h-[88px] w-full rounded-xl border border-[#F9D972]/55 bg-mono-card px-4 py-3 text-[var(--text-base)] text-mono-text placeholder:text-[var(--color-placeholder)] focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15 hover:border-[#F9D972]/85 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          <FileUploadField
            id="customer-upload-file"
            label="File Upload"
            compact={false}
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.csv,.zip"
            helperText="Supported files include PDF, images, Office documents, CSV, and ZIP up to 25 MB."
            triggerText={form.file ? "Replace selected file" : "Drag and drop or choose a file to upload"}
            selectedFile={form.file ? { file: form.file, name: form.file.name, sizeBytes: form.file.size } : null}
            onInputChange={handleFileChange}
            onClear={() => {
              setForm((current) => ({ ...current, file: null }));
              setError(null);
              setSuccess(null);
            }}
            disabled={isPending}
          />

          {error ? (
            <div className="rounded-xl border border-[#D88700]/35 bg-[#D88700]/[0.08] px-4 py-3 text-sm text-[#D88700]">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="rounded-xl border border-[#F9D972]/35 bg-[#F9D972]/[0.08] px-4 py-3 text-sm text-[#F9D972]">
              {success}
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
