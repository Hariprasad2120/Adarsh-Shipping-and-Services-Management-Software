"use client";

import React, { useEffect, useState, useTransition } from "react";
import { Folder, FolderPlus, FileText, Upload, Trash, Share2, Link as LinkIcon, UserPlus } from "lucide-react";
import { useSession } from "next-auth/react";
import {
  listDriveContents,
  createDriveFolder,
  uploadDriveFile,
  shareFile,
  generateShareLink,
  deleteDriveFile,
} from "@/modules/communication/file.service";

export default function FilesPage() {
  const { data: session } = useSession();
  const [scope, setScope] = useState<"personal" | "organization" | "employee">("personal");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [activeFile, setActiveFile] = useState<any>(null);

  // Folder paths trail
  const [breadcrumb, setBreadcrumb] = useState<any[]>([]);

  // Create folder overlay
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [folderName, setFolderName] = useState("");

  // Upload file overlay
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileMime, setFileMime] = useState("application/pdf");
  const [fileSize, setFileSize] = useState(1024 * 1024 * 5); // 5MB

  // Sharing controls
  const [isSharing, setIsSharing] = useState(false);
  const [targetUserId, setTargetUserId] = useState("");
  const [shareRole, setShareRole] = useState<"VIEWER" | "EDITOR">("VIEWER");
  const [shareLinkToken, setShareLinkToken] = useState("");
  const [isPending, startTransition] = useTransition();

  const reloadDrive = () => {
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (userId && orgId) {
      listDriveContents(userId, orgId, currentFolderId, scope).then((res) => {
        setFolders(res.folders);
        setFiles(res.files);
      });
    }
  };

  useEffect(() => {
    reloadDrive();
  }, [currentFolderId, scope, session]);

  const handleCreateFolder = () => {
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (!folderName.trim() || !userId || !orgId) return;

    createDriveFolder(
      userId,
      orgId,
      folderName.trim(),
      currentFolderId,
      scope
    ).then(() => {
      setIsCreatingFolder(false);
      setFolderName("");
      reloadDrive();
    });
  };

  const handleUploadFile = () => {
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (!fileName.trim() || !userId || !orgId) return;

    startTransition(async () => {
      try {
        const fileKey = `drive/${Math.random().toString(36).substring(2, 15)}-${Date.now()}`;
        await uploadDriveFile(userId, orgId, {
          name: fileName.trim(),
          fileKey,
          mimeType: fileMime,
          sizeBytes: fileSize,
          folderId: currentFolderId,
          scope,
        });

        setIsUploading(false);
        setFileName("");
        reloadDrive();
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleShareFile = () => {
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (!targetUserId || !activeFile || !userId || !orgId) return;

    shareFile(
      userId,
      orgId,
      activeFile.id,
      targetUserId,
      shareRole
    ).then(() => {
      setTargetUserId("");
      alert("Shared successfully!");
    });
  };

  const handleGenerateLink = () => {
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (!activeFile || !userId || !orgId) return;

    generateShareLink(userId, orgId, activeFile.id, true, 7).then((res) => {
      setShareLinkToken(`${window.location.origin}/api/files/share/${res.token}`);
    });
  };

  const handleDelete = (id: string) => {
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (!userId || !orgId) return;
    if (confirm("Are you sure you want to delete this file?")) {
      deleteDriveFile(userId, orgId, id).then(() => {
        setActiveFile(null);
        reloadDrive();
      });
    }
  };

  const navigateToFolder = (f: any) => {
    setCurrentFolderId(f.id);
    setBreadcrumb((prev) => [...prev, f]);
  };

  const navigateUp = (idx: number) => {
    if (idx === -1) {
      setCurrentFolderId(null);
      setBreadcrumb([]);
    } else {
      const nextBreadcrumb = breadcrumb.slice(0, idx + 1);
      setCurrentFolderId(breadcrumb[idx].id);
      setBreadcrumb(nextBreadcrumb);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] min-h-0">
      
      {/* 1. Directory Tree rail */}
      <div className="w-full lg:w-60 shrink-0 flex flex-col gap-4 bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl p-4">
        <span className="ds-label block mb-2 px-2">Storage Volumes</span>
        {[
          { key: "personal", label: "My Files" },
          { key: "organization", label: "Company Drive" },
          { key: "employee", label: "Department Shared" },
        ].map((v) => (
          <button
            key={v.key}
            onClick={() => {
              setScope(v.key as any);
              setCurrentFolderId(null);
              setBreadcrumb([]);
              setActiveFile(null);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all text-left cursor-pointer ${
              scope === v.key
                ? "bg-[#00cec4]/10 text-[#00cec4]"
                : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-white"
            }`}
          >
            <Folder size={14} />
            <span>{v.label}</span>
          </button>
        ))}

        <div className="mt-4 pt-4 border-t border-[var(--color-outline-variant)]/40 flex flex-col gap-2">
          <button
            onClick={() => setIsCreatingFolder(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[var(--color-outline-variant)]/80 text-white hover:border-[#00cec4] text-xs font-bold uppercase transition-all cursor-pointer bg-transparent"
          >
            <FolderPlus size={14} />
            Create Folder
          </button>
          <button
            onClick={() => setIsUploading(true)}
            className="w-full bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] py-2.5 rounded-xl text-xs uppercase tracking-widest font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Upload size={14} />
            Upload File
          </button>
        </div>
      </div>

      {/* 2. File Explorer view grid */}
      <div className="flex-1 bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl flex flex-col min-h-0">
        
        {/* Breadcrumb Trail */}
        <div className="p-4 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] flex items-center gap-1.5 text-xs text-white shrink-0">
          <button onClick={() => navigateUp(-1)} className="hover:text-[#00cec4] font-bold">
            Root
          </button>
          {breadcrumb.map((b, idx) => (
            <React.Fragment key={b.id}>
              <span className="text-[var(--color-on-surface-variant)]">/</span>
              <button
                onClick={() => navigateUp(idx)}
                className="hover:text-[#00cec4] font-semibold"
              >
                {b.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Directory details */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Subfolders list */}
          {folders.length > 0 && (
            <div className="space-y-2">
              <span className="ds-label block px-1">Folders</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {folders.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => navigateToFolder(f)}
                    className="flex items-center gap-3 p-4 bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]/60 hover:border-[#00cec4]/40 rounded-xl cursor-pointer transition-all"
                  >
                    <Folder className="text-[#00cec4] size-5 shrink-0" />
                    <span className="text-white text-xs font-semibold truncate uppercase">{f.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files List */}
          <div className="space-y-2">
            <span className="ds-label block px-1">Files</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {files.map((file) => (
                <div
                  key={file.id}
                  onClick={() => setActiveFile(file)}
                  className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                    activeFile?.id === file.id
                      ? "bg-[#00cec4]/5 border-[#00cec4]/40 text-[#00cec4]"
                      : "bg-[var(--color-surface-container-low)] border-[var(--color-outline-variant)]/60 hover:border-[#00cec4]/40 text-white"
                  }`}
                >
                  <FileText className="text-orange-400 size-5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold truncate block uppercase leading-snug">{file.name}</span>
                    <span className="text-[9px] text-[var(--color-on-surface-variant)] block font-mono mt-0.5">
                      {(file.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {folders.length === 0 && files.length === 0 && (
              <div className="p-8 text-center text-xs text-[var(--color-on-surface-variant)] uppercase tracking-wider">
                This directory path is empty
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 3. Detail sidebar options / Inspector */}
      {activeFile && (
        <div className="w-full lg:w-80 shrink-0 bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl overflow-hidden flex flex-col min-h-0">
          <div className="p-4 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] flex justify-between items-center shrink-0">
            <h3 className="text-white text-xs font-bold uppercase truncate font-sans">
              File Details
            </h3>
            <button
              onClick={() => {
                setActiveFile(null);
                setIsSharing(false);
                setShareLinkToken("");
              }}
              className="text-xs text-[var(--color-on-surface-variant)] hover:text-white uppercase font-bold cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div className="space-y-1">
              <span className="ds-label block">Name</span>
              <h4 className="text-white text-sm font-bold uppercase font-sans break-words">{activeFile.name}</h4>
              <span className="text-[9px] text-[var(--color-on-surface-variant)] block font-mono">
                Mime-Type: {activeFile.mimeType}
              </span>
            </div>

            {/* Sharing & Links Panel */}
            <div className="pt-4 border-t border-[var(--color-outline-variant)]/40 space-y-3">
              <button
                onClick={() => setIsSharing((v) => !v)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs uppercase tracking-wider font-bold bg-[#00cec4]/10 text-[#00cec4] rounded-xl hover:bg-[#00cec4]/20 cursor-pointer border-0"
              >
                <Share2 size={13} />
                Share File
              </button>

              <button
                onClick={handleGenerateLink}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs uppercase tracking-wider font-bold bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container)]/80 text-white rounded-xl cursor-pointer border-0"
              >
                <LinkIcon size={13} />
                Generate Public Link
              </button>

              {shareLinkToken && (
                <div className="p-3 bg-[var(--color-surface-container-low)] rounded-xl border border-[var(--color-outline-variant)]/60 space-y-1.5">
                  <span className="text-[9px] text-[var(--color-on-surface-variant)] uppercase block">Generated Token Link:</span>
                  <input
                    type="text"
                    readOnly
                    value={shareLinkToken}
                    className="w-full text-[9px] font-mono bg-transparent border-0 text-[#00cec4] select-all cursor-pointer p-0"
                  />
                </div>
              )}
            </div>

            {/* Sharing list inputs */}
            {isSharing && (
              <div className="p-3.5 bg-[var(--color-surface-container-low)] rounded-xl border border-[var(--color-outline-variant)]/60 space-y-3">
                <span className="ds-label block">Target User ID</span>
                <input
                  type="text"
                  placeholder="e.g. user_cuid"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full text-xs text-white"
                />
                <select
                  value={shareRole}
                  onChange={(e: any) => setShareRole(e.target.value)}
                  className="w-full text-xs bg-[var(--color-surface-container)] text-white"
                >
                  <option value="VIEWER">Viewer (Read Only)</option>
                  <option value="EDITOR">Editor (Edit/Upload versions)</option>
                </select>
                <button
                  onClick={handleShareFile}
                  className="bg-[#00cec4] text-white hover:bg-[#00b8af] px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase cursor-pointer"
                >
                  Add share
                </button>
              </div>
            )}

            <div className="pt-4 border-t border-[var(--color-outline-variant)]/40">
              <button
                onClick={() => handleDelete(activeFile.id)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs uppercase tracking-wider font-bold bg-red-950 border border-red-400/20 text-red-400 hover:bg-red-900 rounded-xl cursor-pointer"
              >
                <Trash size={12} />
                Delete File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. New Folder Creation Modal Dialog */}
      {isCreatingFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="ds-h3 text-white text-sm font-bold flex items-center gap-2">
              <FolderPlus size={16} className="text-[#00cec4]" />
              New Folder
            </h3>
            <div>
              <span className="ds-label block mb-1">Folder Name</span>
              <input
                type="text"
                placeholder="e.g. Invoices"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                className="w-full text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-outline-variant)]/40">
              <button
                onClick={() => setIsCreatingFolder(false)}
                className="px-4 py-2 text-xs text-[var(--color-on-surface-variant)] hover:text-white uppercase tracking-wider font-bold cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleCreateFolder}
                className="bg-[#00cec4] text-white hover:bg-[#00b8af] px-5 py-2 rounded-xl text-xs uppercase tracking-widest font-bold transition-all cursor-pointer"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Upload File Modal Dialog */}
      {isUploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="ds-h3 text-white text-sm font-bold flex items-center gap-2">
              <Upload size={16} className="text-[#00cec4]" />
              Upload File Asset
            </h3>
            <div className="space-y-3">
              <div>
                <span className="ds-label block mb-1">File Name</span>
                <input
                  type="text"
                  placeholder="e.g. Operations_Manual.pdf"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full text-xs text-white"
                />
              </div>
              <div>
                <span className="ds-label block mb-1">Mime-Type</span>
                <select
                  value={fileMime}
                  onChange={(e) => setFileMime(e.target.value)}
                  className="w-full text-xs bg-[var(--color-surface-container)] text-white"
                >
                  <option value="application/pdf">PDF Document (.pdf)</option>
                  <option value="image/png">PNG Image (.png)</option>
                  <option value="image/jpeg">JPEG Image (.jpg)</option>
                  <option value="application/vnd.openxmlformats-officedocument.wordprocessingml.document">DOCX Document (.docx)</option>
                  <option value="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">XLSX Spreadsheet (.xlsx)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-outline-variant)]/40">
              <button
                onClick={() => setIsUploading(false)}
                className="px-4 py-2 text-xs text-[var(--color-on-surface-variant)] hover:text-white uppercase tracking-wider font-bold cursor-pointer"
              >
                Close
              </button>
              <button
                disabled={isPending}
                onClick={handleUploadFile}
                className="bg-[#00cec4] text-white hover:bg-[#00b8af] px-5 py-2 rounded-xl text-xs uppercase tracking-widest font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                {isPending ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
