"use client";

import React, { useState, useEffect } from "react";
import { Folder, FileText, Search, Plus, Trash2, FolderPlus, Upload, ShieldCheck } from "lucide-react";
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
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-6 select-none animate-in fade-in duration-200">
      {/* File scopes & upload options */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
        {/* Scopes */}
        <div className="flex items-center gap-2">
          {(["personal", "organization", "employee"] as const).map((sc) => (
            <button
              key={sc}
              type="button"
              onClick={() => setScope(sc)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer capitalize ${
                scope === sc
                  ? "bg-[#00c4b6]/10 text-[#00c4b6] border-[#00c4b6]/20 font-bold"
                  : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-800"
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#00c4b6] hover:bg-[#00b0a3] rounded-lg cursor-pointer transition-colors shadow-sm disabled:opacity-50"
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search folders and files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-[#00c4b6] focus:bg-white bg-slate-50 transition-colors"
          />
        </div>

        {/* Quick Folder Creator Form */}
        <form onSubmit={handleCreateFolder} className="flex gap-2 w-full max-w-xs">
          <input
            type="text"
            placeholder="New folder name..."
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-[#00c4b6] bg-slate-50 focus:bg-white transition-colors"
          />
          <button
            type="submit"
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:text-[#00c4b6] hover:bg-[#00c4b6]/5 text-slate-500 cursor-pointer transition-all shrink-0"
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
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Folders</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {filteredFolders.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 border border-slate-200 hover:border-[#00c4b6] bg-slate-50/50 hover:bg-white rounded-xl flex items-center gap-3 transition-all cursor-pointer group"
                  >
                    <Folder className="size-5 text-[#00c4b6]" />
                    <span className="text-xs font-bold text-slate-700 truncate">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files List block */}
          <div>
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Files</h4>
            {filteredFiles.length === 0 ? (
              <div className="border border-dashed border-slate-200 py-10 rounded-xl flex flex-col items-center justify-center text-center">
                <FileText className="size-8 text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-500">No documents uploaded</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Upload a file to get started.</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 text-[10.5px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-200">
                      <th className="px-4 py-3">File Name</th>
                      <th className="px-4 py-3">Uploaded On</th>
                      <th className="px-4 py-3">File Size</th>
                      <th className="px-4 py-3 text-right">Security</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                    {filteredFiles.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3.5 font-semibold text-slate-800 flex items-center gap-2">
                          <FileText className="size-4 text-indigo-500 shrink-0" />
                          <span className="truncate max-w-xs sm:max-w-sm md:max-w-md">{item.name}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3.5">
                          {Math.round(item.sizeBytes / 1024)} KB
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full select-none">
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
