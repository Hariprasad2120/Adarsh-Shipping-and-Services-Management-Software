"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import {
  Building2,
  Download,
  Eye,
  FileText,
  FolderLock,
  Search,
  ShieldCheck,
  Upload,
  UserRound,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import {
  PeopleControlButton as MnxAction,
  PeopleControlInput as MnxInput,
} from "@/modules/people/components";
import { FileUploadField } from "@/components/forms/file-upload/file-upload-field";
import { NativeSelect } from "@/components/ui/native-select";
import {
  PeopleErrorState,
  PeopleLoadingState,
  PeopleSection,
  PeopleSectionHeader,
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableEmpty,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
} from "@/modules/people/components";
import {
  WorkspaceAlert,
  WorkspaceBadge,
} from "@/components/layout/workspace";

type DocumentCategory = "MY_SPACE" | "COMPANY_FILES" | "EMPLOYEE_SHARED";

type EmployeeTarget = {
  id: string;
  name: string;
  employeeNumber: number | null;
};

type DocumentFile = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  downloadUrl: string;
  owner: EmployeeTarget | null;
  uploadedBy: EmployeeTarget | null;
};

type DocumentDriveData = {
  category: DocumentCategory;
  files: DocumentFile[];
  selectedEmployeeId: string | null;
  employeeTargets: EmployeeTarget[];
  permissions: {
    canUpload: boolean;
    isHrAdmin: boolean;
  };
  storage: {
    configured: boolean;
  };
};

type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  error?: {
    message?: string;
  };
};

const TABS: Array<{
  category: DocumentCategory;
  label: string;
  icon: typeof UserRound;
}> = [
  { category: "MY_SPACE", label: "My Space Files", icon: UserRound },
  { category: "COMPANY_FILES", label: "Company Files", icon: Building2 },
  {
    category: "EMPLOYEE_SHARED",
    label: "Employee Shared",
    icon: UsersRound,
  },
];

const CATEGORY_DETAILS: Record<
  DocumentCategory,
  { title: string; description: string }
> = {
  MY_SPACE: {
    title: "Private to you",
    description:
      "Only you can list, open, download, or add files in this personal workspace.",
  },
  COMPANY_FILES: {
    title: "Organisation-wide",
    description:
      "Everyone in the organisation can view these policies and common documents. Only HR can upload.",
  },
  EMPLOYEE_SHARED: {
    title: "Controlled employee record",
    description:
      "The employee, their primary and secondary reporting managers, and HR can view these files. Other employees cannot.",
  },
};

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function employeeLabel(employee: EmployeeTarget) {
  return employee.employeeNumber !== null
    ? `${employee.name} · ID ${employee.employeeNumber}`
    : employee.name;
}

async function readApiResponse<T>(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | ApiResponse<T>
    | null;
  if (!response.ok || !payload?.ok || !payload.data) {
    throw new Error(
      payload?.error?.message || "The document drive request failed.",
    );
  }
  return payload.data;
}

export function FilesView() {
  const [category, setCategory] =
    useState<DocumentCategory>("MY_SPACE");
  const [data, setData] = useState<DocumentDriveData | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadDocuments = useCallback(
    async (nextCategory = category, employeeId = selectedEmployeeId) => {
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams({ category: nextCategory });
        if (nextCategory === "EMPLOYEE_SHARED" && employeeId) {
          query.set("employeeId", employeeId);
        }
        const response = await fetch(`/api/hrms/files?${query.toString()}`, {
          cache: "no-store",
        });
        const nextData = await readApiResponse<DocumentDriveData>(response);
        setData(nextData);
        setSelectedEmployeeId(nextData.selectedEmployeeId);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "The document drive could not be loaded.",
        );
      } finally {
        setLoading(false);
      }
    },
    [category, selectedEmployeeId],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDocuments();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadDocuments]);

  const filteredFiles = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return data?.files || [];
    return (data?.files || []).filter((file) =>
      file.name.toLocaleLowerCase().includes(term),
    );
  }, [data?.files, search]);

  function changeCategory(nextCategory: DocumentCategory) {
    if (nextCategory === category) return;
    setCategory(nextCategory);
    setSelectedEmployeeId(null);
    setSearch("");
    setShowUpload(false);
    setSelectedFile(null);
  }

  function changeEmployee(employeeId: string) {
    setSelectedEmployeeId(employeeId);
    setShowUpload(false);
    setSelectedFile(null);
  }

  function selectUploadFile(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] || null);
  }

  async function uploadSelectedFile() {
    if (!selectedFile) {
      toast.error("Choose a file to upload.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("category", category);
      formData.set("file", selectedFile);
      if (category === "EMPLOYEE_SHARED" && selectedEmployeeId) {
        formData.set("employeeId", selectedEmployeeId);
      }
      const response = await fetch("/api/hrms/files", {
        method: "POST",
        body: formData,
      });
      await readApiResponse<DocumentFile>(response);
      toast.success("File saved to the HR folder in the Shared Drive.");
      setSelectedFile(null);
      setShowUpload(false);
      await loadDocuments(category, selectedEmployeeId);
    } catch (uploadError) {
      toast.error(
        uploadError instanceof Error
          ? uploadError.message
          : "The file could not be uploaded.",
      );
    } finally {
      setUploading(false);
    }
  }

  const detail = CATEGORY_DETAILS[category];

  if (loading && !data) {
    return (
      <PeopleLoadingState description="Loading your authorised HR document folders." />
    );
  }

  if (error && !data) {
    return (
      <PeopleErrorState
        description={error}
        onRetry={() => void loadDocuments()}
      />
    );
  }

  return (
    <PeopleSection>
      <PeopleSectionHeader
        eyebrow="Shared Drive"
        title="Document access"
        description="Files are stored in managed Shared Drive folders and shown according to employee reporting access."
        actions={
          data?.permissions.canUpload ? (
            <MnxAction
              variant="primary"
              onClick={() => setShowUpload((value) => !value)}
            >
              <Upload aria-hidden="true" />
              {showUpload ? "Close upload" : "Upload file"}
            </MnxAction>
          ) : null
        }
      />

      <div className="grid gap-5 p-5 sm:p-6">
        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="HR document categories"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = category === tab.category;
            return (
              <MnxAction
                key={tab.category}
                role="tab"
                aria-selected={active}
                variant={active ? "primary" : "secondary"}
                onClick={() => changeCategory(tab.category)}
              >
                <Icon aria-hidden="true" />
                {tab.label}
              </MnxAction>
            );
          })}
        </div>

        <WorkspaceAlert variant="info">
          <FolderLock aria-hidden="true" />
          <span>
            <strong>{detail.title}.</strong> {detail.description}
          </span>
        </WorkspaceAlert>

        {!data?.storage.configured ? (
          <WorkspaceAlert variant="warning">
            <ShieldCheck aria-hidden="true" />
            The organisation Shared Drive or a Drive-enabled Google Workspace
            connection still needs to be configured before the first upload.
          </WorkspaceAlert>
        ) : null}

        {category === "EMPLOYEE_SHARED" &&
        (data?.employeeTargets.length || 0) > 1 ? (
          <div className="mnx-field max-w-xl">
            <label htmlFor="hr-document-employee">Employee folder</label>
            <NativeSelect
              id="hr-document-employee"
              value={selectedEmployeeId || ""}
              onChange={(event) => changeEmployee(event.target.value)}
            >
              {data?.employeeTargets.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employeeLabel(employee)}
                </option>
              ))}
            </NativeSelect>
            <small>
              Only employees within your HR or direct reporting access are
              listed.
            </small>
          </div>
        ) : null}

        {showUpload && data?.permissions.canUpload ? (
          <div className="grid gap-4 rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-soft)] p-4 sm:p-5">
            <FileUploadField
              id="hr-document-upload"
              selectedFile={
                selectedFile
                  ? {
                      file: selectedFile,
                      name: selectedFile.name,
                      sizeBytes: selectedFile.size,
                      statusLabel: "Ready to save",
                    }
                  : null
              }
              onInputChange={selectUploadFile}
              onClear={() => setSelectedFile(null)}
              disabled={uploading}
              uploading={uploading}
              triggerText="Choose an HR document"
              helperText="PDF, image, spreadsheet, document, or other business file · maximum 25 MB"
            />
            <div className="flex justify-end gap-2">
              <MnxAction
                variant="secondary"
                disabled={uploading}
                onClick={() => {
                  setShowUpload(false);
                  setSelectedFile(null);
                }}
              >
                Cancel
              </MnxAction>
              <MnxAction
                variant="primary"
                disabled={!selectedFile || uploading}
                onClick={() => void uploadSelectedFile()}
              >
                <Upload aria-hidden="true" />
                {uploading ? "Saving…" : "Save to Shared Drive"}
              </MnxAction>
            </div>
          </div>
        ) : null}

        <div className="mnx-search-field max-w-xl">
          <Search aria-hidden="true" />
          <MnxInput
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search files in this folder"
            aria-label="Search files"
          />
        </div>

        {error ? (
          <WorkspaceAlert variant="danger">{error}</WorkspaceAlert>
        ) : null}

        <PeopleTable aria-label={`${TABS.find((tab) => tab.category === category)?.label} files`}>
          <PeopleTableHeader>
            <PeopleTableRow>
              <PeopleTableHead>File</PeopleTableHead>
              <PeopleTableHead>
                {category === "COMPANY_FILES" ? "Access" : "Employee"}
              </PeopleTableHead>
              <PeopleTableHead>Uploaded by</PeopleTableHead>
              <PeopleTableHead>Uploaded on</PeopleTableHead>
              <PeopleTableHead>Size</PeopleTableHead>
              <PeopleTableHead className="text-right">Actions</PeopleTableHead>
            </PeopleTableRow>
          </PeopleTableHeader>
          <PeopleTableBody>
            {loading ? (
              <PeopleTableEmpty colSpan={6} message="Refreshing files…" />
            ) : filteredFiles.length === 0 ? (
              <PeopleTableEmpty
                colSpan={6}
                message={
                  search
                    ? "No files match this search."
                    : "No files have been uploaded to this folder."
                }
              />
            ) : (
              filteredFiles.map((file) => (
                <PeopleTableRow key={file.id}>
                  <PeopleTableCell>
                    <span className="mnx-table-identity">
                      <span className="mnx-icon-badge mnx-table-leading-icon">
                        <FileText aria-hidden="true" />
                      </span>
                      <span>
                        <b title={file.name}>{file.name}</b>
                        <WorkspaceBadge variant="neutral">
                          Protected
                        </WorkspaceBadge>
                      </span>
                    </span>
                  </PeopleTableCell>
                  <PeopleTableCell>
                    {category === "COMPANY_FILES"
                      ? "Everyone"
                      : file.owner
                        ? employeeLabel(file.owner)
                        : "—"}
                  </PeopleTableCell>
                  <PeopleTableCell>
                    {file.uploadedBy?.name || "Employee"}
                  </PeopleTableCell>
                  <PeopleTableCell>
                    {new Date(file.createdAt).toLocaleString()}
                  </PeopleTableCell>
                  <PeopleTableCell>{formatBytes(file.sizeBytes)}</PeopleTableCell>
                  <PeopleTableCell>
                    <span className="mnx-table-cell-actions">
                      <a
                        className="mnx-button mnx-button-secondary mnx-button-compact"
                        href={file.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Eye aria-hidden="true" />
                        Open
                      </a>
                      <a
                        className="mnx-button mnx-button-secondary mnx-button-compact"
                        href={`${file.downloadUrl}?download=true`}
                      >
                        <Download aria-hidden="true" />
                        Download
                      </a>
                    </span>
                  </PeopleTableCell>
                </PeopleTableRow>
              ))
            )}
          </PeopleTableBody>
        </PeopleTable>
      </div>
    </PeopleSection>
  );
}
