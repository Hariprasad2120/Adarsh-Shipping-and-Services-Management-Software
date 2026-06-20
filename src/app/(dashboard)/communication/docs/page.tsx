"use client";

import React, { useEffect, useState } from "react";
import { FileText, Plus, ExternalLink, ShieldAlert, Sparkles, BookOpen } from "lucide-react";
import { useSession } from "next-auth/react";
import {
  listDocuments,
  createDocument,
  getOnlyOfficeConfig,
} from "@/modules/communication/document.service";

export default function DocsPage() {
  const { data: session } = useSession();
  const [docs, setDocs] = useState<any[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [onlyOfficeConfig, setOnlyOfficeConfig] = useState<any>(null);

  // Creation form
  const [isCreating, setIsCreating] = useState(false);
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState<"DOCUMENT" | "SPREADSHEET" | "PRESENTATION">("DOCUMENT");

  const reloadDocs = () => {
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (userId && orgId) {
      listDocuments(userId, orgId).then((res) => {
        setDocs(res);
      });
    }
  };

  useEffect(() => {
    reloadDocs();
  }, [session]);

  useEffect(() => {
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (selectedDocId && userId && orgId) {
      getOnlyOfficeConfig(userId, orgId, selectedDocId).then((res) => {
        setOnlyOfficeConfig(res);
      });
    } else {
      setOnlyOfficeConfig(null);
    }
  }, [selectedDocId, session]);

  const handleCreate = () => {
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (!docName.trim() || !userId || !orgId) return;

    createDocument(
      userId,
      orgId,
      docName.trim(),
      docType
    ).then(() => {
      setIsCreating(false);
      setDocName("");
      reloadDocs();
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] min-h-0">
      
      {/* 1. Documents list index */}
      <div className="w-full lg:w-80 shrink-0 flex flex-col bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl overflow-hidden min-h-0">
        <div className="p-4 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] flex justify-between items-center shrink-0">
          <h3 className="ds-h3 text-white text-xs font-bold uppercase tracking-wider">
            Workspace Docs
          </h3>
          <button
            onClick={() => setIsCreating(true)}
            className="p-1.5 rounded-lg bg-[#00cec4]/10 text-[#00cec4] hover:bg-[#00cec4]/20 transition-all cursor-pointer border-0"
            title="Create Document"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {docs.map((d) => {
            const isActive = d.id === selectedDocId;
            return (
              <button
                key={d.id}
                onClick={() => setSelectedDocId(d.id)}
                className={`w-full text-left p-3 rounded-xl transition-all border cursor-pointer flex justify-between items-start gap-2 ${
                  isActive
                    ? "bg-[#00cec4]/10 text-[#00cec4] border-[#00cec4]/30"
                    : "bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-white border-[var(--color-outline-variant)]/60"
                }`}
              >
                <div className="min-w-0">
                  <span className="text-[8px] text-[var(--color-on-surface-variant)] font-semibold block uppercase">
                    {d.type}
                  </span>
                  <h4 className="text-white text-xs font-bold truncate leading-snug font-sans uppercase mt-0.5">
                    {d.name}
                  </h4>
                  <span className="text-[8px] text-[var(--color-on-surface-variant)] block font-mono">
                    Owner: {d.createdBy.name}
                  </span>
                </div>
              </button>
            );
          })}
          {docs.length === 0 && (
            <span className="text-[10px] text-[var(--color-on-surface-variant)] block px-3 py-4 italic uppercase">
              No documents created yet
            </span>
          )}
        </div>
      </div>

      {/* 2. Co-editing frame details view / ONLYOFFICE placeholder info */}
      <div className="flex-1 bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl overflow-hidden flex flex-col min-h-0">
        {onlyOfficeConfig ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header info */}
            <div className="p-5 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-white text-sm font-bold font-sans uppercase">
                  {onlyOfficeConfig.document.title}
                </h3>
                <span className="text-[9px] text-[#00cec4] bg-[#00cec4]/10 border border-[#00cec4]/20 px-2 py-0.5 rounded font-mono font-bold uppercase block mt-1 w-fit">
                  ONLYOFFICE Co-Authoring Active
                </span>
              </div>
              <button
                onClick={() => alert("ONLYOFFICE Integration Connected. Initializing editor session.")}
                className="bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-4 py-2 rounded-xl text-xs uppercase tracking-widest font-bold transition-all flex items-center gap-1.5 cursor-pointer border-0"
              >
                <ExternalLink size={13} />
                Open Co-Editor Frame
              </button>
            </div>

            {/* Config metadata log */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              <div className="p-4 bg-[var(--color-surface-container-low)] rounded-xl border border-[var(--color-outline-variant)]/60 space-y-3">
                <h4 className="ds-h3 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-[#00cec4]" />
                  Active API Integration Config
                </h4>
                <div className="space-y-2 text-[10px] font-mono text-white leading-relaxed">
                  <div className="flex justify-between border-b border-[var(--color-outline-variant)]/20 pb-1">
                    <span className="text-[var(--color-on-surface-variant)]">FILE_TYPE</span>
                    <span>{onlyOfficeConfig.document.fileType}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--color-outline-variant)]/20 pb-1">
                    <span className="text-[var(--color-on-surface-variant)]">DOCUMENT_KEY</span>
                    <span className="truncate max-w-[200px]">{onlyOfficeConfig.document.key}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--color-outline-variant)]/20 pb-1">
                    <span className="text-[var(--color-on-surface-variant)]">CALLBACK_URL</span>
                    <span className="truncate max-w-[200px]">{onlyOfficeConfig.editorConfig.callbackUrl}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-on-surface-variant)]">SERVER_ENDPOINT</span>
                    <span className="truncate max-w-[200px]">{onlyOfficeConfig.documentServerUrl}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-orange-950/20 border border-orange-400/20 text-[var(--color-on-surface-variant)] text-xs rounded-xl flex items-start gap-2.5">
                <Sparkles size={16} className="text-[#fb923c] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="text-white font-bold block uppercase tracking-wider text-[10px]">Real-Time Co-Authoring Notice</span>
                  <p className="leading-relaxed">
                    By launching the co-editor frame, multiple users from your department can edit this spreadsheet, document, or presentation simultaneously. Saving a new version automatically updates the Monolith database logs.
                  </p>
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <BookOpen size={48} className="text-[var(--color-outline)] mb-3" />
            <h4 className="text-white font-bold text-xs uppercase tracking-wider">No Document Selected</h4>
            <p className="text-[var(--color-on-surface-variant)] text-xs mt-1">
              Select a collaborative document or spreadsheet from the workspace index to load co-editing frames.
            </p>
          </div>
        )}
      </div>

      {/* Creation Modal Dialog */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="ds-h3 text-white text-sm font-bold flex items-center gap-2">
              <Plus size={16} className="text-[#00cec4]" />
              New Document
            </h3>
            <div className="space-y-3">
              <div>
                <span className="ds-label block mb-1">Title</span>
                <input
                  type="text"
                  placeholder="e.g. Q3_Finance_Plan"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full text-xs text-white"
                />
              </div>
              <div>
                <span className="ds-label block mb-1">Editor Type</span>
                <select
                  value={docType}
                  onChange={(e: any) => setDocType(e.target.value)}
                  className="w-full text-xs bg-[var(--color-surface-container)] text-white"
                >
                  <option value="DOCUMENT">Text Document (.docx)</option>
                  <option value="SPREADSHEET">Spreadsheet (.xlsx)</option>
                  <option value="PRESENTATION">Presentation Slides (.pptx)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-outline-variant)]/40">
              <button
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-xs text-[var(--color-on-surface-variant)] hover:text-white uppercase tracking-wider font-bold cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleCreate}
                className="bg-[#00cec4] text-white hover:bg-[#00b8af] px-5 py-2 rounded-xl text-xs uppercase tracking-widest font-bold transition-all cursor-pointer"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
