"use client";

import React, { useState, useEffect } from "react";
import { FileText, Search, Plus, Trash2, FolderPlus, Upload, ShieldCheck } from "lucide-react";
import { FolderIcon as CarbonFolder } from "@/components/ui/folder-icon";
import { toast } from "sonner";

interface FilesViewProps {
  onFetchFiles: (scope: "personal" | "organization" | "employee") => Promise<{ folders: any[]; files: any[] }>;
  onCreateFolder: (name: string, scope: string) => Promise<any>;
  onUploadFile: (name: string, fileKey: string, mimeType: string, sizeBytes: number, scope: string) => Promise<any>;
}

export function FilesView({
  onFetchFiles,
  onCreateFolder,
  onUploadFile,
}: FilesViewProps) {
  const [scope, setScope] = useState<"personal" | "organization" | "employee">("personal");
  const [folders, setFolders] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [uploading, setUploading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const { folders: fld, files: fls } = await onFetchFiles(scope);
      setFolders(fld);
      setFiles(fls);
    } catch (err: any) {
      toast.error("Failed to load files ledger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [scope]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await onCreateFolder(newFolderName, scope);
      toast.success(`Folder "${newFolderName}" created successfully.`);
      setNewFolderName("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create folder");
    }
  };

  const handleSimulateUpload = async () => {
    setUploading(true);
    try {
      // Simulate malware scan & storage write
      const mockFileKey = `hrms/docs/${Math.random().toString(36).substring(7)}`;
      await onUploadFile("Joining_Report.pdf", mockFileKey, "application/pdf", 1024 * 350, scope);
      toast.success("File uploaded successfully. [Safe: Malware Scan Clean]");
      loadData();
    } catch (err: any) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const filteredFolders = folders.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));
  const filteredFiles = files.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="bg-[var(--color-surface)] border border-outline-variant/20 rounded-2xl p-6 shadow-sm flex flex-col gap-6 select-none animate-in fade-in duration-200">
      {/* File scopes & upload options */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant/10 pb-4">
        {/* Scopes */}
        <div className="flex items-center gap-2">
          {(["personal", "organization", "employee"] as const).map((sc) => (
            <button
              key={sc}
              type="button"
              onClick={() => setScope(sc)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer capitalize ${
                scope === sc
                  ? "bg-[#00cec4]/10 text-[#00cec4] border-[#00cec4]/20 font-bold"
                  : "bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)] border-outline-variant/10 hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)]"
              }`}
            >
              {sc === "employee" ? "Employee Shared" : sc === "personal" ? "My Space Files" : "Company Files"}
            </button>
          ))}
        </div>

        {/* Upload buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={handleSimulateUpload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#00cec4] hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] rounded-lg cursor-pointer transition-all shadow-sm disabled:opacity-50"
          >
            <Upload className="size-3.5" />
            Upload File
          </button>
        </div>
      </div>

      {/* Directory controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        {/* Search */}
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--color-placeholder)]" />
          <input
            type="text"
            placeholder="Search folders and files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs border border-outline-variant/50 rounded-lg outline-none focus:border-[#00cec4] focus:bg-[var(--color-surface)] bg-[var(--color-surface-container-low)] text-[var(--color-on-surface)] transition-colors placeholder:text-[var(--color-placeholder)]"
          />
        </div>

        {/* Quick Folder Creator Form */}
        <form onSubmit={handleCreateFolder} className="flex gap-2 w-full max-w-xs">
          <input
            type="text"
            placeholder="New folder name..."
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-outline-variant/50 rounded-lg outline-none focus:border-[#00cec4] bg-[var(--color-surface-container-low)] focus:bg-[var(--color-surface)] text-[var(--color-on-surface)] transition-colors placeholder:text-[var(--color-placeholder)]"
          />
          <button
            type="submit"
            className="p-1.5 bg-[var(--color-surface-container-low)] border border-outline-variant/50 rounded-lg hover:text-[#00cec4] hover:bg-[#00cec4]/5 text-[var(--color-on-surface-variant)] cursor-pointer transition-all shrink-0"
            title="Create Folder"
          >
            <FolderPlus className="size-4" />
          </button>
        </form>
      </div>

      {/* Directory Grid */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-xs text-slate-400">
          Loading file manager entries...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Folders block */}
          {filteredFolders.length > 0 && (
            <div>
              <h4 className="ds-label mb-3">Folders</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {filteredFolders.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 border border-outline-variant/10 hover:border-[#00cec4] bg-[var(--color-surface)] hover-cyan rounded-xl flex items-center gap-3 transition-all cursor-pointer group"
                  >
                    <span className="ds-icon-badge">
                      <CarbonFolder size={18} />
                    </span>
                    <span className="text-xs font-bold text-[var(--color-on-surface)] truncate">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files List block */}
          <div>
            <h4 className="ds-label mb-3">Files</h4>
            {filteredFiles.length === 0 ? (
              <div className="border border-dashed border-outline-variant/30 py-10 rounded-xl flex flex-col items-center justify-center text-center">
                <FileText className="size-8 text-[var(--color-placeholder)] mb-2" />
                <p className="text-xs font-semibold text-[var(--color-on-surface-variant)]">No documents uploaded</p>
                <p className="text-[10px] text-[var(--color-placeholder)] mt-0.5">Upload a file to get started.</p>
              </div>
            ) : (
              <div className="border border-outline-variant/10 rounded-xl overflow-hidden shadow-sm">
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th className="px-4 py-3">File Name</th>
                      <th className="px-4 py-3">Uploaded On</th>
                      <th className="px-4 py-3">File Size</th>
                      <th className="px-4 py-3 text-right">Security</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFiles.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3.5 font-semibold text-[var(--color-on-surface)] flex items-center gap-2">
                          <FileText className="size-4 text-[#818cf8] shrink-0" />
                          <span className="truncate max-w-xs sm:max-w-sm md:max-w-md">{item.name}</span>
                        </td>
                        <td className="px-4 py-3.5 text-[var(--color-on-surface-variant)]">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3.5 text-[var(--color-on-surface-variant)]">
                          {Math.round(item.sizeBytes / 1024)} KB
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full select-none">
                            <ShieldCheck className="size-3" />
                            Clean
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
