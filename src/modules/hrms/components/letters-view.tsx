"use client";

import {
  PeopleControlInput as MnxInput,
  PeopleControlTextarea as MnxTextarea,
} from "@/modules/people/components";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bold,
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
import { toast } from "@/modules/notifications/client";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { NativeSelect } from "@/components/ui/native-select";
import {
  OperationalDataTable,
  OperationalDataTableFooter,
  OperationalDataTableHeader,
  OperationalDataTableWrap,
  OperationalPrimaryCell,
  OperationalStatus,
  OperationalTable,
  OperationalTableCell,
  OperationalTableEmpty,
  OperationalTableHead,
} from "@/components/data-display/operational-data-table";
import {
  WorkspaceAction,
  WorkspaceAlert,
  WorkspaceBadge,
  WorkspacePage,
  WorkspacePanel,
} from "@/components/layout/workspace";
import {
  type TemplateRecord,
  renderDraftPreviewHtml,
} from "@/modules/hrms/components/letters-shared";

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
  const toolbarIconButtonClass = "min-w-[2.75rem]";
  const toolbarActionButtonClass = "px-4";
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={toolbarIconButtonClass}
            onMouseDown={handleToolbarMouseDown}
            onClick={() => runCommand("bold")}
            aria-label="Bold"
            title="Bold"
          >
            <Bold className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={toolbarIconButtonClass}
            onMouseDown={handleToolbarMouseDown}
            onClick={() => runCommand("italic")}
            aria-label="Italic"
            title="Italic"
          >
            <ItalicIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={toolbarIconButtonClass}
            onMouseDown={handleToolbarMouseDown}
            onClick={() => runCommand("formatBlock", "h2")}
            aria-label="Heading"
            title="Heading"
          >
            <Heading1 className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={toolbarIconButtonClass}
            onMouseDown={handleToolbarMouseDown}
            onClick={() => runCommand("insertUnorderedList")}
            aria-label="Bullets"
            title="Bullets"
          >
            <List className="size-4" />
          </Button>
          <div className="mx-1 hidden h-7 w-px bg-mono-border/45 sm:block" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={toolbarActionButtonClass}
            onMouseDown={handleToolbarMouseDown}
            onClick={insertPlaceholder}
            title="Insert placeholder"
          >
            <span className="rounded-md bg-mono-soft px-1.5 py-0.5 font-mono text-[10px] leading-none">
              {`{{ }}`}
            </span>
            <span>Placeholder</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={toolbarActionButtonClass}
            onMouseDown={handleToolbarMouseDown}
            onClick={() => imageInputRef.current?.click()}
            title="Insert image"
          >
            <ImagePlus className="size-4" />
            <span>Image</span>
          </Button>
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
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "register" | "inbox" | "templates" | "settings"
  >("register");
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateRecord | null>(null);
  const [editorHtml, setEditorHtml] = useState("");
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
      const [meRes, reqRes, tempRes, settingsRes] = await Promise.all([
        fetch("/api/hrms/me"),
        fetch("/api/hrms/letters"),
        fetch("/api/hrms/letters?type=templates"),
        fetch("/api/hrms/letters/settings"),
      ]);

      const [meJson, reqJson, tempJson, settingsJson] =
        await Promise.all([
          meRes.json(),
          reqRes.json(),
          tempRes.json(),
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
  const selectedRequestTemplate = selectedRequest
    ? templates.find((template) => template.id === selectedRequest.templateId) ??
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

  const getOperationalStatusTone = (
    status: string,
  ): "success" | "warning" | "danger" | "info" | "neutral" => {
    if (status === "ISSUED" || status === "ACCEPTED") return "success";
    if (status === "READY_TO_ISSUE") return "info";
    if (status === "DRAFT") return "neutral";
    if (status.includes("REVIEW") || status.includes("APPROVAL")) return "warning";
    return "danger";
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

  const buildPreviewViewerPath = useCallback(
    (pdfPath: string) =>
      `/api/hrms/letters/preview-file?path=${encodeURIComponent(pdfPath)}`,
    [],
  );

  const openBrowserPdf = useCallback((pdfPath: string) => {
    window.open(buildPreviewViewerPath(pdfPath), "_blank", "noopener,noreferrer");
  }, [buildPreviewViewerPath]);

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
                size="compact"
                onClick={() => router.push("/hrms/letters/prepare")}
              >
                <Plus className="size-4" />
                <span>Prepare Letter</span>
              </WorkspaceAction>
            ) : null}
            <WorkspaceAction
              size="compact"
              variant="outline"
              onClick={fetchData}
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
            >
              {tab.label}
            </WorkspaceAction>
          ))}
        </div>
      </WorkspacePanel>

      {activeTab === "register" ? (
        <OperationalDataTable>
          <OperationalDataTableHeader
            eyebrow="Registry"
            title="Letter registry"
          >
            <p>
              Review every letter request, its workflow state, and the related
              employee record.
            </p>
          </OperationalDataTableHeader>
          <OperationalDataTableWrap
            role="region"
            aria-label="HR letters registry"
            tabIndex={0}
          >
            <OperationalTable>
              <thead>
                <tr>
                  <OperationalTableHead>Employee</OperationalTableHead>
                  <OperationalTableHead>Document Type</OperationalTableHead>
                  <OperationalTableHead>Letter No</OperationalTableHead>
                  <OperationalTableHead>Created</OperationalTableHead>
                  <OperationalTableHead>Status</OperationalTableHead>
                  <OperationalTableHead className="text-right">
                    Actions
                  </OperationalTableHead>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <OperationalTableEmpty colSpan={6}>
                    No letters generated yet.
                  </OperationalTableEmpty>
                ) : (
                  requests.map((request) => {
                    const template = templates.find(
                      (item) => item.id === request.templateId,
                    );
                    return (
                      <tr key={request.id}>
                        <OperationalPrimaryCell
                          primary={request.user.name}
                          secondary={request.user.employeeCode || undefined}
                        />
                        <OperationalTableCell>
                          {template?.name || "Letter"}
                        </OperationalTableCell>
                        <OperationalTableCell className="mnx-numeric">
                          {request.letterNumber}
                        </OperationalTableCell>
                        <OperationalTableCell className="text-mono-muted">
                          {new Date(request.createdAt).toLocaleString()}
                        </OperationalTableCell>
                        <OperationalTableCell>
                          <OperationalStatus
                            tone={getOperationalStatusTone(request.status)}
                          >
                            {request.status.replace(/_/g, " ")}
                          </OperationalStatus>
                        </OperationalTableCell>
                        <OperationalTableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              mode="icon"
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowViewModal(true);
                              }}
                              aria-label={`Review ${template?.name || "letter"} for ${request.user.name}`}
                            >
                              <Eye className="size-4" />
                            </Button>
                            {isHR && request.status === "DRAFT" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleWorkflowTransition(
                                    request.id,
                                    "SUBMIT",
                                  )
                                }
                              >
                                Submit for Review
                              </Button>
                            ) : null}
                            {request.status === "ISSUED" ? (
                              <a
                                href={`/verify/${request.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex"
                              >
                                <Button
                                  variant="outline"
                                  mode="icon"
                                  aria-label={`Open verification page for ${request.user.name}`}
                                >
                                  <Shield className="size-4" />
                                </Button>
                              </a>
                            ) : null}
                            {isHR && request.status === "DRAFT" ? (
                              <Button
                                variant="outline"
                                mode="icon"
                                onClick={() => handleDeleteRequest(request.id)}
                                aria-label={`Delete draft for ${request.user.name}`}
                              >
                                <Trash className="size-4" />
                              </Button>
                            ) : null}
                          </div>
                        </OperationalTableCell>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </OperationalTable>
          </OperationalDataTableWrap>
          <OperationalDataTableFooter
            summary={`${requests.length} ${requests.length === 1 ? "letter" : "letters"} in registry`}
          />
        </OperationalDataTable>
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
                <WorkspacePanel
                  key={request.id}
                  className="w-full rounded-2xl p-5"
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
                        size="sm"
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
                          size="sm"
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
                          size="sm"
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
                          size="sm"
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
                          size="sm"
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
                </WorkspacePanel>
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
            <div className="space-y-4 px-5 pb-5">
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

              <div className="rounded-[22px] bg-[linear-gradient(180deg,rgba(255,252,247,0.98),rgba(247,243,234,0.94))] px-4 py-4 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-mono-text">
                      Source DOCX actions
                    </p>
                    <p className="max-w-2xl text-xs leading-5 text-mono-muted">
                      Manage the authoritative DOCX files used for template
                      revisions, legal approval, and issue-time generation.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <WorkspaceAction
                      onClick={handleImportBundledTemplates}
                      disabled={submitting}
                    >
                      <WandSparkles className="size-4" />
                      <span>Import bundled DOCX</span>
                    </WorkspaceAction>
                    <WorkspaceAction
                      variant="outline"
                      onClick={() => templateUploadInputRef.current?.click()}
                      disabled={templateUploading}
                    >
                      <Upload className="size-4" />
                      <span>
                        {templateUploading ? "Uploading..." : "Upload template"}
                      </span>
                    </WorkspaceAction>
                  </div>
                </div>
                <MnxInput
                  ref={templateUploadInputRef}
                  type="file"
                  accept=".docx"
                  className="hidden"
                  onChange={handleUploadTemplateDocx}
                />
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
              <WorkspacePanel className="rounded-2xl bg-mono-soft p-4">
                <h3 className="mnx-title-3 font-semibold text-mono-text">
                  Field Values
                </h3>
                <div className="mt-4 space-y-3">
                  {Object.entries(selectedRequest.details || {}).map(
                    ([key, value]) => (
                      <div
                        key={key}
                        className="rounded-xl bg-mono-card p-3 shadow-[inset_0_0_0_1px_rgba(17,18,14,0.06)]"
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
              </WorkspacePanel>
            </div>

            <div className="space-y-4">
              <div className="space-y-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <p className="mnx-dashboard-spec-label">Letter preview</p>
                      <h3 className="text-lg font-semibold text-mono-text">
                        Letter viewer
                      </h3>
                      <p className="max-w-2xl text-sm leading-6 text-mono-muted">
                        Draft letters render directly as formatted letter content
                        inside this popup. Issued letters still use the browser
                        PDF viewer.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedRequest.pdfPath ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              openBrowserPdf(selectedRequest.pdfPath)
                            }
                          >
                            <Eye className="size-4" />
                            <span>Open in tab</span>
                          </Button>
                          <a
                            href={`${buildPreviewViewerPath(selectedRequest.pdfPath)}&download=true`}
                            download
                            className="inline-flex"
                          >
                            <Button type="button" variant="outline">
                              <Save className="size-4" />
                              <span>Download PDF</span>
                            </Button>
                          </a>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {selectedRequest.pdfPath ? (
                    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
                      <iframe
                        src={`${buildPreviewViewerPath(selectedRequest.pdfPath)}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
                        className="h-[78vh] min-h-[38rem] w-full border-0 bg-white"
                        title={`${selectedRequest.letterNumber} PDF preview`}
                      />
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
                      <iframe
                        srcDoc={`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /><style>html,body{margin:0;padding:0;background:#fff;color:#111827;}body{font-family:'Times New Roman',Georgia,serif;}.sheet{max-width:980px;margin:0 auto;padding:36px 40px 64px;line-height:1.6;font-size:17px;}p{margin:0 0 12px;}h1,h2,h3{margin:20px 0 12px;line-height:1.3;}ul,ol{margin:0 0 14px 24px;}img{max-width:100%;height:auto;}@media (max-width:900px){.sheet{padding:24px 18px 48px;font-size:15px;}}</style></head><body><article class="sheet">${selectedRequestPreviewHtml}</article></body></html>`}
                        className="h-[78vh] min-h-[38rem] w-full border-0 bg-white"
                        title={`${selectedRequest.letterNumber} letter preview`}
                      />
                    </div>
                  )}
              </div>

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
