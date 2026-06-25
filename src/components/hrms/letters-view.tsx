/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileCheck,
  FilePenLine,
  ImagePlus,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Save,
  Send,
  Shield,
  Trash,
  Upload,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";

type TemplateField = {
  key: string;
  label: string;
  inputType: "text" | "textarea" | "date" | "number" | "currency" | "email" | "select" | "image";
  required: boolean;
  defaultSource: string;
  placeholder?: string;
  helpText?: string;
  readOnly?: boolean;
  options?: Array<{ label: string; value: string }>;
};

type TemplateRecord = {
  id: string;
  name: string;
  type: string;
  version: number;
  isActive: boolean;
  isLegalReviewed: boolean;
  content: string;
  previewHtml: string | null;
  variables: string[];
  sourceDocxPath: string | null;
  sourceFileName: string | null;
  fieldSchema: TemplateField[];
  editorDocument: { html: string };
};

const TABS = [
  { key: "register", label: "Letters Registry" },
  { key: "inbox", label: "Approval Inbox" },
  { key: "templates", label: "Letter Templates" },
  { key: "settings", label: "Signatory Settings" },
] as const;

function RichTemplateEditor({
  value,
  variables,
  onChange,
  onUploadImage,
}: {
  value: string;
  variables: string[];
  onChange: (value: string) => void;
  onUploadImage: (file: File) => Promise<string | null>;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const syncValue = () => {
    onChange(editorRef.current?.innerHTML ?? "");
  };

  const runCommand = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    syncValue();
  };

  const insertPlaceholder = () => {
    const choice = window.prompt("Enter placeholder key to insert", variables[0] ?? "employee_name");
    if (!choice) return;
    runCommand("insertText", `{{${choice}}}`);
  };

  const handleImageSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const uploadedPath = await onUploadImage(file);
    if (uploadedPath) {
      runCommand("insertImage", `/${uploadedPath}`);
    }
    event.target.value = "";
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-low p-3">
        <Button type="button" variant="outline" size="sm" onClick={() => runCommand("bold")}>Bold</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => runCommand("italic")}>Italic</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => runCommand("formatBlock", "<h2>")}>Heading</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => runCommand("insertUnorderedList")}>Bullets</Button>
        <Button type="button" variant="outline" size="sm" onClick={insertPlaceholder}>Placeholder</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => imageInputRef.current?.click()}>
          <ImagePlus className="size-4" />
          <span>Image</span>
        </Button>
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelection} />
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={syncValue}
        className="min-h-[28rem] rounded-2xl border border-outline-variant bg-surface p-4 text-sm text-on-surface outline-none focus:border-primary"
      />
    </div>
  );
}

export function LettersView() {
  const [activeTab, setActiveTab] = useState<"register" | "inbox" | "templates" | "settings">("register");
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPrepareModal, setShowPrepareModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateRecord | null>(null);
  const [editorHtml, setEditorHtml] = useState("");
  const [wizardUserId, setWizardUserId] = useState("");
  const [wizardTemplateId, setWizardTemplateId] = useState("");
  const [wizardDetails, setWizardDetails] = useState<Record<string, string>>({});
  const [wizardLoading, setWizardLoading] = useState(false);
  const [templateUploading, setTemplateUploading] = useState(false);
  const templateUploadInputRef = useRef<HTMLInputElement | null>(null);

  const [settingsForm, setSettingsForm] = useState({
    numberingPattern: "",
    probationDaysDefault: 90,
    noticePeriodDaysDefault: 30,
    letterValidityDaysDefault: 7,
    legalJurisdiction: "",
    complianceVersion: "",
    signatoryName: "",
    signatoryDesignation: "",
    signatorySignatureUrl: "",
    companySealUrl: "",
    emailTemplate: ""
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, reqRes, tempRes, empRes, settingsRes] = await Promise.all([
        fetch("/api/hrms/me"),
        fetch("/api/hrms/letters"),
        fetch("/api/hrms/letters?type=templates"),
        fetch("/api/hrms/letters?type=employees"),
        fetch("/api/hrms/letters/settings"),
      ]);

      const [meJson, reqJson, tempJson, empJson, settingsJson] = await Promise.all([
        meRes.json(),
        reqRes.json(),
        tempRes.json(),
        empRes.json(),
        settingsRes.json(),
      ]);

      if (meJson.ok) {
        setUserPermissions(meJson.data.permissions || []);
      }
      if (reqJson.ok) setRequests(reqJson.data);
      if (tempJson.ok) {
        setTemplates(tempJson.data);
        setSelectedTemplate((current) => current ?? tempJson.data[0] ?? null);
        if (tempJson.data.length > 0) {
          setEditorHtml((current) => current || tempJson.data[0].editorDocument?.html || tempJson.data[0].previewHtml || "");
        }
      }
      if (empJson.ok) setEmployees(empJson.data);
      if (settingsJson.ok && settingsJson.data) {
        setSettingsForm({
          numberingPattern: settingsJson.data.numberingPattern || "",
          probationDaysDefault: settingsJson.data.probationDaysDefault || 90,
          noticePeriodDaysDefault: settingsJson.data.noticePeriodDaysDefault || 30,
          letterValidityDaysDefault: settingsJson.data.letterValidityDaysDefault || 7,
          legalJurisdiction: settingsJson.data.legalJurisdiction || "",
          complianceVersion: settingsJson.data.complianceVersion || "",
          signatoryName: settingsJson.data.signatoryName || "",
          signatoryDesignation: settingsJson.data.signatoryDesignation || "",
          signatorySignatureUrl: settingsJson.data.signatorySignatureUrl || "",
          companySealUrl: settingsJson.data.companySealUrl || "",
          emailTemplate: settingsJson.data.emailTemplate || "",
        });
      }
    } catch {
      toast.error("Failed to load HR Letters portal data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isHR = userPermissions.includes("hrms.letters.settings") || userPermissions.includes("hrms.letters.manage");
  const isLegal = userPermissions.includes("hrms.letters.legal_review");
  const isManagement = userPermissions.includes("hrms.letters.mgmt_approve");

  const inboxRequests = requests.filter((request) =>
    (isHR && request.status === "HR_REVIEW") ||
    (isLegal && request.status === "LEGAL_REVIEW") ||
    (isManagement && request.status === "MGMT_APPROVAL") ||
    (isHR && request.status === "READY_TO_ISSUE")
  );

  const activeTemplate = templates.find((template) => template.id === wizardTemplateId) || selectedTemplate;

  const loadTemplateDefaults = async (userId: string, templateId: string) => {
    if (!userId || !templateId) return;
    setWizardLoading(true);
    try {
      const response = await fetch(`/api/hrms/letters?type=prepopulate&userId=${userId}&templateId=${templateId}`);
      const json = await response.json();
      if (!json.ok) throw new Error(json.error?.message || "Failed to load defaults");
      setWizardDetails(json.data || {});
    } catch (error: any) {
      toast.error(error.message || "Failed to load prefilled template fields");
    } finally {
      setWizardLoading(false);
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
      if (!json.ok) throw new Error(json.error?.message || "Failed to create draft");

      toast.success("Letter draft created");
      setShowPrepareModal(false);
      setWizardUserId("");
      setWizardTemplateId("");
      setWizardDetails({});
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to create draft");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWorkflowTransition = async (requestId: string, action: string, notes?: string) => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/hrms/letters/${requestId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes }),
      });
      const json = await response.json();
      if (!json.ok) throw new Error(json.error?.message || "Action failed");
      toast.success(`Action completed: ${action.replace(/_/g, " ")}`);
      setShowViewModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Action failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!window.confirm("Delete this draft?")) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/hrms/letters/${requestId}`, { method: "DELETE" });
      const json = await response.json();
      if (!json.ok) throw new Error(json.error?.message || "Delete failed");
      toast.success("Draft deleted");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Delete failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveTemplateRevision = async () => {
    if (!selectedTemplate) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/hrms/letters/${selectedTemplate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "template",
          saveEditorRevision: true,
          previewHtml: editorHtml,
        }),
      });
      const json = await response.json();
      if (!json.ok) throw new Error(json.error?.message || "Failed to save template");
      toast.success("Template revision saved. Legal review reset.");
      await fetchData();
      const refreshed = json.data;
      setSelectedTemplate(refreshed);
      setEditorHtml(refreshed.editorDocument?.html || refreshed.previewHtml || "");
    } catch (error: any) {
      toast.error(error.message || "Failed to save template");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLegalApproveTemplate = async (templateId: string) => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/hrms/letters/${templateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "template", legalApprove: true }),
      });
      const json = await response.json();
      if (!json.ok) throw new Error(json.error?.message || "Approval failed");
      toast.success("Template legally approved and activated");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Approval failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportBundledTemplates = async () => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/hrms/letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import_docx_templates" }),
      });
      const json = await response.json();
      if (!json.ok) throw new Error(json.error?.message || "Import failed");
      toast.success("Bundled DOCX templates imported");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Import failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadTemplateDocx = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setTemplateUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/hrms/letters/templates/upload", { method: "POST", body: formData });
      const json = await response.json();
      if (!json.ok) throw new Error(json.error?.message || "Template upload failed");
      toast.success("DOCX template uploaded");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Template upload failed");
    } finally {
      setTemplateUploading(false);
      event.target.value = "";
    }
  };

  const uploadEditorImage = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/hrms/letters/assets/upload", { method: "POST", body: formData });
    const json = await response.json();
    if (!json.ok) {
      toast.error(json.error?.message || "Image upload failed");
      return null;
    }
    return json.data.path as string;
  };

  const handleUpdateSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch("/api/hrms/letters/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsForm),
      });
      const json = await response.json();
      if (!json.ok) throw new Error(json.error?.message || "Failed to save settings");
      toast.success("Letter settings saved");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[24rem] flex-col items-center justify-center gap-3 text-on-surface-variant">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="ds-label">Loading HR Letters</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-[24px] border border-outline-variant bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="ds-icon-badge">
              <Mail className="size-5" />
            </span>
            <div>
              <h1 className="ds-h1 font-semibold text-on-surface">HR Letters & Contracts</h1>
              <p className="mt-2 text-sm text-on-surface-variant">
                DOCX-based templates, guided drafting, approvals, and issuance in one workspace.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isHR ? (
              <Button type="button" onClick={() => setShowPrepareModal(true)}>
                <Plus className="size-4" />
                <span>Prepare Letter</span>
              </Button>
            ) : null}
            <Button type="button" variant="outline" mode="icon" onClick={fetchData}>
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-5 border-b border-outline-variant">
        {TABS.filter((tab) => (tab.key === "templates" || tab.key === "settings" ? isHR : true)).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`border-b-2 pb-3 text-xs font-semibold uppercase tracking-[0.12em] transition ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "register" ? (
        <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="ds-table">
              <thead>
                <tr>
                  <th className="px-6 py-3">Employee</th>
                  <th className="px-6 py-3">Document Type</th>
                  <th className="px-6 py-3">Letter No</th>
                  <th className="px-6 py-3">Created</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm text-on-surface-variant">No letters generated yet.</td>
                  </tr>
                ) : requests.map((request) => {
                  const template = templates.find((item) => item.id === request.templateId);
                  return (
                    <tr key={request.id}>
                      <td className="px-6 py-4 font-medium text-on-surface">{request.user.name}</td>
                      <td className="px-6 py-4 text-on-surface">{template?.name || "Letter"}</td>
                      <td className="px-6 py-4 ds-numeric">{request.letterNumber}</td>
                      <td className="px-6 py-4 text-on-surface-variant">{new Date(request.createdAt).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className="rounded-full border border-outline-variant bg-surface-container-low px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface">
                          {request.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" mode="icon" onClick={() => { setSelectedRequest(request); setShowViewModal(true); }}>
                            <Eye className="size-4" />
                          </Button>
                          {request.status === "ISSUED" ? (
                            <a href={`/verify/${request.id}`} target="_blank" rel="noreferrer" className="inline-flex">
                              <Button type="button" variant="outline" mode="icon">
                                <Shield className="size-4" />
                              </Button>
                            </a>
                          ) : null}
                          {isHR && request.status === "DRAFT" ? (
                            <Button type="button" variant="outline" mode="icon" onClick={() => handleDeleteRequest(request.id)}>
                              <Trash className="size-4" />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {activeTab === "inbox" ? (
        <div className="space-y-4">
          {inboxRequests.length === 0 ? (
            <Card className="rounded-2xl border border-dashed border-outline-variant bg-surface p-10 text-center text-on-surface-variant">
              <CheckCircle2 className="mx-auto mb-3 size-10 text-primary" />
              <p className="text-sm">No letters are waiting for your approval.</p>
            </Card>
          ) : inboxRequests.map((request) => {
            const template = templates.find((item) => item.id === request.templateId);
            return (
              <Card key={request.id} className="card-left-accent rounded-2xl border border-outline-variant bg-surface p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-base font-semibold uppercase tracking-[0.05em] text-on-surface">{template?.name} for {request.user.name}</p>
                    <p className="text-sm text-on-surface-variant">Stage: {request.status.replace(/_/g, " ")} | Created: {new Date(request.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => { setSelectedRequest(request); setShowViewModal(true); }}>Review</Button>
                    {isHR && request.status === "HR_REVIEW" ? <Button type="button" onClick={() => handleWorkflowTransition(request.id, "HR_APPROVE")}>Approve HR</Button> : null}
                    {isLegal && request.status === "LEGAL_REVIEW" ? <Button type="button" onClick={() => handleWorkflowTransition(request.id, "LEGAL_APPROVE")}>Approve Legal</Button> : null}
                    {isManagement && request.status === "MGMT_APPROVAL" ? <Button type="button" onClick={() => handleWorkflowTransition(request.id, "MGMT_APPROVE")}>Approve Mgmt</Button> : null}
                    {isHR && request.status === "READY_TO_ISSUE" ? (
                      <Button type="button" onClick={() => handleWorkflowTransition(request.id, "ISSUE")}>
                        <Send className="size-4" />
                        <span>Issue Document</span>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      {activeTab === "templates" && isHR ? (
        <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <div className="space-y-4">
            <Card className="rounded-2xl border border-outline-variant bg-surface p-4 shadow-sm">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={handleImportBundledTemplates} disabled={submitting}>
                    <WandSparkles className="size-4" />
                    <span>Import Bundled DOCX</span>
                  </Button>
                  <Button type="button" variant="outline" onClick={() => templateUploadInputRef.current?.click()} disabled={templateUploading}>
                    <Upload className="size-4" />
                    <span>{templateUploading ? "Uploading..." : "Upload DOCX"}</span>
                  </Button>
                  <input ref={templateUploadInputRef} type="file" accept=".docx" className="hidden" onChange={handleUploadTemplateDocx} />
                </div>
                <p className="text-sm text-on-surface-variant">
                  Manage authoritative DOCX templates, rich-editor revisions, and legal activation.
                </p>
              </div>
            </Card>

            <div className="space-y-3">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => {
                    setSelectedTemplate(template);
                    setEditorHtml(template.editorDocument?.html || template.previewHtml || "");
                  }}
                  className={`w-full rounded-2xl border p-4 text-left shadow-sm transition ${
                    selectedTemplate?.id === template.id
                      ? "border-primary bg-surface-container-low"
                      : "border-outline-variant bg-surface hover:border-primary"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.08em] text-on-surface">{template.name}</p>
                      <p className="mt-2 text-xs text-on-surface-variant">Type: {template.type} | Ver: {template.version}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                      template.isLegalReviewed ? "bg-primary/10 text-primary" : "bg-orange-500/10 text-orange-600"
                    }`}>
                      {template.isLegalReviewed ? "Legal OK" : "Review Needed"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {selectedTemplate ? (
              <>
                <Card className="rounded-2xl border border-outline-variant bg-surface p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4">
                    <div>
                      <h2 className="ds-h2 font-semibold text-on-surface">{selectedTemplate.name}</h2>
                      <p className="mt-2 text-sm text-on-surface-variant">
                        Source: {selectedTemplate.sourceFileName || "DOCX"} | Stored DOCX: {selectedTemplate.sourceDocxPath || "N/A"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {isLegal && !selectedTemplate.isLegalReviewed ? (
                        <Button type="button" onClick={() => handleLegalApproveTemplate(selectedTemplate.id)}>
                          <FileCheck className="size-4" />
                          <span>Approve Legal</span>
                        </Button>
                      ) : null}
                      <Button type="button" variant="outline" onClick={handleSaveTemplateRevision} disabled={submitting}>
                        <Save className="size-4" />
                        <span>Save Revision</span>
                      </Button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_22rem]">
                    <div className="space-y-4">
                      <div className="ds-form-section space-y-3">
                        <h3 className="ds-h3 font-semibold text-on-surface">Rich Template Editor</h3>
                        <RichTemplateEditor
                          value={editorHtml}
                          variables={selectedTemplate.variables}
                          onChange={setEditorHtml}
                          onUploadImage={uploadEditorImage}
                        />
                      </div>

                      <div className="ds-form-section space-y-3">
                        <h3 className="ds-h3 font-semibold text-on-surface">Preview</h3>
                        <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-5">
                          <div className="prose max-w-none text-on-surface" dangerouslySetInnerHTML={{ __html: editorHtml }} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="ds-form-section space-y-3">
                        <h3 className="ds-h3 font-semibold text-on-surface">Template Fields</h3>
                        <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4">
                          <div className="space-y-3">
                            {selectedTemplate.fieldSchema.map((field) => (
                              <div key={field.key} className="rounded-xl border border-outline-variant bg-surface p-3">
                                <p className="text-sm font-medium text-on-surface">{field.label}</p>
                                <p className="mt-1 text-xs text-on-surface-variant">{field.key}</p>
                                <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-on-surface-variant">
                                  {field.inputType} | {field.defaultSource} | {field.required ? "required" : "optional"}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </>
            ) : (
              <Card className="rounded-2xl border border-dashed border-outline-variant bg-surface p-12 text-center text-on-surface-variant">
                <FilePenLine className="mx-auto mb-3 size-12 text-primary" />
                <p className="text-sm">Select a template to preview and edit it.</p>
              </Card>
            )}
          </div>
        </div>
      ) : null}

      {activeTab === "settings" && isHR ? (
        <form onSubmit={handleUpdateSettings} className="max-w-4xl rounded-2xl border border-outline-variant bg-surface p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4">
            <h2 className="ds-h2 font-semibold text-on-surface">Letter Settings</h2>
            <Button type="submit" disabled={submitting}>
              <Save className="size-4" />
              <span>Save Settings</span>
            </Button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              { key: "numberingPattern", label: "Numbering Pattern", type: "text" },
              { key: "probationDaysDefault", label: "Default Probation Days", type: "number" },
              { key: "noticePeriodDaysDefault", label: "Default Notice Days", type: "number" },
              { key: "letterValidityDaysDefault", label: "Letter Validity Days", type: "number" },
              { key: "legalJurisdiction", label: "Legal Jurisdiction", type: "text" },
              { key: "complianceVersion", label: "Compliance Version", type: "text" },
              { key: "signatoryName", label: "Signatory Name", type: "text" },
              { key: "signatoryDesignation", label: "Signatory Designation", type: "text" },
              { key: "signatorySignatureUrl", label: "Signatory Signature Path", type: "text" },
              { key: "companySealUrl", label: "Company Seal Path", type: "text" },
            ].map((field) => (
              <div key={field.key} className={`space-y-2 ${field.key === "companySealUrl" || field.key === "signatorySignatureUrl" ? "sm:col-span-2" : ""}`}>
                <label className="ds-label">{field.label}</label>
                <input
                  type={field.type}
                  value={(settingsForm as any)[field.key]}
                  onChange={(event) => setSettingsForm((current) => ({
                    ...current,
                    [field.key]: field.type === "number" ? Number(event.target.value) : event.target.value,
                  }))}
                  className="w-full text-sm"
                />
              </div>
            ))}

            <div className="space-y-2 sm:col-span-2">
              <label className="ds-label">Email Template</label>
              <textarea
                rows={4}
                value={settingsForm.emailTemplate}
                onChange={(event) => setSettingsForm((current) => ({ ...current, emailTemplate: event.target.value }))}
                className="w-full text-sm"
              />
            </div>
          </div>
        </form>
      ) : null}

      <Modal
        open={showPrepareModal}
        title="Prepare Letter"
        description="Choose the employee and letter format, then complete only the fields required for that DOCX template."
        onClose={() => setShowPrepareModal(false)}
        className="max-w-4xl"
      >
        <form onSubmit={handleCreateRequest} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="ds-label">Recipient Employee</label>
              <select
                value={wizardUserId}
                onChange={(event) => {
                  const value = event.target.value;
                  setWizardUserId(value);
                  setWizardDetails({});
                  if (value && wizardTemplateId) void loadTemplateDefaults(value, wizardTemplateId);
                }}
                required
                className="w-full text-sm"
              >
                <option value="">Choose employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.name} ({employee.email})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="ds-label">Letter Format</label>
              <select
                value={wizardTemplateId}
                onChange={(event) => {
                  const value = event.target.value;
                  setWizardTemplateId(value);
                  setWizardDetails({});
                  if (wizardUserId && value) void loadTemplateDefaults(wizardUserId, value);
                }}
                required
                className="w-full text-sm"
              >
                <option value="">Choose format</option>
                {templates.filter((template) => template.isActive).map((template) => (
                  <option key={template.id} value={template.id}>{template.name} (v{template.version})</option>
                ))}
              </select>
            </div>
          </div>

          {wizardLoading ? (
            <div className="flex min-h-[10rem] items-center justify-center rounded-2xl border border-outline-variant bg-surface-container-low">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : activeTemplate ? (
            <div className="ds-form-section space-y-4">
              <h3 className="ds-h3 font-semibold text-on-surface">Template Details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {activeTemplate.fieldSchema.map((field) => (
                  <div key={field.key} className={`space-y-2 ${field.inputType === "textarea" ? "sm:col-span-2" : ""}`}>
                    <label className="ds-label">{field.label}</label>
                    {field.inputType === "textarea" ? (
                      <textarea
                        rows={4}
                        required={field.required}
                        readOnly={field.readOnly}
                        value={wizardDetails[field.key] || ""}
                        onChange={(event) => setWizardDetails((current) => ({ ...current, [field.key]: event.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full text-sm"
                      />
                    ) : (
                      <input
                        type={field.inputType === "currency" ? "text" : field.inputType}
                        required={field.required}
                        readOnly={field.readOnly}
                        value={wizardDetails[field.key] || ""}
                        onChange={(event) => setWizardDetails((current) => ({ ...current, [field.key]: event.target.value }))}
                        placeholder={field.placeholder}
                        className={`w-full text-sm ${field.inputType === "currency" ? "ds-numeric" : ""}`}
                      />
                    )}
                    {field.helpText ? <p className="text-xs text-on-surface-variant">{field.helpText}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-3 border-t border-outline-variant pt-4">
            <Button type="button" variant="outline" onClick={() => setShowPrepareModal(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting || !wizardUserId || !wizardTemplateId}>
              {submitting ? "Creating..." : "Create Draft"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showViewModal && !!selectedRequest}
        title={selectedRequest ? `Review ${selectedRequest.letterNumber}` : "Review Letter"}
        description={selectedRequest ? `${selectedRequest.user.name} | ${selectedRequest.status.replace(/_/g, " ")}` : ""}
        onClose={() => setShowViewModal(false)}
        className="max-w-5xl"
      >
        {selectedRequest ? (
          <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
            <div className="space-y-4">
              <Card className="rounded-2xl border border-outline-variant bg-surface-container-low p-4">
                <h3 className="ds-h3 font-semibold text-on-surface">Field Values</h3>
                <div className="mt-4 space-y-3">
                  {Object.entries(selectedRequest.details || {}).map(([key, value]) => (
                    <div key={key} className="rounded-xl border border-outline-variant bg-surface p-3">
                      <p className="ds-label">{key.replace(/_/g, " ")}</p>
                      <p className="mt-2 text-sm text-on-surface break-words">{String(value || "N/A")}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="space-y-4">
              {selectedRequest.pdfPath ? (
                <iframe src={`/${selectedRequest.pdfPath}`} className="h-[34rem] w-full rounded-2xl border border-outline-variant bg-surface" title="Letter preview" />
              ) : (
                <Card className="rounded-2xl border border-dashed border-outline-variant bg-surface p-12 text-center text-on-surface-variant">
                  <AlertTriangle className="mx-auto mb-3 size-10 text-orange-600" />
                  <p className="text-sm">This draft has not been issued yet, so the final PDF is not available.</p>
                </Card>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                {isHR && selectedRequest.status === "HR_REVIEW" ? <Button type="button" onClick={() => handleWorkflowTransition(selectedRequest.id, "HR_APPROVE")}>Approve HR</Button> : null}
                {isLegal && selectedRequest.status === "LEGAL_REVIEW" ? <Button type="button" onClick={() => handleWorkflowTransition(selectedRequest.id, "LEGAL_APPROVE")}>Approve Legal</Button> : null}
                {isManagement && selectedRequest.status === "MGMT_APPROVAL" ? <Button type="button" onClick={() => handleWorkflowTransition(selectedRequest.id, "MGMT_APPROVE")}>Approve Mgmt</Button> : null}
                {isHR && selectedRequest.status === "READY_TO_ISSUE" ? <Button type="button" onClick={() => handleWorkflowTransition(selectedRequest.id, "ISSUE")}>Issue</Button> : null}
                {(selectedRequest.status === "ISSUED" || selectedRequest.status === "ACCEPTED") && selectedRequest.pdfPath ? (
                  <>
                    <a href={`/${selectedRequest.pdfPath}`} download className="inline-flex">
                      <Button type="button" variant="outline">
                        <Save className="size-4" />
                        <span>Download PDF</span>
                      </Button>
                    </a>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        try {
                          const response = await fetch("/api/hrms/letters/share-mail", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ letterRequestId: selectedRequest.id }),
                          });
                          const json = await response.json();
                          if (!json.ok) throw new Error(json.error?.message || json.error || "Failed to prepare email");
                          // Open communication module mail composer
                          window.open(json.data.composerLink, "_blank");
                          toast.success("Opening mail composer...");
                        } catch (error: any) {
                          toast.error(error.message || "Failed to share via mail");
                        }
                      }}
                    >
                      <Send className="size-4" />
                      <span>Share via Mail</span>
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
