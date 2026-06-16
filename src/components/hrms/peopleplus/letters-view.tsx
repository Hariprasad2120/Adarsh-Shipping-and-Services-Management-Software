"use client";

import React, { useState, useEffect } from "react";
import { Mail, Plus, Save, Loader2, Download, AlertCircle, FileText, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export function LettersView() {
  const [requests, setRequests] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);

  // Form states
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateDetails, setTemplateDetails] = useState<Record<string, string>>({});

  const fetchLettersData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hrms/peopleplus/letters");
      const json = await res.json();
      if (json.ok) {
        setRequests(json.data);
      }

      const tempRes = await fetch("/api/hrms/peopleplus/letters?type=templates");
      const tempJson = await tempRes.json();
      if (tempJson.ok) {
        setTemplates(tempJson.data);
        if (tempJson.data.length > 0) {
          setSelectedTemplateId(tempJson.data[0].id);
          initializeDetails(tempJson.data[0]);
        }
      }
    } catch (e) {
      toast.error("Failed to load letter data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLettersData();
  }, []);

  const initializeDetails = (template: any) => {
    if (!template) return;
    const vars = JSON.parse(template.variables || "[]");
    const init: Record<string, string> = {};
    vars.forEach((v: string) => {
      init[v] = "";
    });
    setTemplateDetails(init);
  };

  const handleTemplateChange = (id: string) => {
    setSelectedTemplateId(id);
    const template = templates.find((t) => t.id === id);
    initializeDetails(template);
  };

  const handleDetailChange = (key: string, val: string) => {
    setTemplateDetails((prev) => ({ ...prev, [key]: val }));
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/hrms/peopleplus/letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          details: templateDetails,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("HR Letter requested successfully!");
        setShowRequestForm(false);
        fetchLettersData();
      }
    } catch (err) {
      toast.error("Failed to apply for letter");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
        <Loader2 className="size-8 animate-spin text-[#00c4b6]" />
        <p className="text-xs font-semibold tracking-wider">Syncing letter registry...</p>
      </div>
    );
  }

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const selectedVars = selectedTemplate ? JSON.parse(selectedTemplate.variables || "[]") : [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative rounded-3xl border border-slate-800 bg-[#0f121b]/85 p-6 overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00c4b6]/5 rounded-full blur-3xl" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-[#00c4b6]/10 border border-[#00c4b6]/35 flex items-center justify-center text-[#00c4b6] shadow-sm">
              <Mail className="size-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-100 uppercase tracking-widest">HR LETTERS GATEWAY</h1>
              <p className="text-xs text-slate-500 font-bold mt-0.5 uppercase tracking-wider">Request NOC, Bonafide certificates, and Relieving Letters dynamically</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowRequestForm(!showRequestForm)}
            className="inline-flex items-center justify-center gap-2 bg-[#00c4b6]/15 hover:bg-[#00c4b6]/25 border border-[#00c4b6]/35 rounded-2xl px-4 py-2 text-xs font-black text-[#00c4b6] cursor-pointer transition-all uppercase tracking-wider"
          >
            <Plus className="size-4" />
            <span>Apply Letter</span>
          </button>
        </div>
      </div>

      {/* Letters request form */}
      {showRequestForm && (
        <form onSubmit={handleCreateRequest} className="rounded-3xl border border-slate-900 bg-[#0e121b]/80 p-5 space-y-4 shadow-xl max-w-xl">
          <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">Apply for dynamic Certificate</h3>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Select Letter Template</label>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-[#00c4b6]"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic parameter fields based on template variables */}
          {selectedVars.length > 0 && (
            <div className="space-y-3 p-4 bg-slate-950/40 border border-slate-900 rounded-2xl">
              <span className="text-[8.5px] font-black text-slate-550 uppercase tracking-widest block mb-2">Template Parameters Details</span>
              {selectedVars.map((v: string) => (
                <div key={v} className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 capitalize tracking-wide">{v.replace(/([A-Z])/g, " $1")}</label>
                  <input
                    type="text"
                    value={templateDetails[v] || ""}
                    onChange={(e) => handleDetailChange(v, e.target.value)}
                    required
                    placeholder={`Enter ${v}`}
                    className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-900 rounded-xl text-slate-200 outline-none focus:border-[#00c4b6]"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowRequestForm(false)}
              className="px-4 py-2 border border-slate-800 rounded-xl text-xs font-bold text-slate-400 bg-transparent hover:bg-slate-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-[#00c4b6] border-0 rounded-xl text-xs font-black text-slate-950 cursor-pointer transition-all disabled:opacity-50"
            >
              {submitting ? "Applying..." : "Submit request"}
            </button>
          </div>
        </form>
      )}

      {/* Letters request history list */}
      <div className="space-y-4">
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Application history</div>
        {requests.length === 0 ? (
          <div className="text-center py-16 text-xs text-slate-600 font-bold border border-dashed border-slate-900 rounded-3xl">
            No dynamic certificates requested yet.
          </div>
        ) : (
          <div className="grid gap-4">
            {requests.map((req) => {
              const matchedTemplate = templates.find((t) => t.id === req.templateId);
              const name = matchedTemplate ? matchedTemplate.name : "Dynamic Certificate";
              const statusColors =
                req.status === "APPROVED"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : req.status === "REJECTED"
                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    : "bg-orange-500/10 text-orange-400 border border-orange-500/20";

              return (
                <div
                  key={req.id}
                  className="rounded-3xl border border-slate-900 bg-[#0e121b]/40 p-4 flex flex-wrap items-center justify-between gap-4 transition hover:border-slate-800 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-2xl bg-[#00c4b6]/10 border border-[#00c4b6]/25 flex items-center justify-center text-[#00c4b6]">
                      <FileText className="size-4.5" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-200 uppercase tracking-wide">{name}</p>
                      <p className="text-[8px] font-bold text-slate-500 uppercase mt-0.5 font-mono">
                        Applied: {new Date(req.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={`px-2.5 py-0.5 rounded-xl text-[8px] font-black uppercase tracking-wider ${statusColors}`}>
                      {req.status}
                    </span>

                    {req.status === "APPROVED" ? (
                      <a
                        href={`/import-output/letters/${req.id}.pdf`}
                        download
                        className="inline-flex items-center justify-center p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/35 text-cyan-400 transition-all hover:bg-cyan-500 hover:text-slate-950 cursor-pointer"
                        title="Download Certificate PDF"
                      >
                        <Download className="size-4" />
                      </a>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider select-none font-mono">
                        Awaiting sign
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
