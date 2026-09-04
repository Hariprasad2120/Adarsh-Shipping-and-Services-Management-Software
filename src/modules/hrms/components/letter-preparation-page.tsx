"use client";

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, FilePenLine, Loader2, Plus } from "lucide-react";
import { toast } from "@/modules/notifications/client";
import { NativeSelect } from "@/components/ui/native-select";
import {
  WorkspaceAlert,
  WorkspaceAction,
  WorkspacePage,
  WorkspacePageHeader,
  WorkspacePanel,
  WorkspacePanelHeader,
} from "@/components/layout/workspace";
import {
  PeopleControlInput as MnxInput,
  PeopleControlTextarea as MnxTextarea,
} from "@/modules/people/components";
import { LetterPdfPreviewModal } from "@/modules/hrms/components/letter-pdf-preview-modal";
import {
  type TemplateRecord,
} from "@/modules/hrms/components/letters-shared";

export function LetterPreparationPage() {
  const router = useRouter();
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPdfPath, setPreviewPdfPath] = useState<string | null>(null);
  const [wizardLoading, setWizardLoading] = useState(false);
  const [wizardUserId, setWizardUserId] = useState("");
  const [wizardTemplateId, setWizardTemplateId] = useState("");
  const [wizardDetails, setWizardDetails] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, tempRes, empRes] = await Promise.all([
        fetch("/api/hrms/me"),
        fetch("/api/hrms/letters?type=templates"),
        fetch("/api/hrms/letters?type=employees"),
      ]);

      const [meJson, tempJson, empJson] = await Promise.all([
        meRes.json(),
        tempRes.json(),
        empRes.json(),
      ]);

      if (meJson.ok) {
        setUserPermissions(meJson.data.permissions || []);
      }
      if (tempJson.ok) {
        const activeTemplates = (tempJson.data || []).filter(
          (template: TemplateRecord) => template.isActive,
        );
        setTemplates(activeTemplates);
      }
      if (empJson.ok) {
        setEmployees(empJson.data || []);
      }
    } catch {
      toast.error("Failed to load letter preparation data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isHR =
    userPermissions.includes("hrms.letters.settings") ||
    userPermissions.includes("hrms.letters.manage");

  const activeTemplate =
    templates.find((template) => template.id === wizardTemplateId) ?? null;

  const loadTemplateDefaults = async (userId: string, templateId: string) => {
    if (!userId || !templateId) return;
    setWizardLoading(true);
    try {
      const response = await fetch(
        `/api/hrms/letters?type=prepopulate&userId=${userId}&templateId=${templateId}`,
      );
      const json = await response.json();
      if (!json.ok) {
        throw new Error(json.error?.message || "Failed to load defaults");
      }
      setWizardDetails(json.data || {});
    } catch (error: any) {
      toast.error(error.message || "Failed to load prefilled template fields");
    } finally {
      setWizardLoading(false);
    }
  };

  const handleOpenPreview = async () => {
    if (!wizardUserId || !wizardTemplateId) {
      toast.error("Choose the employee and template before previewing");
      return;
    }

    setPreviewOpen(true);
    setPreviewPdfPath(null);
    setPreviewing(true);

    try {
      const response = await fetch("/api/hrms/letters/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: wizardTemplateId,
          userId: wizardUserId,
          details: wizardDetails,
        }),
      });
      const json = await response.json();
      if (!json.ok) {
        throw new Error(json.error?.message || "Failed to generate preview");
      }
      if (!json.data?.pdfPath) {
        throw new Error("Preview PDF was not generated");
      }
      setPreviewPdfPath(json.data.pdfPath);
    } catch (error: any) {
      setPreviewOpen(false);
      setPreviewPdfPath(null);
      toast.error(error.message || "Failed to generate preview");
    } finally {
      setPreviewing(false);
    }
  };

  const handleCreateRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch("/api/hrms/letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: wizardTemplateId,
          userId: wizardUserId,
          details: wizardDetails,
        }),
      });
      const json = await response.json();
      if (!json.ok) {
        throw new Error(json.error?.message || "Failed to create draft");
      }

      toast.success("Letter draft created");
      router.push("/hrms/letters");
    } catch (error: any) {
      toast.error(error.message || "Failed to create draft");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <WorkspacePage className="space-y-6">
        <WorkspacePanel className="flex min-h-[18rem] items-center justify-center rounded-[28px]">
          <div className="flex items-center gap-3 text-mono-muted">
            <Loader2 className="size-5 animate-spin text-mono-accent" />
            <span className="text-sm">Loading letter preparation workspace...</span>
          </div>
        </WorkspacePanel>
      </WorkspacePage>
    );
  }

  if (!isHR) {
    return (
      <WorkspacePage className="space-y-6">
        <WorkspacePageHeader
          eyebrow="HR letters"
          title="Prepare letter"
          description="Only HR letter managers can draft new document requests."
          actions={
            <WorkspaceAction
              size="compact"
              variant="outline"
              onClick={() => router.push("/hrms/letters")}
            >
              <ArrowLeft className="size-4" />
              <span>Back to letters</span>
            </WorkspaceAction>
          }
        />
        <WorkspaceAlert variant="warning">
          You do not have permission to prepare new HR letters from this workspace.
        </WorkspaceAlert>
      </WorkspacePage>
    );
  }

  return (
    <WorkspacePage className="space-y-6">
      <div className="grid gap-5">
        <WorkspacePanel className="rounded-[28px]">
          <WorkspacePanelHeader
            eyebrow="HR letters"
            title="Letter details"
            description="Choose the employee and template, fill only the required fields, then open the draft in the browser PDF viewer before creating it."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <WorkspaceAction
                  variant="outline"
                  onClick={() => router.push("/hrms/letters")}
                >
                  <ArrowLeft className="size-4" />
                  <span>Back</span>
                </WorkspaceAction>
                <WorkspaceAction
                  variant="outline"
                  onClick={() => void handleOpenPreview()}
                  disabled={!activeTemplate || !wizardUserId || previewing}
                >
                  {previewing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                  <span>{previewing ? "Opening preview..." : "Preview letter"}</span>
                </WorkspaceAction>
                <WorkspaceAction
                  type="submit"
                  form="letter-preparation-form"
                  disabled={submitting || !wizardUserId || !wizardTemplateId}
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  <span>{submitting ? "Creating..." : "Create draft"}</span>
                </WorkspaceAction>
              </div>
            }
          />

          <form
            id="letter-preparation-form"
            onSubmit={handleCreateRequest}
            className="space-y-5 px-6 pb-6 pt-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="mnx-dashboard-spec-label">
                  Recipient employee
                </label>
                <NativeSelect
                  value={wizardUserId}
                  onChange={(event) => {
                    const value = event.target.value;
                    setWizardUserId(value);
                    setWizardDetails({});
                    if (value && wizardTemplateId) {
                      void loadTemplateDefaults(value, wizardTemplateId);
                    }
                  }}
                  required
                  className="w-full text-sm"
                >
                  <option value="">Choose employee</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} ({employee.email})
                    </option>
                  ))}
                </NativeSelect>
              </div>

              <div className="space-y-2">
                <label className="mnx-dashboard-spec-label">Letter format</label>
                <NativeSelect
                  value={wizardTemplateId}
                  onChange={(event) => {
                    const value = event.target.value;
                    setWizardTemplateId(value);
                    setWizardDetails({});
                    if (wizardUserId && value) {
                      void loadTemplateDefaults(wizardUserId, value);
                    }
                  }}
                  required
                  className="w-full text-sm"
                >
                  <option value="">Choose format</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} (v{template.version})
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </div>

            {wizardLoading ? (
              <div className="flex min-h-[10rem] items-center justify-center rounded-[24px] bg-mono-soft">
                <Loader2 className="size-6 animate-spin text-mono-accent" />
              </div>
            ) : activeTemplate ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] bg-mono-soft px-4 py-3">
                  <div>
                    <p className="mnx-dashboard-spec-label">Selected template</p>
                    <h2 className="text-xl font-semibold text-mono-text">
                      {activeTemplate.name}
                    </h2>
                    <p className="text-sm text-mono-muted">
                      Version {activeTemplate.version} - DOCX-backed revision flow
                    </p>
                  </div>
                  <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-mono-muted shadow-[inset_0_0_0_1px_rgba(17,18,14,0.06)]">
                    {activeTemplate.fieldSchema.length} fields
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {activeTemplate.fieldSchema.map((field) => (
                    <div
                      key={field.key}
                      className={`space-y-2 ${field.inputType === "textarea" ? "md:col-span-2 xl:col-span-3" : ""}`}
                    >
                      <label className="mnx-dashboard-spec-label">
                        {field.label}
                      </label>
                      {field.inputType === "textarea" ? (
                        <MnxTextarea
                          rows={4}
                          required={field.required}
                          readOnly={field.readOnly}
                          value={wizardDetails[field.key] || ""}
                          onChange={(event) =>
                            setWizardDetails((current) => ({
                              ...current,
                              [field.key]: event.target.value,
                            }))
                          }
                          placeholder={field.placeholder}
                          className="w-full text-sm"
                        />
                      ) : (
                        <MnxInput
                          type={
                            field.inputType === "currency"
                              ? "text"
                              : field.inputType
                          }
                          required={field.required}
                          readOnly={field.readOnly}
                          value={wizardDetails[field.key] || ""}
                          onChange={(event) =>
                            setWizardDetails((current) => ({
                              ...current,
                              [field.key]: event.target.value,
                            }))
                          }
                          placeholder={field.placeholder}
                          className={`w-full text-sm ${field.inputType === "currency" ? "mnx-numeric" : ""}`}
                        />
                      )}
                      {field.helpText ? (
                        <p className="text-xs text-mono-muted">{field.helpText}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex min-h-[9rem] flex-col items-center justify-center gap-3 rounded-[24px] bg-mono-soft text-center text-mono-muted">
                <FilePenLine className="size-8 text-mono-accent" />
                <p className="text-sm">
                  Choose an employee and template to start preparing the letter.
                </p>
              </div>
            )}
          </form>
        </WorkspacePanel>
      </div>
      <LetterPdfPreviewModal
        open={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewPdfPath(null);
        }}
        title={activeTemplate ? activeTemplate.name : "Draft preview"}
        description="Review the draft inside the popup using the PDF viewer before creating the letter request."
        pdfPath={previewPdfPath}
        loading={previewing}
      />
    </WorkspacePage>
  );
}
