"use client";

import {
  PeopleControlInput as MnxInput,
  PeopleControlTextarea as MnxTextarea,
} from "@/modules/people/components";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import React, { useCallback, useEffect, useRef, useState } from "react";
import DOMPurify from "isomorphic-dompurify";
import {
  Bold,
  ChevronDown,
  CheckCircle2,
  Eye,
  FileCheck,
  Heading1,
  FilePenLine,
  ImagePlus,
  Italic as ItalicIcon,
  List,
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
import { NativeSelect } from "@/components/ui/native-select";
import {
  WorkspaceAction,
  WorkspaceAlert,
  WorkspaceBadge,
  WorkspaceEmptyTableRow,
  WorkspacePage,
  WorkspacePanel,
  WorkspacePanelHeader,
  WorkspaceTable,
} from "@/components/layout/workspace";
import { LetterDocumentPreviewSurface } from "@/modules/hrms/components/letter-document-preview-surface";

type TemplateField = {
  key: string;
  label: string;
  inputType:
    | "text"
    | "textarea"
    | "date"
    | "number"
    | "currency"
    | "email"
    | "select"
    | "image";
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

function escapePreviewValue(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderDraftPreviewHtml({
  template,
  details,
  settings,
}: {
  template: TemplateRecord | null;
  details: Record<string, unknown>;
  settings: {
    signatoryName: string;
    signatoryDesignation: string;
    signatorySignatureUrl: string;
    companySealUrl: string;
  };
}) {
  if (!template) return "";

  const sourceHtml =
    template.editorDocument?.html || template.previewHtml || template.content;
  const mergedValues: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(details || {}).map(([key, value]) => [key, String(value ?? "")]),
    ),
    authorised_signatory_name:
      String(details.authorised_signatory_name ?? settings.signatoryName ?? ""),
    authorised_signatory_designation: String(
      details.authorised_signatory_designation ??
        settings.signatoryDesignation ??
        "",
    ),
    authorised_signatory_signature: String(
      details.authorised_signatory_signature ??
        settings.signatorySignatureUrl ??
        "",
    ),
    company_seal: String(details.company_seal ?? settings.companySealUrl ?? ""),
  };

  return sourceHtml.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key: string) => {
    const field = template.fieldSchema.find((item) => item.key === key);
    const value = mergedValues[key] ?? "";

    if (!value) {
      return '<span class="rounded bg-mono-soft px-1 py-0.5 text-mono-muted">________</span>';
    }

    if (
      field?.inputType === "image" ||
      key === "authorised_signatory_signature" ||
      key === "company_seal" ||
      key === "employee_signature"
    ) {
      const normalized = value.startsWith("/") ? value : `/${value}`;
      return `<img src="${escapePreviewValue(normalized)}" alt="${escapePreviewValue(
        field?.label || key,
      )}" style="display:inline-block;max-height:88px;max-width:220px;vertical-align:middle;" />`;
    }

    return escapePreviewValue(value).replace(/\n/g, "<br />");
  });
}

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
  const savedRangeRef = useRef<Range | null>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return;
    const range = selection.getRangeAt(0);
    if (editorRef.current.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection) return;
    if (savedRangeRef.current) {
      selection.removeAllRanges();
      selection.addRange(savedRangeRef.current);
    }
  }, []);

  const syncValue = () => {
    onChange(editorRef.current?.innerHTML ?? "");
  };

  const runCommand = (command: string, commandValue?: string) => {
    restoreSelection();
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    saveSelection();
    syncValue();
  };

  const handleToolbarMouseDown = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    restoreSelection();
  };

  const insertPlaceholder = () => {
    const choice = window.prompt(
      "Enter placeholder key to insert",
      variables[0] ?? "employee_name",
    );
    if (!choice) return;
    runCommand("insertText", `{{${choice}}}`);
  };

  const handleImageSelection = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
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
      <div className="overflow-hidden rounded-[24px] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,247,242,0.98))] shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-center gap-2 bg-[linear-gradient(180deg,rgba(248,244,236,0.88),rgba(243,238,229,0.78))] px-4 py-3">
          <button
            type="button"
            className="inline-flex min-w-[2.75rem] items-center justify-center gap-2 rounded-xl border border-mono-border/55 bg-white/96 px-3 py-2 text-xs font-semibold text-mono-text shadow-[0_6px_16px_rgba(15,23,42,0.05)] transition hover:border-primary/35 hover:bg-[rgba(255,248,220,0.9)]"
            onMouseDown={handleToolbarMouseDown}
            onClick={() => runCommand("bold")}
            aria-label="Bold"
            title="Bold"
          >
            <Bold className="size-4" />
          </button>
          <button
            type="button"
            className="inline-flex min-w-[2.75rem] items-center justify-center gap-2 rounded-xl border border-mono-border/55 bg-white/96 px-3 py-2 text-xs font-semibold text-mono-text shadow-[0_6px_16px_rgba(15,23,42,0.05)] transition hover:border-primary/35 hover:bg-[rgba(255,248,220,0.9)]"
            onMouseDown={handleToolbarMouseDown}
            onClick={() => runCommand("italic")}
            aria-label="Italic"
            title="Italic"
          >
            <ItalicIcon className="size-4" />
          </button>
          <button
            type="button"
            className="inline-flex min-w-[2.75rem] items-center justify-center gap-2 rounded-xl border border-mono-border/55 bg-white/96 px-3 py-2 text-xs font-semibold text-mono-text shadow-[0_6px_16px_rgba(15,23,42,0.05)] transition hover:border-primary/35 hover:bg-[rgba(255,248,220,0.9)]"
            onMouseDown={handleToolbarMouseDown}
            onClick={() => runCommand("formatBlock", "h2")}
            aria-label="Heading"
            title="Heading"
          >
            <Heading1 className="size-4" />
          </button>
          <button
            type="button"
            className="inline-flex min-w-[2.75rem] items-center justify-center gap-2 rounded-xl border border-mono-border/55 bg-white/96 px-3 py-2 text-xs font-semibold text-mono-text shadow-[0_6px_16px_rgba(15,23,42,0.05)] transition hover:border-primary/35 hover:bg-[rgba(255,248,220,0.9)]"
            onMouseDown={handleToolbarMouseDown}
            onClick={() => runCommand("insertUnorderedList")}
            aria-label="Bullets"
            title="Bullets"
          >
            <List className="size-4" />
          </button>
          <div className="mx-1 hidden h-7 w-px bg-mono-border/45 sm:block" />
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-mono-border/55 bg-white/96 px-4 py-2 text-xs font-semibold text-mono-text shadow-[0_6px_16px_rgba(15,23,42,0.05)] transition hover:border-primary/35 hover:bg-[rgba(255,248,220,0.9)]"
            onMouseDown={handleToolbarMouseDown}
            onClick={insertPlaceholder}
            title="Insert placeholder"
          >
            <span className="rounded-md bg-mono-soft px-1.5 py-0.5 font-mono text-[10px] leading-none">
              {`{{ }}`}
            </span>
            <span>Placeholder</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-mono-border/55 bg-white/96 px-4 py-2 text-xs font-semibold text-mono-text shadow-[0_6px_16px_rgba(15,23,42,0.05)] transition hover:border-primary/35 hover:bg-[rgba(255,248,220,0.9)]"
            onMouseDown={handleToolbarMouseDown}
            onClick={() => imageInputRef.current?.click()}
            title="Insert image"
          >
            <ImagePlus className="size-4" />
            <span>Image</span>
          </button>
          <MnxInput
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelection}
          />
        </div>

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
          onBlur={saveSelection}
          onInput={syncValue}
          className="min-h-[34rem] bg-white px-5 py-5 text-sm leading-7 text-mono-text outline-none"
        />
      </div>
    </div>
  );
}

export function LettersView() {
  const [activeTab, setActiveTab] = useState<
    "register" | "inbox" | "templates" | "settings"
  >("register");
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPrepareModal, setShowPrepareModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateRecord | null>(null);
  const [editorHtml, setEditorHtml] = useState("");
  const [wizardUserId, setWizardUserId] = useState("");
  const [wizardTemplateId, setWizardTemplateId] = useState("");
  const [wizardDetails, setWizardDetails] = useState<Record<string, string>>(
    {},
  );
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
    emailTemplate: "",
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

      const [meJson, reqJson, tempJson, empJson, settingsJson] =
        await Promise.all([
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
          setEditorHtml(
            (current) =>
              current ||
              tempJson.data[0].editorDocument?.html ||
              tempJson.data[0].previewHtml ||
              "",
          );
        }
      }
      if (empJson.ok) setEmployees(empJson.data);
      if (settingsJson.ok && settingsJson.data) {
        setSettingsForm({
          numberingPattern: settingsJson.data.numberingPattern || "",
          probationDaysDefault: settingsJson.data.probationDaysDefault || 90,
          noticePeriodDaysDefault:
            settingsJson.data.noticePeriodDaysDefault || 30,
          letterValidityDaysDefault:
            settingsJson.data.letterValidityDaysDefault || 7,
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

  const isHR =
    userPermissions.includes("hrms.letters.settings") ||
    userPermissions.includes("hrms.letters.manage");
  const isLegal = userPermissions.includes("hrms.letters.legal_review");
  const isManagement = userPermissions.includes("hrms.letters.mgmt_approve");

  const inboxRequests = requests.filter(
    (request) =>
      (isHR && request.status === "HR_REVIEW") ||
      (isLegal && request.status === "LEGAL_REVIEW") ||
      (isManagement && request.status === "MGMT_APPROVAL") ||
      (isHR && request.status === "READY_TO_ISSUE"),
  );

  const activeTemplate =
    templates.find((template) => template.id === wizardTemplateId) ||
    selectedTemplate;
  const selectedRequestTemplate = selectedRequest
    ? templates.find((template) => template.id === selectedRequest.templateId) ||
      null
    : null;
  const selectedRequestPreviewHtml = selectedRequest
    ? renderDraftPreviewHtml({
        template: selectedRequestTemplate,
        details: selectedRequest.details || {},
        settings: {
          signatoryName: settingsForm.signatoryName,
          signatoryDesignation: settingsForm.signatoryDesignation,
          signatorySignatureUrl: settingsForm.signatorySignatureUrl,
          companySealUrl: settingsForm.companySealUrl,
        },
      })
    : "";

  const getStatusVariant = (
    status: string,
  ): "accent" | "neutral" | "success" | "warning" | "danger" => {
    if (status === "ISSUED" || status === "ACCEPTED") return "success";
    if (status === "READY_TO_ISSUE") return "accent";
    if (status === "DRAFT") return "neutral";
    if (status.includes("REVIEW") || status.includes("APPROVAL")) return "warning";
    return "danger";
  };

  const loadTemplateDefaults = async (userId: string, templateId: string) => {
    if (!userId || !templateId) return;
    setWizardLoading(true);
    try {
      const response = await fetch(
        `/api/hrms/letters?type=prepopulate&userId=${userId}&templateId=${templateId}`,
      );
      const json = await response.json();
      if (!json.ok)
        throw new Error(json.error?.message || "Failed to load defaults");
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
      if (!json.ok)
        throw new Error(json.error?.message || "Failed to create draft");

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

  const handleWorkflowTransition = async (
    requestId: string,
    action: string,
    notes?: string,
  ) => {
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
      const response = await fetch(`/api/hrms/letters/${requestId}`, {
        method: "DELETE",
      });
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
      if (!json.ok)
        throw new Error(json.error?.message || "Failed to save template");
      toast.success("Template revision saved. Legal review reset.");
      await fetchData();
      const refreshed = json.data;
      setSelectedTemplate(refreshed);
      setEditorHtml(
        refreshed.editorDocument?.html || refreshed.previewHtml || "",
      );
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

  const handleUploadTemplateDocx = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setTemplateUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/hrms/letters/templates/upload", {
        method: "POST",
        body: formData,
      });
      const json = await response.json();
      if (!json.ok)
        throw new Error(json.error?.message || "Template upload failed");
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
    const response = await fetch("/api/hrms/letters/assets/upload", {
      method: "POST",
      body: formData,
    });
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
      if (!json.ok)
        throw new Error(json.error?.message || "Failed to save settings");
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
      <div className="flex min-h-[24rem] flex-col items-center justify-center gap-3 text-mono-muted">
        <Loader2 className="size-8 animate-spin text-mono-accent" />
        <p className="mnx-dashboard-spec-label">Loading HR Letters</p>
      </div>
    );
  }

  return (
    <WorkspacePage className="space-y-6">
      <WorkspacePanel className="overflow-hidden border-transparent bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(255,248,220,0.88))] shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-5 px-6 py-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-[rgba(255,214,10,0.14)] text-mono-text">
                <Mail className="size-5" />
              </span>
              <div className="space-y-1">
                <p className="mnx-dashboard-spec-label">Documents</p>
                <h1 className="text-[2rem] font-semibold tracking-[-0.03em] text-mono-text">
                  HR Letters &amp; Contracts
                </h1>
              </div>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-mono-muted">
              DOCX-backed templates, guided drafting, structured approvals, and
              in-app document review in one workspace.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isHR ? (
              <WorkspaceAction
                onClick={() => setShowPrepareModal(true)}
                className="rounded-2xl px-5 text-sm font-semibold normal-case"
              >
                <Plus className="size-4" />
                <span>Prepare Letter</span>
              </WorkspaceAction>
            ) : null}
            <WorkspaceAction
              variant="outline"
              onClick={fetchData}
              className="rounded-2xl px-5 text-sm font-semibold normal-case"
            >
              <RefreshCw className="size-4" />
              <span>Refresh</span>
            </WorkspaceAction>
          </div>
        </div>
      </WorkspacePanel>

      <WorkspacePanel className="space-y-4 border-transparent p-6 shadow-none">
        <div className="space-y-2">
          <p className="mnx-dashboard-spec-label">Workspace views</p>
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-mono-text">
            Letters workflow
          </h2>
          <p className="text-sm leading-6 text-mono-muted">
            Switch between the live registry, approval queue, template library,
            and signatory controls.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {TABS.filter((tab) =>
            tab.key === "templates" || tab.key === "settings" ? isHR : true,
          ).map((tab) => (
            <WorkspaceAction
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              size="compact"
              variant={activeTab === tab.key ? "accent" : "outline"}
              className="rounded-2xl px-5 text-sm font-semibold normal-case"
            >
              {tab.label}
            </WorkspaceAction>
          ))}
        </div>
      </WorkspacePanel>

      {activeTab === "register" ? (
        <WorkspacePanel className="overflow-hidden">
          <WorkspacePanelHeader
            eyebrow="Registry"
            title="Letter registry"
            description="Review every letter request, its workflow state, and the related employee record."
          />
          <WorkspaceTable scrollLabel="HR letters registry">
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
                  <WorkspaceEmptyTableRow colSpan={6}>
                    <div className="py-10 text-center text-sm text-mono-muted">
                      No letters generated yet.
                    </div>
                  </WorkspaceEmptyTableRow>
                ) : (
                  requests.map((request) => {
                    const template = templates.find(
                      (item) => item.id === request.templateId,
                    );
                    return (
                      <tr key={request.id}>
                        <td className="px-6 py-4 font-medium text-mono-text">
                          {request.user.name}
                        </td>
                        <td className="px-6 py-4 text-mono-text">
                          {template?.name || "Letter"}
                        </td>
                        <td className="px-6 py-4 mnx-numeric">
                          {request.letterNumber}
                        </td>
                        <td className="px-6 py-4 text-mono-muted">
                          {new Date(request.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <WorkspaceBadge variant={getStatusVariant(request.status)}>
                            {request.status.replace(/_/g, " ")}
                          </WorkspaceBadge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <WorkspaceAction
                              size="compact"
                              variant="outline"
                              className="min-w-0 rounded-xl px-0"
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowViewModal(true);
                              }}
                            >
                              <Eye className="size-4" />
                            </WorkspaceAction>
                            {isHR && request.status === "DRAFT" ? (
                              <WorkspaceAction
                                size="compact"
                                variant="outline"
                                className="rounded-xl"
                                onClick={() =>
                                  handleWorkflowTransition(
                                    request.id,
                                    "SUBMIT",
                                  )
                                }
                              >
                                Submit for Review
                              </WorkspaceAction>
                            ) : null}
                            {request.status === "ISSUED" ? (
                              <a
                                href={`/verify/${request.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex"
                              >
                                <WorkspaceAction
                                  size="compact"
                                  variant="outline"
                                  className="min-w-0 rounded-xl px-0"
                                >
                                  <Shield className="size-4" />
                                </WorkspaceAction>
                              </a>
                            ) : null}
                            {isHR && request.status === "DRAFT" ? (
                              <WorkspaceAction
                                size="compact"
                                variant="outline"
                                className="min-w-0 rounded-xl px-0"
                                onClick={() => handleDeleteRequest(request.id)}
                              >
                                <Trash className="size-4" />
                              </WorkspaceAction>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </WorkspaceTable>
        </WorkspacePanel>
      ) : null}

      {activeTab === "inbox" ? (
        <div className="space-y-4">
          {inboxRequests.length === 0 ? (
            <WorkspaceAlert
              variant="success"
              className="items-center justify-center p-10 text-center"
            >
              <CheckCircle2 className="size-10 text-mono-accent" />
              <p className="text-sm">
                No letters are waiting for your approval.
              </p>
            </WorkspaceAlert>
          ) : (
            inboxRequests.map((request) => {
              const template = templates.find(
                (item) => item.id === request.templateId,
              );
              return (
                <Card
                  key={request.id}
                  className="mnx-panel mnx-accent-edge rounded-2xl border border-mono-border bg-mono-card p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-2">
                      <p className="text-base font-semibold uppercase tracking-[0.05em] text-mono-text">
                        {template?.name} for {request.user.name}
                      </p>
                      <p className="font-sans text-sm text-mono-muted">
                        Stage: {request.status.replace(/_/g, " ")} | Created:{" "}
                        {new Date(request.createdAt).toLocaleString()}
                      </p>
                      <WorkspaceBadge variant={getStatusVariant(request.status)}>
                        {request.status.replace(/_/g, " ")}
                      </WorkspaceBadge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowViewModal(true);
                        }}
                      >
                        Review
                      </Button>
                      {isHR && request.status === "HR_REVIEW" ? (
                        <Button
                          type="button"
                          onClick={() =>
                            handleWorkflowTransition(request.id, "HR_APPROVE")
                          }
                        >
                          Approve HR
                        </Button>
                      ) : null}
                      {isLegal && request.status === "LEGAL_REVIEW" ? (
                        <Button
                          type="button"
                          onClick={() =>
                            handleWorkflowTransition(
                              request.id,
                              "LEGAL_APPROVE",
                            )
                          }
                        >
                          Approve Legal
                        </Button>
                      ) : null}
                      {isManagement && request.status === "MGMT_APPROVAL" ? (
                        <Button
                          type="button"
                          onClick={() =>
                            handleWorkflowTransition(request.id, "MGMT_APPROVE")
                          }
                        >
                          Approve Mgmt
                        </Button>
                      ) : null}
                      {isHR && request.status === "READY_TO_ISSUE" ? (
                        <Button
                          type="button"
                          onClick={() =>
                            handleWorkflowTransition(request.id, "ISSUE")
                          }
                        >
                          <Send className="size-4" />
                          <span>Issue Document</span>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      ) : null}

      {activeTab === "templates" && isHR ? (
        <div className="space-y-6">
          <WorkspacePanel className="overflow-hidden border-transparent shadow-none">
            <div className="space-y-2 px-5 py-5">
              <p className="mnx-dashboard-spec-label">Template controls</p>
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-mono-text">
                Template selector
              </h2>
              <p className="text-sm leading-6 text-mono-muted">
                Choose the template you want to edit, and manage source-file
                actions alongside it.
              </p>
            </div>
            <div className="grid gap-4 px-5 pb-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
              <div className="space-y-2">
                <label className="mnx-dashboard-spec-label">
                  Active template
                </label>
                <NativeSelect
                  value={selectedTemplate?.id || ""}
                  onChange={(event) => {
                    const nextTemplate =
                      templates.find((item) => item.id === event.target.value) ||
                      null;
                    setSelectedTemplate(nextTemplate);
                    setEditorHtml(
                      nextTemplate?.editorDocument?.html ||
                        nextTemplate?.previewHtml ||
                        "",
                    );
                  }}
                  className="w-full font-sans text-sm"
                >
                  <option value="">Choose template</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} | v{template.version} |{" "}
                      {template.isLegalReviewed ? "Legal OK" : "Review needed"}
                    </option>
                  ))}
                </NativeSelect>
              </div>

              <div className="rounded-[22px] border border-mono-border/70 bg-mono-card px-4 py-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-mono-text">
                    Source DOCX actions
                  </p>
                  <p className="text-xs leading-5 text-mono-muted">
                    Manage the authoritative DOCX files used for template
                    revisions, legal approval, and issue-time generation.
                  </p>
                </div>
                <div className="mt-4 grid gap-2">
                  <WorkspaceAction
                    onClick={handleImportBundledTemplates}
                    disabled={submitting}
                    className="rounded-xl"
                  >
                    <WandSparkles className="size-4" />
                    <span>Import bundled DOCX</span>
                  </WorkspaceAction>
                  <WorkspaceAction
                    variant="outline"
                    onClick={() => templateUploadInputRef.current?.click()}
                    disabled={templateUploading}
                    className="rounded-xl"
                  >
                    <Upload className="size-4" />
                    <span>
                      {templateUploading ? "Uploading..." : "Upload template"}
                    </span>
                  </WorkspaceAction>
                  <MnxInput
                    ref={templateUploadInputRef}
                    type="file"
                    accept=".docx"
                    className="hidden"
                    onChange={handleUploadTemplateDocx}
                  />
                </div>
                <WorkspaceAlert variant="info" className="mt-4 font-sans text-sm">
                  Template revisions, legal approval, and issue-time generation
                  all use these DOCX sources.
                </WorkspaceAlert>
              </div>
            </div>
          </WorkspacePanel>

          <div className="space-y-6">
            {selectedTemplate ? (
              <div className="space-y-5">
                <WorkspacePanel className="overflow-hidden border-transparent">
                  <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-5">
                    <div className="space-y-2">
                      <p className="mnx-dashboard-spec-label">Active template</p>
                      <h2 className="text-2xl font-semibold text-mono-text">
                        {selectedTemplate.name}
                      </h2>
                      <p className="text-sm text-mono-muted">
                        Source file: {selectedTemplate.sourceFileName || "DOCX"}
                        {selectedTemplate.sourceDocxPath
                          ? ` • Stored at ${selectedTemplate.sourceDocxPath}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <WorkspaceBadge
                        variant={
                          selectedTemplate.isLegalReviewed
                            ? "success"
                            : "warning"
                        }
                      >
                        {selectedTemplate.isLegalReviewed
                          ? "Legal approved"
                          : "Needs legal review"}
                      </WorkspaceBadge>
                      {isLegal && !selectedTemplate.isLegalReviewed ? (
                        <WorkspaceAction
                          className="rounded-xl"
                          onClick={() =>
                            handleLegalApproveTemplate(selectedTemplate.id)
                          }
                        >
                          <FileCheck className="size-4" />
                          <span>Approve legal</span>
                        </WorkspaceAction>
                      ) : null}
                      <WorkspaceAction
                        variant="outline"
                        className="rounded-xl"
                        onClick={handleSaveTemplateRevision}
                        disabled={submitting}
                      >
                        <Save className="size-4" />
                        <span>Save revision</span>
                      </WorkspaceAction>
                    </div>
                  </div>

                  <div className="space-y-5 px-3 pb-5">
                    <div className="pt-1">
                      <RichTemplateEditor
                        value={editorHtml}
                        variables={selectedTemplate.variables}
                        onChange={setEditorHtml}
                        onUploadImage={uploadEditorImage}
                      />
                    </div>

                    <details className="rounded-[22px] border border-mono-border/70 bg-mono-card px-4 py-3">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-mono-text">
                            Template fields
                          </p>
                          <p className="mt-1 text-xs text-mono-muted">
                            Expand only when you need placeholder metadata.
                          </p>
                        </div>
                        <ChevronDown className="size-4 text-mono-muted" />
                      </summary>
                      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {selectedTemplate.fieldSchema.map((field) => (
                          <div
                            key={field.key}
                            className="rounded-[20px] bg-white px-4 py-4 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.12)]"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-mono-text">
                                  {field.label}
                                </p>
                                <p className="mt-1 text-xs text-mono-muted">
                                  {field.key}
                                </p>
                              </div>
                              <WorkspaceBadge
                                variant={
                                  field.required ? "accent" : "neutral"
                                }
                              >
                                {field.required ? "Required" : "Optional"}
                              </WorkspaceBadge>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.12em] text-mono-muted">
                              <span className="rounded-full bg-mono-soft px-2.5 py-1">
                                {field.inputType}
                              </span>
                              <span className="rounded-full bg-mono-soft px-2.5 py-1">
                                {field.defaultSource}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>

                    <WorkspacePanel className="overflow-hidden border-0 bg-[linear-gradient(180deg,rgba(251,247,239,0.95),rgba(255,255,255,1))] shadow-none">
                      <WorkspacePanelHeader
                        eyebrow="Live layout"
                        title="Rendered preview"
                        description="Review the current template structure before you save a new revision."
                      />
                      <div className="px-5 pb-5">
                        <div className="rounded-[24px] bg-white p-8 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.12),0_24px_60px_rgba(15,23,42,0.08)]">
                          <div
                            className="prose max-w-none text-mono-text"
                            dangerouslySetInnerHTML={{
                              __html: DOMPurify.sanitize(editorHtml),
                            }}
                          />
                        </div>
                      </div>
                    </WorkspacePanel>
                  </div>
                </WorkspacePanel>
              </div>
            ) : (
              <WorkspacePanel className="border-dashed p-12 text-center text-mono-muted">
                <FilePenLine className="mx-auto mb-3 size-12 text-mono-accent" />
                <p className="text-sm">
                  Select a template to preview and edit it.
                </p>
              </WorkspacePanel>
            )}
          </div>
        </div>
      ) : null}

      {activeTab === "settings" && isHR ? (
        <form
          onSubmit={handleUpdateSettings}
          className="max-w-4xl rounded-2xl border border-mono-border bg-mono-card p-6 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mono-border pb-4">
            <h2 className="mnx-title-2 font-semibold text-mono-text">
              Letter Settings
            </h2>
            <Button type="submit" disabled={submitting}>
              <Save className="size-4" />
              <span>Save Settings</span>
            </Button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              {
                key: "numberingPattern",
                label: "Numbering Pattern",
                type: "text",
              },
              {
                key: "probationDaysDefault",
                label: "Default Probation Days",
                type: "number",
              },
              {
                key: "noticePeriodDaysDefault",
                label: "Default Notice Days",
                type: "number",
              },
              {
                key: "letterValidityDaysDefault",
                label: "Letter Validity Days",
                type: "number",
              },
              {
                key: "legalJurisdiction",
                label: "Legal Jurisdiction",
                type: "text",
              },
              {
                key: "complianceVersion",
                label: "Compliance Version",
                type: "text",
              },
              { key: "signatoryName", label: "Signatory Name", type: "text" },
              {
                key: "signatoryDesignation",
                label: "Signatory Designation",
                type: "text",
              },
              {
                key: "signatorySignatureUrl",
                label: "Signatory Signature Path",
                type: "text",
              },
              {
                key: "companySealUrl",
                label: "Company Seal Path",
                type: "text",
              },
            ].map((field) => (
              <div
                key={field.key}
                className={`space-y-2 ${field.key === "companySealUrl" || field.key === "signatorySignatureUrl" ? "sm:col-span-2" : ""}`}
              >
                <label className="mnx-dashboard-spec-label">
                  {field.label}
                </label>
                <MnxInput
                  type={field.type}
                  value={(settingsForm as any)[field.key]}
                  onChange={(event) =>
                    setSettingsForm((current) => ({
                      ...current,
                      [field.key]:
                        field.type === "number"
                          ? Number(event.target.value)
                          : event.target.value,
                    }))
                  }
                  className="w-full text-sm"
                />
              </div>
            ))}

            <div className="space-y-2 sm:col-span-2">
              <label className="mnx-dashboard-spec-label">Email Template</label>
              <MnxTextarea
                rows={4}
                value={settingsForm.emailTemplate}
                onChange={(event) =>
                  setSettingsForm((current) => ({
                    ...current,
                    emailTemplate: event.target.value,
                  }))
                }
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
              <label className="mnx-dashboard-spec-label">
                Recipient Employee
              </label>
              <NativeSelect
                value={wizardUserId}
                onChange={(event) => {
                  const value = event.target.value;
                  setWizardUserId(value);
                  setWizardDetails({});
                  if (value && wizardTemplateId)
                    void loadTemplateDefaults(value, wizardTemplateId);
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
              <label className="mnx-dashboard-spec-label">Letter Format</label>
              <NativeSelect
                value={wizardTemplateId}
                onChange={(event) => {
                  const value = event.target.value;
                  setWizardTemplateId(value);
                  setWizardDetails({});
                  if (wizardUserId && value)
                    void loadTemplateDefaults(wizardUserId, value);
                }}
                required
                className="w-full text-sm"
              >
                <option value="">Choose format</option>
                {templates
                  .filter((template) => template.isActive)
                  .map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} (v{template.version})
                    </option>
                  ))}
              </NativeSelect>
            </div>
          </div>

          {wizardLoading ? (
            <div className="flex min-h-[10rem] items-center justify-center rounded-2xl border border-mono-border bg-mono-soft">
              <Loader2 className="size-6 animate-spin text-mono-accent" />
            </div>
          ) : activeTemplate ? (
            <div className="mnx-form-section space-y-4">
              <h3 className="mnx-title-3 font-semibold text-mono-text">
                Template Details
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {activeTemplate.fieldSchema.map((field) => (
                  <div
                    key={field.key}
                    className={`space-y-2 ${field.inputType === "textarea" ? "sm:col-span-2" : ""}`}
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
                      <p className="text-xs text-mono-muted">
                        {field.helpText}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-3 border-t border-mono-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPrepareModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !wizardUserId || !wizardTemplateId}
            >
              {submitting ? "Creating..." : "Create Draft"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showViewModal && !!selectedRequest}
        title={
          selectedRequest
            ? `Review ${selectedRequest.letterNumber}`
            : "Review Letter"
        }
        description={
          selectedRequest
            ? `${selectedRequest.user.name} | ${selectedRequest.status.replace(/_/g, " ")}`
            : ""
        }
        onClose={() => setShowViewModal(false)}
        size="workspace"
      >
        {selectedRequest ? (
          <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
            <div className="space-y-4">
              <Card className="rounded-2xl border border-mono-border bg-mono-soft p-4">
                <h3 className="mnx-title-3 font-semibold text-mono-text">
                  Field Values
                </h3>
                <div className="mt-4 space-y-3">
                  {Object.entries(selectedRequest.details || {}).map(
                    ([key, value]) => (
                      <div
                        key={key}
                        className="rounded-xl border border-mono-border bg-mono-card p-3"
                      >
                        <p className="mnx-dashboard-spec-label">
                          {key.replace(/_/g, " ")}
                        </p>
                        <p className="mt-2 text-sm text-mono-text break-words">
                          {String(value || "N/A")}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </Card>
            </div>

            <div className="space-y-4">
              <LetterDocumentPreviewSurface
                title={
                  selectedRequest.pdfPath
                    ? "Issued document"
                    : "Draft preview"
                }
                description={
                  selectedRequest.pdfPath
                    ? "The embedded browser PDF viewer is shown directly here for print, open, and download actions."
                    : "This rendered draft preview is visible before issue so the letter can be read and approved."
                }
                pdfPath={selectedRequest.pdfPath || null}
                htmlPreview={
                  selectedRequest.pdfPath ? null : selectedRequestPreviewHtml
                }
                downloadPath={selectedRequest.pdfPath || null}
              />

              <div className="flex flex-wrap justify-end gap-2">
                {isHR && selectedRequest.status === "DRAFT" ? (
                  <Button
                    type="button"
                    onClick={() =>
                      handleWorkflowTransition(selectedRequest.id, "SUBMIT")
                    }
                  >
                    Submit for Review
                  </Button>
                ) : null}
                {isHR && selectedRequest.status === "HR_REVIEW" ? (
                  <Button
                    type="button"
                    onClick={() =>
                      handleWorkflowTransition(selectedRequest.id, "HR_APPROVE")
                    }
                  >
                    Approve HR
                  </Button>
                ) : null}
                {isLegal && selectedRequest.status === "LEGAL_REVIEW" ? (
                  <Button
                    type="button"
                    onClick={() =>
                      handleWorkflowTransition(
                        selectedRequest.id,
                        "LEGAL_APPROVE",
                      )
                    }
                  >
                    Approve Legal
                  </Button>
                ) : null}
                {isManagement && selectedRequest.status === "MGMT_APPROVAL" ? (
                  <Button
                    type="button"
                    onClick={() =>
                      handleWorkflowTransition(
                        selectedRequest.id,
                        "MGMT_APPROVE",
                      )
                    }
                  >
                    Approve Mgmt
                  </Button>
                ) : null}
                {isHR && selectedRequest.status === "READY_TO_ISSUE" ? (
                  <Button
                    type="button"
                    onClick={() =>
                      handleWorkflowTransition(selectedRequest.id, "ISSUE")
                    }
                  >
                    Issue
                  </Button>
                ) : null}
                {(selectedRequest.status === "ISSUED" ||
                  selectedRequest.status === "ACCEPTED") &&
                selectedRequest.pdfPath ? (
                  <>
                    <a
                      href={`/${selectedRequest.pdfPath}`}
                      download
                      className="inline-flex"
                    >
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
                          const response = await fetch(
                            "/api/hrms/letters/share-mail",
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                letterRequestId: selectedRequest.id,
                              }),
                            },
                          );
                          const json = await response.json();
                          if (!json.ok)
                            throw new Error(
                              json.error?.message ||
                                json.error ||
                                "Failed to prepare email",
                            );
                          // Open communication module mail composer
                          window.open(json.data.composerLink, "_blank");
                          toast.success("Opening mail composer...");
                        } catch (error: any) {
                          toast.error(
                            error.message || "Failed to share via mail",
                          );
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
    </WorkspacePage>
  );
}
