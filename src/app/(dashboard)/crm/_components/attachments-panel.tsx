"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { createAttachmentAction, deleteAttachmentAction } from "@/modules/crm/actions";
import { Paperclip, Trash2, Download, File, UploadCloud, User, Clock } from "lucide-react";

interface Attachment {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  createdAt: Date;
  createdBy: { id: string; name: string };
}

interface AttachmentsPanelProps {
  relatedToType: string;
  relatedToId: string;
  initialAttachments: Attachment[];
}

export function AttachmentsPanel({ relatedToType, relatedToId, initialAttachments }: AttachmentsPanelProps) {
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Standard validations
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds the 10MB limit");
      return;
    }

    setIsUploading(true);
    const res = await createAttachmentAction(
      relatedToType,
      relatedToId,
      file.name,
      file.size,
      file.type || "application/octet-stream"
    );
    setIsUploading(false);

    if (res.ok) {
      toast.success("File attached successfully");
      setAttachments((prev) => [res.data, ...prev]);
    } else {
      toast.error(res.error);
    }
  };

  const handleDeleteAttachment = async (id: string) => {
    if (!confirm("Are you sure you want to remove this attachment?")) return;

    const res = await deleteAttachmentAction(id, relatedToType, relatedToId);
    if (res.ok) {
      toast.success("Attachment removed");
      setAttachments((prev) => prev.filter((a) => a.id !== id));
    } else {
      toast.error(res.error);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-[#1c212a]/30 pb-3">
        <div className="flex items-center gap-2">
          <Paperclip className="size-4.5 text-[#00c4b6]" />
          <h3 className="font-bold text-sm text-white uppercase tracking-wider">File Attachments</h3>
        </div>
        <span className="text-xs text-slate-400 font-bold">{attachments.length} files</span>
      </div>

      {/* Upload Zone */}
      <div className="relative border border-dashed border-[#1c212a] hover:border-[#00c4b6]/60 rounded-xl p-6 bg-[#0a0d12]/50 text-center transition-all">
        <input
          type="file"
          id="crm-file-upload"
          onChange={handleFileUpload}
          disabled={isUploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <div className="flex flex-col items-center gap-2">
          <UploadCloud className="size-8 text-[#00c4b6]" />
          <span className="text-sm font-semibold text-white">
            {isUploading ? "Uploading file..." : "Click or drag files to upload"}
          </span>
          <span className="text-[11px] text-on-surface-variant">Max file size: 10MB</span>
        </div>
      </div>

      {/* Attachments List */}
      {attachments.length === 0 ? (
        <div className="p-6 text-center text-on-surface-variant text-sm border border-dashed border-[#1c212a]/50 rounded-lg">
          No files attached.
        </div>
      ) : (
        <div className="space-y-2.5">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="p-3 bg-[#0f1319] border border-[#1c212a]/40 hover:border-[#1c212a] transition-all rounded-lg flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-slate-800 text-slate-400 rounded-lg shrink-0">
                  <File className="size-4.5" />
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-white text-xs block truncate leading-tight">
                    {attachment.fileName}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1 uppercase font-semibold">
                    {formatBytes(attachment.fileSize)} • By {attachment.createdBy.name}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    toast.success(`Simulating download of: ${attachment.fileName}`);
                  }}
                  className="p-1.5 text-slate-400 hover:text-[#00c4b6] rounded hover:bg-slate-800/40 cursor-pointer"
                  title="Download File"
                >
                  <Download className="size-4" />
                </a>
                <button
                  onClick={() => handleDeleteAttachment(attachment.id)}
                  className="p-1.5 text-on-surface-variant hover:text-red-400 rounded hover:bg-red-500/10 cursor-pointer"
                  title="Remove Attachment"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
